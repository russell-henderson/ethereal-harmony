# Database Documentation

## Databases Used

There is **no backend database**. All data is stored locally in the browser using:
- LocalStorage (for settings, UI state, and developer toggles)
- In-memory state (Zustand stores)
- Audio files are loaded from local disk or streamed (not persisted)

## Models/Entities

- **SettingsStore**: theme, view, reducedMotion, visualizer settings
- **PlayerStore**: playback state, queue, current track
- **VizStore**: visualizer parameters, quality, HDR, dimmer
- **UIStore**: side panel, modals, FPS overlay

## Relationships

- Stores are independent but may reference each other for UI composition.

## ERD

Not applicable (no relational data model).

## Data Retention/Backups

- Data is retained in browser LocalStorage until cleared by the user or browser.
- No automated backup or restore; no PII/PHI/PCI data is stored.
