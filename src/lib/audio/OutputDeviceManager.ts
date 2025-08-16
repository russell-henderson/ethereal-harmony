// src/lib/audio/OutputDeviceManager.ts
/**
 * OutputDeviceManager
 * -----------------------------------------------------------------------------
 * A small, framework-agnostic helper that manages audio **output devices**
 * (speakers / headphones) selection for Ethereal Harmony.
 *
 * Why this module?
 * - Browsers expose output routing for **HTMLMediaElement** via `setSinkId()`
 *   (Chromium, secure contexts). Our `AudioEngine` owns a single <audio> tag,
 *   so we can steer the app’s sound to any available output device *without*
 *   changing the Web Audio graph.
 *
 * What this does:
 * - Detects feature availability and secure-context constraints
 * - Enumerates `audiooutput` devices (with graceful permission prompting)
 * - Persists/re-applies the user’s preferred device across sessions
 * - Subscribes to device change events and validates the selected device
 * - Provides a clean API to set/get the current sink id (device id)
 *
 * What this does NOT do:
 * - It does not modify the Web Audio routing graph; all routing is through the
 *   <audio> element’s `setSinkId`. (AudioContext destination routing is not
 *   currently spec’d/implemented across browsers.)
 *
 * Permissions & privacy:
 * - Device labels are only revealed to the page once the user has granted a
 *   microphone permission at least once in the origin (browser rule). We do
 *   NOT store or stream any microphone audio; we can request a *silent* audio
 *   permission via `getUserMedia({ audio: true })` solely to unlock labels.
 *
 * SSR safety:
 * - All DOM and Web APIs are guarded. Calls that require the browser will no-op
 *   or resolve safely on the server.
 */

import audioEngine from "@/lib/audio/AudioEngine";

/* -------------------------------------------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------------------------------------- */

export type OutputDevice = Pick<MediaDeviceInfo, "deviceId" | "kind" | "label" | "groupId"> & {
  /** Convenience: whether this entry represents the UA "default" output. */
  isDefault: boolean;
  /** Convenience: whether this entry represents the UA "communications" output. */
  isCommunications: boolean;
};

type Listener = (ev?: any) => void;

type EventMap = {
  /** Fired when the underlying device list changes (hotplug, permission, etc.). */
  deviceschanged: { devices: OutputDevice[] };
  /** Fired after a successful/failed attempt to change sink id. */
  sinkchange: { sinkId: string | null; ok: boolean; error?: unknown };
};

/* -------------------------------------------------------------------------------------------------
 * Tiny Emitter (dependency-free)
 * ----------------------------------------------------------------------------------------------- */

class Emitter<T extends Record<string, any>> {
  private map = new Map<keyof T, Set<Listener>>();
  on<K extends keyof T>(type: K, fn: (arg: T[K]) => void) {
    if (!this.map.has(type)) this.map.set(type, new Set());
    this.map.get(type)!.add(fn as Listener);
    return () => this.map.get(type)!.delete(fn as Listener);
  }
  emit<K extends keyof T>(type: K, payload: T[K]) {
    const set = this.map.get(type);
    if (!set) return;
    for (const fn of set) (fn as (p: T[K]) => void)(payload);
  }
}

/* -------------------------------------------------------------------------------------------------
 * Constants & helpers
 * ----------------------------------------------------------------------------------------------- */

const STORAGE_KEY = "eh.audio.sinkId.v1";

/** Narrow a MediaDeviceInfo to our OutputDevice shape with flags. */
function toOutputDevice(d: MediaDeviceInfo): OutputDevice {
  const id = d.deviceId || "";
  return {
    deviceId: id,
    kind: d.kind,
    label: d.label || "", // may be empty if permission not granted
    groupId: d.groupId || "",
    isDefault: id === "default",
    isCommunications: id === "communications",
  };
}

/** Check if we can call setSinkId on HTMLMediaElement in this runtime. */
function supportsSetSinkId(): boolean {
  if (typeof window === "undefined") return false;
  const proto = (HTMLMediaElement as any)?.prototype;
  return typeof proto?.setSinkId === "function";
}

/** Secure context is required for device enumeration and setSinkId in Chromium. */
function isSecureContextOk(): boolean {
  if (typeof window === "undefined") return false;
  // localhost is treated as secure in modern browsers; `window.isSecureContext` covers HTTPS.
  return Boolean((window as any).isSecureContext);
}

/** Persist/retrieve last chosen sink id. */
function readPersistedSinkId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function writePersistedSinkId(id: string | null) {
  try {
    if (!id) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore storage failures
  }
}

