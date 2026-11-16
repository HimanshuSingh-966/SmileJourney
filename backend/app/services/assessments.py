from datetime import datetime, timezone
from uuid import uuid4

from app.schemas import CompletedAssessment
from app.services.inference import analyze_photo
from app.services.storage import store_photo

VALID_CATEGORIES = {
    "crowding/alignment",
    "gaps",
    "discoloration",
    "gum line",
    "symmetry",
}
VALID_SEVERITIES = {"none", "mild", "moderate", "severe"}
SEVERITY_PENALTIES = {"none": 0, "mild": 1, "moderate": 2, "severe": 3}
MAX_TOTAL_PENALTY = len(VALID_CATEGORIES) * max(SEVERITY_PENALTIES.values())


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def calculate_prototype_score(findings: list[dict]) -> int:
    """Calculate the experimental 0–100 score from the five predicted severities."""
    total_penalty = sum(SEVERITY_PENALTIES[finding["severity"]] for finding in findings)
    return round(100 * (1 - total_penalty / MAX_TOTAL_PENALTY))


def validate_model_result(result: dict) -> dict:
    """Validate the model's five findings and derive the score on the backend."""
    if not isinstance(result, dict) or "score" in result:
        raise ValueError("Model output must be a findings object without a score.")
    findings = result.get("findings")
    if not isinstance(findings, list) or len(findings) != 5:
        raise ValueError("Model result must include exactly five findings.")

    categories: set[str] = set()
    normalized_findings: list[dict] = []
    for finding in findings:
        if not isinstance(finding, dict):
            raise ValueError("Model returned an invalid finding.")
        category = finding.get("category")
        if not isinstance(category, str) or category not in VALID_CATEGORIES or category in categories:
            raise ValueError("Model findings contain an invalid or duplicate category.")
        categories.add(category)
        for field in ("id", "title", "description"):
            value = finding.get(field)
            max_length = {"id": 128, "title": 200, "description": 1000}[field]
            if not isinstance(value, str) or not value.strip() or len(value.strip()) > max_length:
                raise ValueError(f"Model finding is missing {field}.")
        severity = finding.get("severity")
        if not isinstance(severity, str) or severity not in VALID_SEVERITIES:
            raise ValueError("Model finding contains an unsupported severity.")
        normalized_findings.append(
            {
                "id": finding["id"].strip(),
                "category": category,
                "title": finding["title"].strip(),
                "severity": severity,
                "description": finding["description"].strip(),
            }
        )
    if categories != VALID_CATEGORIES:
        raise ValueError("Model result is missing a required finding category.")

    return {
        "score": calculate_prototype_score(normalized_findings),
        "findings": normalized_findings,
    }


def create_completed_assessment(uid: str, photo: bytes, content_type: str) -> CompletedAssessment:
    """Run inference, store the private photo, and return a Firestore-ready result.

    Firestore persistence is performed by the authenticated frontend client, not
    this backend. The result intentionally excludes unbounded optional lists.
    """
    created_at = utc_now()
    model_result = validate_model_result(analyze_photo(photo, content_type))
    photo_object_key = store_photo(uid, photo, content_type)
    completed_at = utc_now()
    return CompletedAssessment(
        assessment_id=str(uuid4()),
        status="complete",
        **model_result,
        photo_object_key=photo_object_key,
        created_at=created_at,
        completed_at=completed_at,
    )
