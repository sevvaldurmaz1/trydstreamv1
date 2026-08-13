from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import os
import shutil
import uuid
from pathlib import Path

from app.core.config import get_settings
from app.models.schemas import OcrResultSchema, ProcessDocumentRequest
from app.services import ocr_service, validation_service

router = APIRouter(prefix="/ocr", tags=["OCR"])
settings = get_settings()


@router.post("/process", response_model=OcrResultSchema)
async def process_document(request: ProcessDocumentRequest):
    """Process a document that has already been saved to disk by the backend."""
    result = await ocr_service.process_document(
        file_path=request.file_path,
        mime_type=request.mime_type,
        document_id=request.document_id,
    )
    return result


@router.post("/upload-and-process", response_model=OcrResultSchema)
async def upload_and_process(
    document_id: int,
    file: UploadFile = File(...),
):
    """Direct upload endpoint for quick testing without the backend."""
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "document").suffix
    save_path = upload_dir / f"{uuid.uuid4()}{suffix}"

    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = await ocr_service.process_document(
            file_path=str(save_path),
            mime_type=file.content_type or "application/octet-stream",
            document_id=document_id,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        if save_path.exists():
            os.unlink(save_path)
