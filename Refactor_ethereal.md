Here is a consolidated, final refactor plan that covers the whole layout and calls out what is still missing, including visualizer controls, SplitPane, `useUIStore`, and documentation checks.

---

## **1\. Goal**

Refactor Ethereal Harmony’s UI so it matches the visionboard layout:

* Persistent bottom player bar  
* Top header with menu and search  
* Left navigation column  
* Visualizer controls strip above content  
* Split pane main content (left list, right detail)

while preserving all existing player and navigation behavior.

---

## **2\. Target Layout Structure**

Logical components mapped to the annotated screenshot:

* `AppShell`  
    
  * `AppTopBar` (A \+ B)  
      
    * Menu bar  
    * Global search and top level actions

    

  * `VisualizerToolbar` (G)  
      
  * `BodyGrid`  
      
    * `NavSidebar` (D, D1, D2, D3)  
    * `MainContent` (E1, E2, E3)

    

  * `BottomPlayerBar` (F, F1, F2, F3, F4, F5)

---

## **3\. Phase 1 – Bottom Player Bar**

**Files**

* `src/components/layout/AppShell.tsx`  
* `src/components/player/PlayerCard.tsx`  
* `src/components/player/BottomPlayerBar.tsx` (new)  
* `src/components/player/PlaybackButtons.tsx`  
* `src/components/player/VolumeSlider.tsx`  
* `src/components/player/TransportBar.tsx`

**Tasks**

1. Create `BottomPlayerBar` and mount it in `AppShell` as the only player surface.  
     
   * Left: `PlayerVolumeSection` (volume and mute)  
   * Center left: `NowPlayingInfo` (art, title, artist, album, progress bar)  
   * Center: `PlayerTransport` (prev, play or pause, next)  
   * Center right: secondary actions (upload, cast, etc)  
   * Right: time display and playback speed selector

   

2. Extract the above sections out of `PlayerCard` and wire them to `usePlayerStore` and the audio engine.  
     
3. Update `AppShell` to add bottom padding so content does not sit under the bar.  
     
4. Remove or hide the old `PlayerCard` from main content once the bottom bar is stable.

**Behavior checks**

* Play, pause, previous, next, seek, volume, and speed all work exactly as before.  
* The bar shows a safe empty state when no track is loaded.  
* Keyboard shortcuts call the same handlers as the buttons.

---

## **4\. Phase 2 – Main Content Split Pane**

**Files**

* `src/components/layout/AppShell.tsx` (main content grid)  
* `src/components/layout/SplitPane.tsx` (new)  
* `src/components/LibraryView.tsx`  
* `src/components/PlaylistsView.tsx`  
* `src/components/DiscoveryView.tsx`

**Tasks**

1. Create `SplitPane` component that implements the E1, E2, E3 structure:  
     
   * Left pane (E1) `paneLeft`  
   * Right header (E2) `paneRightHeader`  
   * Right body (E3) `paneRightBody`

   

   Use CSS grid or flex so left and right are independently scrollable.

   

2. In `AppShell`, wrap the main route outlet with `SplitPane` or a `MainContent` that uses it.  
     
3. Update `LibraryView`, `PlaylistsView`, and `DiscoveryView` to render:  
     
   * E1: main list (tracks, playlists, discovery results)  
   * E2: filters, sort controls, or queue header  
   * E3: active item detail or queue contents

   

4. Add reusable `EmptyState` for E1 and E3 with clear messages like “No tracks found”.

**Behavior checks**

* Switching nav views does not reset the queue or player state.  
* Both panels scroll independently without jitter.  
* Empty states appear in the correct pane and react to search or filters.

---

## **5\. Phase 3 – Top Bar and Navigation**

**Files**

* `src/components/layout/AppTopBar.tsx`  
* `src/components/layout/MenuBar.tsx`  
* `src/components/layout/TopBar.tsx` (or combined)  
* `src/components/layout/NavSidebar.tsx`  
* `src/components/layout/SidePanel.tsx` (if existing)

**Tasks**

1. Consolidate header parts into `AppTopBar`:  
     
   * `MenuBar` with File, View, Analyze, Tools, Help  
   * Global search input and search options  
   * Profile, settings, diagnostics icons

   

2. Update `NavSidebar`:  
     
   * `NavSidebarToggle` for collapse  
   * `NavSidebarSearch` for local library search  
   * `NavSidebarItems` for Library, Playlists, Discovery

   

3. Wire both header and nav to `useUIStore` state (see Phase 5\) for:  
     
   * Active view  
   * Sidebar collapsed state

**Behavior checks**

* Menu bar is always visible and keyboard reachable.  
* Search from top bar and sidebar both filter Library in a predictable way.  
* Nav items show correct active highlighting.

---

## **6\. Phase 4 – VisualizerToolbar Decision and Wiring  ✅ (Missing piece 1\)**

**Files**

* `src/components/layout/AppShell.tsx`  
* `src/components/visualizer/VisualizerToolbar.tsx` (new)  
* `src/lib/state/useVizStore.ts`  
* `src/lib/three` and `src/lib/visualizer` modules

**Decision**

Keep visualizer quick controls in a dedicated strip directly under the top bar and above the split pane, exactly as in the annotated G region.

**Tasks**

1. Create `VisualizerToolbar` that hosts:  
     
   * Preset selector (optional)  
   * HDR toggle and HDR intensity slider or fixed level  
   * Dimmer toggle and dimmer strength control

   

