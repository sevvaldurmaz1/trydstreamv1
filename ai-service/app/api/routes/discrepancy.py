"""
Aykırılık Kontrol Route'ları – MT 700 vs Fatura çapraz doğrulama.
"""
import asyncio

from fastapi import APIRouter, HTTPException
from loguru import logger

from app.models.mt_schemas import (
    DiscrepancyCheckRequest,
    DiscrepancyCheckResponse,
    DiscrepancyFindingSchema,
    DiscrepancyWithFieldsRequest,
)
from app.services.mt_parser import parse_mt700
from app.services.discrepancy_engine import run_discrepancy_check
from app.services.ollama_service import get_ai_explanation, check_ollama_available

router = APIRouter(prefix="/discrepancy", tags=["Aykırılık Kontrolü"])


@router.post("/check", response_model=DiscrepancyCheckResponse)
async def check_discrepancy(req: DiscrepancyCheckRequest):
    """
    MT 700 ile fatura/belge arasındaki aykırılıkları kontrol eder.

    - MT metni ham olarak gönderilebilir (mt_raw_text) veya mt_id ile referans verilebilir
    - Belgeden çıkarılan alanlar document_id ile alınır (DB sorgusu)
    - use_ai=True ise Qwen 14B (Ollama) ile her aykırılık için açıklama üretilir
    """
    # MT ayrıştırma
    if req.mt_raw_text:
        try:
            mt_parsed = parse_mt700(req.mt_raw_text)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"MT ayrıştırılamadı: {str(exc)}")
    else:
        raise HTTPException(
            status_code=400,
            detail="mt_raw_text gereklidir. (mt_id desteği backend üzerinden yapılır)"
        )

    # Belge alanları – bu endpoint'te mock/test için basit dict
    # Gerçek kullanımda backend bu alanları DB'den çekip gönderir
    invoice_fields: dict = {}

    # Aykırılık motorunu çalıştır
    result = run_discrepancy_check(
        mt_parsed=mt_parsed,
        invoice_fields=invoice_fields,
        document_type=req.document_type,
        presentation_date=req.presentation_date,
    )

    # Ollama erişilebilirlik kontrolü
    ai_available = False
    if req.use_ai:
        ai_available = await check_ollama_available()

    # Her bulgu için AI açıklaması al
    findings_out: list[DiscrepancyFindingSchema] = []
    for finding in result.findings:
        ai_exp = None
        if req.use_ai and ai_available:
            ai_exp = await get_ai_explanation(
                rule_code=finding.rule_code,
                description=finding.description,
                mt_value=finding.mt_value,
                document_value=finding.document_value,
                document_type=req.document_type,
            )

        findings_out.append(DiscrepancyFindingSchema(
            rule_code=finding.rule_code,
            finding_type=finding.finding_type,
            severity=finding.severity,
            field_name=finding.field_name,
            description=finding.description,
            mt_value=finding.mt_value,
            document_value=finding.document_value,
            isbp_reference=finding.isbp_reference,
            ucp_reference=finding.ucp_reference,
            ai_explanation=ai_exp,
        ))

    notes = None
    if req.use_ai and not ai_available:
        notes = "Ollama bağlantısı kurulamadı. AI açıklamaları devre dışı. Ollama'yı çalıştırın: `ollama serve`"

    return DiscrepancyCheckResponse(
        success=True,
        overall_result=result.overall_result,
        total_findings=result.total_findings,
        mandatory_findings=result.mandatory_findings,
        optional_findings=result.optional_findings,
        findings=findings_out,
        ai_available=ai_available,
        notes=notes,
    )


@router.post("/check-with-fields", response_model=DiscrepancyCheckResponse)
async def check_discrepancy_with_fields(req: DiscrepancyWithFieldsRequest):
    """
    MT 700 metni ve belge alanlarını doğrudan alarak aykırılık kontrolü yapar.
    Backend tarafından çağrılır; belge alanları DB'den çekilip buraya gönderilir.
    """
    try:
        mt_parsed = parse_mt700(req.mt_raw_text)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"MT ayrıştırılamadı: {str(exc)}")

    result = run_discrepancy_check(
        mt_parsed=mt_parsed,
        invoice_fields=req.invoice_fields,
        document_type=req.document_type,
    )

    ai_available = await check_ollama_available() if req.use_ai else False

    findings_out: list[DiscrepancyFindingSchema] = []
    for finding in result.findings:
        ai_exp = None
        if req.use_ai and ai_available:
            ai_exp = await get_ai_explanation(
                rule_code=finding.rule_code,
                description=finding.description,
                mt_value=finding.mt_value,
                document_value=finding.document_value,
                document_type=req.document_type,
            )
        findings_out.append(DiscrepancyFindingSchema(
            rule_code=finding.rule_code,
            finding_type=finding.finding_type,
            severity=finding.severity,
            field_name=finding.field_name,
            description=finding.description,
            mt_value=finding.mt_value,
            document_value=finding.document_value,
            isbp_reference=finding.isbp_reference,
            ucp_reference=finding.ucp_reference,
            ai_explanation=ai_exp,
        ))

    return DiscrepancyCheckResponse(
        success=True,
        overall_result=result.overall_result,
        total_findings=result.total_findings,
        mandatory_findings=result.mandatory_findings,
        optional_findings=result.optional_findings,
        findings=findings_out,
        ai_available=ai_available,
    )
