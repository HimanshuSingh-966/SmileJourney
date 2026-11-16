# SmileJourneyAI

SmileJourneyAI is a React PWA with a Python API and a prototype dental-image label set. See `docs/` for the product, architecture, API, schema, and implementation plan.

## Repository layout

- `frontend/` — existing Google AI Studio React + Vite + TypeScript PWA.
- `backend/` — FastAPI API for Firebase ID-token verification, synchronous assessment inference, Hugging Face model downloads, and private Backblaze B2 photo storage. The backend does not use Firebase Admin or Firestore.
- `ml/data/labels.csv` — labels for the prototype image set.
- `ml/data/images/` — prototype image files referenced by `labels.csv`.
- `ml/training/`, `ml/evaluation/`, `ml/configs/` — prototype fine-tuning and evaluation pipeline.
- `docs/` — project requirements and technical plans.

## Run locally

Frontend: from `frontend/`, install dependencies and run `npm run dev` (or use the package manager lockfile supplied by your environment).

Backend: see `backend/README.md`. Real assessments require the Firebase project ID, Backblaze B2 configuration, a Hugging Face model repository, and a compatible trained checkpoint. The frontend persists completed results to Firestore under owner-scoped rules.

ML prototype: see `ml/README.md` for setup, training, and held-out evaluation commands. Training is not run automatically.

## Prototype dataset

The CSV has one row per image and five category labels: `crowding`, `gaps`, `discoloration`, `gum_line`, and `symmetry`. Values include `none`, `mild`, `moderate`, and `severe`. Images are resolved relative to `ml/data/images/`.
