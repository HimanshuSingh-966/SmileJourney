from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import get_settings


class StorageNotConfigured(RuntimeError):
    pass


class StorageOperationFailed(RuntimeError):
    pass


PHOTO_URL_EXPIRY_SECONDS = 15 * 60


def _get_client():
    settings = get_settings()
    required = (
        settings.b2_endpoint_url,
        settings.b2_bucket_name,
        settings.b2_key_id,
        settings.b2_application_key,
    )
    if not all(required):
        raise StorageNotConfigured("Photo storage is not configured on the backend.")

    return boto3.client(
        "s3",
        endpoint_url=settings.b2_endpoint_url,
        region_name=settings.b2_region,
        aws_access_key_id=settings.b2_key_id,
        aws_secret_access_key=settings.b2_application_key,
    )


def store_photo(uid: str, content: bytes, content_type: str) -> str:
    settings = get_settings()
    if not settings.b2_bucket_name:
        raise StorageNotConfigured("Photo storage is not configured on the backend.")
    extension = "png" if content_type == "image/png" else "jpg"
    object_key = f"user-photos/{uid}/{uuid4().hex}.{extension}"
    client = _get_client()
    try:
        client.put_object(
            Bucket=settings.b2_bucket_name,
            Key=object_key,
            Body=content,
            ContentType=content_type,
            CacheControl="private, no-store",
        )
    except (BotoCoreError, ClientError) as exc:
        raise StorageOperationFailed("The uploaded photo could not be saved to cloud storage.") from exc

    return object_key


def create_photo_download_url(uid: str, object_key: str) -> str:
    """Create a short-lived download URL for an owner's object in the private bucket."""
    settings = get_settings()
    expected_prefix = f"user-photos/{uid}/"
    if not object_key.startswith(expected_prefix) or ".." in object_key.split("/"):
        raise ValueError("Photo object does not belong to the authenticated user.")
    if not settings.b2_bucket_name:
        raise StorageNotConfigured("Photo storage is not configured on the backend.")
    try:
        return _get_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.b2_bucket_name, "Key": object_key},
            ExpiresIn=PHOTO_URL_EXPIRY_SECONDS,
        )
    except (BotoCoreError, ClientError) as exc:
        raise StorageOperationFailed("A temporary photo access URL could not be created.") from exc
