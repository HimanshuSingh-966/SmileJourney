# Product Requirements Document — SmileJourneyAI

## 1. Overview

SmileJourneyAI is a patient-facing Progressive Web App (PWA) that lets a user photograph their own smile, receive an AI-analyzed report on common smile issues, get told which type of dental specialist to consult, and track their own progress over time.

This is **Phase 1** of a multi-phase project (per the official Synergy Techfest proforma). Phase 1 scope excludes AI-generated correction/simulation previews — that is an explicitly later-phase feature.

## 2. Problem Statement

People often notice something feels "off" about their smile but don't know how to characterize it or which type of dental specialist to approach. Existing AI smile-analysis tools are mostly built for dental clinics (B2B), not for direct, self-guided use by the person themselves.

## 3. Target User

A general consumer, likely with no dental background, using their own phone. Assume no prior use of dental software. Copy and UI must stay in plain language throughout — this is a hard requirement, not a preference.

## 4. Goals (Phase 1)

- Let a user capture a smile photo and receive an automated issue report
- Explain detected issues in plain language, with a severity level per issue
- Recommend the correct type of specialist based on detected issues
- Let users track their own photos/progress over time
- Deliver as an installable PWA, not a website or native app

## 5. Non-Goals (Phase 1 — explicitly out of scope)

- AI-generated "before/after" corrected-smile simulation (later phase; needs a paired-image dataset we do not currently have at sufficient scale)
- Clinical diagnosis of any kind — this is a screening/awareness tool only
- Booking/scheduling integration with real clinics (not currently planned; may be considered later)
- Native iOS/Android app (PWA only)

## 6. Core Features

### 6.1 Onboarding
Minimal profile creation — name, age. No unnecessary fields.

### 6.2 Smile Photo Capture
Camera-based capture flow with on-screen guidance (lighting, framing, natural smile). Must request camera permission with a priming screen first (see UX guidelines).

### 6.3 Smile Analysis Report
AI-generated report covering five issue categories:
- Tooth alignment / crowding
- Interdental gaps
- Tooth discoloration
- Gum line irregularities
- Facial-dental symmetry

Each category uses one of the frontend's four severity labels: **None / Mild / Moderate / Severe**. “None” is presented as “No visible issue.” The backend calculates an experimental prototype score from the five severities using the formula documented in `schema.md`; the frontend displays the score returned by the backend. The score is not clinically validated and is not a diagnosis.

> Note: the specific severity thresholds (e.g. "<2mm = mild") referenced in early research notes are a proposed clinical rubric only. These must be validated and confirmed by our dental expert before being treated as final — do not hard-code them into any spec without that confirmation.

### 6.4 Specialist Recommendation
Rule-based mapping (not a trained model) from detected issue(s) to specialist type:
- Crowding / gaps / midline asymmetry → Orthodontist
- Discoloration / surface defects → Cosmetic Dentist
- Gum line irregularities → Periodontist

This logic must be defined and signed off by our dental expert before implementation — it is clinical judgment encoded as rules, not something the engineering team should decide alone.

### 6.5 Progress Tracking
Users can return, upload a new photo, and view their own historical photos side by side. No AI/model involvement — pure storage and display feature.

## 7. Explicit Product Constraints

- Every AI-derived statement in the UI must be paired with plain-language explanation, not clinical jargon.
- A visible, persistent disclaimer must appear on any results screen: this is a screening tool, not a medical diagnosis.
- Do not represent detection confidence with fabricated precision (e.g. no "94.2% accurate" claims) unless backed by actual validated model metrics.

## 8. Success Criteria (Phase 1)

- Working PWA installable on Android and iOS from browser
- End-to-end flow: capture → report → recommendation → (optional) progress tracking
- Issue-detection model fine-tuned and validated on our own labeled dataset
- All claims in the product (features, capabilities) match what is actually built — no capability should be advertised that is not implemented

## 9. Open Decisions (not yet finalized — track separately)

- Exact backbone architecture for the classification model (ResNet vs EfficientNet vs other) — pending early experimentation results
- Final severity-rating thresholds per issue — pending dental expert sign-off
- Whether specialist recommendation copy needs per-issue combination logic (multiple simultaneous issues) or simple single-issue-priority logic
