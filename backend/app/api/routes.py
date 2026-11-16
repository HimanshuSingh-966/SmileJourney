import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from starlette.concurrency import run_in_threadpool

from app.api.dependencies import authenticated_uid
from app.core.config import get_settings
from app.schemas import CompletedAssessment, SignedPhotoUrlRequest, SignedPhotoUrlResponse
from app.services.assessments import create_completed_assessment
from app.services.image_validation import InvalidImage, validate_image
from app.services.inference import InferenceUnavailable
from app.services.storage import (
    StorageNotConfigured,
    StorageOperationFailed,
    create_photo_download_url,
)

router = APIRouter()
UserId = Annotated[str, Depends(authenticated_uid)]
logger = logging.getLogger(__name__)


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post(
    "/api/assessments",
    response_model=CompletedAssessment,
    status_code=status.HTTP_200_OK,
)
async def submit_assessment(
    uid: UserId,
    photo: Annotated[UploadFile, File()],
    response: Response,
) -> CompletedAssessment:
    response.headers["Cache-Control"] = "private, no-store"
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

    try:
        # Model loading/inference and B2 operations are blocking; keep them off
        # FastAPI's event loop while returning the completed result in this call.
        return await run_in_threadpool(create_completed_assessment, uid, content, content_type)
    except InferenceUnavailable as exc:
        logger.warning("Assessment inference unavailable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The assessment model is temporarily unavailable. Please try again.",
        ) from exc
    except StorageNotConfigured as exc:
        logger.error("Private photo storage is not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Private photo storage is not configured on the backend.",
        ) from exc
    except StorageOperationFailed as exc:
        logger.exception("Assessment photo could not be stored in B2.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Private photo storage is temporarily unavailable. Please try again.",
        ) from exc
    except ValueError as exc:
        logger.exception("The model returned an invalid assessment result.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The model returned an invalid assessment result.",
        ) from exc
    except Exception as exc:
        logger.exception("Assessment processing failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The assessment could not be completed. Please try again later.",
        ) from exc


@router.post("/api/photos/signed-url", response_model=SignedPhotoUrlResponse)
def signed_photo_url(
    body: SignedPhotoUrlRequest,
    uid: UserId,
    response: Response,
) -> SignedPhotoUrlResponse:
    response.headers["Cache-Control"] = "private, no-store"
    try:
        photo_url = create_photo_download_url(uid, body.photo_object_key)
    except ValueError as exc:
        # Ownership is derived from the verified token UID and checked against
        # the object-key prefix. Never accept a UID from the client.
        raise HTTPException(status_code=404, detail="Assessment photo was not found.") from exc
    except StorageNotConfigured as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Private photo storage is not configured on the backend.",
        ) from exc
    except StorageOperationFailed as exc:
        logger.exception("A signed B2 photo URL could not be created.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Private photo storage is temporarily unavailable. Please try again.",
        ) from exc
    return SignedPhotoUrlResponse(photo_url=photo_url, expires_in=15 * 60)
