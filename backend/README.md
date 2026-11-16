# SmileJourneyAI Backend

FastAPI service for the SmileJourneyAI PWA. Firebase Auth remains the identity provider. The API verifies Firebase ID tokens using Google's public Secure Token certificates, without Firebase Admin credentials or Firestore access. It runs inference on Render, downloads model artifacts from Hugging Face, and stores assessment photos in private Backblaze B2.

## Local setup

1. Use Python 3.12 and create/activate a virtual environment.
2. Install dependencies: `pip install -r requirements.txt`.
3. Copy `.env.example` to `.env` and configure the Firebase project ID, Backblaze settings, Hugging Face model repo/token, and allowed frontend origins.
4. Start the API from the `backend` directory: `uvicorn app.main:app --reload --port 8000`.
5. Health endpoint: `GET http://localhost:8000/health`.

The backend requires no Firebase service-account JSON or Firestore database ID. Never commit `.env`, Hugging Face tokens, or Backblaze credentials.

## API

- `POST /api/assessments` — authenticated multipart upload (`photo`); validates the image, runs synchronous inference, uploads the photo to B2, and returns a completed result including an owner-scoped `photo_object_key`.
- `POST /api/photos/signed-url` — authenticated JSON body (`photo_object_key`); validates that the key belongs to the UID from the verified token and returns a 15-minute signed URL.
- `GET /health` — process health only; does not test model or B2 access.

The frontend writes the returned sanitized report to `users/{uid}/assessments/{assessment_id}` with the Firebase Web SDK. Firestore Rules allow only the signed-in owner to create/read the fixed schema; updates and deletes are denied. The backend does not read or write Firestore.

## Authentication limitation

The service validates token signature and Firebase claims (`aud`, `iss`, `exp`, `iat`, `auth_time`, `sub`) using Google's public certificate endpoint. It does not check token revocation because that requires privileged Firebase Admin access. Certificate retrieval must be available over outbound HTTPS. Keep the project ID aligned with the frontend Firebase project.

## Prototype inference status

The inference adapter loads `best_prototype.pt` from the Hugging Face model repository configured by `HF_MODEL_REPO`, validates its category, label, and preprocessing metadata, and runs CPU inference. Configure `HF_TOKEN` for a private repository. The model output is experimental and held-out metrics are weak; use only in a clearly labeled, controlled pilot, not for dental decisions. The backend derives the overall score from predicted severities.

The backend requirements include PyTorch, torchvision, NumPy, and `huggingface_hub`. Ensure the selected Render instance has enough memory for those packages and the loaded model. Never commit the checkpoint or secrets to Git.
