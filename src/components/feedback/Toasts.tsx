// src/components/feedback/Toasts.tsx
/**
 * Toasts (Phase 2)
 * -----------------------------------------------------------------------------
 * Glassmorphism toasts with Framer Motion animations.
 * - Accessible: uses aria-live and role="status"/"alert" based on variant.
 * - Programmatic API: import { toast } and call toast.success("..."), etc.
 * - Auto-dismiss with per-toast duration; manual close is always available.
 * - No persistence; transient UI only.
 *
 * Usage:
 *  <Toasts />  // mount once near App root
 *  toast.success("Saved changes");
 */

import React, { useEffect } from "react";
import { create } from "zustand";
import { motion, AnimatePresence } from "framer-motion";

// ---- Types ------------------------------------------------------------------

type ToastVariant = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  message: string;
  title?: string;
  variant?: ToastVariant;
  duration?: number; // ms; default 2800
};

// ---- Store (local, transient) -----------------------------------------------

type ToastState = {
  toasts: ToastItem[];
  add: (t: ToastItem) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (t) =>
    set((s) => ({
      toasts: [...s.toasts, { duration: 2800, variant: "info", ...t }],
    })),
  remove: (id) =>
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    })),
  clear: () => set({ toasts: [] }),
}));

// ---- Programmatic API -------------------------------------------------------

let _seq = 0;
const makeId = () => `${Date.now().toString(36)}-${(++_seq).toString(36)}`;

function push(message: string, opts: Omit<ToastItem, "id" | "message"> = {}) {
  const id = makeId();
  useToastStore.getState().add({ id, message, ...opts });
  return id;
}

function dismiss(id: string) {
  useToastStore.getState().remove(id);
}

function clear() {
  useToastStore.getState().clear();
}

export const toast = {
  push,
  dismiss,
  clear,
  success: (message: string, opts: Omit<ToastItem, "id" | "message" | "variant"> = {}) =>
    push(message, { ...opts, variant: "success" }),
  error: (message: string, opts: Omit<ToastItem, "id" | "message" | "variant"> = {}) =>
    push(message, { ...opts, variant: "error" }),
  info: (message: string, opts: Omit<ToastItem, "id" | "message" | "variant"> = {}) =>
    push(message, { ...opts, variant: "info" }),
};

// ---- Icons (inline SVGs) ----------------------------------------------------

const Icon: React.FC<{ variant: ToastVariant }> = ({ variant }) => {
  if (variant === "success") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm-1.2-6.2 6-6-1.4-1.4-4.6 4.58-2.2-2.18-1.4 1.42 3.6 3.58Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm-1-6h2v2h-2v-2Zm0-8h2v6h-2V8Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M11 7h2v2h-2V7Zm0 4h2v6h-2v-6Zm1 11A10 10 0 1 1 12 1a10 10 0 0 1 0 20Z"
        fill="currentColor"
      />
    </svg>
  );
};

// ---- Single Toast view ------------------------------------------------------

const ToastView: React.FC<{ toast: ToastItem; onClose: (id: string) => void }> = ({
  toast,
  onClose,
}) => {
  const { id, message, title, duration = 2800, variant = "info" } = toast;

  // auto-dismiss
  useEffect(() => {
    const t = window.setTimeout(() => onClose(id), duration);
    return () => window.clearTimeout(t);
  }, [id, duration, onClose]);

  // color accent per variant
  const accent =
    variant === "success"
      ? "#00F0FF" // Radiant Aqua (on-brand)
      : variant === "error"
      ? "#ff6b6b"
      : "#7F6A9F"; // Soft Lavender

  return (
    <motion.div
      layout
      initial={{ y: 16, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 8, opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.6 }}
      className="eh-toast"
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      style={{
        display: "grid",
        gridTemplateColumns: "18px 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 16,
        // glass surface
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.25)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
        color: "#fff",
        minWidth: 280,
        maxWidth: 420,
      }}
    >
      <div
        aria-hidden
        style={{
          color: accent,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon variant={variant} />
      </div>

      <div style={{ minWidth: 0 }}>
        {title ? (
          <div
            className="eh-toast-title"
            style={{ fontWeight: 700, fontFamily: "Montserrat, ui-sans-serif", marginBottom: 2 }}
          >
            {title}
          </div>
        ) : null}
        <div
          className="eh-toast-message"
          style={{
            fontFamily: "Lato, ui-sans-serif",
            fontSize: 14,
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          {message}
        </div>
      </div>

      <button
        type="button"
        className="eh-btn eh-btn--glass"
        aria-label="Dismiss notification"
        onClick={() => onClose(id)}
        style={{
          borderRadius: 10,
          padding: "4px 8px",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.25)",
          background: "rgba(255,255,255,0.10)",
        }}
      >
        ✕
      </button>

      {/* Accent bar */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 2,
          width: "100%",
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.2) 35%, rgba(255,255,255,0.0) 100%)",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 2,
          width: "100%",
          transformOrigin: "left",
          background: accent,
          opacity: 0.7,
          // simple CSS progress via animation duration
          animation: `eh-toast-progress ${Math.max(800, duration)}ms linear forwards`,
        }}
      />
    </motion.div>
  );
};

// ---- Container --------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 16,
  right: 16,
  display: "grid",
  gap: 10,
  zIndex: 9999,
  pointerEvents: "none", // allow clicks to pass through gaps
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  pointerEvents: "auto", // but toasts themselves are interactive
};

export const Toasts: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div className="eh-toasts" style={containerStyle} aria-live="polite" aria-atomic="false">
      <AnimatePresence initial={false}>
        <div style={listStyle}>
          {toasts.map((t) => (
            <ToastView key={t.id} toast={t} onClose={remove} />
          ))}
        </div>
      </AnimatePresence>
      {/* Inline keyframes (scoped) */}
      <style>
        {`
          @keyframes eh-toast-progress {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
          }
        `}
      </style>
    </div>
  );
};

export default Toasts;
