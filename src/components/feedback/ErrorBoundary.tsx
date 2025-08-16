// src/components/feedback/ErrorBoundary.tsx
import React from "react";

/**
 * ErrorBoundary
 * -----------------------------------------------------------------------------
 * Phase: 1 (Foundation)
 * Scope: App-wide crash containment and user-friendly recovery UI.
 *
 * Design + Architecture notes (kept as code comments for maintainability):
 * - Lives under `src/components/feedback/` as defined in the build plan.
 * - Presents an accessible, keyboard-navigable recovery panel with WCAG-AA
 *   contrast on a glassmorphism surface, matching the tokens in styles/tokens.css.
 * - Avoids coupling to telemetry for V1; logs to console and emits a DOM CustomEvent
 *   ("eh:error") so diagnostics modules (e.g., PerfOverlay/PerfEvents) can optionally
 *   listen without hard imports to keep the boundary self-contained and resilient.
 * - Provides three actions:
 *     1) Reload (hard refresh)
 *     2) Soft Reset (clear likely persisted keys, then reload)
 *     3) Copy Details (error + component stack) for bug reports (dev-friendly)
 * - Details panel is collapsed by default; visible in development or when the user
 *   requests it, to avoid overwhelming end users.
 *
 * A11y:
 * - Uses role="alertdialog" with aria-labelledby/aria-describedby.
 * - First heading is auto-focused when the boundary is shown.
 * - All actions have clear, descriptive labels and keyboard focus states.
 *
 * Styling:
 * - Uses CSS variables from tokens.css (colors, radii, blur).
 * - Kept inline here to avoid adding a separate CSS file for a single surface,
 *   but strictly adheres to the project's glass tokens and motion preferences.
 */

type Props = { children: React.ReactNode };
type State = {
  hasError: boolean;
  errorMessage?: string;
  componentStack?: string;
  timestamp?: number;
  showDetails: boolean;
};

export class ErrorBoundary extends React.Component<Props, State> {
  private headingRef = React.createRef<HTMLHeadingElement>();

  state: State = {
    hasError: false,
    errorMessage: undefined,
    componentStack: undefined,
    timestamp: undefined,
    showDetails: false,
  };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return {
      hasError: true,
      errorMessage: ErrorBoundary.stringifyError(error),
      timestamp: Date.now(),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // Minimal, local-first logging (telemetry is opt-in and handled separately in diagnostics).
    // eslint-disable-next-line no-console
    console.error("[Ethereal Harmony] Uncaught error:", error, info);

    // Store the component stack for "Copy details" and internal visibility.
    this.setState({ componentStack: info?.componentStack ?? "" });

    // Emit a DOM event that diagnostics/overlays can subscribe to without a compile-time dependency.
    try {
      const detail = {
        error: ErrorBoundary.stringifyError(error),
        stack: info?.componentStack ?? "",
        ts: Date.now(),
      };
      window.dispatchEvent(new CustomEvent("eh:error", { detail }));
      // Stash the last error on window for quick manual inspection during dev.
      (window as any).__EH_LAST_ERROR__ = detail;
    } catch {
      /* no-op */
    }
  }

  componentDidUpdate(_: Props, prevState: State) {
    if (!prevState.hasError && this.state.hasError && this.headingRef.current) {
      // After showing the boundary, move keyboard focus to the heading for SR and keyboard users.
      this.headingRef.current.focus();
    }
  }

