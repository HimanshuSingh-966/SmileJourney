# Firebase Firestore Schema — SmileJourneyAI

Status: documents the agreed Phase 1 Firestore layout. Assessment documents are written by the Python backend using Firebase Admin. Profile and consultation-question documents are currently written by the signed-in frontend. Rules and runtime validation must stay aligned with these fields.

## Database

Use the Firebase project's configured Firestore database ID. The backend must use the same database ID as the frontend.

## `users/{uid}`

Profile and dashboard state. Firebase Auth owns identity; `{uid}` is the verified Firebase UID.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string | yes | Must equal the document UID. |
| `email` | string | yes | From Firebase Auth. |
| `name` | string | no | Display name. |
| `age` | string | no | Current frontend and rules use a string. |
| `intent` | string | no | Optional user-entered intent. |
| `ritualDay` | number | no | Legacy dashboard field; not an assessment result. |
| `harmonyScore` | number | no | Cached latest score for dashboard display; source of truth is the latest assessment document. |
| `createdAt` | ISO 8601 string | no | Current frontend format. |
| `updatedAt` | ISO 8601 string | no | Current frontend format. |

## `users/{uid}/assessment_jobs/{assessmentId}`

Backend-owned processing status. This is not a report and must not be used as one.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `assessment_id` | string | yes | Same value as the Firestore document ID. |
| `status` | string | yes | `processing`, `complete`, or `failed`. |
| `error` | string | no | Safe user-facing error for failed jobs; no secrets or stack traces. |
| `created_at` | ISO 8601 string | yes | Job creation time. |
| `updated_at` | ISO 8601 string | yes | Most recent status change. |

The backend must derive `{uid}` from a verified Firebase ID token. The browser cannot read or write job documents directly unless separately authorized by a future contract.

## `users/{uid}/assessments/{assessmentId}`

One complete result per successfully completed assessment. The document ID must equal `assessment_id`. Backend only writes; authenticated owner may read.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `assessment_id` | string | yes | Must equal the Firestore document ID. |
| `status` | string | yes | Always `complete` for documents in this collection. Failed/processing states stay in `assessment_jobs`. |
| `score` | integer | yes | 0–100; use only when supported by the validated model/rubric. |
| `findings` | array of 5 objects | yes | Exactly one for each canonical category. |
| `photo_url` | string | yes | URL for the stored Backblaze image, not a data URL or image bytes. |
| `specialist_recommendation` | object or null | no | Omit/null until expert-approved routing is available. |
| `consultation_questions` | array | no | Only if supplied by an approved backend flow. |
| `created_at` | ISO 8601 string | yes | Assessment submission time. |
| `completed_at` | ISO 8601 string | no | Completion time. |

### Finding object

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string | yes | Unique within the assessment. |
| `category` | string | yes | `crowding/alignment`, `gaps`, `discoloration`, `gum line`, or `symmetry`. |
| `title` | string | yes | Plain-language display title. |
| `severity` | string | yes | Exactly `none`, `mild`, `moderate`, or `severe`; `none` means no visible issue. These are experimental image observations, not clinical diagnoses. |
| `description` | string | yes | Plain-language explanation; never fabricate if the model cannot assess. |

### Prototype score

The backend calculates the experimental score from all five finding severities. Map `none=0`, `mild=1`, `moderate=2`, and `severe=3`; sum the five values as `total_penalty`; then calculate `round(100 * (1 - total_penalty / 15))`. Store and return the resulting integer from 0 to 100. The frontend only displays this score. This formula is not clinically validated and must not be presented as a diagnosis or a measure of dental health.

## `users/{uid}/milestones/{milestoneId}` (legacy)

Older frontend-written history. Read-only for the frontend going forward; do not copy/migrate records automatically. Legacy records may contain fields such as `id`, `score`, `photoUrl`, `date`, `timestamp`, `dayLabel`, `title`, `description`, `tags`, and `assessmentId`. These are photo/score checkpoints, not complete verified reports.

## `users/{uid}/questions/{questionId}`

User-owned consultation checklist. The current frontend can create/update questions for the signed-in owner.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string | yes | Same value as document ID. |
| `userId` | string | yes | Must equal authenticated UID. |
| `question` | string | yes | User-facing question. |
| `explanation` | string | no | Plain-language context. |
| `checked` | boolean | yes | User checklist state. |
| `createdAt` | ISO 8601 string | no | Current frontend format. |

## Training data separation

The labeled training dataset is not stored in user Firestore subcollections. Keep training images and labels in separate, access-controlled storage. Never join/export labeled training data together with real user photos or assessment records.
