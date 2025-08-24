
import React, { useEffect, useState } from "react";
import { usePlayerStore } from "@/lib/state/usePlayerStore";
import styles from "./SessionUtilityRow.module.css";

// Real now-playing selector from Zustand store
const useNowPlaying = () => {
  const current = usePlayerStore((s) => s.current);
  return {
    title: current?.title || "Unknown Title",
    artist: current?.artist || "Unknown Artist",
    duration: current?.duration || 0,
  };
};

// FPS/tier hook using PerfEvents
const useFPS = () => {
  const [fps, setFps] = useState(60);
  const [tier, setTier] = useState("Medium");
  useEffect(() => {
    let mounted = true;
    // Lazy-load PerfEvents to avoid import cycles
    import("@/lib/diagnostics/PerfEvents").then((mod) => {
      const PerfEvents = mod.PerfEvents || mod.default;
      if (!PerfEvents?.onTick) return;
      const unsub = PerfEvents.onTick((detail) => {
        if (!mounted) return;
        setFps(Math.round(detail.fps));
        // Tier logic: you can refine this as needed
        setTier(detail.fps >= 55 ? "High" : detail.fps >= 40 ? "Medium" : "Low");
      });
      return unsub;
    });
    return () => {
      mounted = false;
    };
  }, []);
  return { tier, fps };
};

const useQueueSize = () => usePlayerStore((s) => s.queue.length);

const fmtTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return `${m}:${ss}`;
};

export const SessionUtilityRow: React.FC = () => {
  const { title, artist, duration } = useNowPlaying();
  const { tier, fps } = useFPS();
  const queueSize = useQueueSize();

  // TODO: Wire up click to focus PlayerCard and open queue
  return (
    <div className={`${styles["session-utility-row"]} eh-glass`}>
      {/* Now-playing summary */}
      <button
        className={styles["utility-nowplaying"]}
        aria-label="Focus player card"
        // onClick={...}
      >
        {title} • {artist} • {fmtTime(duration)}
      </button>
      {/* Hotkeys cheat button */}
      <button
        className={styles["utility-hotkeys"]}
        aria-label="Show hotkeys cheat sheet"
        // onClick={...}
      >
        ⌨️ Hotkeys
      </button>
      {/* Performance chip */}
      <span className={styles["utility-fps"]}>
        {tier} • {fps} FPS
      </span>
      {/* Queue size chip */}
      <button
        className={styles["utility-queue"]}
        aria-label="Open queue"
        // onClick={...}
      >
        Queue: {queueSize}
      </button>
    </div>
  );
};

export default SessionUtilityRow;