/* -------------------------------------------------------------------------------------------------
 * OutputDeviceManager
 * ----------------------------------------------------------------------------------------------- */

export class OutputDeviceManager {
  private static _instance: OutputDeviceManager | null = null;
  static get instance(): OutputDeviceManager {
    if (!OutputDeviceManager._instance) {
      OutputDeviceManager._instance = new OutputDeviceManager();
    }
    return OutputDeviceManager._instance;
  }

  private emitter = new Emitter<EventMap>();
  private devices: OutputDevice[] = [];
  private deviceChangeBound = false;

  /** Cached sink id applied to the audio element (best-effort reflection). */
  private currentSinkId: string | null = null;

  private constructor() {
    // Try to remember last chosen sink id (will be validated against device list).
    this.currentSinkId = readPersistedSinkId();

    // Attach devicechange listener when possible.
    this.attachDeviceChangeListener();
  }

  /* ----------------------------------------------------------------------------
   * Events
   * -------------------------------------------------------------------------- */

  on<K extends keyof EventMap>(type: K, fn: (arg: EventMap[K]) => void) {
    return this.emitter.on(type, fn);
  }

  /* ----------------------------------------------------------------------------
   * Capabilities
   * -------------------------------------------------------------------------- */

  /**
   * Returns true if the runtime supports `HTMLMediaElement.setSinkId`.
   * NOTE: Safari currently does not; Chromium-based browsers do (HTTPS only).
   */
  isAvailable(): boolean {
    return supportsSetSinkId() && isSecureContextOk();
  }

  /**
   * Return true if the UA can enumerate devices (labels may still be empty until
   * the user grants microphone permission at least once).
   */
  canEnumerate(): boolean {
    if (typeof navigator === "undefined") return false;
    return !!navigator.mediaDevices?.enumerateDevices;
  }

  /* ----------------------------------------------------------------------------
   * Permissions
   * -------------------------------------------------------------------------- */

  /**
   * Attempt to unlock device *labels* by requesting a transient audio permission.
   * We **do not** use the stream; it is immediately stopped. This is optional,
   * but improves the UX for naming output devices in a picker.
   */
  async ensurePermissionForLabels(): Promise<boolean> {
    if (typeof navigator === "undefined") return false;
    const md = navigator.mediaDevices as MediaDevices | undefined;
    if (!md?.getUserMedia) return false;

    try {
      const stream = await md.getUserMedia({ audio: true, video: false });
      // Immediately stop tracks; we only needed the permission grant signal.
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      // User denied or device unavailable — we can still enumerate (labels hidden).
      return false;
    }
  }

  /* ----------------------------------------------------------------------------
   * Enumeration
   * -------------------------------------------------------------------------- */

  /**
   * Enumerate `audiooutput` devices. If permission hasn’t been granted,
   * labels may be empty strings. The returned list is **sorted** to keep
   * the "default" device first, followed by "communications", then others
   * alphabetically by label.
   */
  async listOutputs(): Promise<OutputDevice[]> {
    if (!this.canEnumerate()) return [];

    const list = await navigator.mediaDevices!.enumerateDevices();
    const outs = list.filter((d) => d.kind === "audiooutput").map(toOutputDevice);

    // Stable, helpful ordering.
    outs.sort((a, b) => {
      // default first
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      // communications second
      if (a.isCommunications !== b.isCommunications) return a.isCommunications ? -1 : 1;
      // then alphabetically by label (empty labels sink to the bottom)
      const la = a.label || "~";
      const lb = b.label || "~";
      return la.localeCompare(lb);
    });

    // Cache and notify if changed meaningfully
    const changed =
      outs.length !== this.devices.length ||
      outs.some((d, i) => d.deviceId !== this.devices[i]?.deviceId || d.label !== this.devices[i]?.label);

    this.devices = outs;
    if (changed) this.emitter.emit("deviceschanged", { devices: this.devices });

    return outs;
  }

  /** Return the last known device list without triggering a re-enumeration. */
  getCachedOutputs(): OutputDevice[] {
    return this.devices.slice();
  }

  /* ----------------------------------------------------------------------------
   * Selection (sink id)
   * -------------------------------------------------------------------------- */