  private static stringifyError(error: unknown): string {
    if (error instanceof Error) {
      return error.message || String(error);
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  private handleReload = () => {
    // Hard refresh to recover from unrecoverable error states (most reliable).
    location.reload();
  };

  private handleSoftReset = () => {
    // Best-effort soft reset: clear most likely persisted app keys while avoiding a full storage wipe.
    // Keys are subject to change; we match common prefixes and known store keys per blueprint.
    try {
      const candidates: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const k = key.toLowerCase();
        if (
          k.includes("eh:") ||
          k.includes("ethereal-harmony") ||
          k.includes("zustand") ||
          k.includes("useplayerstore") ||
          k.includes("usevizstore") ||
          k.includes("usesettingsstore") ||
          k.includes("useuistore")
        ) {
          candidates.push(key);
        }
      }
      candidates.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    } finally {
      location.reload();
    }
  };

  private handleCopyDetails = async () => {
    const { errorMessage, componentStack, timestamp } = this.state;
    const payload =
      `Ethereal Harmony — Crash Report\n` +
      `Time: ${new Date(timestamp ?? Date.now()).toISOString()}\n\n` +
      `Error: ${errorMessage ?? "(none)"}\n\n` +
      `Component Stack:\n${componentStack ?? "(none)"}\n\n` +
      `User Agent: ${navigator.userAgent}\n` +
      `URL: ${location.href}\n`;

    try {
      await navigator.clipboard.writeText(payload);
      // eslint-disable-next-line no-console
      console.info("[Ethereal Harmony] Error details copied to clipboard.");
    } catch {
      // Fallback: open a blob for manual copy
      const blob = new Blob([payload], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "eh-crash-report.txt";
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    }
  };

  private toggleDetails = () => {
    this.setState((s) => ({ showDetails: !s.showDetails }));
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Glassmorphism surface and overlay using tokens from styles/tokens.css.
    // Keeping inline JS styles limited to component-scoped layout so we don’t add a new CSS file.
    const overlayStyle: React.CSSProperties = {
      position: "fixed",
      inset: 0,
      display: "grid",
      placeItems: "center",
      background:
        "linear-gradient(135deg, rgba(26,43,69,0.92), rgba(127,106,159,0.85))", // Brand gradient tinted for contrast
      zIndex: 9999,
      padding: "24px",
    };

    const panelStyle: React.CSSProperties = {
      width: "min(720px, 92vw)",
      maxWidth: "92vw",
      color: "var(--eh-color-text, #FFFFFF)",
      background: "rgba(255,255,255,0.12)",
      backdropFilter: "blur(16px) saturate(120%)",
      WebkitBackdropFilter: "blur(16px) saturate(120%)",
      border: "1px solid rgba(255,255,255,0.25)",
      borderRadius: "16px",
      boxShadow:
        "0 8px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.2)",
      padding: "24px",
      outline: "2px solid transparent",
    };

    const titleStyle: React.CSSProperties = {
      fontFamily: 'Montserrat, ui-sans-serif, system-ui, "Segoe UI", Roboto',
      fontWeight: 700,
      fontSize: "1.75rem",
      lineHeight: 1.25,
      margin: 0,
      marginBottom: "8px",
    };

    const descStyle: React.CSSProperties = {
      fontFamily: 'Lato, ui-sans-serif, system-ui, "Segoe UI", Roboto',
      fontSize: "1rem",
      lineHeight: 1.6,
      margin: 0,
      marginBottom: "16px",
      color: "rgba(255,255,255,0.9)",
    };

    const hintStyle: React.CSSProperties = {
      fontSize: "0.875rem",
      marginTop: "4px",
      marginBottom: "16px",
      color: "rgba(255,255,255,0.8)",
    };

    const buttonRowStyle: React.CSSProperties = {
      display: "flex",
      gap: "12px",
      flexWrap: "wrap",
      marginTop: "8px",
    };

    const buttonStyleBase: React.CSSProperties = {
      appearance: "none",
      fontFamily: 'Lato, ui-sans-serif, system-ui, "Segoe UI", Roboto',
      fontSize: "0.95rem",
      lineHeight: 1,
      borderRadius: "12px",
      padding: "12px 16px",
      border: "1px solid rgba(255,255,255,0.25)",
      background: "rgba(255,255,255,0.14)",
      color: "#FFFFFF",
      cursor: "pointer",
      transition: "transform 120ms ease, box-shadow 160ms ease, background 160ms",
      outlineOffset: "2px",
    };

    const primaryButton: React.CSSProperties = {
      ...buttonStyleBase,
      background:
        "linear-gradient(180deg, rgba(0,240,255,0.32), rgba(0,240,255,0.18))",
      borderColor: "rgba(0,240,255,0.6)",
      boxShadow: "0 4px 14px rgba(0,240,255,0.25)",
    };

    const secondaryButton: React.CSSProperties = {
      ...buttonStyleBase,
    };

    const detailBlockStyle: React.CSSProperties = {
      marginTop: "16px",
      padding: "12px 14px",
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,0.2)",
      background: "rgba(255,255,255,0.08)",
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: "0.85rem",
      whiteSpace: "pre-wrap",
      maxHeight: "30vh",
      overflow: "auto",
      color: "rgba(255,255,255,0.95)",
    };

    const linkLike: React.CSSProperties = {
      background: "none",
      border: "none",
      color: "rgba(0,240,255,1)",
      textDecoration: "underline",
      cursor: "pointer",
      padding: 0,
      margin: 0,
      font: "inherit",
    };

    const titleId = "eh-error-title";
    const descId = "eh-error-desc";

    const { errorMessage, componentStack, showDetails, timestamp } = this.state;

    return (
      <div
        style={overlayStyle}
        role="presentation"
        aria-hidden={false}
        data-testid="error-boundary-overlay"
      >
        <section
          style={panelStyle}
          role="alertdialog"
          aria-labelledby={titleId}
          aria-describedby={descId}
        >
          <h1
            id={titleId}
            ref={this.headingRef}
            tabIndex={-1}
            style={titleStyle}
          >
            Something went wrong
          </h1>

          <p id={descId} style={descStyle}>
            The app hit an unexpected error. You can reload, or try a soft
            reset if the issue persists.
          </p>
          <p style={hintStyle}>
            <strong>Time</strong>:{" "}
            {new Date(timestamp ?? Date.now()).toLocaleString()} •{" "}
            <strong>URL</strong>: {location.href}
          </p>

          <div style={buttonRowStyle}>
            <button
              type="button"
              onClick={this.handleReload}
              style={primaryButton}
              aria-label="Reload the application"
            >
              Reload
            </button>

            <button
              type="button"
              onClick={this.handleSoftReset}
              style={secondaryButton}
              aria-label="Reset saved settings and reload"
            >
              Soft reset & reload
            </button>

            <button
              type="button"
              onClick={this.handleCopyDetails}
              style={secondaryButton}
              aria-label="Copy error details to clipboard"
            >
              Copy details
            </button>

            <button
              type="button"
              onClick={this.toggleDetails}
              style={secondaryButton}
              aria-expanded={showDetails}
              aria-controls="eh-error-details"
            >
              {showDetails ? "Hide details" : "Show details"}
            </button>
          </div>

          {showDetails && (
            <div id="eh-error-details" style={detailBlockStyle}>
              <div>
                <strong>Error</strong>: {errorMessage ?? "(none)"}
              </div>
              <div>
                <strong>Component Stack</strong>:
              </div>
              <pre style={{ margin: 0 }}>{componentStack ?? "(none)"}</pre>
              <div style={{ marginTop: 8 }}>
                Having trouble repeatedly?{" "}
                <button onClick={this.handleSoftReset} style={linkLike}>
                  try a soft reset
                </button>{" "}
                or{" "}
                <button onClick={this.handleReload} style={linkLike}>
                  reload the app
                </button>
                .
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }
}

export default ErrorBoundary;
