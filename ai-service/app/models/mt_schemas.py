"""
MT 700 ve Aykırılık için Pydantic şemaları.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, Field


# ─── MT 700 ────────────────────────────────────────────────────────────────

class MtParseRequest(BaseModel):
    raw_text: str = Field(..., description="Ham SWIFT MT 700 metni")
    document_id: Optional[int] = Field(None, description="İlişkili belge ID (opsiyonel)")


class MtParsedFields(BaseModel):
    reference_number: Optional[str] = None
    form_of_credit: Optional[str] = None
    applicable_rules: Optional[str] = None
    lc_issue_date: Optional[date] = None
    lc_expiry_date: Optional[date] = None
    lc_expiry_place: Optional[str] = None
    lc_currency: Optional[str] = None
    lc_amount: Optional[Decimal] = None
    tolerance_positive: Optional[Decimal] = None
    tolerance_negative: Optional[Decimal] = None
    maximum_amount: Optional[str] = None
    partial_shipments: Optional[str] = None
    transhipment: Optional[str] = None
    latest_shipment_date: Optional[date] = None
    shipment_period: Optional[str] = None
    place_of_taking: Optional[str] = None
    place_of_destination: Optional[str] = None
    port_of_loading: Optional[str] = None
    port_of_discharge: Optional[str] = None
    goods_description: Optional[str] = None
    documents_required: Optional[str] = None
    additional_conditions: Optional[str] = None
    presentation_period_days: Optional[int] = None
    confirmation: Optional[str] = None
    applicant: Optional[str] = None
    beneficiary: Optional[str] = None
    available_with: Optional[str] = None
    drafts_at: Optional[str] = None
    charges: Optional[str] = None
    unit_price: Optional[str] = None
    quantity: Optional[str] = None
    advance_payment: Optional[str] = None
    discount: Optional[str] = None
    incoterms_year_required: Optional[str] = None
    requires_declaration: Optional[bool] = None
    raw_fields: dict[str, str] = Field(default_factory=dict)


class MtParseResponse(BaseModel):
    success: bool = True
    mt_id: Optional[int] = None  # DB'ye kaydedilirse
    parsed: MtParsedFields
    field_count: int = 0


# ─── Aykırılık ──────────────────────────────────────────────────────────────

class DiscrepancyCheckRequest(BaseModel):
    mt_raw_text: Optional[str] = Field(None, description="Ham MT 700 metni (mt_id yoksa)")
    mt_id: Optional[int] = Field(None, description="Daha önce kaydedilmiş MT ID")
    document_id: int = Field(..., description="Fatura/belge ID")
    document_type: str = Field("FATURA", description="Belge tipi: FATURA, KONSIMENTO, AWB, vb.")
    use_ai: bool = Field(True, description="Qwen 14B AI açıklaması kullanılsın mı?")
    presentation_date: Optional[date] = Field(None, description="İbraz tarihi (None = bugün)")


class DiscrepancyWithFieldsRequest(BaseModel):
    """Backend tarafından /check-with-fields endpoint'i için kullanılır."""
    mt_raw_text: str = Field(..., description="Ham MT 700 metni")
    invoice_fields: dict = Field(default_factory=dict, description="OCR ile çıkarılmış belge alanları")
    document_type: str = Field("FATURA", description="Belge tipi")
    use_ai: bool = Field(True, description="Qwen AI açıklaması kullanılsın mı?")


class DiscrepancyFindingSchema(BaseModel):
    rule_code: str
    finding_type: str
    field_name: str
    description: str
    mt_value: Optional[str] = None
    document_value: Optional[str] = None
    isbp_reference: str = ""
    ucp_reference: str = ""
    ai_explanation: Optional[str] = None


class DiscrepancyCheckResponse(BaseModel):
    success: bool = True
    report_id: Optional[int] = None
    overall_result: str  # CLEAN | DISCREPANT
    total_findings: int
    mandatory_findings: int
    optional_findings: int
    findings: list[DiscrepancyFindingSchema]
    ai_available: bool = False
    notes: Optional[str] = None
