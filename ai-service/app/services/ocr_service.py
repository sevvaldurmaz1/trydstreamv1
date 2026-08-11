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

# Fallback score used only when no real word-level confidence is available
# (demo text, or an offset that couldn't be matched back to OCR'd words).
_FALLBACK_PATTERN_SCORE = 0.90


def _words_from_tesseract_data(data: dict, offset: int = 0) -> tuple[str, list[dict]]:
    """
    Reconstructs a text string from Tesseract's `image_to_data` word list and
    returns it alongside per-word (start, end, confidence) spans, so field
    values can later be matched back to their real OCR confidence.
    """
    parts: list[str] = []
    words: list[dict] = []
    pos = offset
    prev_line_key: Optional[tuple] = None
    n = len(data.get("text", []))

    for i in range(n):
        word = (data["text"][i] or "").strip()
        try:
            conf = float(data["conf"][i])
        except (TypeError, ValueError):
            conf = -1.0
        if not word or conf < 0:
            continue

        line_key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        if prev_line_key is not None and line_key != prev_line_key:
            parts.append("\n")
            pos += 1
        elif parts:
            parts.append(" ")
            pos += 1

        start = pos
        parts.append(word)
        pos += len(word)
        words.append({"start": start, "end": pos, "conf": conf / 100.0})
        prev_line_key = line_key

    return "".join(parts), words


def _extract_text_from_image(file_path: str) -> tuple[str, list[dict]]:
    """Run Tesseract OCR on an image file. Returns (text, word_confidence_spans)."""
    try:
        import pytesseract
        from PIL import Image

        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
        image = Image.open(file_path)
        data = pytesseract.image_to_data(image, lang=settings.OCR_LANGUAGE, output_type=pytesseract.Output.DICT)
        return _words_from_tesseract_data(data)
    except ImportError:
        logger.warning("pytesseract not available – returning placeholder text")
        return _get_demo_text(), []
    except Exception as exc:
        logger.error(f"OCR extraction failed: {exc}")
        return "", []


def _extract_text_from_pdf(file_path: str) -> tuple[str, list[dict]]:
    """Convert PDF pages to images then OCR each page. Returns (text, word_confidence_spans)."""
    try:
        from pdf2image import convert_from_path
        import pytesseract

        pages = convert_from_path(file_path, dpi=300)
        texts: list[str] = []
        words: list[dict] = []
        pos = 0
        for page in pages:
            data = pytesseract.image_to_data(page, lang=settings.OCR_LANGUAGE, output_type=pytesseract.Output.DICT)
            page_text, page_words = _words_from_tesseract_data(data, offset=pos)
            texts.append(page_text)
            words.extend(page_words)
            pos += len(page_text) + 2  # account for the "\n\n" page separator below

        return "\n\n".join(texts), words
    except Exception as exc:
        logger.error(f"PDF OCR failed: {exc}")
        return _get_demo_text(), []


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


def _confidence_for_span(start: int, end: int, words: list[dict]) -> Optional[float]:
    """Averages real Tesseract word confidences overlapping a matched field span."""
    overlapping = [w["conf"] for w in words if w["end"] > start and w["start"] < end]
    if not overlapping:
        return None
    return sum(overlapping) / len(overlapping)


def _parse_fields(text: str, words: list[dict]) -> list[ExtractedFieldSchema]:
    """Apply regex patterns to raw OCR text and return extracted fields with real confidence."""
    fields: list[ExtractedFieldSchema] = []
    text_lower = text.lower()

    for field_name, patterns in FIELD_PATTERNS.items():
        value: Optional[str] = None
        score = 0.0

        for i, pattern in enumerate(patterns):
            match = re.search(pattern, text_lower, re.IGNORECASE | re.MULTILINE)
            if match:
                value = match.group(1).strip()
                real_conf = _confidence_for_span(match.start(1), match.end(1), words)
                score = real_conf if real_conf is not None else (_FALLBACK_PATTERN_SCORE - (i * 0.08))
                break

        if value:
            fields.append(ExtractedFieldSchema(
                field_name=field_name,
                field_value=value,
                confidence_score=round(min(max(score, 0.0), 1.0), 4),
            ))
        else:
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
        raw_text, words = _get_demo_text(), []
    elif mime_type == "application/pdf":
        raw_text, words = _extract_text_from_pdf(file_path)
    else:
        raw_text, words = _extract_text_from_image(file_path)

    fields = _parse_fields(raw_text, words)
    elapsed = int((time.time() - start) * 1000)

    logger.info(f"Document {document_id}: {len(fields)} fields extracted in {elapsed}ms")

    return OcrResultSchema(
        document_id=document_id,
        raw_text=raw_text,
        extracted_fields=fields,
        processing_time_ms=elapsed,
    )
