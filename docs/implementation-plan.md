# Implementation Plan — SmileJourneyAI (Phase 1)

Status note: sequencing is dependency-based; dates are not fixed. Frontend and backend scaffolding are underway. Model training/integration depends on labeled data and dental-expert rubric sign-off.

## Workstream 1: Frontend / PWA

1. UI/UX design (wireframes → high-fidelity) — in progress, using design brief across multiple tools for comparison
2. Design handoff and review — confirm final screens against PRD section 6 before build starts
3. Frontend build: onboarding, capture, report display, specialist recommendation, progress tracking screens
4. PWA setup: manifest, service worker, install prompt, offline state handling
5. Frontend-backend integration against synchronous API contracts and client-side Firestore persistence
6. Cross-device testing (Android + iOS browsers, since PWA behavior differs slightly between them)

## Workstream 2: Data Pipeline

1. Organize existing pre-treatment image pool for labeling — **in progress**
2. Finalize labeling rubric with dental expert sign-off (issue categories + severity definitions) — **must happen before bulk labeling starts**
3. Set up labeling tool/workflow for the 4-person team
4. Label a working subset (target volume to be confirmed once labeling speed is measured — do not commit to a fixed number until a real trial run has been done)
5. Quality check: spot-check inter-labeler agreement before treating the dataset as ready for training

## Workstream 3: ML Model

1. Set up inference pipeline skeleton (segmentation stage using a pretrained model)
2. Once a usable labeled subset exists, fine-tune the classification backbone
3. Evaluate model on a held-out labeled sample
4. Iterate based on evaluation results
5. Package model for serving via the backend inference service

## Workstream 4: Backend

1. Build FastAPI service per api-contracts.md (initial scaffold created in `backend/`)
2. Verify Firebase ID tokens against Google's public Secure Token certificates; derive ownership from the verified UID (revocation checks are unavailable without Firebase Admin)
3. Implement synchronous authenticated assessment upload returning a completed result
4. Store uploaded photos in private Backblaze B2; let the signed-in frontend create the sanitized report under its own Firestore path
5. Integrate inference after the trained artifact and approved rubric exist; fail safely before then
6. Issue short-lived B2 signed photo URLs only for keys scoped to the verified Firebase UID
7. Implement specialist-routing only after dental-expert sign-off; keep unbounded lists out of rules-validated assessment documents

## Sequencing (dependency order, not calendar dates)

```
Data pipeline setup ──┐
                       ├──> Labeled dataset ready ──> Model fine-tuning ──> Model integration
Frontend design ───────┤
                       └──> Frontend build ──> Frontend-backend integration ──> End-to-end testing
Backend API skeleton ──────────────────────────────────────────────────────>
```

Frontend build and backend skeleton can proceed in parallel with the data pipeline — they do not block each other. Model fine-tuning is the one hard dependency on labeling completing first.

## Milestones

- **Milestone 1:** Design finalized, labeling rubric confirmed, working subset labeling begun
- **Milestone 2:** Frontend functional with explicit unavailable/loading states; backend API functional without fabricated model output
- **Milestone 3:** Model fine-tuned and evaluated on labeled data
- **Milestone 4:** Full integration — real model output flowing through the real app
- **Milestone 5:** End-to-end testing, bug fixing, demo readiness

## Key Risk

Labeling throughput is the single dependency that can shift every downstream date. Do not present any date in this plan as fixed to the committee or mentor until a real labeling trial (actual people, actual hours, actual images/hour) has been run and the numbers confirmed. Treat this document's sequencing as reliable; treat any specific date as provisional until that trial happens.
