````markdown
---
Version: 1.0.0
Last Updated: 2025-11-17
Status: Draft
Owner: Russell Henderson
---

# Ethereal Harmony Improvements

## 1. Purpose and Scope

This document lists concrete improvements for Ethereal Harmony.

It focuses on closing gaps between code and documentation, hardening the architecture, improving UX and accessibility, and bringing testing and DevOps up to the standard implied by the existing docs.

This is not a feature roadmap. New features and phases stay in `docs/ROADMAP.md` and `docs/PRD.md`. Items here are about quality, alignment, and operational readiness for a solid V1.

Each item includes:

- Category  
- Impact (High, Medium, Low)  
- Effort (Small, Medium, Large)  
- Evidence (where this comes from in the repo)  
- Suggested next actions  

You can later convert these items into `TASK_LIST.md` entries.

---

## 2. Improvement Themes (Summary)

1. **Documentation alignment**  
   - Add version front matter across docs and declare canonical sources for Brand and Glossary.  
   - Fill stub docs like `ONBOARDING.md` and `DEVOPS.md`.  
   - Create `ARCHITECTURE.md` to anchor technical docs.

2. **State and architecture accuracy**  
   - Bring `STATE_MANAGEMENT.md` in line with the actual Zustand stores.  
   - Clean up overlapping FPS and performance guard utilities so there is a single source of truth.

3. **Testing and quality**  
   - Implement the first real unit and end to end tests to match `docs/TEST_PLAN.md`.  
   - Make the test plan explicit about what is aspirational vs current.

4. **UX and feedback**  
   - Route error and success flows through the `Toasts` system instead of relying on console and silent failures.  
   - Tighten a few accessibility and reduced motion integration points in visualizer flows.

5. **DevOps and distribution**  
   - Capture the actual build and deploy story in `DEVOPS.md` and `WORKFLOWS.md`.  
   - Decide how to use `check-md-images` and `scripts/export-tree.mjs` in day to day work.

---

## 3. Detailed Improvements

### 3.1 Documentation and Structure

#### D1. Add version front matter to core docs

- **Category:** Documentation  
- **Impact:** High  
- **Effort:** Small  

**Evidence**

- `docs/MASTER_OVERVIEW.md`, `docs/PRD.md`, `docs/FRONTEND.md`, `docs/BACKEND.md`, `docs/DATABASE.md`, `docs/TEST_PLAN.md`, `docs/ROADMAP.md`, `docs/SECURITY.md`, `docs/ACCESSIBILITY.md`, `docs/WORKFLOWS.md`, `docs/ONBOARDING.md`, `docs/DEVOPS.md`, `docs/OBSERVABILITY.md` and root `BRAND_GUIDELINES.md`, `STATE_MANAGEMENT.md`, `GLOSSARY.md` have no YAML version block, while Pivotal expects one.

**Suggested next actions**

- Add the standard block to each major doc:  
  ```markdown
  ---
  Version: 1.0.0
  Last Updated: 2025-11-17
  Status: Draft
  Owner: Russell Henderson
  ---
````

* Set Status to `Draft` initially and promote to `Active` once reviewed.
* Note in `docs/MASTER_OVERVIEW.md` that all project docs follow this format.

---

#### D2. Create `docs/ARCHITECTURE.md` as the central entry

* **Category:** Documentation / Architecture
* **Impact:** High
* **Effort:** Medium

**Evidence**

* There is `docs/FRONTEND.md`, `docs/BACKEND.md`, `docs/DATABASE.md`, `docs/API_REFERENCE.md`, and several Mermaid diagrams in `docs/diagrams/`, but no `docs/ARCHITECTURE.md` file.
* `docs/MASTER_OVERVIEW.md` and `docs/PRD.md` talk about architecture but have no single canonical architectural index.

**Suggested next actions**

* Add `docs/ARCHITECTURE.md` with:

  * System overview and a short paragraph on current reality (frontend only, browser persistence).
  * A rendered or linked diagram from `docs/diagrams/architecture-overview.mmd`.
  * Pointers to `FRONTEND.md`, `DATABASE.md`, `OBSERVABILITY.md`, `SECURITY.md`.
* Add a small “Current vs Future” callout that explains that `BACKEND.md` is conceptual only for now.

---

#### D3. Declare canonical Brand and Glossary sources

* **Category:** Documentation
* **Impact:** Medium
* **Effort:** Small

**Evidence**

* Root `BRAND_GUIDELINES.md` and `GLOSSARY.md` exist.
* Richer versions live under `docs/BRAND_GUIDELINES.md` and `docs/GLOSSARY.md`.
* `docs/BRAND_GUIDELINES.md` already states that it should live at `/docs/BRAND_GUIDELINES.md`.

**Suggested next actions**

* Decide that the canonical versions are in `docs/`.
* Update root `BRAND_GUIDELINES.md` and `GLOSSARY.md` to be short pointers:

  * One sentence and a link to the canonical doc.
  * Optionally keep a very small quick reference table.
* Add a short “Source of truth” note in `docs/MASTER_OVERVIEW.md`.

---

#### D4. Fill `docs/ONBOARDING.md` with a real quick start

* **Category:** Documentation / Developer Experience
* **Impact:** High
* **Effort:** Medium

**Evidence**

* `docs/ONBOARDING.md` currently has only headings: “Setup Steps”, “Local Environment”, “Seed Data”, “Common Commands”, “Debugging Tips”.

**Suggested next actions**

* Under “Setup Steps” specify:

  * Required Node version (match what you actually use in local dev).
  * Installation (`npm install` or `npm ci`).
* Under “Local Environment” specify:

  * `npm run dev` to start Vite.
  * URL for local app (default `http://localhost:5173`).
