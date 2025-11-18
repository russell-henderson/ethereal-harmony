---
Version: 1.0.0
Last Updated: 2025-11-17
Status: Draft
Owner: Russell Henderson
---

# Ethereal Harmony Executive Summary

## 1. Vision and Overview

Ethereal Harmony is a premium in browser music player and audio visualizer that treats local and streamed audio as a first class creative experience. It combines a refined interface, high quality audio controls, and real time visualizations into a single page application that runs entirely on the client.

There is no backend service today. All data and preferences live in the browser using LocalStorage, IndexedDB, and the Cache API. The app is designed to feel like a desktop grade player while remaining portable and easy to host as a static site.

## 2. Product Positioning

**Product type**

- Modern web music player with integrated visualizer  
- Progressive web app that can be installed and used like a desktop client  
- Fully local experience with optional streaming support via HLS

**Positioning summary**

- For users who care about listening experience, visual ambience, and control  
- More polished and opinionated than a bare playlist tool  
- Less complex than a full streaming ecosystem or DJ workstation

For detailed product requirements, see `docs/PRD.md`.

## 3. Target Users and Core Use Cases

**Primary target users**

- Power listeners who maintain personal music libraries on disk  
- Creators and developers who want a reference quality, frontend only player  
- Focus and ambience users who play long sessions with visual background scenes

**Core use cases**

1. Load local tracks or folders and listen with high quality controls  
2. Build and manage queues and lightweight playlists  
3. Run the visualizer on a secondary screen as a backdrop  
4. Adjust visualizer quality to match device performance  
5. Customize theme, density, and motion preferences to match the environment

## 4. Current Status

**Stage**

- Mature prototype with production ready architecture  
- Frontend feature set is coherent and stable  
- No public deployment or distribution pipeline defined yet

**What exists today**

- Full React plus Vite plus TypeScript codebase  
- Strong documentation set under `docs/` with PRD, architecture, security, and accessibility  
- Local audio playback, basic streaming support, visualizers, and settings  
- Instrumentation hooks and diagnostics foundations

**What does not exist yet**

- Real backend, multi device sync, or user accounts  
- Automated test suite beyond tooling configuration  
- Release and packaging strategy for broader distribution

## 5. Key Capabilities

**Listening and control**

- Local file playback through modern browsers  
- HLS streaming support for compatible remote sources  
- Queue management and now playing view  
- Transport controls, timeline seek, volume, and basic EQ presets  
- Audio device selection where supported by the browser

**Visualizer and ambience**

- Three.js based visualizer scenes driven by Web Audio analysis  
- Preset selection for different looks and behaviors  
- Quality and performance controls, including HDR and dimming  
- Reduced motion support that respects user preference

**Interface and settings**

- Single page layout with navigation for Library, Discovery, Queue, Playlists, and Settings  
- Theme and density controls for different screens and environments  
- Keyboard shortcuts and shortcut reference view  
- Diagnostics overlay for development and performance tuning

## 6. Architecture Summary

**High level design**

- Single page React app bundled by Vite  
- Domain focused state using Zustand stores for player, visualizer, settings, and UI  
- Web Audio based engine for playback and analysis  
- Three.js based renderer for the visualizer layer  
- Strong separation between UI components and domain logic under `src/lib`

**Persistence**

- LocalStorage and IndexedDB for settings, playlists, and library metadata  
- Browser cache for assets  
- No remote database, API, or authentication layer at this time

For deeper detail, see:

- `docs/FRONTEND.md` for component and routing structure  
- `docs/DATABASE.md` for browser side data models  
- `STATE_MANAGEMENT.md` for store design and usage patterns

## 7. UX and Brand Summary

**Experience goals**

- Feel like a dedicated music client, not a generic website  
- Emphasize clarity, elegance, and legibility  
- Provide a calm default visual style with optional higher energy presets  
- Respect accessibility and reduced motion preferences

**Brand characteristics**

- Minimal and premium visual language  
- Glass and glow surface treatments with careful contrast  
- Thoughtful use of color to distinguish active state and status  
- Consistent typography and spacing system

Brand and visual rules are documented in `BRAND_GUIDELINES.md` and `docs/BRAND_GUIDELINES.md`.

## 8. Non Functional Characteristics

**Performance**

- Client only architecture avoids network latency for core flows  
- Visualizer quality can be tuned per device  
- Use of virtualized lists and lazy loading for large libraries  
- Diagnostics support for monitoring frame rate and key metrics

**Accessibility**

- Keyboard shortcuts and focus management utilities  
- Reduced motion handling for sensitive users  
- Color and contrast helpers for theme design  
- Documented accessibility goals in `docs/ACCESSIBILITY.md`

**Security and privacy**

- No user accounts and no server side session data  
- All data stored locally in the browser  
- Threat model and security posture described in `docs/SECURITY.md`

## 9. Known Limitations and Risks

- No true backend or synchronization across devices  
- Playlists and library metadata cannot be shared or backed up automatically  
- Automated tests are not yet implemented despite tooling and a written test plan  
- Performance on very low power devices can degrade with high visualizer settings  
- Browser feature support for advanced audio routing is uneven across platforms

These limitations should be considered when positioning the app as a product versus a reference implementation.

## 10. Top Priorities for the Next Iteration

The following priorities guide near term work and are reflected in `IMPROVEMENTS.md` and `TASK_LIST.md` once they exist.

1. **Testing and quality baseline**  
   - Implement initial unit tests for core state stores and audio engine  
   - Add at least one Playwright smoke test for basic playback flows

2. **Documentation alignment with Pivotal system**  
   - Add version headers to all major docs  
   - Introduce `ARCHITECTURE.md` as the canonical architecture index  
   - Clarify which docs describe current behavior versus future plans

3. **Explicit improvements and task catalog**  
   - Create `IMPROVEMENTS.md` with a structured list of enhancements  
   - Create `TASK_LIST.md` with machine and human friendly tasks

4. **Performance and UX polish for visualizer**  
   - Refine quality presets and defaults for common hardware profiles  
   - Improve feedback when performance guard rails adjust settings

5. **Distribution and packaging plan**  
   - Decide how Ethereal Harmony will be shared  
   - Define minimal deployment steps for static hosting and PWA usage
