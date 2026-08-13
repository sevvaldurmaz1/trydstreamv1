"""
MT 700 Parser – SWIFT mesaj ayrıştırıcısı.

SWIFT MT 700 standardını ayrıştırır ve yapılandırılmış bir dict döndürür.
Desteklenen alanlar: :20:, :23:, :27:, :40A:, :31C:, :31D:, :32B:, :39A:,
:39B:, :40E:, :41A/41D:, :42C:, :42A/42D:, :43P:, :43T:, :44A:, :44B:,
:44C:, :44D:, :44E:, :44F:, :45A:, :46A:, :47A:, :48:, :49:, :50:, :59:, :71B:
"""
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Optional

from loguru import logger


# ─── Yardımcı Fonksiyonlar ─────────────────────────────────────────────────

def _parse_swift_date(value: str) -> Optional[date]:
    """YYMMDD formatını date objesine çevirir."""
    v = value.strip()[:6]
    try:
        return datetime.strptime(v, "%y%m%d").date()
    except ValueError:
        try:
            return datetime.strptime(v, "%Y%m%d").date()
        except ValueError:
            return None


def _parse_amount_field(value: str) -> tuple[Optional[str], Optional[Decimal]]:
    """
    :32B: gibi CCCAAAAAAAAAAAAAAAAAAAAb alanını (para birimi + tutar) ayrıştırır.
    Örnek: 'USD50000,00' → ('USD', Decimal('50000.00'))
    """
    value = value.strip()
    if len(value) < 4:
        return None, None

    currency = value[:3].upper()
    raw_amount = value[3:].replace(",", ".").strip()
    try:
        amount = Decimal(raw_amount)
    except InvalidOperation:
        amount = None
    return currency, amount


def _parse_tolerance(value: str) -> tuple[Optional[Decimal], Optional[Decimal]]:
    """
    :39A: tolerans alanını ayrıştırır.
    Örnek: '5/5' → (Decimal('5'), Decimal('5'))
    Örnek: '10/0' → (Decimal('10'), Decimal('0'))
    """
    value = value.strip()
    parts = value.split("/")
    if len(parts) == 2:
        try:
            pos = Decimal(parts[0].strip())
            neg = Decimal(parts[1].strip())
            return pos, neg
        except InvalidOperation:
            pass
    return None, None


def _clean_multiline(value: str) -> str:
    """MT çok-satırlı alan değerini temizler (+ ile başlayan devam satırları)."""
    lines = []
    for line in value.splitlines():
        stripped = line.strip()
        if stripped.startswith("+"):
            lines.append(stripped[1:].strip())
        elif stripped:
            lines.append(stripped)
    return "\n".join(lines)


# ─── Ana Ayrıştırıcı ───────────────────────────────────────────────────────

FIELD_PATTERN = re.compile(
    r":([0-9]{2}[A-Z]?):(.*?)(?=:[0-9]{2}[A-Z]?:|$)",
    re.DOTALL,
)


