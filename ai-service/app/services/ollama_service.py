"""
Ollama Servis Entegrasyonu – Qwen 14B ile RAG tabanlı aykırılık açıklaması.

Kullanım:
  - Ollama'nın yerel olarak çalıştığını varsayar (host.docker.internal:11434)
  - Model: qwen2.5:14b (veya ENV ile yapılandırılabilir)
  - Her aykırılık için ilgili ISBP 745 / UCP 600 maddeleri context olarak verilir
  - Ollama çalışmıyorsa servis None döndürür (hard fail yok)
"""
from __future__ import annotations

import os
from typing import Optional

import httpx
from loguru import logger

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:14b")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "60"))

# ─── ISBP 745 / UCP 600 Bilgi Tabanı ──────────────────────────────────────────
# Aykırılık türlerine göre eşleştirilmiş kural metinleri.
RULE_KNOWLEDGE_BASE: dict[str, str] = {
    # Genel İlkeler (ISBP A bölümü)
    "GENERAL": """
ISBP 745 Genel İlkeler:
A1: Kısaltmalar – Kabul edilmiş uluslararası kısaltmalar (ISBP A1)
A7: Düzeltmeler – Orijinal belgelerinde düzeltmeler ve silintiler akreditifi düzenleyen kurum tarafından onaylanmış olmalı (ISBP A7)
A11: Tarihler – Tarihler tek bir anlam taşımalıdır. "Erken", "hızlı" ifadeleri kullanılmamalıdır (ISBP A11-A16)
A21: Dil – Belgeler akreditifte belirtilen dilde düzenlenmeli (ISBP A21)
A23: Yazım Hataları – Yazım hataları içeriği değiştirmiyorsa kabul edilebilir (ISBP A23)
A27: Asıllar – "Bir set asıl" ibaresi 1 adet; "en az bir asıl" ibaresi 1+ adet anlamına gelir (ISBP A27-A31)
A35: İmzalar – İmzaların el yazısı, faks, atıflı imza, delikli mühür veya damga şeklinde olması kabul edilebilir (ISBP A35-A38)
A39: Belge Başlıkları – Akreditifte başlık belirtilmemişse sunulan belgenin başlığı önem taşımaz (ISBP A39-A41)
""",
    # Fatura Kuralları (ISBP C bölümü)
    "FATURA": """
ISBP 745 Fatura (Commercial Invoice) Kuralları:
C1: Faturadaki mal, hizmet veya edim tanımı akreditifte belirtilen tanım ile tam olarak örtüşmelidir. (ISBP C1, UCP 600 Madde 18)
C2: Fatura, lehtar (beneficiary) tarafından düzenlenmiş gibi görünmelidir. Lehtar adı LC'deki :59: alanındaki isimle eşleşmelidir. (ISBP C2, UCP 600 Madde 18)
C3: Akreditif faturanın imzalanmasını gerektiriyorsa, fatura imzalanmış olmalıdır. (ISBP C3)
C6: INCOTERMS kullanılıyorsa, INCOTERMS kurallarına uygun olarak gösterilmelidir (örneğin CIF ISTANBUL ICC INCOTERMS 2020). (ISBP C6)
C8: Fatura tutarı akreditif tutarını aşmamalıdır. UCP 600 Madde 30 uyarınca ±%5 tolerans uygulanabilir. :39A: alanında özel tolerans belirtilmişse o esas alınır. (UCP 600 Madde 30)
C13: Başvuru sahibinin (applicant) adı :50: alanındaki isimle eşleşmelidir. (ISBP C13, UCP 600 Madde 18)
C14: Faturadaki para birimi akreditifteki para birimi ile aynı olmalıdır. (ISBP C14)
C18: Lehtar adı ve adresi :59: alanındaki bilgilerle uyumlu olmalıdır. (ISBP C18)
""",
    # Konşimento Kuralları (ISBP E bölümü)
    "KONSIMENTO": """
ISBP 745 Konşimento (Bill of Lading) Kuralları:
E1: Akreditif bir deniz konşimentosu (ocean B/L) istiyorsa bu şekilde düzenlenmiş bir belge ibraz edilmelidir. (ISBP E1, UCP 600 Madde 20)
E4: Konşimentoda yükleme tarihi, akreditifteki son yükleme tarihini (:44C:) geçmemelidir. (ISBP E4, UCP 600 Madde 14)
E5: Konşimento taşıyıcı veya acentesi tarafından imzalanmış olmalıdır. (ISBP E5, UCP 600 Madde 20)
E6: Temiz konşimento (clean B/L) şartı varsa, mallara ilişkin olumsuz not içermemelidir. (ISBP E6, UCP 600 Madde 27)
E8: Akreditif aktarmayı yasaklıyorsa (:43T: NOT ALLOWED), konşimento aktarma yapılmayacağını göstermelidir. (ISBP E8, UCP 600 Madde 20)
""",
    # Sigorta Kuralları (ISBP I bölümü)
    "SIGORTA": """
ISBP 745 Sigorta Belgesi Kuralları:
I1: Sigorta belgesi, malların değerinin en az %110'u üzerinden düzenlenmiş olmalıdır. (ISBP I1, UCP 600 Madde 28)
I2: Sigorta kapsamı akreditifte belirtilen rizikolarla uyumlu olmalıdır. (ISBP I2, UCP 600 Madde 28)
I3: Sigorta belgesi, yükleme tarihinden önce veya en geç yükleme tarihinde geçerli olmalıdır. (ISBP I3, UCP 600 Madde 28)
""",
    # UCP 600 Temel Maddeleri
    "UCP_GENEL": """
UCP 600 Temel Maddeler:
Madde 6: Kullanılabilirlik, Son Geçerlilik Tarihi ve Yeri – Akreditif bir son kullanım tarihi ve yeri içermelidir.
Madde 14: Belgelerin Tetkiki Standardı – Bankalar belgeler arasında yüzeysel bir tutarlılık aramaktadır.
Madde 17: Asıl Belgeler – En az bir asıl ibraz edilmelidir.
Madde 18: Ticari Fatura – Fatura lehtar tarafından düzenlenmiş olmalı ve LC ile tutarlı olmalıdır.
Madde 20: Konişmento – Konşimento koşulları ve imza gereklilikleri.
Madde 27: Temiz Taşıma Belgesi – Malların hasarını belirtmeyen belge.
Madde 28: Sigorta Belgesi ve Kapsamı – Sigorta tutarı ve koşulları.
Madde 30: Akreditif Tutarı, Miktar ve Birim Fiyat Toleransları – %5 tolerans kuralı.
Madde 31: Kısmi Çekimler veya Sevkiyatlar – İzin verilmiyorsa yasaktır.
""",
    # R Kodları (Zorunlu Aykırılıklar)
    "MANDATORY": """
Zorunlu Aykırılıklar (R Kodları):
K1 – Akreditif Vade Tarihi Geçirildi: Belge ibraz tarihi akreditifin son geçerlilik tarihini (:31D:) geçmiştir. UCP 600 Madde 6.
K2 – Son Yükleme Tarihi Geçirildi: Yükleme tarihi akreditifteki son yükleme tarihini (:44C:) geçmiştir. UCP 600 Madde 14.
K3 – Akreditif Tutarı Aşıldı: Talep tutarı, tolerans dahilinde (:39A:) akreditif tutarını (:32B:) aşmaktadır. UCP 600 Madde 18/30.
K4 – İbraz Süresi Aşıldı: Belgeler yükleme tarihinden itibaren (:48:) gün içinde ibraz edilmemiştir. UCP 600 Madde 14.
K5 – Eksik Sevkiyat: İbraz edilen tutarın LC miktarının altında kalması ve eksik sevkiyat çekim yapılmamış olması.
K6 – Fazla Sevkiyat: Tutarın LC miktarını (tolerans üstü) aşması.
K7 – Kısmi Sevkiyat Yasağı: :43P: NOT ALLOWED iken kısmi sevkiyat tespit edildi. UCP 600 Madde 31.
""",
}