  /**
   * Apply a specific output device (by `deviceId`) to the app’s media element.
   * - `deviceId` can be "default" or "communications", or a concrete id returned
   *   by `enumerateDevices`.
   * - On success, the selection is persisted and a `sinkchange` event fires.
   * - On failure, we keep the old selection and also emit `sinkchange` (ok:false).
   */
  async setSinkId(deviceId: string): Promise<void> {
    if (!this.isAvailable()) {
      this.emitter.emit("sinkchange", { sinkId: null, ok: false, error: new Error("setSinkId not available") });
      return;
    }

    const el = audioEngine.media as any;
    if (typeof el.setSinkId !== "function") {
      this.emitter.emit("sinkchange", { sinkId: null, ok: false, error: new Error("element has no setSinkId") });
      return;
    }

    try {
      await el.setSinkId(deviceId);
      this.currentSinkId = deviceId || null;
      writePersistedSinkId(this.currentSinkId);
      this.emitter.emit("sinkchange", { sinkId: this.currentSinkId, ok: true });
    } catch (err) {
      // Surface failure but do not modify persisted value
      this.emitter.emit("sinkchange", { sinkId: this.currentSinkId, ok: false, error: err });
    }
  }

  /**
   * Return the currently applied sink id if known. Note that there is no
   * standard `audio.sinkId` getter; we reflect the last *applied* value.
   */
  getSinkId(): string | null {
    return this.currentSinkId;
  }

  /**
   * Re-apply the persisted sink id (if any) against the current device set.
   * Call this on startup (after the audio engine has created its element) or
   * after device permission changes.
   */
  async reapplyPersistedSink(): Promise<void> {
    const persisted = readPersistedSinkId();
    if (!persisted) return;

    // Validate against current devices if we have them, otherwise attempt anyway.
    const outs = this.devices.length ? this.devices : await this.listOutputs();
    const exists = outs.some((d) => d.deviceId === persisted);

    if (!exists) {
      // Device disappeared; fall back to default and clear stored value.
      try {
        await this.setSinkId("default");
      } finally {
        // If default route applied successfully, we can clear persisted custom id.
        writePersistedSinkId(null);
      }
      return;
    }

    await this.setSinkId(persisted);
  }

  /* ----------------------------------------------------------------------------
   * Device change handling
   * -------------------------------------------------------------------------- */

  private attachDeviceChangeListener() {
    if (this.deviceChangeBound) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.addEventListener) return;

    const handler = async () => {
      await this.listOutputs();

      // If our persisted sink id vanished, try to fall back to "default".
      const persisted = readPersistedSinkId();
      if (persisted) {
        const exists = this.devices.some((d) => d.deviceId === persisted);
        if (!exists) {
          try {
            await this.setSinkId("default");
          } finally {
            writePersistedSinkId(null);
          }
        }
      }
    };

    navigator.mediaDevices.addEventListener("devicechange", handler);
    this.deviceChangeBound = true;
  }

  /* ----------------------------------------------------------------------------
   * Convenience: build simple UI options list for a picker
   * -------------------------------------------------------------------------- */

  /**
   * Returns a slim array for binding to a <select> or custom list:
   *   [{ value: deviceId, label: "Speakers (High Definition...)" }, ...]
   *
   * If labels are empty (no permission), we provide generic names.
   */
  async getOutputOptions(): Promise<Array<{ value: string; label: string }>> {
    const list = await this.listOutputs();
    return list.map((d) => {
      let label = d.label;
      if (!label) {
        // Provide a stable placeholder when labels are hidden
        if (d.isDefault) label = "System Default";
        else if (d.isCommunications) label = "Communications";
        else label = "Audio Output";
      }
      return { value: d.deviceId, label };
    });
  }
}

/* -------------------------------------------------------------------------------------------------
 * Singleton export for convenience
 * ----------------------------------------------------------------------------------------------- */

export const outputDeviceManager = OutputDeviceManager.instance;
export default outputDeviceManager;

/* -------------------------------------------------------------------------------------------------
 * Example usage (reference only; do not ship in production bundles):
 *
 *   // At startup:
 *   await outputDeviceManager.listOutputs();         // prime the cache
 *   await outputDeviceManager.reapplyPersistedSink(); // re-apply last selection
 *
 *   // Build a picker:
 *   const opts = await outputDeviceManager.getOutputOptions();
 *   // <select onChange={(e) => outputDeviceManager.setSinkId(e.target.value)}>
 *   //   {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
 *   // </select>
 *
 *   // Subscribe to changes:
 *   const off = outputDeviceManager.on("deviceschanged", ({ devices }) => { ... });
 *   const off2 = outputDeviceManager.on("sinkchange", ({ sinkId, ok }) => { ... });
 *
 * Notes:
 * - For best UX, call `ensurePermissionForLabels()` once behind a user gesture
 *   (e.g., "Enable device names") so device labels become readable.
 * - `setSinkId` requires HTTPS (or localhost) and Chromium-based browsers.
 * - If `setSinkId` is not available, hide the output-switching UI gracefully.
 * ------------------------------------------------------------------------------------------------ */
