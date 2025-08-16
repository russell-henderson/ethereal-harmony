// src/lib/utils/UrlGuard.ts
/**
 * UrlGuard (Phase 2)
 * -----------------------------------------------------------------------------
 * Centralized, zero-dependency URL helpers for the audio player.
 * Goals:
 *  - Normalize user-provided URLs into an absolute, safe form.
 *  - Decide whether a URL is acceptable under our privacy/safety policy.
 *  - Provide quick predicates for HLS and common audio types.
 *
 * Notes:
 *  - We prefer HTTPS for remote resources. HTTP is allowed only for localhost.
 *  - We consider blob: (object URLs) safe (local-only), used for File playback.
 *  - We reject dangerous schemes (javascript:, data:*, chrome-extension:, etc.).
 */

const HTTPS = "https:";
const HTTP = "http:";
const BLOB = "blob:";
const DATA = "data:";

const LOCALHOST_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
]);

/** Safe parse that never throws. Returns null on failure. */
export function tryParseUrl(input: string, base?: string): URL | null {
  try {
    return new URL(input, base);
  } catch {
    return null;
  }
}

/** True if the string looks like a domain/path without scheme (e.g., example.com/a.m3u8). */
function looksSchemelessHttpish(s: string): boolean {
  // domain.tld[/...],  or localhost[:port][/...]
  return /^[a-z0-9.-]+(:\d+)?(\/|$)/i.test(s);
}

/** Returns true if the URL uses https:// */
export function isHttpsUrl(url: string): boolean {
  const u = tryParseUrl(url);
  return !!u && u.protocol === HTTPS;
}

/** Returns true if the URL uses https:// or http:// */
export function isHttpUrl(url: string): boolean {
  const u = tryParseUrl(url);
  return !!u && (u.protocol === HTTPS || u.protocol === HTTP);
}

/** Returns true if url host is localhost or loopback. */
export function isLocalhostUrl(url: string): boolean {
  const u = tryParseUrl(url);
  if (!u) return false;
  return LOCALHOST_HOSTS.has(u.hostname);
}

/** Normalize user input into an absolute URL string.
 *  - Trims whitespace
 *  - Converts protocol-relative URLs (//host/path) to https://
 *  - Adds https:// for schemeless domain/path
 *  - Allows http:// only for localhost/loopback if allowHttpOnLocalhost
 */
export function normalizeUrl(
  input: string,
  opts: { allowHttpOnLocalhost?: boolean } = { allowHttpOnLocalhost: true }
): string {
  const raw = (input || "").trim();
  if (!raw) return "";

  // protocol-relative
  if (/^\/\//.test(raw)) return `${HTTPS}${raw}`;

  // schemeless domain/path
  if (!/^[a-z]+:\/\//i.test(raw) && looksSchemelessHttpish(raw)) {
    // If it's localhost-ish with explicit port and opts allow, use http, else https
    const host = raw.split(/[/?#]/, 1)[0];
    if (opts.allowHttpOnLocalhost && LOCALHOST_HOSTS.has(host.split(":")[0])) {
      return `http://${raw}`;
    }
    return `https://${raw}`;
  }

  // Already has a scheme
  return raw;
}

/** True if scheme is allowed by our policy (https, http[localhost], blob). */
export function isAllowedScheme(url: string, allowHttpOnLocalhost = true): boolean {
  const u = tryParseUrl(url);
  if (!u) return false;
  if (u.protocol === HTTPS) return true;
  if (u.protocol === BLOB) return true; // local object URLs from File API
  if (u.protocol === HTTP) {
    return allowHttpOnLocalhost && LOCALHOST_HOSTS.has(u.hostname);
  }
  // Disallow data:, javascript:, file:, chrome-extension:, etc.
  return false;
}

/** Convenience guard that combines normalize + policy check. */
export function normalizeAndGuard(
  input: string,
  opts: { allowHttpOnLocalhost?: boolean } = { allowHttpOnLocalhost: true }
): { ok: boolean; url: string } {
  const url = normalizeUrl(input, opts);
  return { ok: isAllowedScheme(url, !!opts.allowHttpOnLocalhost), url };
}

/** File extension (lowercase, without dot). */
export function extOf(urlOrName: string): string {
  const clean = urlOrName.split("?")[0].split("#")[0];
  const m = /\.([a-z0-9]+)$/i.exec(clean);
  return m ? m[1].toLowerCase() : "";
}

/** True if URL/path suggests an HLS playlist. */
export function isLikelyHlsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /\.m3u8$/i.test(u.pathname);
  } catch {
    // fallback for schemeless paths
    return /\.m3u8(\?.*)?$/i.test(url);
  }
}

/** True if extension looks like a common audio file. */
export function isLikelyAudioFile(url: string): boolean {
  const e = extOf(url);
  return (
    e === "mp3" ||
    e === "m4a" ||
    e === "aac" ||
    e === "flac" ||
    e === "wav" ||
    e === "ogg" ||
    e === "oga" ||
    e === "opus" ||
    e === "webm"
  );
}

/** Guess MIME from extension (best-effort). */
export function guessMimeFromExt(urlOrName: string): string | undefined {
  switch (extOf(urlOrName)) {
    case "m3u8":
      return "application/vnd.apple.mpegurl";
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
}

/** True if a Content-Type header indicates audio. */
export function isAudioContentType(contentType?: string | null): boolean {
  if (!contentType) return false;
  return /^audio\//i.test(contentType) || /application\/(x-)?mpegurl/i.test(contentType);
}

/** Same-origin helper (compares origin against current location). */
export function isSameOrigin(url: string): boolean {
  const u = tryParseUrl(url, typeof window !== "undefined" ? window.location.href : undefined);
  if (!u) return false;
  if (typeof window === "undefined") return false;
  return u.origin === window.location.origin;
}

/** Export a compact API as default for convenience. */
const UrlGuard = {
  tryParseUrl,
  isHttpsUrl,
  isHttpUrl,
  isLocalhostUrl,
  normalizeUrl,
  isAllowedScheme,
  normalizeAndGuard,
  extOf,
  isLikelyHlsUrl,
  isLikelyAudioFile,
  guessMimeFromExt,
  isAudioContentType,
  isSameOrigin,
};

export default UrlGuard;
