```tsx
// src/components/streaming/StreamTestWizard.tsx
/**
 * StreamTestWizard
 * -----------------------------------------------------------------------------
 * Phase 2 utility to validate streaming URLs (HLS or direct audio) before
 * handing them to the player. Runs a few light checks:
 *  - URL shape and scheme validation (UrlGuard-lite).
 *  - CORS reachability (HEAD; falls back to small GET range).
 *  - Content-Type sniff (e.g., application/vnd.apple.mpegurl, audio/*).
 *  - HLS viability (m3u8 + MediaSource support; optional HlsController probe).
 *
 * If everything looks good, you can "Send to Player" which calls a store
 * method if available: loadFromUrl/loadUrl/load(url).
 *
 * Notes:
 *  - No external deps; safe to mount anywhere in Phase 2.
 *  - Uses glass tokens via `eh-glass` classes; minimal inline styles.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlayerStore } from "@/lib/state/usePlayerStore";

// ---- Types ------------------------------------------------------------------

type TestResult = {
  url: string;
  normalizedUrl: string;
  isHttps: boolean;
  isLikelyHls: boolean;
  mediaSourceSupported: boolean;
  corsOk: boolean | null;
  status?: number;
  contentType?: string;
  bytesSampled?: number;
  hlsControllerOk: boolean | null; // null = not attempted
  errors: string[];
};

// ---- Helpers ----------------------------------------------------------------

const DEFAULTS: TestResult = {
  url: "",
  normalizedUrl: "",
  isHttps: true,
  isLikelyHls: false,
  mediaSourceSupported: typeof window !== "undefined" && "MediaSource" in window,
  corsOk: null,
  status: undefined,
  contentType: undefined,
  bytesSampled: 0,
  hlsControllerOk: null,
  errors: [],
};

const SAMPLE_RANGE = "bytes=0-1023"; // 1KB sniff

function isLikelyHlsUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return /\.m3u8(\?.*)?$/i.test(url.pathname);
  } catch {
    return /\.m3u8(\?.*)?$/i.test(u);
  }
}

function normalizeUrl(input: string): string {
  const s = input.trim();
  if (!s) return s;
  // Allow protocol-relative and common schemeless inputs
  if (/^\/\//.test(s)) return `https:${s}`;
  if (/^https?:\/\//i.test(s)) return s;
  // If schemeless but looks like domain, assume https
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(s)) return `https://${s}`;
  return s;
}

async function probeCors(url: string): Promise<{ ok: boolean; status?: number; contentType?: string; bytes?: number }> {
  try {
    // HEAD first
    const head = await fetch(url, { method: "HEAD", mode: "cors" });
    const ct = head.headers.get("content-type") || undefined;
    if (head.ok) {
      return { ok: true, status: head.status, contentType: ct, bytes: 0 };
    }
    // Fallback: small range GET (some CDNs block HEAD)
    const get = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: { Range: SAMPLE_RANGE },
    });
    const buf = await get.arrayBuffer();
    const ct2 = get.headers.get("content-type") || ct || undefined;
    return { ok: get.ok, status: get.status, contentType: ct2, bytes: buf.byteLength || 0 };
  } catch {
    return { ok: false };
  }
}

async function tryHlsController(url: string): Promise<boolean | null> {
  // Optional: only probe if file exists and looks like m3u8
  if (!isLikelyHlsUrl(url)) return null;
  try {
    // Dynamically import to avoid hard dependency at build time.
    const mod = await import("@/lib/streaming/HlsController").catch(() => null);
    if (!mod || typeof mod.probe !== "function") return null;
    // Expect a `probe(url)` that resolves boolean
    const result: boolean = await mod.probe(url);
    return !!result;
  } catch {
    return null;
  }
}

// ---- Component --------------------------------------------------------------

const fieldStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.25)",
  backdropFilter: "blur(16px)",
  borderRadius: 12,
  color: "#fff",
  padding: "10px 12px",
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.25)",
  backdropFilter: "blur(16px)",
  borderRadius: 12,
  color: "#fff",
  padding: "8px 12px",
  cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.9,
  marginBottom: 6,
};

const gridRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "180px 1fr",
  gap: 12,
  alignItems: "center",
};

