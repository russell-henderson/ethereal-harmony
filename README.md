<picture width="500">
  <img
    src="https://github.com/russell-henderson/ethereal-harmony/blob/master/src/assets/title.jpg?raw=true"
    alt="Ethereal Harmony Music App"
  />
</picture>



# 🎶 Ethereal Harmony

A high-performance, immersive web audio player with a real-time, audio-reactive Three.js visualizer and a sleek glassmorphism UI. Built for speed, accessibility, and trust — all data stays local by default.

---

## ✨ Features

- **Modern Stack**: React 18 + TypeScript + Vite
- **Visualizer**: Three.js (WebGLRenderer) with adaptive quality presets
- **State Management**: Zustand with domain-driven stores (`usePlayerStore`, `useVizStore`)
- **Animations**: Framer Motion for smooth material-style interactions
- **Glassmorphism UI**:
  - Border radius: 16px  
  - Backdrop blur: 16px  
  - Background: `rgba(255, 255, 255, 0.12)`  
  - Border: `1px solid rgba(255, 255, 255, 0.25)`
- **Typography**:
  - Titles: Montserrat (700)
  - Body: Lato (400)
- **Accessibility**: WCAG AA contrast, full keyboard navigation, ARIA roles for custom controls
- **Privacy**: All data stored locally (playlists, settings, EQ)
- **Media Support**:
  - Local file playback
  - Streaming (HLS with native + `hls.js` fallback)
  - Hardware media key integration (via MediaSession API)

---

## 📂 Project Structure

```bash
src/
components/
player/ # PlayerCard, MediaKeyBridge
settings/ # SettingsPanel, EqPanel, VisualizerControls, AudioDevicePicker
visualizer/ # SceneCanvas (primary canvas wrapper)
lib/
audio/ # AudioEngine, HlsController, EQGraph
state/ # usePlayerStore, useVizStore
utils/ # IconRegistry, useHotkeys
visualizer/ # SceneController, QualityPresets
shaders/ # Particle + postprocessing shaders
styles/
tokens.css # Design tokens (glass, palette)
globals.css # Global resets + imports tokens.css first
```


---

## ⚡ Performance

- Target **55–60 FPS** on mid-range hardware
- Lazy loading + dynamic imports (`hls.js` only loaded if needed)
- Adaptive quality presets scale particle counts & resolution
- Pauses rendering when tab is hidden
- Lightweight, incremental re-renders

---

## 🔊 Audio

- **PlaybackController** handles play/pause/seek/rate
- **EQ**:
  - `EqPanel.tsx` for UI
  - `EQGraph.ts` connected to `AudioEngine.ensureEq()`
  - Presets available, with gain/bypass toggles
- **Output Device Management**:
  - Migrated to `OutputDeviceManager`
  - Accessible through `AudioDevicePicker.tsx`

---

## 📺 Visualizer

- Single entry: `SceneCanvas.tsx`
- Controlled by `SceneController.ts` (quality, uniforms, scene lifecycle)
- Quality presets managed in `QualityPresets.ts`
- Presets: Nebula, Glass Waves, Strobe Pulse
- Stats overlay optional (`eh.dev.showStats` flag)

---

## 📡 HLS Playback

- **Safari / iOS**: Native HLS support
- **Chromium / Firefox**: Fallback to [`hls.js`](https://github.com/video-dev/hls.js)
- `hls.js` is shipped as a dependency but loaded dynamically at runtime  
  → Keeps bundle size lean while avoiding playback failures

---

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm 9+ or yarn 3+

### Install

```bash
npm install
```

### Run Dev

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

---

## ✅ Accessibility Checklist

- Keyboard navigation verified for all custom components
- Proper ARIA roles in buttons, sliders, toggles
- WCAG AA contrast enforced
- Screen reader labels added where applicable

---

## 🧹 Code Quality

- TypeScript strict mode
- ESLint + Prettier configured
  - ```tsc --noEmit```
  - ```eslint . --ext .ts,.tsx```
- CSS order lint rule ensures ```tokens.css``` always imports first

---

## 📜 Changelog (Highlights)

- Removed experiments: Deprecated ```WebGLCanvas.tsx```, unified on ```SceneCanvas```
- EQ Integration: ```EqPanel``` wired to ```AudioEngine.ensureEq()```
- Device Management: Consolidated into ```OutputDeviceManager```
- Settings Panel: Centralized HDR, Dimmer, Visualizer preset, and FPS stats
- HLS Support: Added ```hls.js``` as dependency, documented Safari vs. Chromium path

---

## 🧭 Roadmap (V1)

- Finalize presets & shader bundling
- Add unit tests for EQ propagation
- Tighten adaptive quality scaling for low-end devices
- Minor polish for SettingsPanel UI

---

## 📄 License

MIT © 2025 Ethereal Harmony contributors
