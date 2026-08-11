from fastapi import APIRouter
from app.models.schemas import ExtractedFieldSchema, ValidationResultSchema
from app.services.validation_service import validate_document

router = APIRouter(prefix="/validation", tags=["Validation"])


class ValidateRequest:
    pass


from pydantic import BaseModel
from typing import List


class ValidateDocumentRequest(BaseModel):
    document_id: int
    fields: List[ExtractedFieldSchema]
    document_type: str = "FATURA"


@router.post("/validate", response_model=ValidationResultSchema)
async def validate(request: ValidateDocumentRequest):
    """Validate extracted fields against trade finance business rules."""
    return validate_document(
        document_id=request.document_id,
        fields=request.fields,
        document_type=request.document_type,
    )
