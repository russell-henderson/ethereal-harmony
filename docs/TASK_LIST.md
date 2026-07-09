---
Version: 1.0.0
Last Updated: 2025-11-17
Status: Draft
Owner: Russell Henderson
---

# Ethereal Harmony Task List

## 1. Purpose

This file is the canonical task list for Ethereal Harmony.

It collects work items from:

- `IMPROVEMENTS.md`
- `docs/TODOv2.md` (via consolidation tasks)
- `docs/TODO_system.md` (via consolidation tasks)

Each task is designed to be agent friendly and human readable, with clear scope, category, and dependencies.

Use this file as the single source of truth for current and planned work. Update Status, Owner, and Last Updated as tasks move.

---

## 2. Phases

To keep work manageable, tasks are grouped into phases.

- **Phase 1**: Documentation alignment and architecture accuracy  
- **Phase 2**: UX, accessibility, and testing baseline  
- **Phase 3**: DevOps, maintenance, and meta consolidation

---

## 3. Task Table

### Legend

- **Priority**: P1 (highest), P2, P3  
- **Effort**: S (Small), M (Medium), L (Large)  
- **Status**: Planned, In Progress, Blocked, Done  

---

### 3.1 Phase 1 – Documentation and Architecture Alignment

| ID | Title | Category | Priority | Effort | Status | Owner | Depends On | Source | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EH-001 | Add version front matter to core docs | Documentation | P1 | S | Planned | Russell | EH-020 | IMPROVEMENTS D1 | Add YAML block to major docs in `docs/` and root: Version, Last Updated, Status, Owner. |
| EH-002 | Create ARCHITECTURE.md as central index | Architecture | P1 | M | Planned | Russell | EH-001 | IMPROVEMENTS D2 | Summarize current architecture, link out to FRONTEND, DATABASE, SECURITY, OBSERVABILITY, DEVOPS. Clearly state frontend only reality. |
| EH-003 | Declare canonical Brand and Glossary sources | Documentation | P2 | S | Planned | Russell | EH-001 | IMPROVEMENTS D3 | Choose `docs/BRAND_GUIDELINES.md` and `docs/GLOSSARY.md` as canonical, convert root versions into pointers or quick references. |
| EH-004 | Fill ONBOARDING.md with real quick start | Documentation / Dev Experience | P1 | M | Planned | Russell | EH-001 | IMPROVEMENTS D4 | Add concrete setup, commands, and debugging steps. Make it usable for a new dev in under 5 minutes. |
| EH-005 | Make DEVOPS and WORKFLOWS project specific | Documentation / DevOps | P2 | M | Planned | Russell | EH-002 | IMPROVEMENTS D5 | Replace placeholders, describe actual build, test, and release flows, even if manual for now. |
| EH-006 | Align STATE_MANAGEMENT.md with actual stores | Architecture / Documentation | P1 | S | Planned | Russell | EH-002 | IMPROVEMENTS A1 | Document real Zustand store fields and actions. Move hypothetical fields into a clearly labeled future section. |
| EH-007 | Document audio to visualizer data flow | Architecture | P2 | S | Planned | Russell | EH-002 | IMPROVEMENTS A3 | In ARCHITECTURE.md, add a short end to end narrative from file selection to visualizer rendering with module links. |
| EH-008 | Clarify performance guard model for FPS | Architecture / Performance | P2 | M | Planned | Russell | EH-002 | IMPROVEMENTS A2 | Decide how `FpsGuard` and `AdaptiveGuard` fit together. Update OBSERVABILITY docs to describe the final model. |

---

### 3.2 Phase 2 – UX, Accessibility, and Testing

