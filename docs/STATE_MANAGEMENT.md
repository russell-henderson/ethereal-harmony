---
Version: 1.0.0
Last Updated: 2025-01-27
Status: Draft
Owner: Russell Henderson
---

# State Management

Ethereal Harmony uses **Zustand** for state management with domain-focused stores. This document describes each store's responsibilities, main actions, and when to extend existing stores versus creating new ones.

For broader architectural context, see [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md). For component-level usage patterns, see [`docs/FRONTEND.md`](./docs/FRONTEND.md).

---

## Store Overview

All stores are located in `src/lib/state/`:

- `usePlayerStore.ts` - Playback queue, current track, and transport state
- `useVizStore.ts` - Visualizer configuration and presets
- `useSettingsStore.ts` - User preferences, theme, and view routing
- `useUIStore.ts` - Ephemeral UI state (modals, side panel, diagnostics)

---

## Store Details

### 1. `usePlayerStore`

**Location:** `src/lib/state/usePlayerStore.ts`

**Responsibilities:**
- Source of truth for playback queue and current track index
- Playlist management (create, delete, add/remove tracks)
- Delegates transport operations (play/pause/seek) to `PlaybackController`
- Tracks play counts and discovery metadata

**State:**
- `queue: Track[]` - Ordered list of tracks
- `index: number` - Current track index (-1 if empty)
- `current: Track | null` - Currently loaded track
- `playbackState: "idle" | "loading" | "playing" | "paused" | "error"`
- `isPlaying: boolean` - Transport state (delegated to engine)
- `position: number` - Current playback position (seconds)
- `duration: number` - Track duration (seconds)
- `volume: number` - Volume level (0..1)
- `muted: boolean` - Mute state
- `playbackRate: number` - Playback speed (0.25..4)
- `playlists: Playlist[]` - User-created playlists
- `hasHydrated: boolean` - Persistence hydration flag

**Main Actions:**
- `setQueue(tracks, startIndex?)` - Replace queue and optionally start playing
- `addToQueue(track)` - Append track to queue
- `addManyToQueue(tracks)` - Append multiple tracks
- `removeFromQueue(index)` - Remove track by index
- `removeTrackFromQueue(trackId)` - Remove track by ID
- `clearQueue()` - Empty the queue
- `setCurrentIndex(idx)` - Change current track and load it
- `next()` - Advance to next track
- `prev()` - Go to previous track
- `playIndex(idx)` - Play track at specific index
- `play()` / `pause()` / `togglePlay()` - Transport controls (delegated)
- `seek(seconds)` - Seek to position (delegated)
- `addToPlaylist(playlistId, trackId)` - Add track to playlist
- `removeFromPlaylist(playlistId, trackId)` - Remove track from playlist
- `deletePlaylist(playlistId)` - Delete a playlist

**Persistence:**
- Persists: `queue`, `index`, `playlists`
- Does NOT persist: transport state (playing, position, volume) - engine owns these

**Selectors:**
- `selectMostPlayed(count?)` - Top N most played tracks
- `selectRecentlyAdded(count?)` - Recently added tracks
- `selectNotPlayedYet()` - Tracks never played

---

### 2. `useVizStore`

**Location:** `src/lib/state/useVizStore.ts`

**Responsibilities:**
- Visualizer preset selection and parameter management
- Theme configuration for visualizer
- HDR and dimmer toggle states
- Provides curated parameters to Three.js scenes

**State:**
- `theme: "dark" | "system"` - Visualizer theme
- `hdr: boolean` - HDR post-processing enabled
- `dimmer: boolean` - Brightness reduction enabled
- `presetId: "nebula" | "glass-waves" | "strobe-pulse"` - Active preset
- `params: VizParams` - Visualizer parameters (intensity, bloom, motionScale, smooth, colors, particleCount)
- `hasHydrated: boolean` - Persistence hydration flag

**Main Actions:**
- `setParam(key, value)` - Update a single parameter with clamping
- `setPreset(id)` - Apply a curated preset
- `cyclePreset()` - Cycle through presets in order
- `toggleHDR()` - Toggle HDR post-processing
- `toggleDimmer()` - Toggle brightness reduction

**Persistence:**
- Persists: `theme`, `hdr`, `dimmer`, `presetId`, `params`
- All parameters are clamped to safe ranges on load

