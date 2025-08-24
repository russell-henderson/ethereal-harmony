// src/lib/audio/TrackLoader.ts

import { parseBlob } from "music-metadata-browser";

export type Track = {
  /** Stable identifier for UI lists and store */
  id: string;
  /** Display title (guessed from filename/URL if tags not parsed) */
  title: string;
  /** Optional artist/album/artwork (Phase 2: placeholders unless provided) */
  artist?: string;
  album?: string;
  artworkUrl?: string;

  /** Playable URL (file: object URL, remote: normalized URL) */
  url: string;

  /** Hints for UI / engine */
  duration?: number; // seconds, best-effort
  mime?: string;
  isStream?: boolean; // true for .m3u8 or content without fixed duration
  source: "local" | "remote";

  /** Internal resource bookkeeping */
  _objectUrl?: string; // for local files; use revokeTrackResources to cleanup
};

const ALLOWED_FILE_EXTS = [
  "mp3",
  "m4a",
  "aac",
  "flac",
  "wav",
  "ogg",
  "oga",
  "opus",
  "webm",
];

/** Guards ------------------------------------------------------------------ */

const isHls = (u: string) => /\.m3u8(\?.*)?$/i.test(u);

const normalizeUrl = (input: string): string => {
  const s = (input || "").trim();
  if (!s) return s;
  if (/^\/\//.test(s)) return `https:${s}`;
  if (/^https?:\/\//i.test(s)) return s;
  // If looks like a domain/path but missing scheme, assume https
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(s)) return `https://${s}`;
  return s;
};

const extOf = (name: string) => {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
};

const sanitizeTitle = (s: string) =>
  s
    .replace(/[?#].*$/, "") // strip query/hash
    .replace(/\/+$/, "") // drop trailing slash
    .split("/")
    .pop()
    ?.replace(/\.[a-z0-9]+$/i, "") // remove extension
    .replace(/[_-]+/g, " ")
    .trim() || "Unknown Title";

/** Duration probe using an off-DOM <audio> element (best-effort). */
async function probeDuration(url: string, timeoutMs = 7000): Promise<number | undefined> {
  return new Promise<number | undefined>((resolve) => {
    try {
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.crossOrigin = "anonymous";
      const onLoaded = () => {
        const d = Number.isFinite(audio.duration) ? audio.duration : undefined;
        cleanup();
        resolve(d);
      };
      const onError = () => {
        cleanup();
        resolve(undefined);
      };
      const cleanup = () => {
        audio.removeEventListener("loadedmetadata", onLoaded);
        audio.removeEventListener("error", onError);
        try {
          // release any network activity
          audio.removeAttribute("src");
          audio.load();
        } catch {}
      };
      const to = window.setTimeout(() => {
        cleanup();
        resolve(undefined);
      }, timeoutMs);
      audio.addEventListener("loadedmetadata", () => {
        window.clearTimeout(to);
        onLoaded();
      });
      audio.addEventListener("error", () => {
        window.clearTimeout(to);
        onError();
      });
      audio.src = url;
    } catch {
      resolve(undefined);
    }
  });
}

/** Public API --------------------------------------------------------------- */

/**
 * Load a Track from a local File.
 * - Creates an object URL (remember to call revokeTrackResources later).
 * - Guesses a display title from the filename.
 * - Sets `mime` from File.type when present.
 */
export async function loadTrackFromFile(file: File): Promise<Track> {
  if (!(file instanceof File)) {
    throw new Error("loadTrackFromFile: invalid File");
  }

  const ext = extOf(file.name);
  const okByExt = ALLOWED_FILE_EXTS.includes(ext);
  const okByMime = file.type ? file.type.startsWith("audio/") : false;

  if (!okByExt && !okByMime) {
    throw new Error(`Unsupported audio file type: "${file.name}"`);
  }

  const objectUrl = URL.createObjectURL(file);
  // Try best-effort duration for local files too (usually quick)
  const duration = await probeDuration(objectUrl, 4000);

  // Extract metadata using music-metadata-browser
  let title = sanitizeTitle(file.name);
  let artist: string | undefined = undefined;
  let album: string | undefined = undefined;
  let artworkUrl: string | undefined = undefined;
  try {
    const metadata = await parseBlob(file);
    if (metadata.common) {
      title = metadata.common.title || title;
      artist = metadata.common.artist;
      album = metadata.common.album;
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const pic = metadata.common.picture[0];
        const blob = new Blob([pic.data], { type: pic.format });
        artworkUrl = URL.createObjectURL(blob);
      }
    }
  } catch (err) {
    // ignore metadata errors, fallback to filename
  }

  const track: Track = {
    id: makeId(),
    title,
    artist,
    album,
    artworkUrl,
    url: objectUrl,
    duration,
    mime: file.type || mimeFromExt(ext),
    isStream: false,
    source: "local",
    _objectUrl: objectUrl,
  };

  return track;
}

/**
 * Load a Track from a remote URL (HLS or direct audio).
 * - Normalizes scheme (adds https:// when omitted).
 * - Detects HLS by file extension.
 * - Optionally probes duration for direct audio; HLS is flagged as stream.
 */
export async function loadTrackFromUrl(inputUrl: string): Promise<Track> {
  const url = normalizeUrl(inputUrl);
  if (!url) throw new Error("loadTrackFromUrl: empty URL");

  const hls = isHls(url);
  const duration = hls ? undefined : await probeDuration(url, 6500);

  const track: Track = {
    id: makeId(),
    title: sanitizeTitle(url),
    artist: undefined,
    album: undefined,
    artworkUrl: undefined,
    url,
    duration,
    mime: hls ? "application/vnd.apple.mpegurl" : undefined,
    isStream: hls || !Number.isFinite(duration as number),
    source: "remote",
  };

  return track;
}

/**
 * Release any resources held by a Track (e.g., object URL for local files).
 */
export function revokeTrackResources(track: Track): void {
  if (track._objectUrl) {
    try {
      URL.revokeObjectURL(track._objectUrl);
    } catch {
      // ignore
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (track as any)._objectUrl = undefined;
  }
}

/** Internal helpers --------------------------------------------------------- */

const mimeFromExt = (ext: string): string | undefined => {
  switch (ext) {
    case "mp3":
      return "audio/mpeg";
    case "m4a":
    case "aac":
      return "audio/aac";
    case "flac":
      return "audio/flac";
    case "wav":
      return "audio/wav";
    case "ogg":
    case "oga":
      return "audio/ogg";
    case "opus":
      return "audio/opus";
    case "webm":
      return "audio/webm";
    default:
      return undefined;
  }
};

let _seq = 0;
const makeId = () => `trk_${Date.now().toString(36)}_${(++_seq).toString(36)}`;

/** Default export for convenience */
const TrackLoader = {
  loadTrackFromFile,
  loadTrackFromUrl,
  revokeTrackResources,
};

export default TrackLoader;
