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
  - Enhanced shadows: `0 2px 8px rgba(0, 0, 0, 0.2)`
  - Glass opacity: `0.75` for authentic glassmorphism
- **Typography**:
  - Titles: Montserrat (700)
  - Body: Lato (400)
- **Accessibility**: WCAG AA contrast, full keyboard navigation, ARIA roles for custom controls
- **Privacy**: All data stored locally (playlists, settings, EQ)
- **Media Support**:
  - Local file playback with drag & drop
  - Streaming (HLS with native + `hls.js` fallback)
  - Hardware media key integration (via MediaSession API)
- **Collapsible Interface**:
  - TopBar with up/down toggle
  - SidePanel with left/right toggle
  - LED light indicator with pulsing animation

---

## 🆕 Recent Updates (Latest)

### 🎯 Major New Features

- **Functional Audio Player**: All controls now fully working with PlaybackController
- **File Upload System**: Upload and play local audio files instantly
- **Collapsible Panels**: Hide/show TopBar and SidePanel for more screen space
- **Enhanced Glassmorphism**: Consistent visual effects across all UI elements

### 🎵 Player Improvements

- **Transport Controls**: Working play/pause, previous/next track buttons
- **Progress Bar**: Real-time playback progress with seek functionality
- **Volume System**: Functional volume slider and mute controls
- **Speed Control**: Playback rate adjustment from 0.5x to 2x
- **Time Display**: Current time and duration indicators

### 🎨 UI Enhancements

- **Layout Refinements**: Better spacing, sizing, and positioning
- **Navigation Cleanup**: Organized menu structure and search placement
- **Responsive Design**: Improved mobile and desktop experience
- **Visual Consistency**: Unified glassmorphism effects throughout

---

## 📂 Project Structure

```bash
src/
components/
layout/ # TopBar, SidePanel, AppShell, SearchBar
player/ # PlayerCard, MediaKeyBridge
settings/ # SettingsPanel, EqPanel, VisualizerControls, AudioDevicePicker
visualizer/ # SceneCanvas (primary canvas wrapper)
lib/
audio/ # AudioEngine, HlsController, EQGraph, PlaybackController
state/ # useUIStore, usePlayerStore, useVizStore
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

- **PlaybackController** handles play/pause/seek/rate/volume
- **File Upload**: Direct file loading with automatic playback
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

## 🎮 How to Use

### Audio Player

1. **Upload Audio**: Click the upload button (↑) to select local audio files
2. **Playback Controls**: Use the large center buttons for play/pause, previous/next
3. **Progress**: Click/drag on the progress bar to seek through tracks
4. **Volume**: Adjust with the slider or mute with the speaker button
5. **Speed**: Change playback rate with the dropdown selector

### Interface

- **Hide TopBar**: Click the up carrot (^) in the top-right
- **Hide SidePanel**: Click the left chevron (←) in the navigation header
- **Keyboard Shortcuts**:
  - `Ctrl/Cmd + B`: Toggle SidePanel
  - `Escape`: Close SidePanel

---

## ✅ Accessibility Checklist

- Keyboard navigation verified for all custom components
- Proper ARIA roles in buttons, sliders, toggles
- WCAG AA contrast enforced
- Screen reader labels added where applicable
- Collapsible panels maintain accessibility when hidden

---

## 🧹 Code Quality

- TypeScript strict mode
- ESLint + Prettier configured
  - ```tsc --noEmit```
  - ```eslint . --ext .ts,.tsx```
- CSS order lint rule ensures ```tokens.css``` always imports first

---

## 📜 Changelog

For detailed information about all changes, see [CHANGELOG.md](./CHANGELOG.md).

### Recent Highlights

- ✅ **Functional Audio Player**: All controls now working
- ✅ **File Upload System**: Local audio file support
- ✅ **Collapsible Interface**: Hide/show panels for space
- ✅ **Enhanced Glassmorphism**: Consistent visual effects
- ✅ **Navigation Cleanup**: Organized menu structure
- ✅ **Responsive Design**: Better mobile/desktop experience

---

## 🧭 Roadmap (V1)

- [ ] Add missing icons for Playlists and Discovery navigation
- [ ] Implement playlist management functionality
- [ ] Add audio format detection and validation
- [ ] Enhance visualizer integration with audio playback
- [ ] Add keyboard shortcuts for all player controls
- [ ] Implement audio metadata extraction from uploaded files

---

## 📄 License

MIT © 2025 Ethereal Harmony contributors