* Under “Common Commands” list:

  * `npm run dev`, `npm run build`, `npm run preview`, `npm run test`, `npm run lint`, `npm run e2e`, `npm run tree`.
* Under “Debugging Tips” mention:

  * How to enable diagnostics overlays, how to open dev tools, where to look for performance overlays.

---

#### D5. Turn `docs/DEVOPS.md` and `docs/WORKFLOWS.md` into project specific guides

* **Category:** Documentation / DevOps
* **Impact:** Medium
* **Effort:** Medium

**Evidence**

* `docs/DEVOPS.md` contains headings but no concrete content.
* `docs/WORKFLOWS.md` describes CI and release flows in generic terms and still has a placeholder `{{platform}}` for deployment.

**Suggested next actions**

* In `docs/DEVOPS.md`:

  * Describe the current CI setup (even if it is “none; manual only”) and the desired one.
  * Describe build artifacts: Vite output directory, PWA assets.
  * Document how environment variables are set, even if the list is empty for now.
* In `docs/WORKFLOWS.md`:

  * Replace `{{platform}}` with the specific hosting choice you intend to use first (for example, “Netlify” or “Vercel”) or describe it as “static hosting platform”.
  * Define a simple release process that matches the `package.json` scripts `changelog`, `changelog:dry`, and `release`.

---

### 3.2 State and Architecture Accuracy

#### A1. Align `STATE_MANAGEMENT.md` with actual Zustand stores

* **Category:** Architecture / Documentation
* **Impact:** High
* **Effort:** Small

**Evidence**

* `STATE_MANAGEMENT.md` lists:

  * `useSettingsStore` with `telemetryOptIn` and `cacheSize`.
  * `useUIStore` with “toasts”.
* The actual store implementations in `src/lib/state/useSettingsStore.ts` and `src/lib/state/useUIStore.ts` do not include these fields.
* Stores include additional fields such as `view`, `vizPreset`, `hdrEnabled`, `dimmerEnabled`, `dimmerStrength`, `showFps`, and `modal` that are not described in `STATE_MANAGEMENT.md`.

**Suggested next actions**

* Update `STATE_MANAGEMENT.md` to reflect each store accurately:

  * List keys and their meaning for `usePlayerStore`, `useVizStore`, `useSettingsStore`, `useUIStore`.
* Either remove `telemetryOptIn` and `cacheSize` from the doc or add them as “Future fields” with a clear label.
* Add a short “When to add a new store vs extend an existing one” guideline and link back from `docs/FRONTEND.md`.

---

#### A2. Clean up FPS and performance guard utilities

* **Category:** Architecture / Performance
* **Impact:** Medium
* **Effort:** Medium

**Evidence**

* There is an `FpsGuard` class in `src/lib/utils/FpsGuard.ts` used by `src/lib/three/components/ParticlesField.ts` to adjust pixel ratio.
* There is also a more advanced performance ladder in `src/lib/diagnostics/FpsGuard.ts` and an `AdaptiveGuard` in `src/lib/diagnostics/AdaptiveGuard.ts` that integrate with `PerfEvents` and `QualityPresets`.
* This creates overlapping responsibilities for FPS based adaptation.

**Suggested next actions**

