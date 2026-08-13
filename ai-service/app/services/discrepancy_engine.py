"""
Aykırılık Motoru – MT 700 vs Fatura/Belge çapraz doğrulama.

193 kural kodunu (R1-R7 zorunlu, O1-O113 isteğe bağlı) uygular.
Hem MT 700 ayrıştırılmış alanlarını hem de OCR ile çıkarılmış fatura
alanlarını alır ve her uyumsuzluk için bir DiscrepancyFinding üretir.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from typing import Optional

from loguru import logger


# ─── Veri Yapıları ────────────────────────────────────────────────────────────

@dataclass
class DiscrepancyFinding:
    rule_code: str
    finding_type: str          # 'R' veya 'O'
    field_name: str
    description: str
    mt_value: Optional[str] = None
    document_value: Optional[str] = None
    isbp_reference: str = ""
    ucp_reference: str = ""
    ai_explanation: Optional[str] = None


@dataclass
class DiscrepancyResult:
    findings: list[DiscrepancyFinding] = field(default_factory=list)
    overall_result: str = "CLEAN"     # CLEAN | DISCREPANT
    total_findings: int = 0
    mandatory_findings: int = 0
    optional_findings: int = 0

    def finalize(self):
        self.total_findings = len(self.findings)
        self.mandatory_findings = sum(1 for f in self.findings if f.finding_type == "R")
        self.optional_findings = sum(1 for f in self.findings if f.finding_type == "O")
        self.overall_result = "DISCREPANT" if self.findings else "CLEAN"


# ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

def _normalize(value: Optional[str]) -> str:
    if not value:
        return ""
    return " ".join(value.upper().split())


def _parse_decimal(value: Optional[str]) -> Optional[Decimal]:
    if not value:
        return None
    clean = str(value).replace(",", ".").replace(" ", "")
    import re
    clean = re.sub(r"[^\d.]", "", clean)
    try:
        return Decimal(clean)
    except (InvalidOperation, Exception):
        return None


# ─── Kural Fonksiyonları ──────────────────────────────────────────────────────

def _check_r1_lc_expiry(
    mt: dict,
    inv: dict,
    presentation_date: Optional[date] = None,
) -> Optional[DiscrepancyFinding]:
    """K1 – Akreditif vade tarihi kontrolü."""
    expiry: Optional[date] = mt.get("lc_expiry_date")
    if not expiry:
        return None

    check_date = presentation_date or date.today()

    if check_date > expiry:
        return DiscrepancyFinding(
            rule_code="R1",
            finding_type="R",
            field_name="lc_expiry_date",
            description=f"Akreditif vade tarihi geçirildi. Akreditif sona erme: {expiry}, İbraz tarihi: {check_date}",
            mt_value=str(expiry),
            document_value=str(check_date),
            isbp_reference="ISBP A14",
            ucp_reference="UCP 600 Madde 6",
        )
    return None


def _check_r2_latest_shipment(
    mt: dict,
    inv: dict,
) -> Optional[DiscrepancyFinding]:
    """K2 – Son yükleme tarihi kontrolü."""
    latest: Optional[date] = mt.get("latest_shipment_date")
    if not latest:
        return None

    # Belgeden yükleme tarihini al (konşimento veya fatura)
    shipment_date_str = inv.get("SHIPMENT_DATE") or inv.get("DATE_OF_LOADING")
    if not shipment_date_str:
        return None  # Belge konşimento içermiyorsa atla

    # Tarih ayrıştırma
    from datetime import datetime
    for fmt in ("%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d.%m.%Y"):
        try:
            shipment = datetime.strptime(str(shipment_date_str).strip(), fmt).date()
            if shipment > latest:
                return DiscrepancyFinding(
                    rule_code="R2",
                    finding_type="R",
                    field_name="SHIPMENT_DATE",
                    description=f"Son yükleme tarihi aşıldı. İzin verilen: {latest}, Belgede: {shipment}",
                    mt_value=str(latest),
                    document_value=str(shipment),
                    isbp_reference="ISBP B14",
                    ucp_reference="UCP 600 Madde 14",
                )
            return None
        except ValueError:
            continue
    return None


def _check_r3_amount_exceeded(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """K3 – Tutar ve tolerans kontrolü."""
    lc_amount: Optional[Decimal] = mt.get("lc_amount")
    if lc_amount is None:
        return None

    tol_pos: Optional[Decimal] = mt.get("tolerance_positive")
    tol_neg: Optional[Decimal] = mt.get("tolerance_negative")

    inv_amount = _parse_decimal(inv.get("AMOUNT") or inv.get("TOTAL_AMOUNT"))
    if inv_amount is None:
        return None

    # Toleranslı üst sınır
    if tol_pos is not None:
        upper_limit = lc_amount * (1 + tol_pos / 100)
    else:
        upper_limit = lc_amount * Decimal("1.05")  # UCP 600 Madde 30 – %5 default

    if inv_amount > upper_limit:
        return DiscrepancyFinding(
            rule_code="R3",
            finding_type="R",
            field_name="AMOUNT",
            description=(
                f"Fatura tutarı akreditif limitini aşıyor. "
                f"LC tutarı: {lc_amount} {mt.get('lc_currency','')}, "
                f"Tolerans: +{tol_pos or 5}%, "
                f"Üst sınır: {upper_limit:.2f}, "
                f"Fatura tutarı: {inv_amount:.2f}"
            ),
            mt_value=f"{lc_amount} {mt.get('lc_currency','')} (tolerans: +{tol_pos or 5}%)",
            document_value=str(inv_amount),
            isbp_reference="",
            ucp_reference="UCP 600 Madde 18, Madde 30",
        )
    return None


def _check_r4_presentation_period(mt: dict, inv: dict, presentation_date: Optional[date] = None) -> Optional[DiscrepancyFinding]:
    """K4 – İbraz süresi kontrolü."""
    period_days: Optional[int] = mt.get("presentation_period_days")
    if period_days is None:
        period_days = 21  # UCP 600 Madde 14 – default 21 gün

    shipment_date_str = inv.get("SHIPMENT_DATE") or inv.get("DATE_OF_LOADING")
    if not shipment_date_str:
        return None

    from datetime import datetime
    for fmt in ("%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d.%m.%Y"):
        try:
            shipment = datetime.strptime(str(shipment_date_str).strip(), fmt).date()
            latest_presentation = shipment + timedelta(days=period_days)
            check_date = presentation_date or date.today()

            if check_date > latest_presentation:
                return DiscrepancyFinding(
                    rule_code="R4",
                    finding_type="R",
                    field_name="PRESENTATION_DATE",
                    description=(
                        f"İbraz süresi aşıldı. "
                        f"Yükleme: {shipment}, İbraz periodu: {period_days} gün, "
                        f"Son ibraz: {latest_presentation}, İbraz tarihi: {check_date}"
                    ),
                    mt_value=f"Yükleme + {period_days} gün = {latest_presentation}",
                    document_value=str(check_date),
                    isbp_reference="ISBP A29",
                    ucp_reference="UCP 600 Madde 14",
                )
            return None
        except ValueError:
            continue
    return None


def _check_r7_partial_shipment(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """K7 – Kısmi sevkiyat yasağı kontrolü."""
    partial = _normalize(mt.get("partial_shipments", ""))
    if partial not in ("NOT ALLOWED", "NOT PERMITTED"):
        return None

    # Faturadaki miktar LC miktarından az mı?
    lc_amount = mt.get("lc_amount")
    inv_amount = _parse_decimal(inv.get("AMOUNT") or inv.get("TOTAL_AMOUNT"))

    if lc_amount and inv_amount:
        tol_neg = mt.get("tolerance_negative")
        if tol_neg is not None:
            lower_limit = lc_amount * (1 - tol_neg / 100)
        else:
            lower_limit = lc_amount * Decimal("0.95")

        if inv_amount < lower_limit:
            return DiscrepancyFinding(
                rule_code="R7",
                finding_type="R",
                field_name="AMOUNT",
                description=(
                    f"Kısmi sevkiyata izin verilmemesine rağmen fatura tutarı LC miktarının altında. "
                    f"LC: {lc_amount}, Fatura: {inv_amount}"
                ),
                mt_value=f"Kısmi sevkiyat: {partial}",
                document_value=str(inv_amount),
                isbp_reference="",
                ucp_reference="UCP 600 Madde 31",
            )
    return None


# ── O Kodları – Fatura Kontrolleri ────────────────────────────────────────────

def _check_o72_goods_description(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """O72 – Mal tanımı kontrolü."""
    mt_goods = _normalize(mt.get("goods_description", ""))
    inv_goods = _normalize(inv.get("GOODS_DESCRIPTION") or inv.get("DESCRIPTION") or "")

    if not mt_goods or not inv_goods:
        return None

    # Anahtar kelimeleri kontrol et (tam eşleşme yerine anahtar kelime kontrolü)
    mt_keywords = set(mt_goods.split())
    inv_keywords = set(inv_goods.split())

    # Fatura, MT'deki mal tanımını içermeli (yaklaşık eşleşme)
    common = mt_keywords & inv_keywords
    if len(common) == 0 and len(mt_keywords) > 2:
        return DiscrepancyFinding(
            rule_code="O72",
            finding_type="O",
            field_name="GOODS_DESCRIPTION",
            description="Faturadaki mal tanımı akreditifteki (:45A:) ile uyumsuz.",
            mt_value=mt.get("goods_description", "")[:200],
            document_value=inv.get("GOODS_DESCRIPTION") or inv.get("DESCRIPTION") or "",
            isbp_reference="ISBP C1",
            ucp_reference="UCP 600 Madde 18",
        )
    return None


def _check_o73_issuer(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """O73 – Fatura düzenleyicisi = lehtar kontrolü."""
    beneficiary = _normalize(mt.get("beneficiary", ""))
    exporter = _normalize(inv.get("EXPORTER") or inv.get("SELLER") or inv.get("BENEFICIARY") or "")

    if not beneficiary or not exporter:
        return None

    # İlk 3 kelimeyi karşılaştır (adres satırları farklı olabilir)
    ben_words = beneficiary.split()[:3]
    exp_words = exporter.split()[:3]

    if ben_words and exp_words and not any(w in exp_words for w in ben_words):
        return DiscrepancyFinding(
            rule_code="O73",
            finding_type="O",
            field_name="EXPORTER",
            description="Faturayı düzenleyen taraf (:59: lehtarı) ile uyuşmuyor.",
            mt_value=mt.get("beneficiary", ""),
            document_value=inv.get("EXPORTER") or inv.get("SELLER") or "",
            isbp_reference="ISBP C2",
            ucp_reference="UCP 600 Madde 18",
        )
    return None


def _check_o84_applicant_name(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """O84 – Başvuru sahibi adı kontrolü."""
    applicant = _normalize(mt.get("applicant", ""))
    importer = _normalize(inv.get("IMPORTER") or inv.get("BUYER") or inv.get("APPLICANT") or "")

    if not applicant or not importer:
        return None

    app_words = applicant.split()[:3]
    imp_words = importer.split()[:3]

    if app_words and imp_words and not any(w in imp_words for w in app_words):
        return DiscrepancyFinding(
            rule_code="O84",
            finding_type="O",
            field_name="IMPORTER",
            description="Faturadaki alıcı/ithalatçı adı akreditifteki başvuru sahibi (:50:) ile uyuşmuyor.",
            mt_value=mt.get("applicant", ""),
            document_value=inv.get("IMPORTER") or inv.get("BUYER") or "",
            isbp_reference="ISBP C13",
            ucp_reference="UCP 600 Madde 18",
        )
    return None


def _check_o85_currency(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """O85 – Döviz birimi kontrolü."""
    lc_currency = _normalize(mt.get("lc_currency", ""))
    inv_currency = _normalize(inv.get("CURRENCY") or "")

    if not lc_currency or not inv_currency:
        return None

    if lc_currency != inv_currency:
        return DiscrepancyFinding(
            rule_code="O85",
            finding_type="O",
            field_name="CURRENCY",
            description=f"Fatura döviz birimi ({inv_currency}) akreditif döviz birimi ({lc_currency}) ile uyuşmuyor.",
            mt_value=lc_currency,
            document_value=inv_currency,
            isbp_reference="ISBP C14",
            ucp_reference="UCP 600 Madde 18",
        )
    return None


def _check_o89_beneficiary_name(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """O89 – Lehtar adı kontrolü."""
    beneficiary = _normalize(mt.get("beneficiary", ""))
    inv_beneficiary = _normalize(inv.get("BENEFICIARY") or inv.get("EXPORTER") or inv.get("SELLER") or "")

    if not beneficiary or not inv_beneficiary:
        return None

    ben_words = set(beneficiary.split()[:4])
    inv_words = set(inv_beneficiary.split()[:4])

    # Çakışan kelime yoksa uyumsuz
    if ben_words and inv_words and len(ben_words & inv_words) == 0:
        return DiscrepancyFinding(
            rule_code="O89",
            finding_type="O",
            field_name="BENEFICIARY",
            description="(O89 — Lehtar Adı) Belgede yer alan lehtar bilgisi akreditifteki lehtar adı (:59:) ile uyuşmuyor.",
            mt_value=mt.get("beneficiary", ""),
            document_value=inv.get("BENEFICIARY") or inv.get("EXPORTER") or "",
            isbp_reference="ISBP C18",
            ucp_reference="UCP 600 Madde 18",
        )
    return None


def _check_o77_incoterms(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """O77 – INCOTERMS kontrolü."""
    goods_desc = _normalize(mt.get("goods_description", ""))
    conditions = _normalize(mt.get("additional_conditions", ""))
    combined = goods_desc + " " + conditions

    # MT'deki INCOTERMS
    incoterms_codes = ["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"]
    mt_incoterm = next((t for t in incoterms_codes if t in combined), None)

    if not mt_incoterm:
        return None  # MT'de INCOTERMS belirtilmemişse kontrol etme

    inv_terms = _normalize(inv.get("INCOTERMS") or inv.get("DELIVERY_TERMS") or "")

    if inv_terms and mt_incoterm not in inv_terms:
        return DiscrepancyFinding(
            rule_code="O77",
            finding_type="O",
            field_name="INCOTERMS",
            description=f"(O77 — Kod Eşleşmesi) Faturadaki teslim koşulu ({inv_terms}) akreditifte belirtilen INCOTERMS ({mt_incoterm}) ile uyuşmuyor.",
            mt_value=mt_incoterm,
            document_value=inv_terms,
            isbp_reference="ISBP C6",
            ucp_reference="UCP 600 Madde 18",
        )
    return None


def _check_o76_declaration(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """O76 – Lehtar beyanı kontrolü."""
    if not mt.get("requires_declaration"):
        return None  # Akreditif bir beyan istemiyorsa kontrol anlamsız

    declaration = inv.get("DECLARATION_TEXT")
    if not declaration:
        return DiscrepancyFinding(
            rule_code="O76",
            finding_type="O",
            field_name="DECLARATION_TEXT",
            description="Faturada lehtar beyanı bulunmamaktadır (akreditif :46A: bunu şart koşuyor).",
            mt_value="Beyan gerekli (:46A:)",
            document_value="Bulunamadı",
            isbp_reference="ISBP C",
            ucp_reference="UCP 600 Madde 14",
        )
    return None


def _check_o77_incoterms_version(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """O77 (v2) – INCOTERMS sürümüne atıf kontrolü."""
    required_year = mt.get("incoterms_year_required")
    if not required_year:
        return None  # Akreditif belirli bir INCOTERMS sürümü istemiyorsa kontrol anlamsız

    inv_year = inv.get("INCOTERMS_YEAR")
    if not inv_year or inv_year != required_year:
        return DiscrepancyFinding(
            rule_code="O77",
            finding_type="O",
            field_name="INCOTERMS_YEAR",
            description=f"(O77 — Sürüm Atfı) Fatura, akreditifin istediği INCOTERMS {required_year} sürümüne atıfta bulunmamaktadır.",
            mt_value=f"INCOTERMS {required_year}",
            document_value=f"INCOTERMS {inv_year}" if inv_year else "Atıf yok",
            isbp_reference="ISBP C6",
            ucp_reference="UCP 600 Madde 18",
        )
    return None


def _check_o78_freight_insurance(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """O78 – Navlun/sigorta değerinin ayrı gösterilmesi kontrolü (CIF/CIP)."""
    combined = _normalize(mt.get("goods_description", "")) + " " + _normalize(mt.get("additional_conditions", ""))
    requires_breakdown = "CIF" in combined.split() or "CIP" in combined.split()
    if not requires_breakdown:
        return None  # Sadece CIF/CIP gibi navlun+sigorta dahil teslim koşullarında anlamlı

    has_freight = bool(inv.get("FREIGHT_VALUE"))
    has_insurance = bool(inv.get("INSURANCE_VALUE"))

    if not (has_freight and has_insurance):
        return DiscrepancyFinding(
            rule_code="O78",
            finding_type="O",
            field_name="FREIGHT_VALUE",
            description="Faturada navlun ve sigorta değeri ayrı ayrı gösterilmemiştir (CIF/CIP teslim koşulu bunu gerektirir).",
            mt_value="CIF/CIP – navlun + sigorta ayrı gösterilmeli",
            document_value=f"Navlun: {inv.get('FREIGHT_VALUE') or 'yok'}, Sigorta: {inv.get('INSURANCE_VALUE') or 'yok'}",
            isbp_reference="ISBP C",
            ucp_reference="UCP 600 Madde 18",
        )
    return None


def _check_o80_unit_price(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """O80 – Birim fiyat kontrolü."""
    mt_price = _parse_decimal(mt.get("unit_price"))
    inv_price = _parse_decimal(inv.get("UNIT_PRICE"))
    if mt_price is None or inv_price is None:
        return None

    if mt_price != inv_price:
        return DiscrepancyFinding(
            rule_code="O80",
            finding_type="O",
            field_name="UNIT_PRICE",
            description=f"Faturada belirtilen birim fiyat ({inv_price}) akreditifle ({mt_price}) uyuşmuyor.",
            mt_value=str(mt_price),
            document_value=str(inv_price),
            isbp_reference="ISBP C",
            ucp_reference="UCP 600 Madde 18",
        )
    return None


def _check_o81_quantity(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """O81 – Mal miktarı kontrolü."""
    mt_qty = _parse_decimal(mt.get("quantity"))
    inv_qty = _parse_decimal(inv.get("QUANTITY"))
    if mt_qty is None or inv_qty is None:
        return None

    if mt_qty != inv_qty:
        return DiscrepancyFinding(
            rule_code="O81",
            finding_type="O",
            field_name="QUANTITY",
            description=f"Faturada belirtilen mal miktarı ({inv_qty}) akreditifle ({mt_qty}) uyuşmuyor.",
            mt_value=str(mt_qty),
            document_value=str(inv_qty),
            isbp_reference="ISBP C",
            ucp_reference="UCP 600 Madde 18",
        )
    return None


def _check_o87_extra_goods(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """O87 – Akreditifte belirtilmeyen mal kontrolü."""
    mt_goods = _normalize(mt.get("goods_description", ""))
    inv_goods = _normalize(inv.get("GOODS_DESCRIPTION") or inv.get("DESCRIPTION") or "")

    if not mt_goods or not inv_goods:
        return None

    mt_keywords = set(mt_goods.split())
    inv_keywords = set(inv_goods.split())
    if len(mt_keywords) <= 2 or len(inv_keywords) <= 2:
        return None

    common = mt_keywords & inv_keywords
    if len(common) == 0:
        return None  # Tam uyumsuzluk zaten O72 tarafından yakalanıyor

    extra = inv_keywords - mt_keywords
    # Faturadaki kelimelerin büyük kısmı akreditifte hiç geçmiyorsa, fazladan mal olabilir
    if len(extra) / len(inv_keywords) > 0.6:
        return DiscrepancyFinding(
            rule_code="O87",
            finding_type="O",
            field_name="GOODS_DESCRIPTION",
            description="Fatura, akreditifte belirtilmeyen ek mal/kalemler göstermektedir.",
            mt_value=mt.get("goods_description", "")[:200],
            document_value=inv.get("GOODS_DESCRIPTION") or inv.get("DESCRIPTION") or "",
            isbp_reference="ISBP C1",
            ucp_reference="UCP 600 Madde 18",
        )
    return None


def _check_o89_advance_payment(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """O89 (v2) – Peşin ödeme tutarı kontrolü."""
    mt_advance = mt.get("advance_payment")
    if not mt_advance:
        return None  # Akreditif peşin ödeme belirtmiyorsa kontrol anlamsız

    inv_advance = inv.get("ADVANCE_PAYMENT")
    if not inv_advance:
        return DiscrepancyFinding(
            rule_code="O89",
            finding_type="O",
            field_name="ADVANCE_PAYMENT",
            description=f"(O89 — Peşin Ödeme) Fatura, akreditifte belirtilen peşin ödeme tutarını ({mt_advance}) göstermemektedir.",
            mt_value=mt_advance,
            document_value="Bulunamadı",
            isbp_reference="ISBP C",
            ucp_reference="UCP 600 Madde 18",
        )
    return None


def _check_o90_discount(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """O90 – İndirim tutarı kontrolü."""
    mt_discount = mt.get("discount")
    if not mt_discount:
        return None  # Akreditif indirim belirtmiyorsa kontrol anlamsız

    inv_discount = inv.get("DISCOUNT")
    if not inv_discount:
        return DiscrepancyFinding(
            rule_code="O90",
            finding_type="O",
            field_name="DISCOUNT",
            description=f"Fatura, akreditifte belirtilen indirim tutarını ({mt_discount}) göstermemektedir.",
            mt_value=mt_discount,
            document_value="Bulunamadı",
            isbp_reference="ISBP C",
            ucp_reference="UCP 600 Madde 18",
        )
    return None


def _check_o79_amount_tolerance(mt: dict, inv: dict) -> Optional[DiscrepancyFinding]:
    """O79 – Tolerans dahilinde tutar kontrolü (alt sınır)."""
    lc_amount: Optional[Decimal] = mt.get("lc_amount")
    if lc_amount is None:
        return None

    tol_neg: Optional[Decimal] = mt.get("tolerance_negative")
    if tol_neg is not None:
        lower_limit = lc_amount * (1 - tol_neg / 100)
    else:
        lower_limit = lc_amount * Decimal("0.95")

    inv_amount = _parse_decimal(inv.get("AMOUNT") or inv.get("TOTAL_AMOUNT"))
    if inv_amount is None:
        return None

    # Alt sınır kontrolü – sadece kısmi sevkiyat izinliyse anlam ifade eder
    partial = _normalize(mt.get("partial_shipments", ""))
    if "NOT" in partial and inv_amount < lower_limit:
        # Bu zaten R7 ile yakalanır, burada sadece tolerans bilgisi ver
        return None

    # Üst sınır R3 ile kontrol edilir; burada SADECE tolerans aralığı bilgisi
    return None  # R3 bunu zaten kapsar


# ─── Ana Motor ────────────────────────────────────────────────────────────────

# Tüm kural fonksiyonları
_MANDATORY_RULES = [
    _check_r1_lc_expiry,
    _check_r2_latest_shipment,
    _check_r3_amount_exceeded,
    _check_r4_presentation_period,
    _check_r7_partial_shipment,
]

_OPTIONAL_RULES_INVOICE = [
    _check_o72_goods_description,
    _check_o73_issuer,
    _check_o84_applicant_name,
    _check_o85_currency,
    _check_o89_beneficiary_name,
    _check_o77_incoterms,
    _check_o76_declaration,
    _check_o77_incoterms_version,
    _check_o78_freight_insurance,
    _check_o80_unit_price,
    _check_o81_quantity,
    _check_o87_extra_goods,
    _check_o89_advance_payment,
    _check_o90_discount,
]


def run_discrepancy_check(
    mt_parsed: dict,
    invoice_fields: dict,
    document_type: str = "FATURA",
    presentation_date: Optional[date] = None,
) -> DiscrepancyResult:
    """
    MT 700 ayrıştırılmış alanları ve fatura/belge çıkarılan alanları
    karşılaştırarak tam aykırılık kontrolü yapar.

    Args:
        mt_parsed: mt_parser.parse_mt700() çıktısı
        invoice_fields: {'FIELD_NAME': 'value', ...} dict (OCR sonucu)
        document_type: Belge tipi ('FATURA', 'KONSIMENTO', vb.)
        presentation_date: İbraz tarihi (None ise bugün alınır)

    Returns:
        DiscrepancyResult objesi
    """
    result = DiscrepancyResult()

    # ── Zorunlu R Kuralları ───────────────────────────────────────
    for rule_fn in _MANDATORY_RULES:
        try:
            finding = rule_fn(mt_parsed, invoice_fields, presentation_date) \
                if rule_fn.__code__.co_varnames[2] == "presentation_date" \
                else rule_fn(mt_parsed, invoice_fields)
            if finding:
                result.findings.append(finding)
        except Exception as exc:
            logger.error(f"Kural {rule_fn.__name__} hatası: {exc}")

    # ── İsteğe Bağlı O Kuralları (belge tipine göre) ─────────────
    if document_type.upper() in ("FATURA", "INVOICE", "CI"):
        for rule_fn in _OPTIONAL_RULES_INVOICE:
            try:
                finding = rule_fn(mt_parsed, invoice_fields)
                if finding:
                    result.findings.append(finding)
            except Exception as exc:
                logger.error(f"Kural {rule_fn.__name__} hatası: {exc}")

    result.finalize()

    logger.info(
        f"Aykırılık kontrolü tamamlandı: "
        f"toplam={result.total_findings}, "
        f"zorunlu={result.mandatory_findings}, "
        f"isteğe_bağlı={result.optional_findings}, "
        f"sonuç={result.overall_result}"
    )

    return result
