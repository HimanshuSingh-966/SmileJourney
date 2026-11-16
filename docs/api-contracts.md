# API Contracts — SmileJourneyAI

Status: contract for the phase-one synchronous pilot. Inference runs on Render. Hugging Face hosts the checkpoint only; private Backblaze B2 stores assessment photos. Firebase Auth identifies users, and the frontend writes completed reports to Firestore using the Firebase Web SDK and owner-scoped Security Rules.

## Authentication

The frontend signs users in through Firebase Auth and sends the Firebase ID token to the API over HTTPS:

```http
Authorization: Bearer <firebase_id_token>
```

The backend verifies the RS256 token signature against Google's published Firebase Secure Token certificates and checks `aud`, `iss`, `exp`, `iat`, `auth_time`, and `sub`. The verified `sub` is the Firebase UID used to scope B2 object keys. The backend does not use Firebase Admin, Google Cloud IAM credentials, or Firestore. It does not accept a UID from a request body or query parameter.

This verification does not check whether a token has been revoked. Revocation checks require privileged Firebase Admin access and are not part of this keyless pilot design. The frontend must require a signed-in user and must never expose ID tokens in logs or persistent storage.

## Health

### `GET /health`

Returns `{ "status": "ok" }` when the API process is running. This does not verify Hugging Face, model, or B2 availability.

## Synchronous assessment

### `POST /api/assessments`

Accepts an authenticated multipart request with a required `photo` file field. The API validates upload size/type, runs inference on Render, calculates the prototype score from the five findings, uploads the photo to private B2, and returns the completed result in this same request. The frontend then persists the result to `users/{uid}/assessments/{assessment_id}` using Firebase Web SDK.

Successful response (`200 OK`):

```json
{
  "assessment_id": "assessment-uuid",
  "status": "complete",
  "score": 80,
  "findings": [
    {"id":"finding-crowding","category":"crowding/alignment","title":"Crowding / Alignment","severity":"mild","description":"Prototype model label: Mild. This experimental image classification may be inaccurate and is not a dental diagnosis."},
    {"id":"finding-gaps","category":"gaps","title":"Interdental Gaps","severity":"none","description":"Prototype model label: No visible issue. This experimental image classification may be inaccurate and is not a dental diagnosis."},
    {"id":"finding-discoloration","category":"discoloration","title":"Tooth Discoloration","severity":"moderate","description":"Prototype model label: Moderate. This experimental image classification may be inaccurate and is not a dental diagnosis."},
    {"id":"finding-gum-line","category":"gum line","title":"Gum Line","severity":"none","description":"Prototype model label: No visible issue. This experimental image classification may be inaccurate and is not a dental diagnosis."},
    {"id":"finding-symmetry","category":"symmetry","title":"Smile Symmetry","severity":"none","description":"Prototype model label: No visible issue. This experimental image classification may be inaccurate and is not a dental diagnosis."}
  ],
  "photo_object_key": "user-photos/firebase-uid/opaque-filename.jpg",
  "created_at": "2026-11-16T10:00:00Z",
  "completed_at": "2026-11-16T10:00:04Z"
}
```

The example findings are illustrative only. The service returns its actual model findings, never these sample values. There is no asynchronous job, polling endpoint, job collection, recommendation, or consultation-question list in this contract. Do not persist a `photo_url`; the response contains only the private B2 key.

## Private photo URL

### `POST /api/photos/signed-url`

Request headers include the Firebase bearer token and `Content-Type: application/json`:

```json
{"photo_object_key":"user-photos/firebase-uid/opaque-filename.jpg"}
```

The backend verifies the token, derives the UID from `sub`, and only signs keys beginning with `user-photos/{verified_uid}/`. It does not query Firestore or trust a client-supplied UID. A different user's key returns `404`.

Successful response (`200 OK`):

```json
{"photo_url":"https://b2.example.com/private-photo?X-Amz-Signature=temporary","expires_in":900}
```

The signed URL is a bearer link while active. Responses use `Cache-Control: private, no-store`; the frontend may use the URL to display the image but must not save it in Firestore, localStorage, or sessionStorage.

## Assessment and storage rules

- Categories: `crowding/alignment`, `gaps`, `discoloration`, `gum line`, `symmetry`.
- Severities: `none`, `mild`, `moderate`, `severe`.
- The model supplies exactly one finding per category and does not supply an overall score. The backend rejects malformed or duplicate findings and calculates the score with `none=0`, `mild=1`, `moderate=2`, `severe=3`; `round(100 * (1 - total_penalty / 15))`.
- The score and model are experimental, have weak held-out performance, and are not clinically validated. Do not present output as diagnosis or treatment guidance.
- The backend uploads source photos to private B2 and returns an owner-scoped `photo_object_key`. Firestore stores that key, not image bytes or any signed/public URL.
- The frontend writes only the fixed assessment document fields validated by `frontend/firestore.rules`. Recommendation `reasons` and consultation question arrays are not persisted in the assessment document because Firestore Rules cannot iterate safely over variable-length nested arrays. They may be added later as individually validated documents under a separate rules contract.
- Firestore path: `users/{uid}/assessments/{assessment_id}`. The owner may read and create; updates and deletes are denied. Rules validate the document shape and owner path, but cannot prove that a score was generated by the API. A client can forge their own assessment record; the backend response is not cryptographically signed.

## Errors

Errors are JSON and use FastAPI `detail`:

```json
{"detail":"A human-readable error message"}
```

Expected statuses include `400` for invalid image data, `401` for missing/invalid token, `404` for a photo key not belonging to the authenticated user, `413` for oversized upload, `502` for invalid model output, and `503` when model, B2, or public token-certificate service is unavailable. Do not include secrets, tokens, image content, or sensitive stack traces in responses or logs.

## Deployment

- Configure `VITE_API_BASE_URL` in the frontend to the HTTPS Render service URL.
- Configure Render CORS with the exact published frontend origin.
- Backend environment variables: `FIREBASE_PROJECT_ID`, B2 endpoint/region/bucket/key values, `HF_MODEL_REPO`, optional private-repo `HF_TOKEN`, `ALLOWED_ORIGINS`, and normal runtime settings. No Firebase service-account JSON or Firestore database ID is used by the backend.
- Hugging Face credentials and B2 credentials remain server-only secrets on Render.
- The client waits for synchronous inference; the frontend applies a request timeout. Cold model downloads or slow CPU inference can exceed that limit. A durable job queue is a future design if synchronous pilot requests prove too slow.