2. Bind controls to `useVizStore` fields:  
     
   * `hdrEnabled`, `hdrIntensity`  
   * `dimmerEnabled`, `dimmerStrength`  
   * Optional `activePresetId`

   

3. Ensure `VisualizerToolbar` is mounted once in `AppShell` and remains visible regardless of view.  
     
4. Confirm `useVizStore` changes drive the Three.js visualizer:  
     
   * Visualizer scene reads from the store rather than independent internal flags.  
   * Toggling toolbar controls updates uniforms or parameters in the Three.js scene.

   

5. Integrate reduced motion:  
     
   * If reduced motion is active, scale down intensity or restrict presets inside toolbar logic.

**Behavior checks**

* Any change in toolbar controls visibly affects the visualizer.  
* Settings persist across reloads if you already sync `useVizStore` to storage.  
* Reduced motion users see a safe, low motion preset by default.

---

## **7\. Phase 5 – State Design in useUIStore and Documentation  ✅ (Missing piece 2\)**

**Files**

* `src/lib/state/useUIStore.ts`  
* `STATE_MANAGEMENT.md`

**Tasks**

1. Define clear UI state in `useUIStore`:  
     
   * `activeView` for Library, Playlists, Discovery, other views  
   * `isSidebarCollapsed`  
   * Optional `splitPaneLayout` settings (for example, left pane width)  
   * Modal and panel flags (settings open, shortcuts open, etc)

   

2. Make `NavSidebar`, `AppTopBar`, and `MainContent` all read or write these fields:  
     
   * Nav items set `activeView`.  
   * Split pane chooses which view component to render based on `activeView`.  
   * Toggle buttons read and update `isSidebarCollapsed`.

   

3. Update `STATE_MANAGEMENT.md` so it accurately describes:  
     
   * All fields in `useUIStore`, `usePlayerStore`, `useVizStore`, `useSettingsStore`.  
   * When to add new UI flags to `useUIStore` versus local component state.  
   * How visualizer and diagnostics state fit into the overall picture.

**Behavior checks**

* Changing view through nav or top menu updates one source of truth, `activeView`.  
* Collapsing sidebar updates `isSidebarCollapsed` and the layout responds consistently.  
* The doc matches the actual code state, no phantom fields.

---

## **8\. Phase 6 – Styling and Responsive Layout**

**Files**

* `src/styles/globals.css`  
* `src/styles/tokens.css`  
* Component CSS or modules for `AppShell`, `NavSidebar`, `SplitPane`, `BottomPlayerBar`, `VisualizerToolbar`

**Tasks**

1. Add fixed bottom bar styling and main content padding bottom to clear the bar.  
     
2. Define layout tokens in `tokens.css` for:  
     
   * Split pane widths  
   * Bottom bar height  
   * Breakpoints used to collapse split pane into stacked layout

   

3. Add responsive rules:  
     
   * On narrow screens, split pane stacks vertically while the bottom bar remains pinned.  
   * VisualizerToolbar remains accessible and does not clip.

**Behavior checks**

* At all widths, nothing overlaps the bottom player bar.  
* The visualizer and content remain usable on tablet and mobile widths.

---

## **9\. Phase 7 – Accessibility and Tests**

**Files**

* Components for header, nav, split pane, visualizer toolbar, bottom bar  
* Test suite (Vitest and Playwright config)

**Tasks**

1. Accessibility checks:  
     
   * Tab order through header, nav, main content, visualizer controls, and bottom bar.  
   * Proper aria labels for play or pause, previous, next, progress slider, volume, HDR, Dimmer, and speed.  
   * Screen reader announcements for empty states and active track.

   

2. Keyboard and reduced motion:  
     
   * Ensure keyboard shortcuts still work with new layout.  
   * Verify reduced motion behavior in visualizer and any animated transitions.

   

3. Tests:  
     
   * Add unit tests for `useUIStore` and the player stores.  
   * Add Playwright smoke test that runs through load, play, pause, and seek in the new layout.

---

## **10\. Phase 8 – Documentation, Images, and Diagrams  ✅ (Missing piece 3 and 4\)**

**Files and scripts**

* `docs/FRONTEND.md`  
* `docs/ARCHITECTURE.md`  
* `docs/MASTER_OVERVIEW.md`  
* `docs/STATE_MANAGEMENT.md` (already covered above)  
* `docs/diagrams/*.mmd`  
* `check-md-images.mjs`  
* Screenshots for updated layout

**Tasks**

1. Run `npm run check:md-images` and fix any broken links or outdated screenshots.  
     
2. Replace existing UI screenshots in docs with ones that show:  
     
   * Bottom player bar  
   * VisualizerToolbar  
   * Split pane main content

   

3. Update diagrams:  
     
   * Architecture diagram to show `AppTopBar`, `VisualizerToolbar`, `NavSidebar`, `MainContent`, `BottomPlayerBar`.  
   * Any sequence or layout diagrams that referenced the old `PlayerCard` position.

   

4. Ensure `FRONTEND.md` and `ARCHITECTURE.md` describe:  
     
   * The new component hierarchy.  
   * Relationships between `useUIStore`, `usePlayerStore`, `useVizStore`, and the layout.

---

With these phases, including the four missing pieces you highlighted, you have a complete refactor plan that carries the layout all the way to parity with the visionboard and keeps state, visualizer behavior, tests, and documentation in sync.  
