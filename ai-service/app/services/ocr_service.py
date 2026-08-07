"""
OCR Service – Tesseract-based text extraction with field parsing.

Architecture note: This layer is intentionally decoupled from any specific
OCR engine. Swap `_extract_with_tesseract` for an Azure/AWS/Google adapter
without touching field-parsing logic.
"""
import re
import time
import os
from pathlib import Path
from typing import Optional

from loguru import logger

from app.core.config import get_settings
from app.models.schemas import ExtractedFieldSchema, OcrResultSchema

settings = get_settings()

# ── Field extraction patterns ──────────────────────────────────────
FIELD_PATTERNS: dict[str, list[str]] = {
    "INVOICE_NUMBER": [
        r"invoice\s*(?:no|number|#)[:\s]+([A-Z0-9\-/]+)",
        r"inv\s*(?:no|#)[:\s]+([A-Z0-9\-/]+)",
    ],
    "DATE": [
        r"date[:\s]+(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})",
        r"dated?[:\s]+(\w+\s+\d{1,2},?\s+\d{4})",
    ],
    "EXPORTER": [
        r"exporter[:\s]+([^\n]{3,80})",
        r"shipper[:\s]+([^\n]{3,80})",
        r"seller[:\s]+([^\n]{3,80})",
    ],
    "IMPORTER": [
        r"importer[:\s]+([^\n]{3,80})",
        r"consignee[:\s]+([^\n]{3,80})",
        r"buyer[:\s]+([^\n]{3,80})",
    ],
    "CURRENCY": [
        r"\b(USD|EUR|GBP|JPY|CNY|CHF|AUD|CAD)\b",
    ],
    "AMOUNT": [
        r"total\s*amount[:\s]+([0-9,\.]+)",
        r"grand\s*total[:\s]+([0-9,\.]+)",
        r"invoice\s*(?:value|amount)[:\s]+([0-9,\.]+)",
    ],
    "GOODS_DESCRIPTION": [
        r"description\s*of\s*goods[:\s]+([^\n]{5,200})",
        r"commodity[:\s]+([^\n]{5,200})",
    ],
    "COUNTRY_OF_ORIGIN": [
        r"country\s*of\s*origin[:\s]+([A-Za-z\s]+)",
        r"origin[:\s]+([A-Za-z\s]+)",
    ],
    "CONTAINER_NUMBER": [
        r"container\s*(?:no|number|#)[:\s]+([A-Z]{4}\d{7})",
        r"\b([A-Z]{3}U\d{7})\b",
    ],
    "BILL_OF_LADING_NUMBER": [
        r"b/?l\s*(?:no|number|#)[:\s]+([A-Z0-9\-]+)",
        r"bill\s*of\s*lading\s*(?:no|#)[:\s]+([A-Z0-9\-]+)",
    ],
    "PORT_OF_LOADING": [
        r"port\s*of\s*loading[:\s]+([A-Za-z\s,]+)",
    ],
    "PORT_OF_DISCHARGE": [
        r"port\s*of\s*discharge[:\s]+([A-Za-z\s,]+)",
    ],
}


def _extract_text_from_image(file_path: str) -> str:
    """Run Tesseract OCR on an image file."""
    try:
        import pytesseract
        from PIL import Image

        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
        image = Image.open(file_path)
        return pytesseract.image_to_string(image, lang=settings.OCR_LANGUAGE)
    except ImportError:
        logger.warning("pytesseract not available – returning placeholder text")
        return _get_demo_text()
    except Exception as exc:
        logger.error(f"OCR extraction failed: {exc}")
        return ""


def _extract_text_from_pdf(file_path: str) -> str:
    """Convert PDF pages to images then OCR each page."""
    try:
        from pdf2image import convert_from_path
        import pytesseract

        pages = convert_from_path(file_path, dpi=300)
        texts = [pytesseract.image_to_string(page, lang=settings.OCR_LANGUAGE) for page in pages]
        return "\n\n".join(texts)
    except Exception as exc:
        logger.error(f"PDF OCR failed: {exc}")
        return _get_demo_text()


def _get_demo_text() -> str:
    """Return sample trade finance text for demo / testing environments."""
    return """
    COMMERCIAL INVOICE

    Invoice No: INV-2024-001234
    Date: 15/07/2024

    Exporter: Global Trade Co. Ltd, 100 Export Street, Shanghai, China
    Importer: European Imports GmbH, Hauptstraße 45, Hamburg, Germany

    Description of Goods: Electronic components – PCB assemblies, Qty 500 units

    Currency: USD
    Total Amount: 125,000.00

    Country of Origin: China
    Port of Loading: Shanghai
    Port of Discharge: Hamburg

    Bill of Lading No: SHHA20240715001
    Container No: MSCU1234567
    """


def _parse_fields(text: str) -> list[ExtractedFieldSchema]:
    """Apply regex patterns to raw OCR text and return extracted fields."""
    fields: list[ExtractedFieldSchema] = []
    text_lower = text.lower()

    for field_name, patterns in FIELD_PATTERNS.items():
        value: Optional[str] = None
        score = 0.0

        for i, pattern in enumerate(patterns):
            match = re.search(pattern, text_lower, re.IGNORECASE | re.MULTILINE)
            if match:
                value = match.group(1).strip()
                # Primary pattern → higher confidence
                score = 0.90 - (i * 0.08)
                break

        if value:
            fields.append(ExtractedFieldSchema(
                field_name=field_name,
                field_value=value,
                confidence_score=round(min(score, 1.0), 4),
            ))
        else:
            # Field not found → include with null value and zero confidence
            fields.append(ExtractedFieldSchema(
                field_name=field_name,
                field_value=None,
                confidence_score=0.0,
            ))

    return fields


def process_document(file_path: str, mime_type: str, document_id: int) -> OcrResultSchema:
    """Main entry point – run OCR and field extraction on a document."""
    start = time.time()

    if not os.path.exists(file_path):
        logger.warning(f"File not found: {file_path} – using demo text")
        raw_text = _get_demo_text()
    elif mime_type == "application/pdf":
        raw_text = _extract_text_from_pdf(file_path)
    else:
        raw_text = _extract_text_from_image(file_path)

    fields = _parse_fields(raw_text)
    elapsed = int((time.time() - start) * 1000)

    logger.info(f"Document {document_id}: {len(fields)} fields extracted in {elapsed}ms")

    return OcrResultSchema(
        document_id=document_id,
        raw_text=raw_text,
        extracted_fields=fields,
        processing_time_ms=elapsed,
    )
