from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class IssueSeverity(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class IssueType(str, Enum):
    MISSING_FIELD = "MISSING_FIELD"
    INVALID_DATE = "INVALID_DATE"
    CURRENCY_MISMATCH = "CURRENCY_MISMATCH"
    INVOICE_MISMATCH = "INVOICE_MISMATCH"
    AMOUNT_MISMATCH = "AMOUNT_MISMATCH"
    DOCUMENT_INCONSISTENCY = "DOCUMENT_INCONSISTENCY"
    UNKNOWN_FORMAT = "UNKNOWN_FORMAT"


class ExtractedFieldSchema(BaseModel):
    field_name: str
    field_value: Optional[str] = None
    confidence_score: float = Field(ge=0.0, le=1.0)


class ValidationIssueSchema(BaseModel):
    issue_type: IssueType
    severity: IssueSeverity
    field_name: Optional[str] = None
    description: str


class OcrResultSchema(BaseModel):
    document_id: int
    raw_text: str
    extracted_fields: list[ExtractedFieldSchema]
    processing_time_ms: int


class ValidationResultSchema(BaseModel):
    document_id: int
    overall_status: str  # PASSED | FAILED | WARNING
    confidence_score: int = Field(ge=0, le=100)
    issues: list[ValidationIssueSchema]
    notes: Optional[str] = None


class ProcessDocumentRequest(BaseModel):
    document_id: int
    file_path: str
    mime_type: str
    document_type_code: Optional[str] = None