const pill = (ok?: boolean | null) =>
  ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    lineHeight: 1.6,
    border: "1px solid rgba(255,255,255,0.25)",
    background:
      ok === true
        ? "rgba(0,240,255,0.18)"
        : ok === false
        ? "rgba(255,107,107,0.18)"
        : "rgba(255,255,255,0.12)",
  } as React.CSSProperties);

const StreamTestWizard: React.FC = () => {
  const loadFromUrl = usePlayerStore((s: any) => s.loadFromUrl ?? s.loadUrl ?? s.load);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestResult>(DEFAULTS);
  const [log, setLog] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  const canSendToPlayer = useMemo(() => {
    if (!result.normalizedUrl) return false;
    if (result.isLikelyHls) {
      // For HLS, require CORS OK and MSE support; HlsController probe if available
      return !!result.mediaSourceSupported && result.corsOk === true && (result.hlsControllerOk !== false);
    }
    // For direct audio, require CORS OK and an audio/* content type
    return result.corsOk === true && !!result.contentType && /^audio\//i.test(result.contentType);
  }, [result]);

  const appendLog = (line: string) => setLog((l) => [...l, line]);

  const runTests = useCallback(async () => {
    const url = normalizeUrl(input);
    setRunning(true);
    setLog([]);
    setResult(DEFAULTS);

    if (!url) {
      setRunning(false);
      setResult((r) => ({ ...r, errors: ["No URL provided"] }));
      return;
    }

    appendLog(`URL: ${url}`);

    let working: TestResult = {
      ...DEFAULTS,
      url: input,
      normalizedUrl: url,
      isHttps: (() => {
        try {
          return new URL(url).protocol === "https:";
        } catch {
          return true;
        }
      })(),
      isLikelyHls: isLikelyHlsUrl(url),
    };

    // Check CORS / Content-Type
    appendLog("Probing CORS and content-type…");
    const cors = await probeCors(url);
    working = {
      ...working,
      corsOk: cors.ok,
      status: cors.status,
      contentType: cors.contentType,
      bytesSampled: cors.bytes,
    };
    appendLog(
      `CORS: ${cors.ok ? "OK" : "Blocked"}${cors.status ? ` (HTTP ${cors.status})` : ""}${
        cors.contentType ? `, Content-Type: ${cors.contentType}` : ""
      }${cors.bytes ? `, Sampled: ${cors.bytes}B` : ""}`
    );

    // MediaSource (HLS) support
    working.mediaSourceSupported = typeof window !== "undefined" && "MediaSource" in window;
    if (working.isLikelyHls) {
      appendLog(`Detected HLS URL (.m3u8). MediaSource: ${working.mediaSourceSupported ? "supported" : "not supported"}`);
    }

    // Optional HlsController probe
    if (working.isLikelyHls) {
      const ok = await tryHlsController(url);
      working.hlsControllerOk = ok;
      if (ok === true) appendLog("HlsController probe: OK");
      else if (ok === false) appendLog("HlsController probe: FAILED");
      else appendLog("HlsController probe: skipped");
    }

    // Error aggregation
    const errs: string[] = [];
    if (!working.corsOk) errs.push("CORS check failed (resource unreachable from this origin).");
    if (working.isLikelyHls) {
      if (!working.mediaSourceSupported) errs.push("MediaSource API not available (HLS needs MSE).");
    } else {
      // Direct file should advertise audio/*
      if (working.contentType && !/^audio\//i.test(working.contentType)) {
        errs.push(`Unexpected content-type (${working.contentType}) for a direct audio stream.`);
      }
    }
    working.errors = errs;

    setResult(working);
    setRunning(false);
  }, [input]);

  const onSendToPlayer = () => {
    if (!canSendToPlayer || !result.normalizedUrl) return;
    try {
      loadFromUrl?.(result.normalizedUrl);
    } catch {
      // no-op; UI remains as a helper
    }
  };

  // Small preview audio element (muted by default). Only for non-HLS direct audio.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (result.isLikelyHls) {
      el.src = "";
      return;
    }
    if (result.corsOk && result.contentType && /^audio\//i.test(result.contentType)) {
      el.src = result.normalizedUrl;
    } else {
      el.src = "";
    }
  }, [result]);

  return (
    <section
      className="eh-glass"
      aria-label="Stream test wizard"
      style={{
        padding: 12,
        borderRadius: 16,
        display: "grid",
        gap: 12,
      }}
    >
      {/* URL field */}
      <div style={{ display: "grid", gap: 6 }}>
        <label htmlFor="stream-url" style={labelStyle}>
          Stream URL (HLS .m3u8 or direct audio)
        </label>
        <input
          id="stream-url"
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://example.com/stream.m3u8"
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          style={fieldStyle}
        />
      </div>

      {/* Actions */}
      <div className="eh-hstack" style={{ gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={runTests}
          disabled={running || input.trim().length === 0}
          className="eh-btn eh-btn--glass"
          style={btnStyle}
          aria-busy={running}
        >
          {running ? "Testing…" : "Run Tests"}
        </button>
        <button
          type="button"
          onClick={onSendToPlayer}
          disabled={!canSendToPlayer}
          className="eh-btn eh-btn--glass"
          style={{ ...btnStyle, borderColor: "rgba(0,240,255,0.6)" }}
          title={canSendToPlayer ? "Send to player" : "Run tests and ensure they pass first"}
        >
          Send to Player
        </button>
      </div>

      {/* Results */}
      <div
        className="eh-grid"
        role="status"
        aria-live="polite"
        style={{ display: "grid", gap: 8 }}
      >
        <div style={gridRowStyle}>
          <div>Normalized URL</div>
          <div style={{ wordBreak: "break-all", opacity: 0.95 }}>{result.normalizedUrl || "—"}</div>
        </div>
        <div style={gridRowStyle}>
          <div>Scheme</div>
          <div><span style={pill(result.isHttps)}>{result.isHttps ? "HTTPS" : "HTTP"}</span></div>
        </div>
        <div style={gridRowStyle}>
          <div>Type detection</div>
          <div>
            {result.isLikelyHls ? (
              <span style={pill(true)}>HLS (.m3u8)</span>
            ) : (
              <span style={pill(result.contentType ? /^audio\//i.test(result.contentType) : null)}>
                {result.contentType || "unknown"}
              </span>
            )}
          </div>
        </div>
        <div style={gridRowStyle}>
          <div>CORS reachability</div>
          <div>
            <span style={pill(result.corsOk)}>{result.corsOk === true ? "OK" : result.corsOk === false ? "Blocked" : "Unknown"}</span>
            {typeof result.status === "number" && (
              <span style={{ marginLeft: 8, opacity: 0.9 }}>HTTP {result.status}</span>
            )}
            {result.bytesSampled ? (
              <span style={{ marginLeft: 8, opacity: 0.9 }}>{result.bytesSampled} B</span>
            ) : null}
          </div>
        </div>
        {result.isLikelyHls && (
          <>
            <div style={gridRowStyle}>
              <div>MediaSource (MSE)</div>
              <div><span style={pill(result.mediaSourceSupported)}>{result.mediaSourceSupported ? "Supported" : "Not supported"}</span></div>
            </div>
            <div style={gridRowStyle}>
              <div>HlsController probe</div>
              <div><span style={pill(result.hlsControllerOk)}>{result.hlsControllerOk === null ? "Skipped" : result.hlsControllerOk ? "OK" : "Failed"}</span></div>
            </div>
          </>
        )}
        {result.errors.length > 0 && (
          <div
            className="eh-error-list"
            role="alert"
            style={{
              background: "rgba(255,107,107,0.12)",
              border: "1px solid rgba(255,107,107,0.4)",
              borderRadius: 12,
              padding: 10,
            }}
          >
            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Minimal preview for direct audio (muted by default) */}
      <div aria-hidden={result.isLikelyHls || !result.corsOk} style={{ marginTop: 4 }}>
        <audio ref={audioRef} controls muted style={{ width: "100%", opacity: result.isLikelyHls ? 0.4 : 1 }} />
      </div>

      {/* Debug log */}
      {log.length > 0 && (
        <details style={{ marginTop: 6 }}>
          <summary>Log</summary>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", opacity: 0.9, marginTop: 6 }}>
            {log.join("\n")}
          </pre>
        </details>
      )}
    </section>
  );
};

export default StreamTestWizard;
```