| ID | Title | Category | Priority | Effort | Status | Owner | Depends On | Source | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EH-009 | Mount and wire global Toasts component | UX | P1 | S | Planned | Russell | EH-004 | IMPROVEMENTS U1 | Ensure `<Toasts />` is mounted in `App.tsx` and ready for use across the app. |
| EH-010 | Route key errors through Toasts API | UX | P1 | M | Planned | Russell | EH-009 | IMPROVEMENTS U1 | Identify error paths for file load, HLS, and playback failures, and surface clear messages using `toast.error` or similar. |
| EH-011 | Tighten reduced motion integration in visualizer | UX / Accessibility | P2 | M | Planned | Russell | EH-006 | IMPROVEMENTS U2 | Ensure reduced motion preference changes visualizer behavior in a predictable way and document it in ACCESSIBILITY.md. |
| EH-012 | Add unit tests for core state stores | Testing | P1 | M | Planned | Russell | EH-006 | IMPROVEMENTS T1 | Create Vitest suites for player, settings, and visualizer stores that cover defaults and core actions. |
| EH-013 | Add an end to end smoke test for playback | Testing | P2 | M | Planned | Russell | EH-012 | IMPROVEMENTS T2 | Add Playwright tests that start the app, load a sample track, and verify play and pause behavior. |
| EH-014 | Update TEST_PLAN.md with realistic stages | Testing / Documentation | P2 | S | Planned | Russell | EH-012, EH-013 | IMPROVEMENTS T3 | Mark current testing stage as foundational, record what is implemented, move high coverage targets into a future stage section. |

---

### 3.3 Phase 3 – DevOps, Maintenance, Meta Consolidation

| ID | Title | Category | Priority | Effort | Status | Owner | Depends On | Source | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EH-015 | Integrate check-md-images into workflow | DevOps / Docs | P3 | S | Planned | Russell | EH-001 | IMPROVEMENTS O1 | Run image link checker locally and in CI. Fix any missing images or incorrect paths in docs. |
| EH-016 | Add documentation maintenance section | Documentation / Process | P2 | S | Planned | Russell | EH-001 | IMPROVEMENTS O2 | In MASTER_OVERVIEW, define when to bump Version, update Last Updated, and move docs from Draft to Active. |
| EH-017 | Add documentation owner matrix | Documentation / Process | P2 | S | Planned | Russell | EH-016 | IMPROVEMENTS O2 | Create a simple table mapping docs to owners and review cadence. For now, list Russell as owner. |
| EH-018 | Align TODOv2 stack versions with MASTER_OVERVIEW | Documentation | P3 | S | Planned | Russell | EH-001 | IMPROVEMENTS O3 | Update any hard coded React, TypeScript, and Vite version strings in TODOv2 to match MASTER_OVERVIEW. |
| EH-019 | Clarify scope of TODO_system for Ethereal Harmony | Documentation / Process | P3 | S | Planned | Russell | EH-002 | IMPROVEMENTS O4 | Add a short preface explaining which sections of TODO_system apply to this frontend only project and which are template only. |
| EH-020 | Create consolidation plan for TODO docs into TASK_LIST | Meta / Process | P1 | S | Planned | Russell | None | TODOv2, TODO_system | Define how items from `docs/TODOv2.md` and `docs/TODO_system.md` will be reviewed and migrated into this file. This task must complete before mass edits. |
| EH-021 | Review docs/TODOv2.md and import active tasks | Meta / Process | P2 | M | Planned | Russell | EH-020 | TODOv2 | Go through TODOv2 line by line, convert each still relevant item into a structured task entry here, mark imported items in TODOv2 as migrated or remove them. |
| EH-022 | Review docs/TODO_system.md and mark template vs active | Meta / Process | P2 | M | Planned | Russell | EH-020 | TODO_system | Identify generic template sections vs Ethereal Harmony specific tasks, migrate any real tasks here, keep template sections clearly labeled as such. |
| EH-023 | Decide how CHANGELOG relates to doc updates | Documentation / Process | P3 | S | Planned | Russell | EH-016 | IMPROVEMENTS O2 | Either keep CHANGELOG as code only, or add a convention for noting major documentation updates. Document the decision in MASTER_OVERVIEW. |

---

## 4. How To Use This File

1. **When a task is created**  
   - Add a new row to the appropriate phase section.  
   - Fill ID, Title, Category, Priority, Effort, and Source at minimum.

2. **When you start work**  
   - Change Status to `In Progress`.  
   - Update Owner if someone else takes it.  
   - Adjust Depends On if new dependencies appear.

3. **When you finish work**  
   - Change Status to `Done`.  
   - Update Last Updated in this file header if the change is significant.  
   - For documentation tasks, also bump the `Last Updated` field in the target doc.

4. **When importing from TODO docs**  
   - Use EH-020, EH-021, and EH-022 as the guard rails.  
   - Avoid leaving tasks only in TODOv2 or TODO_system once they are active.  
   - Treat this file as the primary place where work is tracked.

This task list is intended to stay lean and current. If it becomes noisy or stale, prefer to merge, split, or retire tasks rather than let them drift.  
