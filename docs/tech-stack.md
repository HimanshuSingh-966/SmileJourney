# Tech Stack — SmileJourneyAI

Status: deployment and core service decisions below reflect the current team plan. Clinical/model choices remain open where marked.

## Frontend

- React + TypeScript + Vite PWA, currently developed/published through Google AI Studio.
- Uses Firebase Authentication for sign-in and reads assessment history from Firestore.
- Sends photos and Firebase ID tokens to the Python API using `VITE_API_BASE_URL`.
- Frontend does not perform inference or write completed assessment documents.

## Backend

- FastAPI (Python), deployed on Render.
- Firebase Admin verifies ID tokens and writes completed reports to Firestore.
- Backblaze B2 stores uploaded image files; report documents keep an image URL, not image bytes.
- CORS origins, upload limits, Firebase service credentials, B2 credentials, and Hugging Face token are configured as environment variables.

## AI / ML

- Fine-tune a pretrained classification backbone; keep the backbone configurable (ResNet/EfficientNet choice remains open pending experiments).
- Use a pretrained segmentation model for mouth/teeth/gum region preprocessing; do not train segmentation from scratch.
- Train/evaluate offline using the team's labeled dataset and an expert-reviewed rubric.
- Store released model artifacts on Hugging Face; download/load and run inference on the Render backend. Do not use Hugging Face hosted inference for user photos under the current plan.
- Lightning AI Studio was the proposed training environment. Confirm current availability/limits before relying on a specific free GPU allocation.
- No placeholder output: backend must fail safely without a configured, loadable checkpoint whose category, severity, and preprocessing metadata match the API. Current prototype predictions are experimental and not clinically validated.

## Data and identity

- Firebase Authentication: identity provider.
- Cloud Firestore: profile, assessment job state, backend-owned completed assessments, legacy milestones (read-only), and user-owned questions. See `schema.md`.
- Backblaze B2: user photo object storage.
- Keep internal training images and labels completely separate from user records and exports.

## Hosting

- Frontend: published through Google AI Studio as currently configured.
- API and inference: Render.
- Model artifact repository: Hugging Face.
- The Render service may cold-start on a free tier; the frontend must show a patient loading state and handle request/poll timeout.