def _get_context_for_finding(rule_code: str, description: str, document_type: str = "") -> str:
    """Aykırılık için ilgili ISBP/UCP bağlamını seçer."""
    parts = [RULE_KNOWLEDGE_BASE["UCP_GENEL"]]

    code_upper = rule_code.upper()
    doc_upper = document_type.upper()

    if code_upper.startswith("R"):
        parts.append(RULE_KNOWLEDGE_BASE["MANDATORY"])
    if "FATURA" in doc_upper or "INVOICE" in doc_upper or any(
        k in code_upper for k in ["O72", "O73", "O74", "O75", "O76", "O77", "O78", "O79", "O80", "O81", "O82", "O83", "O84", "O85", "O86", "O87", "O88", "O89"]
    ):
        parts.append(RULE_KNOWLEDGE_BASE["FATURA"])
    if "KONSIMENTO" in doc_upper or "BL" in doc_upper or any(
        k in code_upper for k in ["O40", "O41", "O42", "O43", "O44", "O45", "O46", "O47", "O48", "O49", "O50"]
    ):
        parts.append(RULE_KNOWLEDGE_BASE["KONSIMENTO"])
    if "SIGORTA" in doc_upper or "INS" in doc_upper or any(
        k in code_upper for k in ["O90", "O91", "O92", "O93", "O94"]
    ):
        parts.append(RULE_KNOWLEDGE_BASE["SIGORTA"])

    parts.append(RULE_KNOWLEDGE_BASE["GENERAL"])
    return "\n".join(dict.fromkeys(parts))  # unique, sıra korunarak


