# Tech Stack — SmileJourneyAI

Status: deployment and core service decisions below reflect the current team plan. Clinical/model choices remain open where marked.

## Frontend

- React + TypeScript + Vite PWA, currently developed/published through Google AI Studio.
- Uses Firebase Authentication for sign-in, reads assessment history, and saves completed assessments to Firestore with the Firebase Web SDK under owner-only rules.
- Sends photos and Firebase ID tokens to the Python API using `VITE_API_BASE_URL`.
- Frontend does not perform inference; it persists only validated, sanitized API results.

## Backend

- FastAPI (Python), deployed on Render.
- The backend verifies Firebase ID tokens against Google's public Secure Token certificates without Firebase Admin or Google Cloud credentials; token revocation is not checked. The signed-in frontend uses Firestore Security Rules to create and read its own assessment documents.
- Private Backblaze B2 stores uploaded image files; Firestore report documents keep only an owner-scoped object key. The backend issues short-lived signed download URLs after validating the token UID against the key prefix.
- CORS origins, upload limits, Firebase project ID, B2 credentials, and Hugging Face token are configured as environment variables. No Firebase service-account key or Firestore database ID is used by Render.

## AI / ML

- Fine-tune a pretrained classification backbone; keep the backbone configurable (ResNet/EfficientNet choice remains open pending experiments).
- Use a pretrained segmentation model for mouth/teeth/gum region preprocessing; do not train segmentation from scratch.
- Train/evaluate offline using the team's labeled dataset and an expert-reviewed rubric.
- Store released model artifacts on Hugging Face; download/load and run inference on the Render backend. Do not use Hugging Face hosted inference for user photos under the current plan.
- Lightning AI Studio was the proposed training environment. Confirm current availability/limits before relying on a specific free GPU allocation.
- No placeholder output: backend must fail safely without a configured, loadable checkpoint whose category, severity, and preprocessing metadata match the API. Current prototype predictions are experimental and not clinically validated.

## Data and identity

- Firebase Authentication: identity provider.
- Cloud Firestore: profile, frontend-created owner-scoped completed assessments, legacy milestones (read-only), and user-owned questions. See `schema.md`.
- Backblaze B2: user photo object storage.
- Keep internal training images and labels completely separate from user records and exports.

## Hosting

- Frontend: published through Google AI Studio as currently configured.
- API and inference: Render.
- Model artifact repository: Hugging Face.
- The Render service may cold-start on a free tier; the frontend must show a patient loading state and handle synchronous request timeouts.
