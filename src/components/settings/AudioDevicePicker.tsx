// src/components/settings/AudioDevicePicker.tsx
/**
 * AudioDevicePicker (Phase 2)
 * -----------------------------------------------------------------------------
 * Unified output device selection UI backed by OutputDeviceManager.
 *
 * Goals
 * - Provide a single, accessible control to choose the app’s audio output
 *   device (speakers/headphones), using HTMLMediaElement.setSinkId when available.
 * - Replace all previous usages of legacy DeviceManager with OutputDeviceManager.
 *
 * Key behaviors
 * - Secure-context & feature detection; renders graceful fallback if unsupported.
 * - Enumerates `audiooutput` devices (labels may be empty until user grants permission).
 * - Persists user selection (handled inside OutputDeviceManager).
 * - Reacts to hotplug/permission changes via manager events.
 * - Offers a one-click “Enable device names” button to request audio permission,
 *   which unlocks readable device labels without using the stream.
 *
 * A11y
 * - Labeled <select> with role="combobox" semantics built-in.
 * - Announces state changes (aria-live).
 *
 * Styling
 * - Glass surface (“eh-glass”) with tokens from globals/tokens.css.
 */

import React, { useEffect, useMemo, useState } from "react";
import outputDeviceManager from "@/lib/audio/OutputDeviceManager";

type Option = { value: string; label: string };

const SUPPORT_TEXT =
  "Output routing (setSinkId) is only available on Chromium-based browsers over HTTPS or localhost.";

const AudioDevicePicker: React.FC = () => {
  const [supported, setSupported] = useState<boolean>(false);
  const [canEnumerate, setCanEnumerate] = useState<boolean>(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [labelsUnlocked, setLabelsUnlocked] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Determine support once on mount, then load devices & reapply persisted sink.
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const hasSupport = outputDeviceManager.isAvailable();
        const canEnum = outputDeviceManager.canEnumerate();
        if (cancelled) return;
        setSupported(hasSupport);
        setCanEnumerate(canEnum);

        if (canEnum) {
          const opts = await outputDeviceManager.getOutputOptions();
          if (cancelled) return;
          setOptions(opts);
        }

        // Reflect current sinkId; if none, attempt persisted reapply.
        const sinkId = outputDeviceManager.getSinkId();
        if (!sinkId) {
          await outputDeviceManager.reapplyPersistedSink();
        }
        if (cancelled) return;
        setSelected(outputDeviceManager.getSinkId());

        setError(null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to initialize audio devices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    // Subscribe to device and sink changes
    const offDevices = outputDeviceManager.on("deviceschanged", async () => {
      if (cancelled) return;
      try {
        const opts = await outputDeviceManager.getOutputOptions();
        if (cancelled) return;
        setOptions(opts);
      } catch {
        // ignore
      }
    });

    const offSink = outputDeviceManager.on("sinkchange", ({ sinkId, ok }) => {
      if (cancelled) return;
      setSelected(sinkId);
      if (!ok) {
        setError("Failed to switch output device");
      } else {
        setError(null);
      }
    });

    return () => {
      cancelled = true;
      offDevices?.();
      offSink?.();
    };
  }, []);

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.currentTarget.value;
    setSelected(id);
    try {
      await outputDeviceManager.setSinkId(id);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Unable to apply output device");
    }
  };

  const onUnlockLabels = async () => {
    try {
      const ok = await outputDeviceManager.ensurePermissionForLabels();
      setLabelsUnlocked(ok);
      // Re-enumerate to fetch device labels
      const opts = await outputDeviceManager.getOutputOptions();
      setOptions(opts);
    } catch (e: any) {
      setError(e?.message || "Permission request failed");
    }
  };

  const unavailableMsg = useMemo(() => {
    if (!supported) return SUPPORT_TEXT;
    if (!canEnumerate) return "This browser cannot enumerate audio devices.";
    return null;
  }, [supported, canEnumerate]);

  return (
    <section
      className="eh-glass"
      role="group"
      aria-label="Audio output device"
      style={{ padding: "var(--eh-gap-md)" }}
    >
      <div
        className="eh-hstack"
        style={{ justifyContent: "space-between", marginBottom: "var(--eh-gap-md)" }}
      >
        <div className="eh-vstack" style={{ gap: 2 }}>
          <h3 className="eh-title" style={{ margin: 0, fontSize: "var(--eh-fs-md)" }}>
            Output Device
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "var(--eh-fs-sm)",
              color: "var(--eh-text-muted)",
            }}
          >
            Route playback to your preferred speakers or headphones.
          </p>
        </div>

        {/* Optional helper to unlock human-readable labels */}
        {supported && canEnumerate && (
          <button
            type="button"
            className="eh-btn"
            onClick={onUnlockLabels}
            aria-pressed={labelsUnlocked}
            title="Enable device names"
          >
            {labelsUnlocked ? "Device names enabled" : "Enable device names"}
          </button>
        )}
      </div>

      {/* Unsupported / unavailable state */}
      {unavailableMsg && (
        <div
          role="note"
          style={{ fontSize: "var(--eh-fs-sm)", color: "var(--eh-text-muted)", marginBottom: 8 }}
        >
          {unavailableMsg}
        </div>
      )}

      {/* Picker */}
      <label className="eh-vstack" style={{ gap: "var(--eh-gap-sm)" }}>
        <span style={{ fontSize: "var(--eh-fs-sm)" }}>Select output</span>

        <select
          value={selected ?? ""}
          onChange={onChange}
          disabled={!supported || !canEnumerate || loading}
          aria-disabled={!supported || !canEnumerate || loading}
          aria-busy={loading}
          style={{
            height: 36,
            borderRadius: "var(--eh-button-radius)",
            border: "var(--eh-glass-border)",
            background: "var(--eh-glass-bg)",
            color: "var(--eh-text)",
            padding: "0 10px",
            outline: "none",
          }}
        >
          {/* If selected is null, surface a placeholder that maps to "default" */}
          {!selected && <option value="">System Default</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {/* Status */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          marginTop: "var(--eh-gap-sm)",
          fontSize: "var(--eh-fs-sm)",
          color: error ? "var(--eh-danger, #ff6b6b)" : "var(--eh-text-muted)",
        }}
      >
        {loading
          ? "Loading devices…"
          : error
          ? error
          : selected
          ? `Current sink: ${selected}`
          : "Using system default"}
      </div>
    </section>
  );
};

export default AudioDevicePicker;