async def get_ai_explanation(
    rule_code: str,
    description: str,
    mt_value: Optional[str],
    document_value: Optional[str],
    document_type: str = "FATURA",
) -> Optional[str]:
    """
    Qwen 14B (Ollama) kullanarak aykırılık için Türkçe açıklama üretir.
    Ollama çalışmıyorsa None döndürür.
    """
    context = _get_context_for_finding(rule_code, description, document_type)

    prompt = f"""Sen bir akreditif (Letter of Credit) uzmanısın. ISBP 745 ve UCP 600 kurallarını çok iyi biliyorsun.
Aşağıdaki aykırılığı Türkçe olarak kısaca (2-3 cümle) açıkla:

Kural Kodu: {rule_code}
Aykırılık: {description}
MT 700'deki Değer: {mt_value or "Belirtilmemiş"}
Belgede Bulunan Değer: {document_value or "Bulunamadı"}

Referans ISBP/UCP Bilgisi:
{context}

Lütfen:
1. Aykırılığın neden hata oluşturduğunu açıkla
2. Hangi ISBP/UCP maddesine göre gerekli olduğunu belirt
3. Düzeltme için ne yapılması gerektiğini söyle
Yanıtını Türkçe ver ve kısa tut."""

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_predict": 160,
                    },
                },
            )
            resp.raise_for_status()
            data = resp.json()
            explanation = data.get("response", "").strip()
            logger.info(f"Ollama açıklaması alındı: {rule_code} ({len(explanation)} karakter)")
            return explanation if explanation else None

    except httpx.ConnectError:
        logger.warning(f"Ollama bağlantısı kurulamadı ({OLLAMA_BASE_URL}). AI açıklaması atlandı.")
        return None
    except httpx.TimeoutException:
        logger.warning(f"Ollama zaman aşımı ({OLLAMA_TIMEOUT}s). AI açıklaması atlandı.")
        return None
    except Exception as exc:
        logger.error(f"Ollama hatası: {exc}")
        return None


async def check_ollama_available() -> bool:
    """Ollama'nın erişilebilir olup olmadığını kontrol eder."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False
