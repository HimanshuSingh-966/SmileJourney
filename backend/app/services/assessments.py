import logging
from datetime import datetime, timezone
from uuid import uuid4

from google.cloud.firestore import Client

from app.services.inference import analyze_photo
from app.services.storage import store_photo

MAX_FINDING_CATEGORIES = {
    "crowding/alignment",
    "gaps",
    "discoloration",
    "gum line",
    "symmetry",
}
VALID_SEVERITIES = {"none", "mild", "moderate", "severe"}
SEVERITY_PENALTIES = {"none": 0, "mild": 1, "moderate": 2, "severe": 3}
MAX_TOTAL_PENALTY = len(MAX_FINDING_CATEGORIES) * max(SEVERITY_PENALTIES.values())
logger = logging.getLogger(__name__)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def calculate_prototype_score(findings: list[dict]) -> int:
    """Calculate the experimental 0–100 score from the five validated severities."""
    total_penalty = sum(SEVERITY_PENALTIES[finding["severity"]] for finding in findings)
    return round(100 * (1 - total_penalty / MAX_TOTAL_PENALTY))


def validate_model_result(result: dict) -> dict:
    """Validate model findings and derive the score on the backend."""
    if not isinstance(result, dict):
        raise ValueError("Model returned an invalid result.")
    if "score" in result:
        raise ValueError("Model output must not include a score; the backend calculates it from finding severities.")
    findings = result.get("findings")
    if not isinstance(findings, list) or len(findings) != 5:
        raise ValueError("Model result must include exactly five findings.")
    categories: set[str] = set()
    for finding in findings:
        if not isinstance(finding, dict):
            raise ValueError("Model returned an invalid finding.")
        category = finding.get("category")
        if category not in MAX_FINDING_CATEGORIES or category in categories:
            raise ValueError("Model findings contain an invalid or duplicate category.")
        categories.add(category)
        for field in ("id", "title", "description"):
            if not isinstance(finding.get(field), str) or not finding[field].strip():
                raise ValueError(f"Model finding is missing {field}.")
        if finding.get("severity") not in VALID_SEVERITIES:
            raise ValueError("Model finding contains an unsupported severity.")
    if categories != MAX_FINDING_CATEGORIES:
        raise ValueError("Model result is missing a required finding category.")

    normalized = {
        "score": calculate_prototype_score(findings),
        "findings": findings,
        "specialist_recommendation": result.get("specialist_recommendation"),
        "consultation_questions": result.get("consultation_questions", []),
    }
    return normalized


def run_assessment(db: Client, uid: str, assessment_id: str, photo: bytes, content_type: str) -> None:
    job_ref = db.document(f"users/{uid}/assessment_jobs/{assessment_id}")
    report_ref = db.document(f"users/{uid}/assessments/{assessment_id}")
    try:
        job_ref.set({"assessment_id": assessment_id, "status": "processing", "updated_at": utc_now()}, merge=True)
        model_result = validate_model_result(analyze_photo(photo, content_type))
        photo_url = store_photo(uid, photo, content_type)
        completed_at = utc_now()
        report = {
            "assessment_id": assessment_id,
            "status": "complete",
            **model_result,
            "photo_url": photo_url,
            "created_at": job_ref.get().to_dict().get("created_at", completed_at),
            "completed_at": completed_at,
        }
        # Backend Admin SDK owns all writes to completed assessment records.
        report_ref.set(report)
        job_ref.set({"assessment_id": assessment_id, "status": "complete", "updated_at": completed_at}, merge=True)
    except Exception:
        # Do not expose internal errors or credentials through the polling endpoint.
        logger.exception("Assessment processing failed (assessment_id=%s)", assessment_id)
        job_ref.set(
            {
                "assessment_id": assessment_id,
                "status": "failed",
                "error": "The assessment could not be completed. Please try again later.",
                "updated_at": utc_now(),
            },
            merge=True,
        )


def create_assessment_job(db: Client, uid: str) -> str:
    assessment_id = str(uuid4())
    now = utc_now()
    db.document(f"users/{uid}/assessment_jobs/{assessment_id}").set(
        {"assessment_id": assessment_id, "status": "processing", "created_at": now, "updated_at": now}
    )
    return assessment_id


def get_assessment_status(db: Client, uid: str, assessment_id: str) -> dict | None:
    report = db.document(f"users/{uid}/assessments/{assessment_id}").get()
    if report.exists:
        return report.to_dict()
    job = db.document(f"users/{uid}/assessment_jobs/{assessment_id}").get()
    return job.to_dict() if job.exists else None
