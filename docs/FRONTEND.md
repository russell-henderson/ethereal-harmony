# Frontend Documentation

## Routing Tree
- **Store-driven routing**: No external router; routes are managed in `useSettingsStore` and mirrored to `location.hash`.
- **Routes**:  
	- `player`: Now Playing & Visualizer  
	- `settings`: EQ, devices, visualizer controls  
	- `stream`: Streaming test wizard  
- See: `src/app/routes.tsx`

## Data Fetching Strategy
- No remote data fetching; all data is local (audio files, settings, state).
- HLS streams handled via `hls.js` for non-Safari browsers.

## State Stores
- **Zustand** is used for all state management:
	- `usePlayerStore`: playback state
	- `useVizStore`: visualizer state
	- `useSettingsStore`: theme, view, settings, router
	- `useUIStore`: ephemeral UI state (side panel, modals, FPS overlay)

## Key Components
- `AppShell`: Layout scaffold, global utilities, visualizer canvas, navigation, and main content.
- `AppChrome`: Header/footer chrome, quick actions, focus management, a11y.
- `PlayerCard`, `TransportBar`, `Timeline`, `TrackInfo`: Player UI.
- `VisualizerControls`, `SceneCanvas`, `PresetSelector`: Visualizer UI.
- `SettingsPanel`, `AudioDevicePicker`, `EqPanel`: Settings.
- `GlobalHotkeys`, `MediaKeyBridge`: Keyboard and hardware media key support.
- `ErrorBoundary`, `Toasts`: Error and feedback handling.

## Styling Approach
- **CSS**: Design tokens (`src/styles/tokens.css`), global styles (`src/styles/globals.css`), and utility classes.
- **Glassmorphism**: Used throughout for modern UI.
- No CSS-in-JS; all styles are static or token-driven.

## Accessibility Checklist
- Full keyboard navigation for all custom components.
- ARIA roles and states on buttons, sliders, toggles, and navigation.
- WCAG AA contrast enforced via tokens and runtime checks.
- Screen reader labels and skip links.
- Focus ring and modality helpers for visible focus.

## Performance Optimizations
- Code-splitting via Vite.
- Lazy loading of HLS.js.
- Adaptive visualizer quality.
- FPS and performance overlays for diagnostics.
- Minimal re-renders via primitive selectors in Zustand.

## Storybook Links
- No Storybook present.
