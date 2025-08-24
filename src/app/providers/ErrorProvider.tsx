// Helper to normalize any error-like value to a consistent shape
function toErrorLike(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) return { message: err.message, stack: err.stack };
  if (typeof err === "string") return { message: err };
  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: "Unknown error" };
  }
}
// src/app/providers/ErrorProvider.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";

/**
 * ErrorProvider
 * -----------------------------------------------------------------------------
 * Phase: 1 (Foundation)
 * Role: App-wide safety net provider that:
 *   - Wraps the React tree with our ErrorBoundary.
 *   - Subscribes to global 'error' and 'unhandledrejection' events to escalate
 *     non-React errors into the boundary.
 *   - Exposes a 'reportError' function via context for any module to escalate
 *     a fatal condition into the boundary without tight coupling.
 *
 * Architecture:
 * - File path: src/app/providers/ErrorProvider.tsx (per blueprint).
 * - No telemetry or external logging in V1 (privacy-first). We only emit a DOM
 *   CustomEvent "eh:error" from the boundary itself (already implemented there).
 * - This provider focuses on capture and escalation; rendering/UI is handled by
 *   ErrorBoundary under src/components/feedback/ErrorBoundary.tsx.
 *
 * Usage:
 *   <ErrorProvider>
 *     <AppShell /> // the rest of the app
 *   </ErrorProvider>
 *
 *   // From anywhere (e.g., async init code), escalate to boundary:
 *   const { reportError } = useError();
 *   reportError(new Error("Catastrophic failure initializing AudioEngine"));
 */

// ----------------------------- Context Types ---------------------------------

export interface GlobalErrorContextValue {
  /**
   * Escalate a fatal application error into the ErrorBoundary overlay.
   * Prefer using this for unrecoverable states (e.g., corrupt persisted data,
   * failed critical initialization) to give users a predictable recovery path.
   */
  reportError: (
    error: unknown,
    info?: { component?: string; extra?: Record<string, unknown> }
  ) => void;
}

const ErrorContext = createContext<GlobalErrorContextValue | undefined>(
  undefined
);

// -------------------------- Internal Escalator Node ---------------------------

/**
 * ErrorEscalator
 * A tiny component that throws during render when it receives a non-null error.
 * Because it is placed inside the ErrorBoundary, throwing here will be caught
 * and the recovery UI will be displayed. This allows us to convert global or
 * async errors into boundary-handled ones without depending on component tree
 * boundaries at the error site.
 */
const ErrorEscalator: React.FC<{ error: Error | null }> = ({ error }) => {
  if (error) {
    // Throwing in render is how React Error Boundaries catch exceptions.
    throw error;
  }
  return null;
};

// --------------------------------- Provider ----------------------------------

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [escalatedError, setEscalatedError] = useState<Error | null>(null);


  const reportError = useCallback<GlobalErrorContextValue["reportError"]>(
    (error, info) => {
      // Normalize error to Error instance for escalation, but keep original info for dev tools
      let errObj: Error;
      if (error instanceof Error) {
        errObj = error;
      } else if (typeof error === "string") {
        errObj = new Error(error);
      } else {
        // Try to stringify, fallback to generic
        try {
          errObj = new Error(JSON.stringify(error));
        } catch {
          errObj = new Error("Unknown application error (non-Error thrown)");
        }
      }
      // Non-invasive enrichment for developer visibility in dev tools.
      try {
        (errObj as any).__eh_info__ = info ?? {};
      } catch {
        /* ignore enrichment failures */
      }
      setEscalatedError(errObj);
    },
    []
  );

  // Subscribe to global browser error channels and escalate into the boundary.
  useEffect(() => {
    const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
      // Avoid masking the original reason; preserve as much as possible.
      const reason = (ev && (ev as any).reason) ?? "Unhandled promise rejection";
      reportError(reason, { component: "unhandledrejection" });
    };

    const onWindowError = (ev: ErrorEvent) => {
      const enriched =
        ev.error instanceof Error
          ? ev.error
          : new Error(ev.message || "Unhandled error");
      try {
        (enriched as any).__eh_source__ = ev.filename
          ? `${ev.filename}:${ev.lineno}:${ev.colno}`
          : "window.onerror";
      } catch {
        /* ignore */
      }
      reportError(enriched, { component: "window.onerror" });
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onWindowError);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onWindowError);
    };
  }, [reportError]);

  const ctx = useMemo<GlobalErrorContextValue>(
    () => ({ reportError }),
    [reportError]
  );

  // We pass a key to force a remount of the boundary after escalation if needed.
  // This is conservative; our boundary currently performs a hard reload on user
  // action, but the key keeps the tree deterministic across states.
  const boundaryKey = escalatedError ? "eh-boundary-tripped" : "eh-boundary-ok";

  return (
    <ErrorContext.Provider value={ctx}>
      <ErrorBoundary key={boundaryKey}>
        {/* Placing the escalator first ensures it throws before rendering children */}
        <ErrorEscalator error={escalatedError} />
        {children}
      </ErrorBoundary>
    </ErrorContext.Provider>
  );
};

// ------------------------------- Convenience ---------------------------------

/**
 * useError
 * Hook to access the global error escalation function.
 */
export const useError = (): GlobalErrorContextValue => {
  const ctx = useContext(ErrorContext);
  if (!ctx) {
    throw new Error("useError must be used within <ErrorProvider>");
  }
  return ctx;
};

export default ErrorProvider;
