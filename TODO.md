---
Version: 1.0.0
Last Updated: 2025-11-17
Status: Draft
Owner: Russell Henderson
---

# Ethereal Harmony TODO

This TODO file is the quick, working view of current and near term work.

- For detailed fields, priorities, and dependencies, see `TASK_LIST.md`.
- For context and rationale, see `EXECUTIVE_SUMMARY.md`, `IMPROVEMENTS.md`, and `docs/ARCHITECTURE.md`.

Use this file when driving a coding session or handing work to an AI assistant.

---

## 1. How to use this file

- Work from top to bottom within each section.
- When you start a task, update `TASK_LIST.md` Status from Planned to In Progress.
- When you finish a task, check it off here and mark it Done in `TASK_LIST.md`.
- If a task here no longer makes sense, either:
  - Update it to match reality, or
  - Remove it and log the change in `TASK_LIST.md`.

Where helpful, related entries from `TASK_LIST.md` are noted in brackets.

---

## 2. Phase 1 – Documentation and architecture alignment (Now)

These tasks bring the docs and architecture description in line with the actual codebase and your Pivotal rules.

### 2.1 Core documentation framing

- [x] Add version front matter to all core docs  
  - Apply the standard YAML header to:
    - `docs/MASTER_OVERVIEW.md`
    - `docs/PRD.md`
    - `docs/FRONTEND.md`
    - `docs/BACKEND.md`
    - `docs/DATABASE.md`
    - `docs/BRAND_GUIDELINES.md`
    - `docs/SECURITY.md`
    - `docs/ACCESSIBILITY.md`
    - `docs/ONBOARDING.md`
    - `docs/TEST_PLAN.md`
    - `docs/DEVOPS.md`
    - `docs/WORKFLOWS.md`
    - `docs/OBSERVABILITY.md`
    - `docs/ROADMAP.md`
    - root `BRAND_GUIDELINES.md`, `STATE_MANAGEMENT.md`, `API_SPEC.md`, `DATABASE.md`, `GLOSSARY.md`  
  - Keep `Status: Draft` until you do a full pass on each.  
  - Related: `EH-001` in `TASK_LIST.md`.

- [x] Make `docs/ARCHITECTURE.md` the canonical architecture entry  
  - Confirm it clearly states:
    - Frontend only system, no backend in production.
    - The four layers: UI, state, domain engines, persistence.
  - Add a visible link to `docs/ARCHITECTURE.md` in:
    - `docs/MASTER_OVERVIEW.md`
    - `docs/PRD.md`
    - `README.md`  
  - Related: `EH-002`.

- [x] Declare canonical Brand and Glossary docs  
  - Choose `docs/BRAND_GUIDELINES.md` and `docs/GLOSSARY.md` as the single sources of truth.
  - Replace root `BRAND_GUIDELINES.md` and `GLOSSARY.md` content with:
    - A short summary.
    - A clear link to the canonical doc.
  - Related: `EH-003`.

### 2.2 Onboarding and DevOps clarity

- [x] Finish `docs/ONBOARDING.md` with a real quick start  
  - Add:
    - Required Node version.
    - Install command (`npm install` or `npm ci`).
    - `npm run dev` and default URL.
    - Basic troubleshooting tips (diagnostics overlay, console, known issues).
  - Ensure a new dev could follow this without reading other docs.
  - Related: `EH-004`.

- [x] Turn `docs/DEVOPS.md` into a concrete description of how you build and ship  
  - Document:
    - Build command and output folder.
    - How you preview builds locally.
    - Current release process (even if manual) and how you expect it to evolve.
  - Be explicit that there is no backend yet and that hosting is static only.
  - Related: `EH-005`.

- [x] Make `docs/WORKFLOWS.md` match your actual workflow  
  - Replace placeholder platform tokens with your real or intended static host.
  - Describe the minimal release flow that uses:
    - `npm run build`
    - `npm run preview`
    - `npm run changelog` and `npm run release` if you use them.
  - Note which steps are manual today and which will eventually be CI.

### 2.3 State and architecture accuracy

- [x] Align `STATE_MANAGEMENT.md` with the Zustand stores in `src/lib/state`  
  - For each store (`usePlayerStore`, `useSettingsStore`, `useVizStore`, `useUIStore`):
    - List real fields, actions, and what they control.
  - Move any fields that do not exist into a clearly labeled “Future fields” section or remove them.
  - Related: `EH-006`.

- [x] Document one end to end data flow in `docs/ARCHITECTURE.md`  
  - From user file selection to:
    - Track loading.
    - Playback in `AudioEngine`.
    - Analysis via `AnalyserBus`.
    - Visualizer updates in `src/lib/three` and `src/components/visualizer`.
  - Include file and module names so this doubles as a navigation guide.
  - Related: `EH-007`.

- [x] Normalize the FPS and performance guard story  
  - Decide how `src/lib/utils/FpsGuard.ts` and `src/lib/diagnostics/AdaptiveGuard.ts` work together.
  - Either:
    - Make one the primary and keep the other scoped, or
    - Unify them behind a single, documented pattern.
  - Update `docs/OBSERVABILITY.md` to describe:
    - How FPS is measured.
    - How quality is adjusted.
  - Related: `EH-008`.

---

## 3. Phase 2 – UX, accessibility, and testing (Next)

These tasks improve real user experience and give you a baseline of automated confidence.

### 3.1 Feedback and error handling

- [x] Mount the global Toasts component and verify it renders correctly  
  - Ensure `<Toasts />` is mounted near the top of `App.tsx`.
  - Confirm it:
    - Appears when called.
    - Is screen reader friendly.
    - Dismisses correctly with keyboard and mouse.
  - Related: `EH-009`.

