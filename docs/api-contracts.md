# API Contracts — SmileJourneyAI

Status: agreed frontend/backend contract; endpoints are not implemented yet.

This contract follows the existing React + Vite + TypeScript frontend. The browser sends captured photos to the Python API. Firebase Authentication remains responsible for sign-in; the API verifies Firebase ID tokens. The backend stores completed assessment records in the user's Firestore `assessments` subcollection; the frontend reads these records and does not write them.

## Authentication

The frontend signs users in through Firebase Auth. There are no backend signup or login endpoints.

All assessment endpoints require:

```http
Authorization: Bearer <firebase_id_token>
```

The backend must verify the token with Firebase Admin and use the verified Firebase UID to authorize the request. It must not trust a UID supplied in a query parameter or request body. The frontend requires sign-in before photo capture/upload; a missing or invalid token must be rejected.

## Health

### `GET /health`

Used by the frontend's backend connection check. Return a JSON response and a successful HTTP status when the API is ready to accept requests.

Example:

```json
{ "status": "ok" }
```

## Assessments

### `POST /api/assessments`

Uploads a smile photo and starts an asynchronous assessment.

Request: `multipart/form-data` with a required `photo` file field and the Firebase bearer token.

Response (`202 Accepted`):

```json
{
  "assessment_id": "assessment-uuid",
  "status": "processing",
  "message": "Assessment queued."
}
```

### `GET /api/assessments/{assessment_id}`

Polls for processing status and, when complete, returns the report. The backend must verify that the authenticated Firebase UID owns or is authorized to access the assessment.

Processing response (`200 OK`):

```json
{
  "assessment_id": "assessment-uuid",
  "status": "processing"
}
```

Completed response (`200 OK`):

```json
{
  "assessment_id": "assessment-uuid",
  "status": "complete",
  "score": 80,
  "photo_url": "https://images.example.com/user-photos/uid/photo.jpg",
  "findings": [
    {
      "id": "finding-crowding",
      "category": "crowding/alignment",
      "title": "Crowding / Alignment",
      "severity": "mild",
      "description": "Your upper front teeth appear slightly crowded."
    },
    {
      "id": "finding-gaps",
      "category": "gaps",
      "title": "Interdental Gaps",
      "severity": "none",
      "description": "No noticeable gaps were observed in this photo."
    },
    {
      "id": "finding-discoloration",
      "category": "discoloration",
      "title": "Tooth Discoloration",
      "severity": "moderate",
      "description": "Some yellowing is visible on the front teeth."
    },
    {
      "id": "finding-gum-line",
      "category": "gum line",
      "title": "Gum Line",
      "severity": "none",
      "description": "The visible gum line appears even in this photo."
    },
    {
      "id": "finding-symmetry",
      "category": "symmetry",
      "title": "Smile Symmetry",
      "severity": "none",
      "description": "Your smile appears balanced from side to side in this photo."
    }
  ],
  "specialist_recommendation": {
    "primarySpecialist": "Orthodontist",
    "coSpecialist": null,
    "notes": "An orthodontist can discuss options for tooth alignment.",
    "reasons": ["Crowding / alignment was observed."],
    "discipline": "Orthodontics"
  },
  "consultation_questions": [],
  "created_at": "2026-09-10T10:00:00Z",
  "completed_at": "2026-09-10T10:00:04Z"
}
```

Failed response (`200 OK`):

```json
{
  "assessment_id": "assessment-uuid",
  "status": "failed",
  "error": "The image could not be assessed. Please try another photo."
}
```

### Response field rules

- `status` is `processing`, `pending`, `complete`, or `failed`. The frontend polls until it receives `complete` or `failed`.
- A completed result must include `assessment_id`, `status`, `score` (integer from 0 to 100), a valid `photo_url`, `created_at` as an ISO 8601 timestamp, and exactly one finding for each of the five supported categories.
- `category` must be one of `crowding/alignment`, `gaps`, `discoloration`, `gum line`, or `symmetry`.
- `severity` must use exactly one of the current frontend values: `none`, `mild`, `moderate`, or `severe`. `none` is displayed as “No visible issue.” Do not return the older labels `optimal`, `good`, or `attention`.
- The prototype score is calculated by the backend from the five predicted category severities. Map `none=0`, `mild=1`, `moderate=2`, and `severe=3`; let `total_penalty` be the sum across the five findings; calculate `score = round(100 * (1 - total_penalty / 15))`. The resulting integer is in `[0, 100]`. The frontend displays the backend-provided score and does not calculate it.
- The model inference result supplies the five findings (including one severity per category), but must not supply an overall `score`. The backend rejects model results containing a `score` field and computes the score only after validating all five findings.
- This scoring formula and the model output are experimental and not clinically validated. Do not describe the score or severity as a diagnosis or clinical assessment.
- Each finding must include a plain-language `title` and `description`. Do not return made-up findings, scores, confidence values, or descriptions when the model cannot assess an item. If a valid full result cannot be produced, return `status: "failed"` with an explanation.
- `specialist_recommendation` may be `null` or omitted until the routing rules have dental-expert sign-off. When present, it may include `primarySpecialist`, `coSpecialist`, `notes`, `reasons`, and `discipline`. Do not add confidence percentages, provider listings, or treatment timelines.
- `consultation_questions` is optional. If returned, each item has `id`, `question`, `explanation`, and `checked` fields.
- Timestamps use ISO 8601 format. `score`, findings, recommendation, and timestamps must come from the backend assessment result; the frontend must not synthesize missing values.

## Assessment history and storage

The frontend uses Firebase Firestore for the signed-in user's profile, questions, and assessment history. The backend writes processing state to `users/{uid}/assessment_jobs/{assessment_id}` and completed reports to `users/{uid}/assessments/{assessment_id}`. See `schema.md`. There is no list endpoint because the frontend subscribes to the user's Firestore `assessments` subcollection. The backend must derive `{uid}` from the verified Firebase token and must never trust a client-supplied user ID.

The frontend displays the completed API response immediately and reads persisted history from Firestore. It must not create, update, or delete assessment documents. Firebase Admin bypasses Firestore rules, so the backend is responsible for authorization and ownership checks on every write.

## Errors

Return a JSON error body. The frontend understands FastAPI-style `detail` and the `message` or `error` fields:

```json
{
  "detail": "A human-readable error message",
  "code": "assessment_not_found"
}
```

Use appropriate HTTP statuses, including `400` for invalid uploads, `401` for missing/invalid authentication, `403` for access to another user's assessment, `404` for an unknown assessment, `413` for an oversized photo, and `500` for unexpected server errors. Do not include secrets, tokens, or sensitive stack traces in error responses.

## Deployment and security

- The frontend calls the backend over HTTPS using `VITE_API_BASE_URL`.
- Configure backend CORS to allow the published SmileJourneyAI frontend origin. Keep the allowed origin configurable for development and production.
- Hugging Face credentials and other server secrets belong in Render environment variables, never in frontend code or this repository.
- Enforce upload size and image type limits on the backend. Do not log photo contents or Firebase ID tokens.
- Analysis is asynchronous: image processing can exceed a single request, so the client polls `GET /api/assessments/{assessment_id}`.
- Correction-preview/simulation endpoints are out of scope for Phase 1.
