# SmileJourneyAI Backend

FastAPI service for the SmileJourneyAI PWA. Firebase Auth remains the identity provider; the API verifies Firebase ID tokens, stores completed assessments in the user's Firestore `assessments` subcollection, and uses Backblaze B2 for photo objects. Model inference is intended to run on Render using model artifacts hosted on Hugging Face.

## Local setup

1. Use Python 3.12 and create/activate a virtual environment.
2. Install dependencies: `pip install -r requirements.txt`.
3. Copy `.env.example` to `.env` and configure Firebase Admin credentials, Firestore database ID, Backblaze settings, and allowed frontend origins.
4. Start the API: `uvicorn app.main:app --reload --port 8000`.
5. Health endpoint: `GET http://localhost:8000/health`.

Never commit `.env`, service-account JSON files, Hugging Face tokens, or Backblaze credentials.

## API

- `POST /api/assessments` — authenticated multipart upload, field `photo`.
- `GET /api/assessments/{assessment_id}` — authenticated status/report lookup.

The API creates job status documents in `users/{uid}/assessment_jobs/{assessment_id}` and writes a completed report to `users/{uid}/assessments/{assessment_id}` only after a valid result exists. Firebase Admin writes bypass Firestore rules, so the API always derives the UID from a verified Firebase token and never accepts a client-supplied UID.

## Prototype inference status

The inference adapter loads `best_prototype.pt` from the Hugging Face model repository configured by `HF_MODEL_REPO`, validates its category, label, and preprocessing metadata, and runs CPU inference. Configure `HF_TOKEN` for a private repository. The model output is experimental and the provided held-out metrics are weak; use only in a clearly labeled, controlled pilot, not for dental decisions. The backend derives the overall score from predicted severities. Firebase, Firestore, and B2 settings are required for a completed assessment flow.

The backend requirements include PyTorch, torchvision, NumPy, and `huggingface_hub`. Ensure the selected Render instance has enough memory for those packages and the loaded model. Never commit the checkpoint or secrets to Git.
