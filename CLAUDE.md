# Project Instructions — SmileJourneyAI

This file orients AI coding assistants working on this codebase. Read `docs/prd.md`, `docs/architecture.md`, `docs/tech-stack.md`, `docs/schema.md`, and `docs/api-contracts.md` before making changes — they define what this project is and is not.

## What this project is

A Progressive Web App (PWA) that lets a user photograph their smile, get an AI-analyzed report on five specific issues (crowding, gaps, discoloration, gum line, symmetry) with severity ratings, get a specialist recommendation, and track progress over time.

## Hard constraints — do not violate these without explicit confirmation from the team

1. **No correction-preview / "before-after" simulation feature.** This is explicitly out of scope for the current phase. Do not build, stub with fake output, or design UI for this feature unless the team explicitly asks and confirms the data situation has changed.
2. **No fabricated confidence scores or clinical claims.** Never hard-code or generate placeholder "accuracy" numbers that look real. If a metric isn't from an actual evaluation run, don't display it as if it were.
3. **No native mobile code.** This is a PWA only — React web app with service worker and manifest, not Swift/Kotlin/React Native.
4. **All user-facing issue/severity language must stay plain-English.** Do not use clinical terminology in UI copy without a plain-language explanation alongside it.
5. **The specialist-routing logic is clinical judgment, not something to invent.** The mapping (which issue → which specialist) must come from the team's dental expert. If asked to implement this before that mapping is confirmed, use the placeholder mapping in the PRD but flag clearly in code comments that it is unconfirmed and pending sign-off.
6. **The five issue categories and their severity labels (mild/moderate/severe) are the only categories in scope.** Do not add additional detected issues (e.g. "bite alignment," "jaw structure") without an explicit request — scope creep here has been a recurring problem for this team and should be actively resisted.

## Data handling rules

- `labeled_training_images` (the internal training dataset) must never be joined with or exposed alongside real user data (`users`, `assessments`). Keep these fully separate in any query or export.
- Do not write code that assumes a specific labeled dataset size. The labeling pipeline is ongoing and its size is not fixed — write model training code to work with "however many labeled images currently exist," not a hard-coded count.

## Model/ML specifics

- The classification approach is **fine-tuning a pretrained backbone**, not training from scratch. If asked to implement model training code, default to a fine-tuning setup (freeze early layers, train later layers/head) rather than initializing weights randomly.
- Backbone choice (ResNet vs EfficientNet) is not finalized — if writing training code, make the backbone swappable via a config value, not hard-coded.
- Segmentation (isolating the mouth/teeth region) should use a pretrained model — do not attempt to train a segmentation model from scratch for this project; that is out of scope given data and time constraints.

## When uncertain

If a requirement in this codebase seems to conflict with what's described in `docs/prd.md` or this file, stop and flag it rather than guessing. Prefer asking a direct question in code comments or PR descriptions over silently making a judgment call on scope, clinical logic, or data claims.
