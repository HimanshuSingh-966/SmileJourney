import json
from functools import lru_cache

import firebase_admin
from firebase_admin import auth, credentials, firestore
from fastapi import HTTPException, status

from app.core.config import get_settings


@lru_cache
def get_firebase_app():
    settings = get_settings()
    if firebase_admin._apps:
        return firebase_admin.get_app()

    if settings.firebase_service_account_json:
        try:
            service_account = json.loads(settings.firebase_service_account_json)
        except json.JSONDecodeError as exc:
            raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON.") from exc
        credential = credentials.Certificate(service_account)
    else:
        # Supports Render workload identity or local GOOGLE_APPLICATION_CREDENTIALS.
        credential = credentials.ApplicationDefault()

    options = {"projectId": settings.firebase_project_id} if settings.firebase_project_id else None
    return firebase_admin.initialize_app(credential, options=options)


def get_firestore_client():
    settings = get_settings()
    app = get_firebase_app()
    return firestore.client(app=app, database_id=settings.firestore_database_id)


def verify_firebase_token(token: str) -> str:
    try:
        app = get_firebase_app()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase authentication is not configured on the backend.",
        ) from exc
    try:
        decoded = auth.verify_id_token(token, app=app, check_revoked=True)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase authentication token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    uid = decoded.get("uid")
    if not isinstance(uid, str) or not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firebase token has no user ID.")
    return uid