- [x] Replace silent failures with Toasts on critical flows  
  - For:
    - Unsupported or corrupted local files.
    - HLS or network failures for remote audio.
    - Web Audio initialization failure cases.
  - Pipe errors to something like `toast.error("Short, clear message")`.
  - Ensure each message:
    - Uses user friendly language.
    - Offers a hint where possible.
  - Related: `EH-010`.

### 3.2 Reduced motion and accessibility

- [ ] Audit visualizer behavior under reduced motion preference  
  - Check how `ReducedMotion` and `Visibility` utilities are used in visualizer components.
  - Ensure:
    - Motion and particle intensity drop when reduced motion is active.
    - Any automatic quality adjustments respect this preference.
  - Update `docs/ACCESSIBILITY.md` with:
    - What reduced motion does.
    - How it interacts with quality presets and FPS guards.
  - Related: `EH-011`.

### 3.3 Testing baseline

- [ ] Add Vitest unit tests for core stores  
  - Create tests for:
    - `usePlayerStore` – queue, play, pause, seek, repeat or shuffle if present.
    - `useSettingsStore` – theme, density, motion, and any persisted fields.
    - `useVizStore` – preset selection, HDR toggle, dimmer settings.
  - Tests should cover:
    - Default state.
    - Simple action flows.
  - Wire them into `npm test` so they run by default.
  - Related: `EH-012`.

- [ ] Add a minimal Playwright smoke test for playback  
  - Configure Playwright.
  - Create a single test that:
    - Opens the app.
    - Loads a known sample track or uses a test fixture.
    - Clicks play and confirms the UI reflects playing state.
  - Mention this test as the first acceptance gate in `docs/TEST_PLAN.md`.
  - Related: `EH-013`.

- [ ] Make `docs/TEST_PLAN.md` honest about the current stage  
  - Add a “Current stage” section that:
    - Names the present stage as foundational.
    - Lists the tests you just implemented.
  - Move long term coverage targets into a “Future state” section so they are not misleading.
  - Related: `EH-014`.

---

## 4. Phase 3 – DevOps, maintenance, and meta consolidation (Later)

These tasks reduce drift between docs and code and set up long term maintenance.

### 4.1 Documentation maintenance and owners

- [x] Add a documentation maintenance section to `docs/MASTER_OVERVIEW.md`  
  - Define:
    - When to bump `Version`.
    - When to update `Last Updated`.
    - When to change `Status` from Draft to Active.
  - Related: `EH-016`.

- [x] Create a simple documentation owner table  
  - Either in `docs/MASTER_OVERVIEW.md` or `DOC_OWNERS.md`.
  - For each doc, list:
    - Name.
    - Owner (for now, you).
    - Review cadence (for example, quarterly).
  - Related: `EH-017`.

### 4.2 Tooling and consistency

- [x] Integrate `check-md-images` into regular workflow  
  - Run `npm run check:md-images` locally and fix any broken links.
  - Add a note in `docs/MASTER_OVERVIEW.md` telling contributors to run it before merging.
  - Consider adding it to CI later.
  - Related: `EH-015`.

- [ ] Align stack version references in `docs/TODOv2.md` with `docs/MASTER_OVERVIEW.md`  
  - Make sure things like:
    - React version.
    - Vite version.
    - TypeScript version.
  - Are identical and only declared once in the master overview.
  - Related: `EH-018`.

- [ ] Clarify how `docs/TODO_system.md` is meant to be used here  
  - Add a short preface that:
    - States it is a reusable template.
    - Notes which sections are relevant for this frontend only project.
  - Move any real Ethereal Harmony tasks out of it and into `TASK_LIST.md` and this `TODO.md`.
  - Related: `EH-019`.

### 4.3 Consolidation of legacy TODO docs

- [ ] Finalize consolidation plan from TODO docs to TASK_LIST  
  - In `TASK_LIST.md`:
    - Keep `EH-020` as the guiding task for consolidation.
  - Decide:
    - Which documents will remain as templates only.
    - Which will be archived after migration.
  - Related: `EH-020`.

- [ ] Migrate active tasks from `docs/TODOv2.md` into `TASK_LIST.md` and this file  
  - Review `docs/TODOv2.md` line by line.
  - For each relevant item:
    - Create a structured task in `TASK_LIST.md`.
    - Add a corresponding checkbox entry here if it is still active.
  - Mark migrated tasks in `docs/TODOv2.md` as moved or remove them.
  - Related: `EH-021`.

- [ ] Migrate active, project specific tasks from `docs/TODO_system.md`  
  - Identify entries that truly apply to Ethereal Harmony.
  - Move them into `TASK_LIST.md` and here.
  - Leave the rest as template guidance, clearly labeled as such.
  - Related: `EH-022`.

- [x] Decide how `CHANGELOG.md` handles documentation changes  
  - Choose one:
    - Only log code changes there.
    - Or record major documentation milestones.
  - Document that choice in `docs/MASTER_OVERVIEW.md` under documentation maintenance.
  - Related: `EH-023`.

---

## 5. Backlog and future evolution

These items are intentionally loose and should be turned into real tasks once you decide to tackle them.

- [ ] Review `docs/ROADMAP.md` and ensure all P1 roadmap items have corresponding entries in `TASK_LIST.md` and `TODO.md`.
- [ ] Identify one future backend or sync feature from `docs/BACKEND.md` and create a high level spike task for it.
- [ ] Revisit visualizer presets and performance defaults after you have real world usage data and diagnostics.

Keep this backlog short and concrete. If it grows too large, move lower priority ideas back into `docs/ROADMAP.md` and keep this file focused on the next one or two releases.