**Selectors:**
- `selectHasHydrated`, `selectHDR`, `selectDimmer`, `selectPresetId`
- `selectIntensity`, `selectBloom`, `selectMotionScale`, `selectSmooth`, `selectParticleCount`

**Non-React Helpers:**
- `getVizParams()` - Get current params (for render loops)
- `getVizToggles()` - Get HDR/dimmer state
- `cyclePreset()` - Imperative preset cycling

---

### 3. `useSettingsStore`

**Location:** `src/lib/state/useSettingsStore.ts`

**Responsibilities:**
- User preferences and application settings
- View routing (player, settings, stream)
- Theme management (applies CSS classes to `<html>`)
- Visualizer quality presets
- Accessibility settings (reduced motion)
- Feature toggles (hotkeys, diagnostics)

**State:**
- `theme: "dark" | "system"` - Application theme
- `view: "player" | "settings" | "stream"` - Current view/route
- `reducedMotion: boolean | undefined` - Reduced motion override (undefined = follow system)
- `vizPreset: "low" | "medium" | "high" | "ultra"` - Visualizer quality preset
- `hdrEnabled: boolean` - HDR toggle state
- `dimmerEnabled: boolean` - Dimmer toggle state
- `dimmerStrength: number` - Dimmer intensity (0..1)
- `hotkeysEnabled: boolean` - Global hotkeys enabled
- `showStats: boolean` - Performance overlay visible
- `searchQuery: string` - Search input (ephemeral, not persisted)
- `hasHydrated: boolean` - Persistence hydration flag

**Main Actions:**
- `setTheme(mode)` - Set theme and apply CSS classes
- `toggleTheme()` - Cycle between dark and system
- `setView(view)` - Navigate to view (updates hash routing)
- `setReducedMotion(value)` - Override reduced motion preference
- `setVizPreset(id)` - Set visualizer quality preset
- `setHdrEnabled(on)` - Toggle HDR
- `setDimmerEnabled(on)` - Toggle dimmer
- `setDimmerStrength(value)` - Set dimmer intensity (clamped 0..1)
- `setHotkeysEnabled(on)` - Toggle global hotkeys
- `setShowStats(on)` - Toggle performance overlay (dispatches DOM event)
- `setSearchQuery(query)` - Update search input

**Persistence:**
- Persists: `theme`, `view`, `reducedMotion`, `vizPreset`, `hdrEnabled`, `dimmerEnabled`, `dimmerStrength`, `hotkeysEnabled`, `showStats`
- Does NOT persist: `searchQuery` (ephemeral)

**Side Effects:**
- Updates `<html>` classList with `theme-dark` or removes theme classes
- Dispatches `eh:viz:stats` CustomEvent when `showStats` changes

**Selectors:**
- `selectHasHydrated`, `selectView`, `selectTheme`
- `selectReducedMotionOverride`, `selectEffectiveReducedMotion()` - Falls back to system preference
- `selectVizPreset`, `selectHdrEnabled`, `selectDimmerEnabled`, `selectDimmerStrength`
- `selectHotkeysEnabled`, `selectShowStats`

---

### 4. `useUIStore`

**Location:** `src/lib/state/useUIStore.ts`

**Responsibilities:**
- Ephemeral UI state that doesn't belong in domain stores
- Layout state (side panel, controls pinning)
- Modal management
- Diagnostics overlay state
- Layout measurements

**State:**
- `mainView: "library" | "playlists" | "discovery"` - Main content view
- `sidePanelOpen: boolean` - Side panel visibility
- `controlsPinned: boolean` - Controls rail pinned state
- `topBarHeight: number` - Measured top bar height (ephemeral)
- `splitPaneLayout?: { leftPaneWidth: string }` - Split pane layout settings (optional, persisted)
- `showFps: boolean` - FPS overlay visible
- `modal: "none" | "hotkeys" | "about" | "stream-wizard" | "device-picker"` - Active modal

**Main Actions:**
- `setMainView(view)` - Switch main content view
- `setSidePanelOpen(open)` - Show/hide side panel
- `toggleSidePanel()` - Toggle side panel
- `setControlsPinned(v)` - Pin/unpin controls rail
- `toggleControlsPinned()` - Toggle controls pinning
- `setTopBarHeight(px)` - Update measured height (clamped 32..128px)
- `setSplitPaneLayout(layout)` - Update split pane layout settings
- `setShowFps(v)` - Show/hide FPS overlay
- `toggleFps()` - Toggle FPS overlay
- `openModal(modal)` - Open a modal
- `closeModal()` - Close current modal
- `resetEphemeral()` - Reset non-persisted state

