"""
Validation Service – rule-based document validation with extensible architecture.

Design intent: Each rule is an independent function returning a list of issues.
New rules can be added without modifying existing ones (Open/Closed Principle).
When an LLM is available, `_llm_validate` replaces or supplements rule-based checks.
"""
import re
from datetime import datetime
from typing import Optional

from loguru import logger

from app.models.schemas import (
    ExtractedFieldSchema,
    IssueType,
    IssueSeverity,
    ValidationIssueSchema,
    ValidationResultSchema,
)

# Zorunlu alanlar belge tipine göre değişir – örn. konşimento numarası bir
# faturada asla bulunmaz, bu yüzden her belge tipinde onu zorunlu saymak
# güven puanını yapay olarak düşürüyordu.
REQUIRED_FIELDS_BY_TYPE: dict[str, dict[str, IssueSeverity]] = {
    "FATURA": {
        "INVOICE_NUMBER": IssueSeverity.HIGH,
        "DATE": IssueSeverity.HIGH,
        "EXPORTER": IssueSeverity.HIGH,
        "IMPORTER": IssueSeverity.HIGH,
        "CURRENCY": IssueSeverity.MEDIUM,
        "AMOUNT": IssueSeverity.HIGH,
    },
    "KONSIMENTO": {
        "BILL_OF_LADING_NUMBER": IssueSeverity.HIGH,
        "EXPORTER": IssueSeverity.HIGH,
        "IMPORTER": IssueSeverity.HIGH,
        "PORT_OF_LOADING": IssueSeverity.MEDIUM,
        "PORT_OF_DISCHARGE": IssueSeverity.MEDIUM,
    },
    "AWB": {
        "BILL_OF_LADING_NUMBER": IssueSeverity.HIGH,
        "EXPORTER": IssueSeverity.HIGH,
        "IMPORTER": IssueSeverity.HIGH,
    },
}

DEFAULT_REQUIRED_FIELDS: dict[str, IssueSeverity] = REQUIRED_FIELDS_BY_TYPE["FATURA"]

VALID_CURRENCIES = {"USD", "EUR", "GBP", "JPY", "CNY", "CHF", "AUD", "CAD", "SGD", "HKD"}

DATE_FORMATS = [
    "%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d", "%d-%m-%Y",
    "%d.%m.%Y", "%Y.%m.%d",
    "%B %d, %Y", "%d %B %Y",
]


def _rule_missing_fields(fields: list[ExtractedFieldSchema], document_type: str) -> list[ValidationIssueSchema]:
    issues: list[ValidationIssueSchema] = []
    field_map = {f.field_name: f for f in fields}
    required_fields = REQUIRED_FIELDS_BY_TYPE.get(document_type.upper(), DEFAULT_REQUIRED_FIELDS)

    for field_name, severity in required_fields.items():
        field = field_map.get(field_name)
        if not field or not field.field_value:
            issues.append(ValidationIssueSchema(
                issue_type=IssueType.MISSING_FIELD,
                severity=severity,
                field_name=field_name,
                description=f"Required field '{field_name.replace('_', ' ').title()}' is missing or could not be extracted.",
            ))

    return issues


def _rule_invalid_date(fields: list[ExtractedFieldSchema]) -> list[ValidationIssueSchema]:
    issues: list[ValidationIssueSchema] = []
    field_map = {f.field_name: f for f in fields}

    date_field = field_map.get("DATE")
    if not date_field or not date_field.field_value:
        return issues

    parsed = None
    for fmt in DATE_FORMATS:
        try:
            parsed = datetime.strptime(date_field.field_value.strip(), fmt)
            break
        except ValueError:
            continue

    if parsed is None:
        issues.append(ValidationIssueSchema(
            issue_type=IssueType.INVALID_DATE,
            severity=IssueSeverity.HIGH,
            field_name="DATE",
            description=f"Date value '{date_field.field_value}' is not in a recognised format.",
        ))
    elif parsed > datetime.now():
        issues.append(ValidationIssueSchema(
            issue_type=IssueType.INVALID_DATE,
            severity=IssueSeverity.MEDIUM,
            field_name="DATE",
            description=f"Document date '{date_field.field_value}' is in the future.",
        ))

    return issues


def _rule_currency_validation(fields: list[ExtractedFieldSchema]) -> list[ValidationIssueSchema]:
    issues: list[ValidationIssueSchema] = []
    field_map = {f.field_name: f for f in fields}

    currency_field = field_map.get("CURRENCY")
    if currency_field and currency_field.field_value:
        if currency_field.field_value.upper() not in VALID_CURRENCIES:
            issues.append(ValidationIssueSchema(
                issue_type=IssueType.CURRENCY_MISMATCH,
                severity=IssueSeverity.HIGH,
                field_name="CURRENCY",
                description=f"Currency '{currency_field.field_value}' is not a recognised trade finance currency.",
            ))

    return issues


