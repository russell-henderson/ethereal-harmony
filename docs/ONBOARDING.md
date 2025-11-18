---
Version: 1.0.0
Last Updated: 2025-01-27
Status: Draft
Owner: Russell Henderson
---

> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links**  
**Core**: [Overview](./MASTER_OVERVIEW.md) · [Roadmap](./ROADMAP.md) · [Brand](./BRAND_GUIDELINES.md) · [Glossary](./GLOSSARY.md)  
**Architecture**: [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md) · [DevOps](./DEVOPS.md) · [Database](./DATABASE.md) · [API Ref](./API_REFERENCE.md)  
**Quality**: [Accessibility](./ACCESSIBILITY.md) · [Security](./SECURITY.md) · [Performance](./PERFORMANCE.md) · [Observability](./OBSERVABILITY.md) · [Test Plan](./TEST_PLAN.md) · [Workflows](./WORKFLOWS.md)  
**People**: [Onboarding](./ONBOARDING.md) · [Contributing](./CONTRIBUTING.md)  
**Deep Links**: [ADRs](./docs/ADR) · [Diagrams](./docs/diagrams/architecture-overview.mmd) · [Security Reviews](./security) · [Ops/Runbooks](./ops) · [Reports](./reports) · [Images](./images/ui-overview.png)

# Onboarding Guide

## Fast Start in 5 Steps

1. **Install Node.js 18+** (check with `node --version`)
2. **Clone and install dependencies:**
   ```bash
   npm install
   ```
3. **Start the development server:**
   ```bash
   npm run dev
   ```
4. **Open your browser** to `http://localhost:5173`
5. **Load an audio file** using the upload button to start playing

That's it! The app runs entirely in the browser with no backend required.

---

## Setup Steps

### Prerequisites

- **Node.js**: Version 18 or higher
  - Check your version: `node --version`
  - Install from [nodejs.org](https://nodejs.org/) or use a version manager like [nvm](https://github.com/nvm-sh/nvm)
- **npm**: Version 9 or higher (comes with Node.js)
  - Check your version: `npm --version`
- **Git**: For cloning the repository

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ethereal-harmony
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   
   This installs all required packages including React, Vite, Three.js, Zustand, and development tools.

3. **Verify installation:**
   ```bash
   npm run dev
   ```
   
   You should see output indicating the Vite dev server is running on `http://localhost:5173`.

---

## Local Environment

### Development Server

The development server runs on **port 5173** by default (configured in `vite.config.ts`).

- **Start dev server:**
  ```bash
  npm run dev
  ```
  
- **Access the app:**
  - Local: `http://localhost:5173`
  - Network: The server will display the network URL in the terminal

### Environment Variables

Currently, there are no environment variables required. All configuration is in code or browser storage.

### Browser Support

- **Chrome/Edge**: Full support (recommended for development)
- **Firefox**: Full support
- **Safari**: Full support (native HLS playback)
- **Mobile browsers**: Supported, but visualizer performance may vary

---

## Seed Data

Ethereal Harmony is a frontend-only application with no seed data required. The app:

- Stores all data locally in the browser (LocalStorage, IndexedDB)
- Loads audio files directly from your file system or via HTTPS/HLS streams
- Creates playlists and library metadata as you use the app

**To test the app:**
1. Use the upload button (↑) to load local audio files
2. Or enter an HTTPS stream URL in the streaming test wizard
3. The app will automatically extract metadata and create library entries

---

## Common Commands

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server on `http://localhost:5173` |
| `npm run build` | Build production bundle to `dist/` directory |
| `npm run preview` | Preview production build locally |

### Testing

| Command | Description |
|---------|-------------|
| `npm run test` | Run unit tests with Vitest |
| `npm run test:ui` | Run tests with Vitest UI (interactive) |
| `npm run e2e` | Run end-to-end tests with Playwright |

### Code Quality

| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint on `src/**/*.{ts,tsx}` |

### Documentation & Maintenance

| Command | Description |
|---------|-------------|
| `npm run check:md-images` | Verify all markdown image references are valid |
| `npm run tree` | Export project structure tree |
| `npm run tree:src` | Export `src/` directory structure to `src-structure.txt` |
| `npm run changelog` | Update CHANGELOG.md |
| `npm run changelog:dry` | Preview changelog changes without writing |
| `npm run release` | Create release tag and update changelog |

---

## Debugging Tips

### Development Tools

1. **Browser DevTools:**
   - Open Chrome DevTools (F12 or Cmd+Option+I)
   - Check Console for errors and warnings
   - Use Network tab to inspect audio file loading
   - Use Application tab to view LocalStorage and IndexedDB data

2. **Diagnostics Overlay:**
   - Enable performance overlay by setting `eh.dev.showStats = true` in browser console
   - Shows FPS, frame time, and performance metrics
   - Useful for visualizer performance tuning

3. **React DevTools:**
   - Install [React Developer Tools](https://react.dev/learn/react-developer-tools) browser extension
   - Inspect component state and props
   - View Zustand store state

4. **Vite DevTools:**
   - Vite provides hot module replacement (HMR)
   - Check terminal for compilation errors
   - Network errors will appear in both terminal and browser console

### Common Issues

**Port already in use:**
```bash
# Kill process on port 5173 (macOS/Linux)
lsof -ti:5173 | xargs kill -9

# Or change port in vite.config.ts
```

**Dependencies out of sync:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors:**
- Check `tsconfig.json` configuration
- Ensure all dependencies are installed
- Run `npm run lint` to see detailed error messages

**Audio playback issues:**
- Check browser console for CORS errors
- Verify audio file format is supported (MP3, FLAC, OGG, etc.)
- Check browser audio permissions
- For HLS streams, verify HTTPS and CORS headers

**Visualizer not rendering:**
- Check WebGL support: Visit `chrome://gpu` (Chrome) or `about:support` (Firefox)
- Verify Three.js is loading (check Network tab)
- Check console for WebGL context errors
- Try disabling hardware acceleration in browser settings

### Performance Debugging

- **Enable FPS overlay:** Set `eh.dev.showStats = true` in console
- **Check performance:** Use Chrome DevTools Performance tab
- **Monitor memory:** Use Chrome DevTools Memory tab to check for leaks
- **Network throttling:** Use DevTools Network tab to simulate slow connections

### Getting Help

- Check `docs/ARCHITECTURE.md` for system overview
- Review `docs/FRONTEND.md` for component structure
- See `docs/API_REFERENCE.md` for module boundaries
- Check `IMPROVEMENTS.md` for known issues and planned fixes

---

[← Back to Documentation Index](./README.md)
