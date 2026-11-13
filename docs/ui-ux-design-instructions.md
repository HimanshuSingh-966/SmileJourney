# UI/UX Design Instructions — SmileJourneyAI PWA

Use this exact brief across all design tools (Google AI Studio, Claude, ChatGPT, etc.) so outputs are comparable on equal footing. Do not paraphrase differently per tool — paste this as-is each time.

---

## Product

SmileJourneyAI — a Progressive Web App. A user photographs their smile, receives an AI-analyzed report on smile issues in plain language, is told which type of dental specialist to see, and can track progress over time.

## Target user

A regular person on their phone, likely self-conscious about their smile, possibly using a health-adjacent app for the first time. No dental background — assume zero familiarity with dental terminology.

## Design tone

Warm and reassuring, not clinical or hospital-like. Explicitly avoid: stethoscope icons, sterile white/blue "medical app" palettes, generic health-app visual clichés. This is closer to a personal wellness/confidence app than a diagnostic tool in feel.

## Screens required (in this order)

1. **Onboarding / sign-up** — minimal fields (name, age), plain copy, no jargon
2. **Smile photo capture** — camera view, on-screen guidance for lighting/framing/natural smile; include a permission-priming screen shown before the native camera permission prompt, explaining why camera access is needed
3. **Smile Analysis Report** — overall smile score (e.g. "72/100"); list of five issues (tooth alignment/crowding, gaps, discoloration, gum line, symmetry), each with a severity tag (Mild/Moderate/Good) and one plain-English sentence explaining it — not clinical terms
4. **Specialist Recommendation** — which type of specialist to see (orthodontist / cosmetic dentist / periodontist) and a one-to-two sentence plain-language reason why
5. **Progress Tracking** — user's own photos over time, shown side by side (their real photos only, not a simulated future image)
6. **Home / Dashboard** — entry point: re-take assessment, view past reports, view progress

## What NOT to design

- No AI-generated "before/after" correction slider or synthetic future-smile image. If shown at all, label clearly as "Coming later" — never as a working feature.
- No clinical-diagnosis framing. Include a small, persistent (not blocking) disclaimer on the report screen: this is a screening tool, not a medical diagnosis.
- No fabricated AI confidence percentages or overly "techy" visual styling implying more precision than the product actually claims.

## PWA-specific requirements to design for

- App icon set (192x192 and 512x512 minimum) and a simple branded splash/launch screen
- Full-screen layout assuming no visible browser address bar once installed — in-app navigation only, no reliance on browser back/forward controls
- An in-app "Add to Home Screen" install prompt/banner — do not rely on the browser's default install UI alone
- A simple, clear "no connection" state for the report screen, since analysis requires a network call

## Content/copy rules

- Explain every issue in plain English (e.g. "your teeth don't line up evenly when you bite," not "malocclusion")
- Buttons state exactly what happens ("Take Photo," "View My Report") — not generic labels like "Submit" or "Continue"
- Empty states should invite action, not just say "No data"

## Visual direction to propose

- A 4–6 color token palette (named hex values) — avoid default/generic AI-palette choices (cream+terracotta, near-black+neon accent) unless deliberately justified
- Two paired typefaces: one characterful display face for the score/headings, one clean body face for report text
- One signature visual moment (e.g. how the smile score is revealed) that becomes the product's memorable visual identity — used with restraint elsewhere
- Minimal, purposeful motion only (e.g. a score reveal animation) — no decorative animation throughout

## Layout

Mobile-first, single-column, thumb-reachable controls. This app is typically used one-handed, often standing in front of a mirror or in bathroom lighting — design for that real-world context, not a seated desktop-style layout.

---

## Evaluation checklist (use this to compare tool outputs afterward)

- [ ] Does it avoid clinical/hospital visual clichés?
- [ ] Are all five issue categories represented clearly on the report screen?
- [ ] Is severity shown per-issue, not just as one overall score?
- [ ] Is the specialist recommendation screen distinct from the report screen, not merged/lost within it?
- [ ] Is there a visible (but non-intrusive) disclaimer on the report screen?
- [ ] Does the camera capture screen include guidance, not just a bare camera view?
- [ ] Is there any trace of a before/after slider or simulation? (Should be absent, or clearly marked "Coming later.")
- [ ] Does the color/type direction feel distinct, not a generic default AI aesthetic?
