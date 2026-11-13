# System Architecture — SmileJourneyAI

## 1. Phase 1 Deployment Shape

```text
User browser / installed PWA
        |
        | HTTPS + Firebase ID token + captured photo
        v
React PWA published through Google AI Studio
        |
        | POST upload / GET status
        v
FastAPI backend on Render
  ├── verifies Firebase ID tokens with Firebase Admin
  ├── stores source photos in Backblaze B2
  ├── runs inference on Render using model artifacts from Hugging Face
  └── writes completed assessment documents with Firebase Admin
        |
        +--> Firestore: users/{uid}/assessment_jobs/{assessmentId}
        +--> Firestore: users/{uid}/assessments/{assessmentId}
```

Hugging Face stores model artifacts only; inference runs on the Render service. The frontend uses Firebase Auth for sign-in and has read-only access to completed assessment documents. The backend is the only writer of those assessment results.

## 2. Components

### 2.1 Frontend (PWA)

- Captures or selects a photo and sends it to the backend using the API contract.
- Sends the signed-in user's Firebase ID token as a bearer token.
- Reads its own Firestore assessment history; does not write assessment results.
- Handles loading, failure, offline, install, and report states.
- Runs no image inference in the browser.

### 2.2 Backend API (FastAPI on Render)

- Verifies Firebase ID tokens and derives the user UID only from the verified token.
- Validates image upload type and size.
- Stores photo objects in Backblaze B2 and stores their URL in the completed report.
- Coordinates inference and writes job status under `users/{uid}/assessment_jobs/{assessmentId}`.
- Writes a completed result to `users/{uid}/assessments/{assessmentId}` only after a valid complete result exists.
- Enforces ownership on every read and write. Firebase Admin bypasses Firestore security rules, so the backend must perform these checks itself.
- Keeps specialist routing disabled until the dental expert approves the rules.

### 2.3 ML Training and Inference

- Training is offline and fine-tunes a pretrained, configurable image-classification backbone.
- Segmentation uses a pretrained model; training segmentation from scratch is out of scope.
- Model artifacts are hosted on Hugging Face and loaded by the Render backend; user photos and inference requests are not sent to Hugging Face inference APIs.
- The deployed service validates checkpoint metadata and fails safely if the model cannot be downloaded, loaded, or run. The current model and severity-derived score are experimental and not clinically validated; do not present them as diagnosis or treatment guidance.

### 2.4 Data Stores

- **Firebase Authentication:** user sign-in and ID tokens.
- **Firestore:** profile data, user-created consultation questions, assessment job state, and completed backend-written assessments. See `schema.md`.
- **Backblaze B2:** uploaded image files. Firestore stores the photo URL, not image bytes.
- `labeled_training_images` remains an internal training dataset and is never mixed with user assessment data.

## 3. Assessment Flow

1. User signs in through Firebase Auth and captures/selects a photo.
2. Frontend obtains a Firebase ID token and posts the photo to `POST /api/assessments`.
3. Backend verifies the token, validates the upload, creates an assessment job, and responds with an assessment ID.
4. Backend stores the photo in Backblaze and runs the configured inference pipeline on Render.
5. Frontend polls `GET /api/assessments/{assessment_id}` with the same authenticated identity.
6. On success, backend validates the full report and writes it to `users/{uid}/assessments/{assessmentId}`. The frontend displays the API response and reads the Firestore history.
7. If storage, inference, or validation fails, the job is marked failed and no completed assessment is written.

## 4. Phase 1 Exclusions

- No correction-preview or synthetic before/after image service.
- No client-side or streaming inference.
- No clinic-facing multi-tenant dashboard or appointment booking.
- No clinical diagnosis.

## 5. Risks and Dependencies

- Model quality depends on the team's labeled dataset and its quality review.
- Severity thresholds and specialist-routing logic require dental-expert sign-off.
- Render's free service may sleep. The frontend must tolerate cold starts and polling timeouts.
- In-process background tasks are suitable only for an initial prototype; a durable queue/worker is needed if jobs must survive service restarts or run across multiple instances.
