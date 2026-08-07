"""
MT 700 Route'ları – SWIFT mesajı ayrıştırma ve kaydetme.
"""
from fastapi import APIRouter, HTTPException
from loguru import logger

from app.models.mt_schemas import MtParseRequest, MtParseResponse, MtParsedFields
from app.services.mt_parser import parse_mt700

router = APIRouter(prefix="/mt", tags=["MT Mesajı"])


@router.post("/parse", response_model=MtParseResponse)
async def parse_mt_message(req: MtParseRequest):
    """
    SWIFT MT 700 mesajını ayrıştırır.

    Ham metin gönderilir; tüm alanlar yapılandırılmış formata çevrilir.
    Sonuç /discrepancy/check endpoint'i ile birlikte kullanılabilir.
    """
    if not req.raw_text or len(req.raw_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Geçerli bir MT metni giriniz.")

    try:
        parsed = parse_mt700(req.raw_text)
    except Exception as exc:
        logger.error(f"MT700 ayrıştırma hatası: {exc}")
        raise HTTPException(status_code=422, detail=f"MT ayrıştırılamadı: {str(exc)}")

    # Pydantic şemasına dönüştür
    fields = MtParsedFields(
        reference_number=parsed.get("reference_number"),
        form_of_credit=parsed.get("form_of_credit"),
        applicable_rules=parsed.get("applicable_rules"),
        lc_issue_date=parsed.get("lc_issue_date"),
        lc_expiry_date=parsed.get("lc_expiry_date"),
        lc_expiry_place=parsed.get("lc_expiry_place"),
        lc_currency=parsed.get("lc_currency"),
        lc_amount=parsed.get("lc_amount"),
        tolerance_positive=parsed.get("tolerance_positive"),
        tolerance_negative=parsed.get("tolerance_negative"),
        maximum_amount=parsed.get("maximum_amount"),
        partial_shipments=parsed.get("partial_shipments"),
        transhipment=parsed.get("transhipment"),
        latest_shipment_date=parsed.get("latest_shipment_date"),
        shipment_period=parsed.get("shipment_period"),
        place_of_taking=parsed.get("place_of_taking"),
        place_of_destination=parsed.get("place_of_destination"),
        port_of_loading=parsed.get("port_of_loading"),
        port_of_discharge=parsed.get("port_of_discharge"),
        goods_description=parsed.get("goods_description"),
        documents_required=parsed.get("documents_required"),
        additional_conditions=parsed.get("additional_conditions"),
        presentation_period_days=parsed.get("presentation_period_days"),
        confirmation=parsed.get("confirmation"),
        applicant=parsed.get("applicant"),
        beneficiary=parsed.get("beneficiary"),
        available_with=parsed.get("available_with"),
        drafts_at=parsed.get("drafts_at"),
        charges=parsed.get("charges"),
        raw_fields=parsed.get("raw_fields", {}),
    )

    field_count = sum(1 for v in parsed.values() if v and v != parsed.get("raw_fields"))

    return MtParseResponse(
        success=True,
        parsed=fields,
        field_count=len(parsed.get("raw_fields", {})),
    )
