# System Architecture — SmileJourneyAI

## 1. Phase 1 Deployment Shape

```text
User browser / installed PWA
        |
        | HTTPS + Firebase ID token + captured photo
        v
React PWA published through Google AI Studio
  ├── Firebase Auth signs the user in
  ├── Firebase Web SDK reads and writes only that user's Firestore records
  └── calls the Render API for inference and private photo URLs
        |
        | POST assessment / POST signed-photo request
        v
FastAPI backend on Render
  ├── verifies Firebase ID tokens using Google's public signing certificates
  ├── uploads source photos to private Backblaze B2
  ├── runs inference on Render using model artifacts from Hugging Face
  └── does not use Firebase Admin or connect to Firestore
        |
        +--> Hugging Face: model checkpoint download only
        +--> Backblaze B2: private user photo objects and short-lived signed reads

Firebase Web SDK ------------------------------> Firestore
  users/{uid}/assessments/{assessmentId}           owner-scoped client reads/creates
```

Hugging Face stores model artifacts only; inference runs on Render. The current phase-one API is synchronous. The client saves the completed report in Firestore under the authenticated user's path. This avoids backend Firestore credentials but means Firestore rules cannot prove that a report's score came from the model API.

## 2. Components

### 2.1 Frontend (PWA)

- Captures/selects a photo and sends it with a Firebase ID token to the assessment API.
- Waits for the completed synchronous response, then saves the sanitized result to `users/{uid}/assessments/{assessmentId}` using the Firebase Web SDK.
- Reads only the signed-in user's assessment history; Firestore rules enforce owner access and create-only report writes.
- Requests a new signed B2 URL when an assessment image is displayed. Signed URLs are never persisted.
- Handles loading, failure, offline, install, and report states; runs no image inference in the browser.

### 2.2 Backend API (FastAPI on Render)

- Verifies Firebase ID token signature and required claims (`aud`, `iss`, `exp`, `iat`, `auth_time`, `sub`) using Google's public Secure Token certificates. It derives UID only from the verified `sub` claim.
- Does not use Firebase Admin, Google Cloud IAM credentials, or Firestore. Token revocation is not checked in this keyless design.
- Validates image upload type and size, runs model inference on Render, validates all five findings, and calculates the experimental score.
- Stores photos in private Backblaze B2 and returns an object key scoped to the verified UID.
- Issues a 15-minute signed B2 URL only when the requested object key belongs to the authenticated UID.
- Does not store reports or processing jobs. The frontend client writes completed report data to Firestore.

### 2.3 ML Training and Inference

- Training is offline and fine-tunes a pretrained, configurable image-classification backbone.
- Segmentation uses a pretrained model; training segmentation from scratch is out of scope.
- Model artifacts are hosted on Hugging Face and loaded by the Render backend; user photos and inference requests are not sent to Hugging Face inference APIs.
- The deployed service validates checkpoint metadata and fails safely if the model cannot be downloaded, loaded, or run. The current model and severity-derived score are experimental and not clinically validated; do not present them as diagnosis or treatment guidance.

### 2.4 Data Stores

- **Firebase Authentication:** user sign-in and ID tokens.
- **Firestore:** profile data, user-created consultation questions, and owner-scoped completed assessments written by the Firebase Web SDK. Assessment create rules validate a fixed schema. See `schema.md` and `frontend/firestore.rules`.
- **Backblaze B2:** uploaded image files in a private bucket. Firestore stores the owner-scoped object key, not image bytes or an expiring URL. Authenticated API calls create short-lived signed download URLs after checking the key's UID prefix.
- **Hugging Face:** model checkpoint hosting only.
- `labeled_training_images` remains an internal training dataset and is never mixed with user assessment data.

## 3. Assessment Flow

1. User signs in through Firebase Auth and captures/selects a photo.
2. Frontend obtains a Firebase ID token and posts the photo to `POST /api/assessments`.
3. Backend verifies the token, validates the upload, runs inference, validates the five findings, and calculates the score.
4. Backend stores the photo in private B2 and returns a complete assessment with `photo_object_key` in the same response.
5. Frontend validates the response and creates `users/{uid}/assessments/{assessmentId}` through Firebase Web SDK. Rules allow the owner to create once, then read; updates and deletes are denied.
6. When displaying a saved photo, frontend posts its `photo_object_key` to `POST /api/photos/signed-url`. Backend validates the key prefix against the UID from the verified token and returns a 15-minute signed URL.
7. If Firestore save fails after inference, frontend retains the result in memory and offers a save retry without resubmitting the photo.

## 4. Phase 1 Exclusions and Limitations

- No correction-preview or synthetic before/after image service.
- No client-side or streaming inference.
- No durable job queue; synchronous CPU inference must fit the request window.
- No token revocation check without privileged Firebase Admin access.
- Owner-scoped create-only Firestore rules cannot cryptographically prove model provenance; a signed-in user can forge their own report document. Do not treat client-persisted prototype scores as trusted clinical records.
- Variable-length recommendation reasons and consultation-question arrays are omitted from assessment documents because rules cannot validate all list elements. They can be added in a later independently validated document model.
- No clinic-facing multi-tenant dashboard or appointment booking.
- No clinical diagnosis.

## 5. Risks and Dependencies

- Model quality depends on the team's labeled dataset and its quality review.
- Severity thresholds and specialist-routing logic require dental-expert sign-off.
- Render's free service may sleep. The first request may include model download and CPU warm-up time; frontend timeout and request handling must be tuned for the selected plan.
- Synchronous requests that exceed the client/platform timeout may be retried and could create duplicate B2 objects. A durable queue, idempotency key, and cleanup process are future work if pilot latency requires asynchronous processing.
