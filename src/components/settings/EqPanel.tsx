// src/components/settings/EqPanel.tsx
/**
 * EqPanel (Phase 2)
 * -----------------------------------------------------------------------------
 * Small, accessible UI for adjusting the 10-band EQ and toggling bypass.
 *
 * Integration
 * - Talks to the audio engine through the high-level facade:
 *     • audioEngine.setEqGain(index, gainDb)
 *     • audioEngine.setEqBypassed(boolean)
 *     • audioEngine.getEqBands() → readonly { freq, gain }[]
 * - The first call (mount) will lazily create the EQ graph via AudioEngine.ensureEq().
 *
 * A11y
 * - Each slider uses role=slider semantics provided by <input type="range">.
 * - Proper aria-labels that include the center frequency.
 *
 * Styling
 * - Uses glass tokens from globals/tokens (eh-glass, range styling already defined).
 */

import React, { useEffect, useMemo, useState } from "react";
import audioEngine from "@/lib/audio/AudioEngine";

type Band = { freq: number; gain: number };

const formatHz = (hz: number) => {
  if (hz >= 1000) return `${(hz / 1000).toFixed(hz % 1000 === 0 ? 0 : 1)} kHz`;
  return `${hz} Hz`;
};

const GAIN_MIN = -12;
const GAIN_MAX = 12;
const GAIN_STEP = 0.5;

const EqPanel: React.FC = () => {
  const [bands, setBands] = useState<Band[]>([]);
  const [bypassed, setBypassed] = useState(false);

  // On mount: ensure EQ graph exists and hydrate local state from engine.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Ensures the EQ module is loaded and chain rewired (no audible change: gains default 0).
        await audioEngine.setEqBypassed(false);
        const initial = audioEngine.getEqBands();
        if (!cancelled) setBands(initial.slice());
      } catch {
        // EQ is optional; if not available, keep panel empty.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Slider handler: update a single band gain
  const onChangeGain = (idx: number) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.currentTarget.value);
    try {
      await audioEngine.setEqGain(idx, val);
      setBands((prev) => {
        const next = prev.slice();
        if (next[idx]) next[idx] = { ...next[idx], gain: val };
        return next;
      });
    } catch {
      // ignore if EQ module absent
    }
  };

  // Bypass toggle
  const onToggleBypass = async () => {
    const next = !bypassed;
    setBypassed(next);
    try {
      await audioEngine.setEqBypassed(next);
    } catch {
      // ignore
    }
  };

  // Render nothing if EQ unavailable
  if (!bands.length) {
    return (
      <section
        className="eh-glass"
        role="region"
        aria-label="Equalizer"
        style={{ padding: "var(--eh-gap-md)" }}
      >
        <div style={{ fontSize: "var(--eh-fs-sm)", color: "var(--eh-text-muted)" }}>
          Equalizer unavailable
        </div>
      </section>
    );
  }

  return (
    <section
      className="eh-glass"
      role="region"
      aria-label="Equalizer"
      style={{ padding: "var(--eh-gap-md)" }}
    >
      <div className="eh-hstack" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <h3 className="eh-title" style={{ fontSize: "var(--eh-fs-md)", margin: 0 }}>
          Equalizer
        </h3>
        <button
          className="eh-btn"
          type="button"
          aria-pressed={bypassed}
          aria-label={bypassed ? "EQ bypassed — click to enable" : "EQ enabled — click to bypass"}
          onClick={onToggleBypass}
          title={bypassed ? "Enable EQ" : "Bypass EQ"}
        >
          {bypassed ? "Bypassed" : "Enabled"}
        </button>
      </div>

      {/* Sliders grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(140px, 1fr))",
          gap: "var(--eh-gap-md)",
        }}
      >
        {bands.map((b, i) => (
          <label key={b.freq} className="eh-vstack" style={{ alignItems: "stretch" }}>
            <span
              style={{
                fontSize: "var(--eh-fs-sm)",
                color: "var(--eh-text-muted)",
                textAlign: "left",
              }}
            >
              {formatHz(b.freq)}
              <span className="sr-only"> gain</span>
            </span>
            <input
              type="range"
              min={GAIN_MIN}
              max={GAIN_MAX}
              step={GAIN_STEP}
              value={b.gain}
              aria-label={`Gain for ${formatHz(b.freq)}`}
              onChange={onChangeGain(i)}
              // Disabled UI state mirrors bypass but still lets users stage values;
              // we keep it interactive to preview slider positions. If you prefer
              // strict disable, uncomment the next line:
              // disabled={bypassed}
            />
            <span style={{ fontSize: "var(--eh-fs-xs)", color: "var(--eh-text-subtle)" }}>
              {b.gain > 0 ? `+${b.gain.toFixed(1)} dB` : `${b.gain.toFixed(1)} dB`}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
};

export default EqPanel;
