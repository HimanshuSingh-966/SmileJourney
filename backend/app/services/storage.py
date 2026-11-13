from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import get_settings


class StorageNotConfigured(RuntimeError):
    pass


def store_photo(uid: str, content: bytes, content_type: str) -> str:
    settings = get_settings()
    required = (
        settings.b2_endpoint_url,
        settings.b2_bucket_name,
        settings.b2_key_id,
        settings.b2_application_key,
        settings.b2_public_base_url,
    )
    if not all(required):
        raise StorageNotConfigured("Photo storage is not configured on the backend.")

    extension = "png" if content_type == "image/png" else "jpg"
    object_key = f"user-photos/{uid}/{uuid4().hex}.{extension}"
    client = boto3.client(
        "s3",
        endpoint_url=settings.b2_endpoint_url,
        region_name=settings.b2_region,
        aws_access_key_id=settings.b2_key_id,
        aws_secret_access_key=settings.b2_application_key,
    )
    try:
        client.put_object(
            Bucket=settings.b2_bucket_name,
            Key=object_key,
            Body=content,
            ContentType=content_type,
        )
    except (BotoCoreError, ClientError) as exc:
        raise RuntimeError("The uploaded photo could not be saved to cloud storage.") from exc

    return f"{settings.b2_public_base_url.rstrip('/')}/{object_key}"
