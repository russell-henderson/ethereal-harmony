# API_SPEC.md — Ethereal Harmony

## Internal APIs
- TrackLoader (file/stream)
- PlaybackController (play, pause, seek)
- AnalyserBus (FFT)
- MediaSession API

## External APIs
- None (except HLS streaming via hls.js, native Safari)

## Security
- Enforce HTTPS
- URL guard rejects non-HTTPS

---
**Acceptance:** Clear mapping of internal module APIs to their components; no ambiguity about integrations.