def _rule_amount_format(fields: list[ExtractedFieldSchema]) -> list[ValidationIssueSchema]:
    issues: list[ValidationIssueSchema] = []
    field_map = {f.field_name: f for f in fields}

    amount_field = field_map.get("AMOUNT")
    if amount_field and amount_field.field_value:
        # Remove commas, try parse as float
        clean = amount_field.field_value.replace(",", "").replace(" ", "")
        try:
            value = float(clean)
            if value <= 0:
                issues.append(ValidationIssueSchema(
                    issue_type=IssueType.AMOUNT_MISMATCH,
                    severity=IssueSeverity.HIGH,
                    field_name="AMOUNT",
                    description="Amount must be a positive value.",
                ))
        except ValueError:
            issues.append(ValidationIssueSchema(
                issue_type=IssueType.AMOUNT_MISMATCH,
                severity=IssueSeverity.HIGH,
                field_name="AMOUNT",
                description=f"Amount value '{amount_field.field_value}' is not a valid number.",
            ))

    return issues


def _rule_container_number_format(fields: list[ExtractedFieldSchema]) -> list[ValidationIssueSchema]:
    issues: list[ValidationIssueSchema] = []
    field_map = {f.field_name: f for f in fields}

    container_field = field_map.get("CONTAINER_NUMBER")
    if container_field and container_field.field_value:
        # ISO 6346 format: 4 letters + 7 digits
        if not re.match(r'^[A-Z]{4}\d{7}$', container_field.field_value.upper().replace(" ", "")):
            issues.append(ValidationIssueSchema(
                issue_type=IssueType.DOCUMENT_INCONSISTENCY,
                severity=IssueSeverity.LOW,
                field_name="CONTAINER_NUMBER",
                description=f"Container number '{container_field.field_value}' does not match ISO 6346 format (e.g. MSCU1234567).",
            ))

    return issues


def _calculate_confidence(issues: list[ValidationIssueSchema], fields: list[ExtractedFieldSchema]) -> int:
    """Calculate overall confidence score (0-100) based on issues and field confidence."""
    base_score = 100

    penalty_map = {IssueSeverity.HIGH: 20, IssueSeverity.MEDIUM: 10, IssueSeverity.LOW: 5}
    for issue in issues:
        base_score -= penalty_map.get(issue.severity, 5)

    # Average field confidence adjustment – only over fields that were actually
    # extracted. Fields irrelevant to this document type (e.g. BILL_OF_LADING_NUMBER
    # on an invoice) are never populated and shouldn't drag the score down; missing
    # *required* fields are already penalised above via MISSING_FIELD issues.
    populated = [f for f in fields if f.field_value]
    if populated:
        avg_field_confidence = sum(f.confidence_score for f in populated) / len(populated)
        base_score = int(base_score * avg_field_confidence)

    return max(0, min(100, base_score))


def validate_document(document_id: int, fields: list[ExtractedFieldSchema], document_type: str = "FATURA") -> ValidationResultSchema:
    """Run all validation rules and return a consolidated ValidationResult."""
    all_issues: list[ValidationIssueSchema] = []

    field_rules = [
        _rule_invalid_date,
        _rule_currency_validation,
        _rule_amount_format,
        _rule_container_number_format,
    ]

    try:
        all_issues.extend(_rule_missing_fields(fields, document_type))
    except Exception as exc:
        logger.error(f"Rule _rule_missing_fields failed: {exc}")

    for rule in field_rules:
        try:
            all_issues.extend(rule(fields))
        except Exception as exc:
            logger.error(f"Rule {rule.__name__} failed: {exc}")

    confidence = _calculate_confidence(all_issues, fields)

    high_issues = [i for i in all_issues if i.severity == IssueSeverity.HIGH]
    medium_issues = [i for i in all_issues if i.severity == IssueSeverity.MEDIUM]

    if high_issues:
        overall_status = "FAILED"
    elif medium_issues:
        overall_status = "WARNING"
    else:
        overall_status = "PASSED"

    logger.info(
        f"Document {document_id}: status={overall_status}, score={confidence}, "
        f"issues={len(all_issues)} (H:{len(high_issues)}/M:{len(medium_issues)})"
    )

    return ValidationResultSchema(
        document_id=document_id,
        overall_status=overall_status,
        confidence_score=confidence,
        issues=all_issues,
        notes=f"Validated {len(fields)} extracted fields against {len(field_rules) + 1} rule sets.",
    )
