from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from google.cloud.firestore import Client

from app.api.dependencies import authenticated_uid
from app.core.config import get_settings
from app.core.firebase import get_firestore_client
from app.schemas import AssessmentAccepted, AssessmentStatusResponse
from app.services.assessments import create_assessment_job, get_assessment_status, run_assessment
from app.services.image_validation import InvalidImage, validate_image

router = APIRouter()
Firestore = Annotated[Client, Depends(get_firestore_client)]
UserId = Annotated[str, Depends(authenticated_uid)]


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/api/assessments", status_code=status.HTTP_202_ACCEPTED)
async def submit_assessment(
    background_tasks: BackgroundTasks,
    db: Firestore,
    uid: UserId,
    photo: Annotated[UploadFile, File()],
) -> AssessmentAccepted:
    settings = get_settings()
    content_type = (photo.content_type or "").lower()
    content = await photo.read(settings.max_upload_bytes + 1)
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded photo is empty.")
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="The photo exceeds the maximum upload size.")
    try:
        validate_image(content, content_type)
    except InvalidImage as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    assessment_id = create_assessment_job(db, uid)
    background_tasks.add_task(run_assessment, db, uid, assessment_id, content, content_type)
    return AssessmentAccepted(assessment_id=assessment_id, status="processing", message="Assessment queued.")


@router.get("/api/assessments/{assessment_id}", response_model=AssessmentStatusResponse)
def read_assessment(assessment_id: str, db: Firestore, uid: UserId) -> dict:
    result = get_assessment_status(db, uid, assessment_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Assessment was not found.")
    return result
