# TODOv2: Roll Back Listed Streaming Radio

## Goal

Remove the built-in/default streaming radio listing while preserving all other audio functionality:

- Local file import and playback
- Queue and playlist behavior
- Visualizer, EQ, effects, transport, volume, metadata, and device controls
- Optional user-supplied stream URL playback for direct Shoutcast, Icecast, HLS, or audio URLs

The app should no longer seed or display a default catalog of external radio streams.

## Rationale

The current default stream catalog is not reliable enough to present as a product feature. Many entries depend on external station behavior that the app cannot control:

- CORS headers
- HTTP vs HTTPS mixed-content restrictions
- Redirects
- Non-audio station pages
- Incorrect MIME types
- Regional or temporary station outages

Manual stream URL playback should remain available because users can provide known-good direct stream endpoints.

## Implementation Plan

### 1. Stop Seeding Default Streams

- [x] Update `src/app/App.tsx`.
- [x] Remove the import of `DEFAULT_STREAMS`.
- [x] Remove the first-run logic that saves default streams into IndexedDB when the library is empty.
- [x] Keep the IndexedDB library sync for local tracks and any user-added remote tracks.

Acceptance criteria:

- A fresh install starts with an empty library.
- No default `default-stream-*` records are created.
- Local file loading still restores from IndexedDB.

### 2. Remove Seeded Default Streams From Existing Browsers

- [x] Add a small migration path during app initialization.
- [x] Delete IndexedDB tracks whose IDs start with `default-stream-`.
- [x] Remove matching tracks from the persisted Zustand queue.
- [x] Preserve all non-default tracks, including user-added stream URLs.
- [x] Preserve playlists, but filter removed default stream IDs out of playlist `trackIds`.

Acceptance criteria:

- Users who already loaded the app no longer see the old default station list.
- User-imported files remain.
- User-created playlists remain.
- User-added remote URLs remain unless their ID matches the old default prefix.

### 3. Keep Manual Stream URL Support

- [x] Keep `TrackLoader.loadTrackFromUrl`.
- [x] Keep `AudioEngine` remote URL playback.
- [x] Keep `HlsController`.
- [x] Keep `/api/stream-proxy.js` for HTTP stream proxying where deployed.
- [x] Keep the stream wizard and menu entry as the manual URL path.

Acceptance criteria:

- A direct HTTPS MP3/AAC stream URL can still be loaded.
- A direct HLS `.m3u8` URL can still be attempted through native HLS or `hls.js`.
- HTTP streams still route through the existing proxy on HTTPS origins.

### 4. Fix Stream Wizard Send-To-Player

- [x] Update `src/components/streaming/StreamTestWizard.tsx`.
- [x] Replace the missing store action lookup with the same working pattern used by `UrlLoader`:
  - `loadTrackFromUrl(result.normalizedUrl)`
  - `usePlayerStore.getState().setQueue([track], 0)`
  - `usePlayerStore.getState().play()`
- [x] Show success and failure toasts.
- [x] Allow loading from the normalized URL even if diagnostic fetch probes are advisory warnings.

Acceptance criteria:

- Clicking `Send to Player` actually loads the tested URL.
- Failed URLs produce clear errors.
- The wizard does not depend on non-existent `usePlayerStore.loadFromUrl`.

### 5. Update Empty States And Copy

- [x] Update empty states in Library and Discovery where needed.
- [x] Emphasize local music, playlists, visualizer controls, and optional stream URL loading.
- [x] Avoid implying that built-in radio discovery is available.

Acceptance criteria:

- Empty library messaging points users toward adding files or opening a stream URL.
- Discovery does not look broken when no tracks exist.

### 6. Retire `DefaultStreams.ts`

- [x] Remove `src/lib/audio/DefaultStreams.ts` after no imports remain.
- [x] Use prefix-based cleanup, so the deleted file is not needed for migration.

Acceptance criteria:

- No production import references `DefaultStreams`.
- Build succeeds without the file.

### 7. Verification

Run:

```bash
npm run build
npm run lint
```

Manual checks:

- Fresh browser profile shows no default radio stations.
- Existing profile with old defaults has them removed.
- Local file import still works.
- Queue playback still works.
- Playlist creation and add/remove still work.
- Manual stream URL still loads when the URL is a valid direct stream.
- Visualizer still reacts during local playback and remains active during remote playback.

## Non-Goals

- Do not build a new radio directory.
- Do not add station scraping.
- Do not attempt automatic discovery of working public streams.
- Do not remove the audio engine, visualizer, EQ, playlist, or local library features.
- Do not remove manual stream URL loading.

## Implementation Log

### Completed Changes

- `src/app/App.tsx`
  - Removed first-run default radio stream seeding.
  - Added production rollback cleanup for old `default-stream-*` IndexedDB records.
  - Filters old seeded stream IDs out of the persisted player queue.
  - Filters old seeded stream IDs out of playlist membership while preserving playlists.
  - Continues to restore local files and user-added non-default remote tracks.

- `src/components/streaming/StreamTestWizard.tsx`
  - Replaced the missing `usePlayerStore.loadFromUrl` path with `loadTrackFromUrl`, `setQueue`, and `play`.
  - Added success and failure toasts.
  - Changed `Send to Player` to `Load in Player`.
  - Allows loading a normalized stream URL even when CORS/content-type probes are only advisory.

- `src/components/LibraryView.tsx`
  - Updated empty-state copy to focus on local files and optional direct stream URLs.

- `src/components/DiscoveryView.tsx`
  - Updated empty-state copy to avoid implying built-in radio discovery.

- `src/lib/audio/DefaultStreams.ts`
  - Deleted the hard-coded default station catalog.

### Production Notes

- This rollback is intentionally conservative for Vercel production: it removes unreliable external station listing behavior without touching the audio engine, local file library, visualizer, EQ, playlists, or stream proxy.
- The cleanup targets only IDs beginning with `default-stream-`. User-added remote URLs are preserved unless they reused that legacy seeded ID prefix.
- Stream diagnostics remain advisory. Some Icecast/Shoutcast endpoints reject browser `fetch` probes but still play through an `<audio>` element.
- `npm run build` passes after the rollback.
- `npm run lint` currently fails due to pre-existing repo-wide lint issues, including `any` usage, unused imports, hook ordering, parsing errors in unrelated files, and Fast Refresh export warnings. The stream wizard changes are not listed in the lint failure output.
- Vite still reports large chunk warnings and dynamic/static import overlap for `TrackLoader`, `PlaybackController`, and `MediaSession`. These existed as architectural bundling concerns and should be handled separately from the streaming radio rollback.

### Follow-Up Candidates

- Add a dedicated lightweight `Open Stream URL` modal separate from the diagnostic wizard.
- Persist user-added stream URLs to IndexedDB with explicit user consent, instead of only placing them in the current queue.
- Add clearer error mapping for media element failures such as unsupported codec, DNS failure, and station timeout.
- Add a production smoke test that verifies a fresh profile does not render `default-stream-*` tracks.
- Clean the repo-wide ESLint backlog so lint can become a reliable production gate.
- Consider route-level or feature-level code splitting for the large main bundle and `hls.js` chunk.
