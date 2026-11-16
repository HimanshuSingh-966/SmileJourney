"""Verify Firebase Auth ID tokens without Firebase Admin credentials.

The Firebase Web SDK issues RS256 ID tokens. This module verifies their
signature against Google's published Secure Token certificates and checks the
standard Firebase issuer, audience, expiry, and subject claims. It does not
call Firebase Admin, Firestore, or any Google Cloud IAM API.

This verifies token authenticity but does not check token revocation. Revocation
checks require a privileged Firebase Admin call, which this deployment avoids.
"""

import json
import re
import threading
import time
from urllib.error import URLError
from urllib.request import Request, urlopen

import jwt
from cryptography import x509
from fastapi import HTTPException, status
from jwt import InvalidKeyError, InvalidTokenError

from app.core.config import get_settings

_CERTIFICATES_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
_cache_lock = threading.Lock()
_cached_certificates: dict[str, str] = {}
_certificates_expire_at = 0.0


class CertificateServiceUnavailable(RuntimeError):
    """Raised when Firebase's public signing certificates cannot be fetched."""


def _load_certificates(force_refresh: bool = False) -> dict[str, str]:
    global _cached_certificates, _certificates_expire_at
    with _cache_lock:
        if not force_refresh and _cached_certificates and time.time() < _certificates_expire_at:
            return _cached_certificates

        request = Request(_CERTIFICATES_URL, headers={"Accept": "application/json"})
        try:
            with urlopen(request, timeout=5) as response:
                payload = json.loads(response.read().decode("utf-8"))
                cache_control = response.headers.get("Cache-Control", "")
        except (URLError, TimeoutError, OSError, ValueError) as exc:
            raise CertificateServiceUnavailable from exc

        if not isinstance(payload, dict) or not payload or not all(
            isinstance(kid, str) and isinstance(cert, str) for kid, cert in payload.items()
        ):
            raise CertificateServiceUnavailable("Firebase returned invalid signing certificates.")

        max_age_match = re.search(r"(?:^|,)\s*max-age=(\d+)", cache_control, flags=re.IGNORECASE)
        max_age = int(max_age_match.group(1)) if max_age_match else 300
        _cached_certificates = payload
        _certificates_expire_at = time.time() + max(1, min(max_age, 24 * 60 * 60))
        return _cached_certificates


def verify_firebase_token(token: str) -> str:
    """Verify a Firebase ID token and return its UID (the token's `sub`)."""
    project_id = get_settings().firebase_project_id
    if not project_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase project ID is not configured on the backend.",
        )

    try:
        header = jwt.get_unverified_header(token)
        key_id = header.get("kid")
        if header.get("alg") != "RS256" or not isinstance(key_id, str):
            raise InvalidTokenError("Unsupported token header.")

        certificates = _load_certificates()
        certificate = certificates.get(key_id)
        if certificate is None:
            certificates = _load_certificates(force_refresh=True)
            certificate = certificates.get(key_id)
        if certificate is None:
            raise InvalidTokenError("Unknown Firebase signing key.")

        # Google's Secure Token endpoint publishes X.509 certificates, while
        # PyJWT expects a parsed public key for RS256 verification.
        public_key = x509.load_pem_x509_certificate(certificate.encode("utf-8")).public_key()
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}",
            leeway=30,
            options={"require": ["exp", "iat", "auth_time", "aud", "iss", "sub"]},
        )
        uid = claims.get("sub")
        auth_time = claims.get("auth_time")
        if (
            not isinstance(uid, str)
            or not uid
            or isinstance(auth_time, bool)
            or not isinstance(auth_time, int)
        ):
            raise InvalidTokenError("Missing Firebase UID or auth_time claim.")
        if auth_time > time.time() + 30:
            raise InvalidTokenError("Firebase auth_time is in the future.")
        return uid
    except CertificateServiceUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase token verification is temporarily unavailable.",
        ) from exc
    except (InvalidKeyError, InvalidTokenError, TypeError, ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase authentication token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
