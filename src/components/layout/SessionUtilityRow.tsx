import React from "react";

// Placeholder hooks/selectors for now-playing, FPS, and queue size
// Replace with real selectors from your stores as needed
const useNowPlaying = () => ({
  title: "Unknown Title",
  artist: "Unknown Artist",
  duration: 0,
});
const useFPS = () => ({ tier: "Medium", fps: 60 });
const useQueueSize = () => 0;

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
    <div className="session-utility-row eh-glass" style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 20px", borderRadius: 12, margin: "8px 0" }}>
      {/* Now-playing summary */}
      <button
        className="utility-nowplaying"
        style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 600 }}
        aria-label="Focus player card"
        // onClick={...}
      >
        {title} • {artist} • {fmtTime(duration)}
      </button>
      {/* Hotkeys cheat button */}
      <button
        className="utility-hotkeys"
        style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}
        aria-label="Show hotkeys cheat sheet"
        // onClick={...}
      >
        ⌨️ Hotkeys
      </button>
      {/* Performance chip */}
      <span className="utility-fps" style={{ fontSize: 12, color: "var(--eh-text-muted)", background: "rgba(0,240,255,0.08)", borderRadius: 8, padding: "2px 8px" }}>
        {tier} • {fps} FPS
      </span>
      {/* Queue size chip */}
      <button
        className="utility-queue"
        style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 12, backgroundColor: "rgba(127,106,159,0.12)", borderRadius: 8, padding: "2px 8px" }}
        aria-label="Open queue"
        // onClick={...}
      >
        Queue: {queueSize}
      </button>
    </div>
  );
};

export default SessionUtilityRow;
