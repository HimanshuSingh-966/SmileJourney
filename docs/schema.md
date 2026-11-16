# Firebase Firestore Schema — SmileJourneyAI

Status: phase-one assessment documents are written by the signed-in frontend through the Firebase Web SDK. Firestore Security Rules restrict access to the owning UID and allow report creation only. Render does not use Firebase Admin or connect to Firestore. Keep this document, `frontend/firestore.rules`, `frontend/src/utils/assessmentValidation.ts`, and `buildFirestoreAssessmentRecord` aligned.

## Database

The frontend uses the named Firestore database configured in `frontend/firebase-applet-config.json`. The Render backend does not need the Firestore database ID.

## `users/{uid}`

Profile and dashboard state. Firebase Auth owns identity; `{uid}` is the authenticated Firebase UID.

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

## `users/{uid}/assessments/{assessmentId}`

One completed result per successful assessment. The document ID must equal `assessment_id`. The signed-in owner can read and create; update and delete are denied. Render returns the inference result but does not write this document.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `assessment_id` | string | yes | Must equal the Firestore document ID. |
| `status` | string | yes | Always `complete`. |
| `score` | integer | yes | 0–100; experimental prototype score. |
| `findings` | array of 5 objects | yes | Exactly one for each canonical category. |
| `photo_object_key` | string | yes | Private Backblaze key under `user-photos/{uid}/`; never a public or signed URL. |
| `created_at` | ISO 8601 string | yes | Assessment completion/start timestamp from the API. |
| `completed_at` | ISO 8601 string or null | yes | Completion timestamp from the API; current client builder writes null if absent. |
| `specialist_recommendation` | object or null | yes | Current client builder writes a sanitized summary object or null. Only scalar summary fields are persisted. |

New documents reject extra fields, including `photo_url`, `consultation_questions`, and recommendation `reasons`. These variable-length lists are not stored in this document because Firestore Rules cannot iterate over every element to validate them. The live API response may carry optional recommendation/question data in a future contract, but persistence needs a separate rules-safe schema first.

Rules can check that timestamp fields are strings within a size bound, but cannot validate full ISO 8601 calendar/timezone semantics. The frontend validates API timestamps before writing; direct client writes remain a trust limitation.

### Finding object

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string | yes | Finding identifier. |
| `category` | string | yes | `crowding/alignment`, `gaps`, `discoloration`, `gum line`, or `symmetry`. |
| `title` | string | yes | Plain-language display title. |
| `severity` | string | yes | Exactly `none`, `mild`, `moderate`, or `severe`; `none` means no visible issue. These are experimental image observations, not clinical diagnoses. |
| `description` | string | yes | Plain-language explanation; never fabricate if the model cannot assess. |
| `icon` | string | no | Optional display metadata, validated by rules. |

### Specialist recommendation summary

The persisted object may contain only `primarySpecialist`, `coSpecialist`, `notes`, and `discipline`, with string/null types and length bounds defined in `frontend/firestore.rules`. The current inference model does not generate this recommendation. `reasons` are omitted from persistence because they are an unbounded list.

### Prototype score

The backend calculates the experimental score from all five finding severities. Map `none=0`, `mild=1`, `moderate=2`, and `severe=3`; sum the five values as `total_penalty`; then calculate `round(100 * (1 - total_penalty / 15))`. The frontend only displays the returned integer. This formula is not clinically validated and must not be presented as a diagnosis or measure of dental health.

### Trust boundary

Security Rules verify authentication, owner-scoped paths, data shape, field bounds, and that the photo key begins with the owner's UID path. Rules cannot prove the result came from Render inference. A user can create a forged assessment for their own account. This design is acceptable only for the clearly labeled prototype and must not be treated as a trusted clinical record.

## `users/{uid}/milestones/{milestoneId}` (legacy)

Older frontend-written history. Read-only for the frontend going forward; do not copy/migrate records automatically. Legacy records may contain fields such as `id`, `score`, `photoUrl`, `date`, `timestamp`, `dayLabel`, `title`, `description`, `tags`, and `assessmentId`. These are photo/score checkpoints, not complete verified reports.

## `users/{uid}/questions/{questionId}`

User-owned consultation checklist. The current frontend can create/update questions for the signed-in owner. This collection is separate from an assessment's inference response.

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
