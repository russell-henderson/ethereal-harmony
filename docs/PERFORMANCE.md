# Performance & Scalability

## Bottlenecks & Hotspots

- Visualizer rendering (WebGL/Three.js) is the main performance hotspot.
- Audio playback is lightweight; bottlenecks are rare.

## Caching Layers

- No HTTP or CDN caching; all assets are static and loaded via Vite.

## Load/Soak Test Plan

- Manual browser testing on a range of devices and browsers.
- Use in-app FPS and performance overlays to monitor.

## Performance Budgets

- Target 60 FPS on modern hardware.
- Bundle size kept minimal by lazy-loading heavy dependencies (e.g., hls.js).

## Autoscaling Policies

- Not applicable (static SPA, no backend).