* Decide on a single conceptual model for FPS adaptation.
* Either:

  * Make `src/lib/utils/FpsGuard.ts` a very small helper used only inside the visualizer and keep `AdaptiveGuard` as the global performance ladder.
  * Or refactor so `ParticlesField` uses the same ladder thresholds and events as `AdaptiveGuard`.
* Document the final model in `docs/OBSERVABILITY.md` and reference it from `docs/FRONTEND.md` and `STATE_MANAGEMENT.md` under performance.

---

#### A3. Add a short data flow overview linking audio and visualizer

* **Category:** Architecture
* **Impact:** Medium
* **Effort:** Small

**Evidence**

* `docs/FRONTEND.md` and `docs/PRD.md` describe components and UI flows.
* `src/lib/audio` and `src/lib/three` show a clear structure for `AudioEngine`, `AnalyserBus`, and visualizer components, but there is no single “from file selection to visualization” story.

**Suggested next actions**

* In the new `docs/ARCHITECTURE.md`, add a “Typical flow” section that traces:

  * User loads a file or URL.
  * `TrackLoader` creates a `Track` object.
  * `usePlayerStore` and `AudioEngine` handle playback.
  * `AnalyserBus` produces audio data.
  * Visualizer controllers in `src/lib/three` and `src/components/visualizer` render scenes.
* Cross link relevant modules so new contributors can follow the path quickly.

---

### 3.3 UX, Feedback, and Accessibility

#### U1. Route user facing errors through `Toasts`

* **Category:** UX / Developer Experience
* **Impact:** High
* **Effort:** Medium

**Evidence**

* `src/components/feedback/Toasts.tsx` exports a `toast` API and a `<Toasts />` component with accessibility considerations.
* A repository wide search shows `toast` usage only inside this file, which suggests the API is not used elsewhere.
* `TrackLoader`, network handling, and other modules may throw errors that surface only in the console or through generic fallback UI.

**Suggested next actions**

* Mount `<Toasts />` in `App.tsx` near the root so toasts are available app wide.
* Identify key error paths where user feedback matters:

  * Unsupported file type.
  * CORS and HLS playback errors.
  * General playback failure in `AudioEngine`.
* Replace or supplement console error paths with `toast.error("Message")` and `toast.info("Hint")` calls that use clear, user friendly language.

---

#### U2. Tighten reduced motion and visibility handling in visualizer

* **Category:** UX / Accessibility / Performance
* **Impact:** Medium
* **Effort:** Medium

**Evidence**

* `src/lib/utils/ReducedMotion.ts` and `src/lib/utils/Visibility.ts` provide hooks for motion and tab visibility.
* `ParticlesField` subscribes to both and adjusts behavior, and `QualityPresets` includes `motionScaleMax`.
* Accessibility goals are written in `docs/ACCESSIBILITY.md` but the exact mapping of reduced motion preference to visualizer presets is not clearly documented.

**Suggested next actions**

* Review how `ReducedMotion` is used in each visualizer component and confirm that:

  * Motion scaling drops significantly or animations pause when reduced motion is active.
  * FPS and performance guards also treat reduced motion as a hint to bias toward lower intensity presets.
* Document the final behavior in `docs/ACCESSIBILITY.md` and briefly reference it from `docs/BRAND_GUIDELINES.md` under motion.

---

### 3.4 Testing and Quality

#### T1. Introduce unit tests for core state stores

* **Category:** Testing
* **Impact:** High
* **Effort:** Medium

**Evidence**

* `package.json` includes `vitest` and `test` scripts.
* There are no `*.test.ts` or `*.spec.ts` files in the repo.
* `docs/TEST_PLAN.md` describes an ambitious coverage target but does not reflect the current absence of tests.

**Suggested next actions**

* Create a `tests/` directory or colocated `*.test.ts` files for:

  * `src/lib/state/usePlayerStore.ts`
  * `src/lib/state/useSettingsStore.ts`
  * `src/lib/state/useVizStore.ts`
* Cover at least:

  * Default state and initial values.
  * Core actions (play, pause, queue operations, view changes, quality preset changes).
* Update `docs/TEST_PLAN.md` with a “Current coverage” section that lists these suites explicitly.

---

#### T2. Add a minimal end to end smoke test

* **Category:** Testing
* **Impact:** Medium
* **Effort:** Medium

**Evidence**

* `package.json` defines `e2e: "playwright test"`.
* There is no `playwright.config` or test file present in the repo.

**Suggested next actions**

