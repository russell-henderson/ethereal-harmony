
# Changelog

> **Note:** All entries must include the date and time in 24-hour clock format (e.g., 2025-08-24 18:30). If the exact time is not known, use an approximate time for when the change was made or merged.

## [Unreleased] - Zustand Store Rewrite (2025-08-24 18:30)

### Changed


### Changed entry

All notable changes to the Ethereal Harmony project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-01-XX

### Added
- Session Utility Row: Added a persistent utility row to the app shell, featuring a mini now-playing summary (title, artist, duration), a live FPS/tier chip, and a queue size chip. All values are wired to real state and update live as playback and performance change. The row is styled using a new CSS module for maintainability and theme consistency.

### 🎯 Major Features Added

- **Collapsible TopBar**: Added up/down carrot buttons to hide/show the top bar
- **Collapsible SidePanel**: Implemented left/right chevron toggle to hide/show navigation panel
- **LED Light Indicator**: Restored and enhanced blue LED light circle with pulsing animation
- **Functional Audio Player**: All player controls now fully functional with PlaybackController integration

### 🎵 Player Functionality

- **Transport Controls**: Play/pause, previous/next track buttons now control actual audio playback
- **File Upload**: Upload button allows users to select and load local audio files
- **Progress Bar**: Real-time playback progress with seek functionality
- **Volume Controls**: Working volume slider and mute toggle
- **Playback Speed**: Speed control dropdown with rates from 0.5x to 2x
- **Time Display**: Shows current time and total duration

### 🎨 UI/UX Improvements

- **Glassmorphism Enhancement**: Applied consistent glassmorphism effects across all UI elements
  - Subtle drop shadows: `0 2px 8px rgba(0, 0, 0, 0.2)`
  - White stroke borders: `1px solid rgba(255, 255, 255, 0.25)`
  - Reduced opacity: `0.75` for more glass-like appearance
- **Layout Refinements**:
  - SidePanel width reduced to 260px for better spacing
  - Player controls increased by 30% for better usability
  - Album art placeholder increased by 50%
  - Volume slider extended to 200px width
- **Navigation Cleanup**:
  - Centered "Navigation" label in SidePanel header
  - Properly positioned search field in dedicated section
  - Clean menu structure for Library, Playlists, Discovery

### 🏗️ Architecture Improvements

- **State Management**: Fixed undefined function errors in SidePanel and TopBar
- **Event Handling**: Proper keyboard shortcuts (Ctrl/Cmd+B, Escape) for panel toggles
- **Component Structure**: Cleaner separation of concerns between layout components
- **Error Handling**: Added proper error handling for file uploads

### 🔧 Technical Fixes

- **Vite Configuration**: Resolved module resolution and alias issues
- **Linter Errors**: Fixed ARIA attribute validation issues
- **Component Props**: Added missing onClick handlers and event functions
- **CSS Organization**: Improved styling structure and consistency

### 📱 Responsive Design

- **Mobile Support**: Enhanced touch interactions for collapsible panels
- **Breakpoint Handling**: Proper desktop vs mobile behavior for SidePanel
- **Accessibility**: Maintained ARIA compliance throughout UI changes

## [Previous Versions]

### [0.2.0] - 2025-01-XX

- **EQ Integration**: EqPanel wired to AudioEngine.ensureEq()
- **Device Management**: Consolidated into OutputDeviceManager
- **Settings Panel**: Centralized HDR, Dimmer, Visualizer preset, and FPS stats
- **HLS Support**: Added hls.js as dependency, documented Safari vs. Chromium path

### [0.1.0] - 2025-01-XX

- **Initial Release**: Core audio player with Three.js visualizer
- **Glassmorphism UI**: Base design system implementation
- **Audio Engine**: Basic playback functionality
- **Visualizer**: SceneCanvas with quality presets

---

## 🚀 How to Use New Features

### Collapsible Panels

- **TopBar**: Click the up carrot (^) to hide, down carrot (v) to show
- **SidePanel**: Click the left chevron (←) to hide, right chevron (→) to show

### Audio Player

- **Upload**: Click upload button to select and load audio files
- **Playback**: Use transport controls to play/pause and navigate tracks
- **Seek**: Click/drag on progress bar to jump to specific times
- **Volume**: Adjust volume with slider or mute with button
- **Speed**: Change playback rate with dropdown selector

### Navigation

- **Keyboard Shortcuts**:
  - `Ctrl/Cmd + B`: Toggle SidePanel
  - `Escape`: Close SidePanel
- **Search**: Use search fields in both TopBar and SidePanel
- **Menu Items**: Access Library, Playlists, and Discovery sections

---

## 📋 Known Issues

- Some ARIA linter warnings persist (non-blocking)
- Volume slider may need fine-tuning for optimal UX
- File upload error handling could be enhanced with better user feedback

---

## 🔮 Next Steps

- [ ] Add missing icons for Playlists and Discovery navigation items
- [ ] Implement playlist management functionality
- [ ] Add audio format detection and validation
- [ ] Enhance visualizer integration with audio playback
- [ ] Add keyboard shortcuts for all player controls
- [ ] Implement audio metadata extraction from uploaded files
