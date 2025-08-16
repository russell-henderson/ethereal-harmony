// src/components/player/Timeline.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePlayerStore } from "@/lib/state/usePlayerStore";

const formatTime = (sec?: number) => {
  const s = Number.isFinite(sec) && (sec as number) > 0 ? Math.floor(sec as number) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const TRACK_HEIGHT = 10;

const barStyle: React.CSSProperties = {
  position: "relative",
  height: TRACK_HEIGHT,
  borderRadius: TRACK_HEIGHT / 2,
  cursor: "pointer",
  // Glass base; project styles may further enhance via .eh-glass
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.25)",
  backdropFilter: "blur(16px)",
};

const fillStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  bottom: 0,
  borderRadius: TRACK_HEIGHT / 2,
  background: "var(--eh-highlight, #00F0FF)",
  width: "0%",
  pointerEvents: "none",
};

const handleStyle: React.CSSProperties = {
  position: "absolute",
  top: -3,
  width: 14,
  height: TRACK_HEIGHT + 6,
  marginLeft: -7, // center on progress edge
  borderRadius: 8,
  background: "rgba(255,255,255,0.85)",
  boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
  pointerEvents: "none",
};

export const Timeline: React.FC = () => {
  // Select only what we need from the store to minimize re-renders
  const position = usePlayerStore((s: any) => s.position ?? s.currentTime ?? 0);
  const duration = usePlayerStore((s: any) => s.duration ?? 0);
  const seek = usePlayerStore((s: any) => s.seek ?? s.seekTo ?? ((_: number) => {}));

  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const [isHover, setIsHover] = useState(false);
  const [hoverPct, setHoverPct] = useState(0);

  const safeDuration = Math.max(0, Number(duration) || 0);
  const safePos = clamp(Number(position) || 0, 0, safeDuration);
  const pct = safeDuration > 0 ? (safePos / safeDuration) * 100 : 0;

  const posFromClientX = useCallback(
    (clientX: number) => {
      const el = barRef.current;
      if (!el || safeDuration <= 0) return 0;
      const rect = el.getBoundingClientRect();
      const local = clamp((clientX - rect.left) / rect.width, 0, 1);
      return local * safeDuration;
    },
    [safeDuration]
  );

  const updateSeekFromClientX = useCallback(
    (clientX: number) => {
      if (safeDuration <= 0) return;
      const t = posFromClientX(clientX);
      // use rAF to avoid flooding store updates
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => seek(t));
    },
    [posFromClientX, seek, safeDuration]
  );

  const onPointerDown = (clientX: number) => {
    if (safeDuration <= 0) return;
    draggingRef.current = true;
    updateSeekFromClientX(clientX);
  };

  const onGlobalPointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current) return;
      const clientX =
        e instanceof MouseEvent ? e.clientX : (e.touches && e.touches[0]?.clientX) || 0;
      updateSeekFromClientX(clientX);
    },
    [updateSeekFromClientX]
  );

  const onGlobalPointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => onGlobalPointerMove(e);
    const touchMove = (e: TouchEvent) => onGlobalPointerMove(e);
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseup", onGlobalPointerUp, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: true });
    window.addEventListener("touchend", onGlobalPointerUp, { passive: true });
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", onGlobalPointerUp);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", onGlobalPointerUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onGlobalPointerMove, onGlobalPointerUp]);

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (safeDuration <= 0) return;
    const stepSmall = 5; // seconds
    const stepLarge = 10; // seconds
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      seek(clamp(safePos - stepSmall, 0, safeDuration));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      seek(clamp(safePos + stepSmall, 0, safeDuration));
    } else if (e.key === "PageDown") {
      e.preventDefault();
      seek(clamp(safePos - stepLarge, 0, safeDuration));
    } else if (e.key === "PageUp") {
      e.preventDefault();
      seek(clamp(safePos + stepLarge, 0, safeDuration));
    } else if (e.key === "Home") {
      e.preventDefault();
      seek(0);
    } else if (e.key === "End") {
      e.preventDefault();
      seek(safeDuration);
    }
  };

  const onBarClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!barRef.current || safeDuration <= 0) return;
    onPointerDown(e.clientX);
  };

  const onBarMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!barRef.current || safeDuration <= 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const local = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    setHoverPct(local * 100);
  };

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const x = e.touches[0]?.clientX;
    if (typeof x === "number") onPointerDown(x);
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Time labels */}
      <div
        className="eh-hstack"
        style={{ justifyContent: "space-between", fontSize: 12 }}
        aria-hidden={safeDuration <= 0}
      >
        <span aria-label="Elapsed time">{formatTime(safePos)}</span>
        <span aria-label="Total duration">{formatTime(safeDuration)}</span>
      </div>

      {/* Slider */}
      <div
        ref={barRef}
        className="eh-glass eh-timeline"
        role="slider"
        aria-label="Seek position"
        aria-valuemin={0}
        aria-valuemax={safeDuration || 0}
        aria-valuenow={safePos}
        aria-valuetext={`${formatTime(safePos)} of ${formatTime(safeDuration)}`}
        aria-disabled={safeDuration <= 0}
        tabIndex={safeDuration > 0 ? 0 : -1}
        onKeyDown={onKeyDown}
        onClick={onBarClick}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        onMouseMove={onBarMouseMove}
        onTouchStart={onTouchStart}
        style={{
          ...barStyle,
          marginTop: 6,
        }}
      >
        {/* Progress fill */}
        <div style={{ ...fillStyle, width: `${pct}%` }} />

        {/* Drag handle */}
        <div style={{ ...handleStyle, left: `${pct}%`, opacity: safeDuration > 0 ? 1 : 0.4 }} />

        {/* Hover indicator (thin line) */}
        {isHover && safeDuration > 0 && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${hoverPct}%`,
              width: 2,
              transform: "translateX(-1px)",
              background: "rgba(255,255,255,0.6)",
              borderRadius: 1,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Timeline;