* Add a basic Playwright setup and a single smoke test that:

  * Starts the app (in CI this can be served via `vite preview`).
  * Loads a small bundled sample audio file or uses a mock if there is no legal asset.
  * Clicks play and verifies that the UI reflects a playing state.
* Mention this smoke test in `docs/TEST_PLAN.md` and `docs/WORKFLOWS.md` as the minimum gate before a release.

---

#### T3. Mark `docs/TEST_PLAN.md` as aspirational and define a realistic next milestone

* **Category:** Testing / Documentation
* **Impact:** Medium
* **Effort:** Small

**Evidence**

* `docs/TEST_PLAN.md` defines acceptance gates such as “Unit + Component tests ≥ 95 percent coverage” and “All E2E scenarios green on CI”.
* The current codebase has no tests yet.

**Suggested next actions**

* Add a “Stage” section near the top of `docs/TEST_PLAN.md` that states:

  * Current stage: “Foundational”.
  * Next milestone: “Core stores and one smoke test implemented”.
* Move the 95 percent coverage gate into a “Future state” subsection.
* Link T1 and T2 from this plan so it is obvious what work is required to reach the first milestone.

---

### 3.5 DevOps, Tooling, and Maintenance

#### O1. Integrate `check-md-images` into routine and fix any broken references

* **Category:** DevOps / Documentation
* **Impact:** Medium
* **Effort:** Small to Medium

**Evidence**

* `package.json` defines `check:md-images`: `node check-md-images.mjs`.
* Docs include images such as `docs/images/ui-overview.png` and others, but the health of all links is unknown.

**Suggested next actions**

* Run `npm run check:md-images` during local development and CI.
* Create a short section in `docs/MASTER_OVERVIEW.md` under “Documentation maintenance” that instructs contributors to run this check before merging.
* Fix any missing or incorrect image paths that the script reports.

---

#### O2. Add a documentation maintenance section and owner matrix

* **Category:** Documentation / Process
* **Impact:** Medium
* **Effort:** Small

**Evidence**

* `docs/MASTER_OVERVIEW.md` acts as the central documentation index but does not describe how often docs should be reviewed or who owns them.

**Suggested next actions**

* In `docs/MASTER_OVERVIEW.md`, add:

  * A “Documentation maintenance” section describing when to bump `Version`, how to update `Last Updated`, and how to move from `Draft` to `Active`.
  * A simple owner table, either in `MASTER_OVERVIEW.md` or a new `DOC_OWNERS.md`, mapping each doc to an owner and review cadence.
* For now, list yourself as owner for all entries and adjust later if collaborators join.

---

#### O3. Ensure TODO templates align with actual stack versions

* **Category:** Documentation
* **Impact:** Low to Medium
* **Effort:** Small

**Evidence**

* `docs/TODOv2.md` describes the stack as “React 18 + TypeScript + Vite”.
* `package.json` specifies React `^19.1.1` and Vite `^7.1.2`.
* `docs/MASTER_OVERVIEW.md` already shows the correct versions.

**Suggested next actions**

* Update the stack line in `docs/TODOv2.md` to match the versions listed in `docs/MASTER_OVERVIEW.md`.
* Scan for other hard coded version strings in docs to avoid future drift.
* Optionally centralize versions in `MASTER_OVERVIEW.md` and avoid repeating them in multiple docs.

---

#### O4. Clarify the role of `docs/TODO_system.md` for this project

* **Category:** Documentation / Process
* **Impact:** Low to Medium
* **Effort:** Small

**Evidence**

* `docs/TODO_system.md` is a general template for full stack analysis and includes sections about backend frameworks, background workers, and auth flows that do not exist in this project.
* New contributors might assume these backend pieces are missing rather than intentionally future facing.

**Suggested next actions**

* Add a short preface at the top of `docs/TODO_system.md` that explains:

  * It is a reusable template for any project.
  * For Ethereal Harmony, backend items are future considerations, not current gaps.
* Optionally highlight which parts of the template currently apply and which can be ignored until a backend appears.

---

## 4. Next Steps

For execution, the recommended order is:

1. D1, D2, D3: Align documentation structure and create `ARCHITECTURE.md`.
2. A1, A2, A3: Fix state and performance guard alignment and document the data flow.
3. U1, U2: Improve user feedback and accessibility behavior.
4. T1, T2, T3: Establish a minimum viable testing baseline.
5. O1, O2, O3, O4: Firm up maintenance, CI checks, and template clarity.

These items can be copied into `TASK_LIST.md` with IDs and status fields to drive implementation.