**Persistence:**
- Persists: `sidePanelOpen`, `controlsPinned`, `splitPaneLayout`, `showFps`
- Does NOT persist: `modal`, `topBarHeight` (ephemeral)

**Selectors:**
- `selectSidePanelOpen`, `selectControlsPinned`, `selectShowFps`
- `selectModal`, `selectTopBarHeight`

**Non-React Helpers:**
- `openModal(modal)`, `closeModal()`, `toggleSidePanel()`, `setSidePanelOpen(open)`, `toggleFps()`

---

## Persistence Strategy

All stores use Zustand's `persist` middleware with LocalStorage:

- **Persisted:** User choices that should survive sessions (theme, queue, playlists, visualizer presets, layout preferences)
- **Not Persisted:** Ephemeral state (modals, search queries, transport position, measured dimensions)
- **Migration:** All stores include `migrate` functions to handle schema changes across versions
- **Hydration:** Stores expose `hasHydrated` flags so components can wait for persistence to complete

**Storage Keys:**
- `player-v2` - Player store
- `viz-v1` - Visualizer store
- `eh-settings-v3` - Settings store
- `ui-v1` - UI store

---

## When to Add a New Store vs Extend an Existing One

### Extend an Existing Store When:

1. **The state is closely related to an existing domain:**
   - Adding new visualizer parameters → extend `useVizStore`
   - Adding new player controls → extend `usePlayerStore`
   - Adding new user preferences → extend `useSettingsStore`
   - Adding new UI overlays/modals → extend `useUIStore`

2. **The state shares the same persistence lifecycle:**
   - If it should be saved/restored with other state in that store
   - If it has the same migration needs

3. **The state is accessed together:**
   - If components typically need both the existing state and the new state together

### Create a New Store When:

1. **The state represents a distinct domain:**
   - Examples: `useLibraryStore` (if library indexing becomes complex), `useAuthStore` (if authentication is added), `useSyncStore` (if multi-device sync is added)

2. **The state has different persistence requirements:**
   - Needs IndexedDB instead of LocalStorage
   - Should not be persisted at all
   - Has a different migration strategy

3. **The state is accessed independently:**
   - If most components that need the new state don't need existing store state
   - If it would bloat an existing store with unrelated concerns

4. **The state has different update frequencies:**
   - High-frequency updates (e.g., real-time analytics) might benefit from isolation
   - Very stable state (e.g., app configuration) might be better separate

### Decision Checklist:

- [ ] Does this state logically belong to an existing domain? → Extend
- [ ] Will this state be accessed with existing state? → Extend
- [ ] Does this state have different persistence needs? → New store
- [ ] Is this a new domain that doesn't fit existing stores? → New store
- [ ] Will extending an existing store make it too large (>500 lines)? → Consider new store

---

## Best Practices

### Using Stores in Components

1. **Use primitive selectors to minimize re-renders:**
   ```ts
   // Good: Only re-renders when intensity changes
   const intensity = useVizStore(selectIntensity);
   
   // Avoid: Re-renders on any params change
   const params = useVizStore(s => s.params);
   ```

2. **Wait for hydration before reading persisted values:**
   ```ts
   const hasHydrated = useSettingsStore(selectHasHydrated);
   if (!hasHydrated) return <Loading />;
   ```

3. **Use imperative helpers in non-React code:**
   ```ts
   // In Three.js render loop or event handlers
   import { getVizParams } from '@/lib/state/useVizStore';
   const params = getVizParams();
   ```

### Store Implementation

1. **Keep stores focused on a single domain**
2. **Export stable primitive selectors**
3. **Clamp and validate values in actions**
4. **Include migration functions for schema changes**
5. **Document side effects (DOM updates, events)**

---

## Related Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) - System architecture and state layer overview
- [`docs/FRONTEND.md`](./docs/FRONTEND.md) - Component structure and state usage patterns
- [`docs/TEST_PLAN.md`](./docs/TEST_PLAN.md) - Testing strategy for state stores