def parse_mt700(raw_text: str) -> dict:
    """
    MT 700 metnini ayrıştırır ve yapılandırılmış dict döndürür.

    Returns:
        {
          'reference_number': str,
          'lc_expiry_date': date | None,
          'lc_expiry_place': str,
          'lc_currency': str,
          'lc_amount': Decimal | None,
          'tolerance_positive': Decimal | None,
          'tolerance_negative': Decimal | None,
          'applicant': str,
          'beneficiary': str,
          'goods_description': str,
          'documents_required': str,
          'additional_conditions': str,
          'latest_shipment_date': date | None,
          'presentation_period_days': int | None,
          'partial_shipments': str,
          'transhipment': str,
          'port_of_loading': str,
          'port_of_discharge': str,
          'applicable_rules': str,
          'form_of_credit': str,
          'raw_fields': dict,
        }
    """
    raw = raw_text.strip()
    raw_fields: dict[str, str] = {}

    # SWIFT blok başlıklarını soy ({1:...}{2:...}{4:...})
    body_match = re.search(r"\{4:(.*?)(-\}|\Z)", raw, re.DOTALL)
    body = body_match.group(1) if body_match else raw

    # Tüm :TAG: alanlarını çıkar
    for m in FIELD_PATTERN.finditer(body):
        tag = m.group(1)
        val = _clean_multiline(m.group(2))
        raw_fields[tag] = val

    # --- Yapılandırılmış alanlar ---
    result: dict = {"raw_fields": raw_fields}

    # :20: – LC Referans Numarası
    result["reference_number"] = raw_fields.get("20", "").strip()

    # :40A: – Akreditif Türü
    result["form_of_credit"] = raw_fields.get("40A", "").strip()

    # :40E: – Uygulanabilir Kurallar
    result["applicable_rules"] = raw_fields.get("40E", "").strip()

    # :31D: – Son Geçerlilik Tarihi ve Yeri
    expiry_raw = raw_fields.get("31D", "")
    expiry_date_str = expiry_raw[:6].strip()
    expiry_place = expiry_raw[6:].strip()
    result["lc_expiry_date"] = _parse_swift_date(expiry_date_str) if expiry_date_str else None
    result["lc_expiry_place"] = expiry_place

    # :31C: – Düzenlenme Tarihi
    issue_raw = raw_fields.get("31C", "")
    result["lc_issue_date"] = _parse_swift_date(issue_raw.strip()) if issue_raw.strip() else None

    # :32B: – Tutar ve Para Birimi
    currency, amount = _parse_amount_field(raw_fields.get("32B", ""))
    result["lc_currency"] = currency
    result["lc_amount"] = amount

    # :39A: – Tolerans
    tol_pos, tol_neg = _parse_tolerance(raw_fields.get("39A", ""))
    result["tolerance_positive"] = tol_pos
    result["tolerance_negative"] = tol_neg

    # :39B: – Azami Tutar
    result["maximum_amount"] = raw_fields.get("39B", "").strip()

    # :43P: – Kısmi Sevkiyat
    partial = raw_fields.get("43P", "").strip().upper()
    result["partial_shipments"] = partial  # ALLOWED / NOT ALLOWED / NOT PERMITTED

    # :43T: – Aktarma
    trans = raw_fields.get("43T", "").strip().upper()
    result["transhipment"] = trans

    # :44C: – Son Yükleme Tarihi
    shipment_raw = raw_fields.get("44C", "")
    result["latest_shipment_date"] = _parse_swift_date(shipment_raw.strip()) if shipment_raw.strip() else None

    # :44D: – Sevkiyat Dönemi
    result["shipment_period"] = raw_fields.get("44D", "").strip()

    # :44A: – Yükleme Yeri
    result["place_of_taking"] = raw_fields.get("44A", "").strip()

    # :44B: – Varış Yeri
    result["place_of_destination"] = raw_fields.get("44B", "").strip()

    # :44E: – Yükleme Limanı
    result["port_of_loading"] = raw_fields.get("44E", "").strip()

    # :44F: – Boşaltma Limanı
    result["port_of_discharge"] = raw_fields.get("44F", "").strip()

    # :45A: – Mal Tanımı
    result["goods_description"] = raw_fields.get("45A", "").strip()

    # :46A: – Gerekli Belgeler
    result["documents_required"] = raw_fields.get("46A", "").strip()

    # :47A: – Ek Koşullar
    result["additional_conditions"] = raw_fields.get("47A", "").strip()

    # :48: – İbraz Süresi (gün)
    period_raw = raw_fields.get("48", "").strip()
    # "21 DAYS AFTER..." veya sadece "21"
    period_match = re.search(r"(\d+)", period_raw)
    result["presentation_period_days"] = int(period_match.group(1)) if period_match else None

    # :49: – Teyit Talimatları
    result["confirmation"] = raw_fields.get("49", "").strip()

    # :50: – Başvuru Sahibi (Applicant/Amir)
    result["applicant"] = raw_fields.get("50", "").strip()

    # :59: – Lehtar (Beneficiary)
    result["beneficiary"] = raw_fields.get("59", "").strip()

    # :71B: – Masraflar
    result["charges"] = raw_fields.get("71B", "").strip()

    # :41A/41D: – Kullanılabilir Yer ve Kullanım Şekli
    result["available_with"] = raw_fields.get("41A", raw_fields.get("41D", "")).strip()

    # :42C: – Poliçe Vadesi
    result["drafts_at"] = raw_fields.get("42C", raw_fields.get("42A", raw_fields.get("42D", ""))).strip()

    # ── Serbest metinden türetilen ek değerler ──────────────────────────────
    # MT700'de bu değerler için ayrı bir SWIFT alanı yok; :45A:/:46A:/:47A:
    # serbest metninde geçiyorsa yakalanır, yoksa None kalır (kural tetiklenmez).
    free_text = " ".join([
        result.get("goods_description", ""),
        result.get("documents_required", ""),
        result.get("additional_conditions", ""),
    ])

    currency_prefix = r"(?:usd|eur|gbp|try)?\s*"

    unit_price_match = re.search(r"unit\s*price[:\s]+" + currency_prefix + r"([0-9][0-9,\.]*)", free_text, re.IGNORECASE)
    result["unit_price"] = unit_price_match.group(1) if unit_price_match else None

    quantity_match = re.search(r"quantity[:\s]+([0-9][0-9,\.]*)", free_text, re.IGNORECASE)
    result["quantity"] = quantity_match.group(1) if quantity_match else None

    advance_payment_match = re.search(r"advance\s*payment[:\s]+" + currency_prefix + r"([0-9][0-9,\.]*)", free_text, re.IGNORECASE)
    result["advance_payment"] = advance_payment_match.group(1) if advance_payment_match else None

    discount_match = re.search(r"discount[:\s]+" + currency_prefix + r"([0-9][0-9,\.]*)", free_text, re.IGNORECASE)
    result["discount"] = discount_match.group(1) if discount_match else None

    incoterms_year_match = re.search(r"incoterms\s*(\d{4})", free_text, re.IGNORECASE)
    result["incoterms_year_required"] = incoterms_year_match.group(1) if incoterms_year_match else None

    # Fatura üzerinde lehtar beyanı isteniyor mu (:46A: gerekli belgeler listesinde geçiyorsa)
    docs_upper = result.get("documents_required", "").upper()
    result["requires_declaration"] = any(
        kw in docs_upper for kw in ["BENEFICIARY'S DECLARATION", "BENEFICIARY DECLARATION", "SIGNED DECLARATION"]
    )

    logger.info(
        f"MT700 ayrıştırıldı: ref={result.get('reference_number')}, "
        f"currency={result.get('lc_currency')}, amount={result.get('lc_amount')}, "
        f"expiry={result.get('lc_expiry_date')}"
    )

    return result
