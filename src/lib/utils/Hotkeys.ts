// src/lib/utils/Hotkeys.ts
/**
 * Ethereal Harmony — Global Hotkeys Manager (framework-agnostic, SSR-safe)
 *
 * Purpose:
 *  - Provide a tiny, dependency-free registry for global keyboard shortcuts.
 *  - Avoid per-component listeners and duplicate logic scattered across the app.
 *  - Respect accessibility: ignore shortcuts while typing in inputs/textareas,
 *    unless explicitly allowed per binding.
 *
 * Design:
 *  - Singleton manager attaching one `keydown` listener to window (on first add).
 *  - String combos like: "p", "h", "d", "space", "arrowleft", "ctrl+`", "shift+/"
 *  - Options per binding: preventDefault, allowInInputs, allowRepeat, scope tag.
 *  - Returns an unsubscribe function to remove the binding.
 *
 * SSR:
 *  - All DOM access is guarded. No-ops on the server.
 *
 * NOTE:
 *  - This is intentionally framework-agnostic so both React code and non-React
 *    utilities (e.g., DevToggle) can share hotkey definitions consistently.
 */

export type HotkeyHandler = (e: KeyboardEvent) => void;

export type HotkeyOptions = {
  /** If true (default), e.preventDefault() is called when the combo matches. */
  preventDefault?: boolean;
  /** Allow the hotkey to fire while typing in inputs/textarea/contenteditable. Default false. */
  allowInInputs?: boolean;
  /** Allow the hotkey to fire on auto-repeat (holding down key). Default false. */
  allowRepeat?: boolean;
  /** Optional app-defined scope label (for debugging/cleanup). */
  scope?: string;
};

export type HotkeyRegistration = {
  id: number;
  combo: string;
  handler: HotkeyHandler;
  opts: Required<HotkeyOptions>;
};

const IS_BROWSER = typeof window !== "undefined";

let _enabled = true;
let _nextId = 1;
const _regs: HotkeyRegistration[] = [];
let _listenerBound = false;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Returns true if `el` is an editable/context where typing is expected. */
const isTypingTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input") {
    const type = (el as HTMLInputElement).type;
    return ["text", "search", "email", "url", "password", "number", "tel"].includes(type);
  }
  return tag === "textarea" || el.isContentEditable || tag === "select";
};

type Combo = {
  key: string; // normalized to e.key.toLowerCase()
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
};

const normalizeKeyName = (k: string) => {
  const key = k.toLowerCase().trim();
  // normalize synonyms
  if (key === "esc") return "escape";
  if (key === "spacebar") return " ";
  if (key === "space") return " ";
  if (key === "left") return "arrowleft";
  if (key === "right") return "arrowright";
  if (key === "up") return "arrowup";
  if (key === "down") return "arrowdown";
  return key;
};

const parseCombo = (combo: string): Combo => {
  const parts = combo.split("+").map((p) => p.trim().toLowerCase());
  let ctrl = false,
    alt = false,
    shift = false,
    meta = false,
    key = "";

  for (const p of parts) {
    if (p === "ctrl" || p === "control") ctrl = true;
    else if (p === "alt" || p === "option") alt = true;
    else if (p === "shift") shift = true;
    else if (p === "meta" || p === "cmd" || p === "command" || p === "super") meta = true;
    else key = normalizeKeyName(p);
  }
  return { key, ctrl, alt, shift, meta };
};

const eventToCombo = (e: KeyboardEvent): Combo => ({
  key: normalizeKeyName(e.key),
  ctrl: !!e.ctrlKey,
  alt: !!e.altKey,
  shift: !!e.shiftKey,
  meta: !!e.metaKey,
});

const combosEqual = (a: Combo, b: Combo) =>
  a.key === b.key && a.ctrl === b.ctrl && a.alt === b.alt && a.shift === b.shift && a.meta === b.meta;

/* -------------------------------------------------------------------------- */
/* Core listener                                                               */
/* -------------------------------------------------------------------------- */

const onKeyDown = (e: KeyboardEvent) => {
  if (!_enabled) return;
  if (!_regs.length) return;

  const fromInput = isTypingTarget(document.activeElement);
  const evCombo = eventToCombo(e);

  // iterate in reverse so later registrations have precedence (LIFO)
  for (let i = _regs.length - 1; i >= 0; i--) {
    const r = _regs[i];
    const want = parseCombo(r.combo);

    if (combosEqual(want, evCombo)) {
      if (!r.opts.allowRepeat && e.repeat) continue;
      if (!r.opts.allowInInputs && fromInput) continue;

      if (r.opts.preventDefault) {
        try {
          e.preventDefault();
        } catch {
          // ignore
        }
      }
      try {
        r.handler(e);
      } catch {
        // never throw from handlers
      }
      // Stop after first match to avoid cascading
      return;
    }
  }
};

const ensureListener = () => {
  if (!_listenerBound && IS_BROWSER) {
    window.addEventListener("keydown", onKeyDown, { passive: false });
    _listenerBound = true;
  }
};

const removeListenerIfIdle = () => {
  if (_listenerBound && IS_BROWSER && _regs.length === 0) {
    window.removeEventListener("keydown", onKeyDown as any);
    _listenerBound = false;
  }
};

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export const Hotkeys = {
  /**
   * Register a global hotkey. Returns an unsubscribe function.
   * Example:
   *   const off = Hotkeys.add("ctrl+`", () => togglePanel(), { scope: "diagnostics" });
   *   // later: off()
   */
  add(combo: string, handler: HotkeyHandler, opts: HotkeyOptions = {}) {
    if (!IS_BROWSER) return () => void 0;

    const reg: HotkeyRegistration = {
      id: _nextId++,
      combo,
      handler,
      opts: {
        preventDefault: opts.preventDefault !== false, // default true
        allowInInputs: !!opts.allowInInputs,
        allowRepeat: !!opts.allowRepeat,
        scope: opts.scope ?? "app",
      },
    };
    _regs.push(reg);
    ensureListener();

    return () => {
      const idx = _regs.findIndex((r) => r.id === reg.id);
      if (idx >= 0) _regs.splice(idx, 1);
      removeListenerIfIdle();
    };
  },

  /** Enable/disable processing (does not remove bindings). */
  setEnabled(next: boolean) {
    _enabled = !!next;
  },

  /** Is the manager currently processing events? */
  isEnabled() {
    return _enabled;
  },

  /** Remove all bindings (useful on major route/shell teardown). */
  clear(scope?: string) {
    if (typeof scope === "string") {
      for (let i = _regs.length - 1; i >= 0; i--) {
        if (_regs[i].opts.scope === scope) _regs.splice(i, 1);
      }
    } else {
      _regs.splice(0, _regs.length);
    }
    removeListenerIfIdle();
  },
} as const;

export default Hotkeys;

/* -------------------------------------------------------------------------- */
/* Common combos used across Ethereal Harmony (optional helpers)              */
/* -------------------------------------------------------------------------- */

export const EH_HOTKEYS = {
  TOGGLE_DEV_PANEL: "ctrl+`",
  VIZ_CYCLE_PRESET: "p",
  VIZ_TOGGLE_HDR: "h",
  VIZ_TOGGLE_DIMMER: "d",
  PLAY_PAUSE: " ", // space
  NEXT_TRACK: "arrowright",
  PREV_TRACK: "arrowleft",
} as const;
