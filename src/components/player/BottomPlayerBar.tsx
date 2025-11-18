// src/components/player/BottomPlayerBar.tsx
/**
 * BottomPlayerBar
 * -----------------------------------------------------------------------------
 * Persistent bottom player control bar matching the visionboard layout.
 * 
 * Layout sections:
 * - Left: Volume control (F1)
 * - Center left: Now playing info with album art and progress bar (F2)
 * - Center: Playback transport controls (F4)
 * - Center right: Upload/action button (F3)
 * - Right: Time display and playback speed selector (F5)
 * 
 * Responsibilities:
 * - Display current track metadata (title/artist/artwork)
 * - Provide transport controls: prev / play-pause / next
 * - Provide timeline scrubbing (seek), volume, and rate controls
 * - Reflect live playback state from PlaybackController events
 * 
 * A11y:
 * - Buttons have aria-labels and pressed state where applicable
 * - Timeline is accessible with proper ARIA attributes
 * - Live regions announce track/time changes to assistive tech
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import playbackController from "@/lib/audio/PlaybackController";
import { Icon } from "@/lib/utils/IconRegistry";
import { toast } from "@/components/feedback/Toasts";
import { VolumeSlider } from "./VolumeSlider";

type TrackMeta = {
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
};

const fmtTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
};

const RATE_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const BottomPlayerBar: React.FC = () => {
  // UI state mirrored from controller events
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [rate, setRate] = useState<number>(1);
  const [track, setTrack] = useState<TrackMeta | null>(null);

  // Scrub state (avoid fighting controller timeupdates while the user drags)
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubValueRef = useRef<number>(0);

  // Subscribe to controller lifecycle
  useEffect(() => {
    const offPlay = playbackController.on("play", () => setIsPlaying(true));
    const offPause = playbackController.on("pause", () => setIsPlaying(false));
    const offEnded = playbackController.on("ended", () => setIsPlaying(false));
    const offError = playbackController.on("error", (e) => {
      const err = e.error;
      const message = err instanceof Error ? err.message : String(err || "Playback error");
      
      if (message.includes("NotAllowedError") || message.includes("autoplay")) {
        toast.error("Autoplay blocked", {
          message: "Please click play to start playback. Some browsers require user interaction.",
        });
      } else if (message.includes("NotSupportedError") || message.includes("format")) {
        toast.error("Unsupported format", {
          message: "This audio format is not supported by your browser.",
        });
      } else if (message.includes("network") || message.includes("CORS") || message.includes("fetch")) {
        toast.error("Network error", {
          message: "Unable to load audio. Please check your connection and try again.",
        });
      } else {
        toast.error("Playback error", {
          message: message,
        });
      }
    });
    const offTime = playbackController.on("timeupdate", (e) => {
      if (!isScrubbing) setCurrentTime(e.currentTime);
    });
    const offDur = playbackController.on("durationchange", (e) => setDuration(e.duration));
    const offRate = playbackController.on("ratechange", (e) => setRate(e.rate));
    const offTrack = playbackController.on("trackchange", (e) => {
      const t = e.track ?? {};
      setTrack({
        title: t.title,
        artist: t.artist,
        album: t.album,
        artworkUrl: t.artworkUrl,
      });
      // Reset times for new track
      setCurrentTime(0);
      setDuration(0);
    });

    // Initialize from controller (covers reload/mount)
    setIsPlaying(playbackController.isPlaying);
    setCurrentTime(playbackController.currentTime);
    setDuration(playbackController.duration);
    setRate(playbackController.playbackRate || 1);

    return () => {
      offPlay();
      offPause();
      offEnded();
      offError();
      offTime();
      offDur();
      offRate();
      offTrack();
    };
  }, [isScrubbing]);

  // Handlers: transport
  const onToggle = async () => {
    await playbackController.toggle();
  };
  const onPrev = async () => {
    await playbackController.prevTrack(true);
  };
  const onNext = async () => {
    await playbackController.nextTrack(true);
  };

  // Handlers: seek
  const onSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.currentTarget.value);
    scrubValueRef.current = v;
    setIsScrubbing(true);
    setCurrentTime(v);
  };
  const commitSeek = async () => {
    const t = scrubValueRef.current;
    setIsScrubbing(false);
    playbackController.seek(t);
  };

  // Handlers: rate
  const onRate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const r = Number(e.currentTarget.value);
    setRate(r);
    playbackController.setRate(r);
  };

  // Handler: file upload
  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.multiple = false;

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          // Use PlaybackController's loadFromFile method
          await playbackController.loadFromFile(file, true);
          toast.success(`Loaded: ${file.name}`);
        } catch (error) {
          console.error('Error loading audio file:', error);
          toast.error("Failed to load file", {
            message: error instanceof Error ? error.message : "Please try again.",
          });
        }
      }
    };

    input.click();
  };

  const progressText = useMemo(() => {
    return `${fmtTime(currentTime)} / ${fmtTime(duration || 0)}`;
  }, [currentTime, duration]);

  return (
    <div
      className="bottom-player-bar"
      role="region"
      aria-label="Player controls"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "var(--eh-bottom-bar-h, 80px)",
        background: "rgba(26, 43, 69, 0.95)",
        backdropFilter: "blur(16px) saturate(120%)",
        borderTop: "1px solid rgba(255, 255, 255, 0.25)",
        boxShadow: "0 -8px 24px rgba(0, 0, 0, 0.28)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: "16px",
        zIndex: 1000,
      }}
    >
      {/* Left: Volume control (F1) */}
      <div style={{ minWidth: "180px", display: "flex", alignItems: "center" }}>
        <VolumeSlider />
      </div>

      {/* Center left: Now playing info (F2) */}
      <div
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {/* Album artwork */}
        <div
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
            borderRadius: 8,
            overflow: "hidden",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            flexShrink: 0,
          }}
        >
          {track?.artworkUrl ? (
            <img
              src={track.artworkUrl}
              alt="Album artwork"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.3)",
                fontSize: "20px",
              }}
            >
              ♪
            </div>
          )}
        </div>

        {/* Track info */}
        <div
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--eh-text)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {track?.title || "No track loaded"}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--eh-text-muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {track?.artist || "Unknown Artist"}
            {track?.album ? ` • ${track.album}` : null}
          </div>
          {/* Progress bar */}
          <div style={{ position: "relative", marginTop: "4px" }}>
            <div
              style={{
                height: 3,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 2,
              }}
            >
              <div
                style={{
                  width: `${((currentTime / duration) * 100) || 0}%`,
                  height: "100%",
                  background: "var(--eh-aqua)",
                  borderRadius: 2,
                }}
              />
            </div>
            {/* Hidden seek input for accessibility */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={onSeekInput}
              onMouseUp={commitSeek}
              onKeyUp={commitSeek}
              style={{
                width: "100%",
                height: "3px",
                background: "transparent",
                position: "absolute",
                top: 0,
                left: 0,
                opacity: 0,
                cursor: "pointer",
              }}
              aria-label="Seek through track"
            />
          </div>
        </div>
      </div>

      {/* Center: Playback transport controls (F4) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <button
          type="button"
          className="icon-btn"
          aria-label="Previous track"
          onClick={onPrev}
          style={{
            width: "40px",
            height: "40px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Icon name="prev" aria-hidden="true" size={20} />
        </button>
        
        <button
          type="button"
          className="icon-btn"
          aria-label={isPlaying ? "Pause" : "Play"}
          aria-pressed={isPlaying ? "true" : "false"}
          onClick={onToggle}
          style={{
            width: "48px",
            height: "48px",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Icon name={isPlaying ? "pause" : "play"} aria-hidden="true" size={24} />
        </button>
        
        <button
          type="button"
          className="icon-btn"
          aria-label="Next track"
          onClick={onNext}
          style={{
            width: "40px",
            height: "40px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Icon name="next" aria-hidden="true" size={20} />
        </button>
      </div>

      {/* Center right: Upload button (F3) */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          type="button"
          className="icon-btn"
          aria-label="Upload audio file"
          onClick={handleFileUpload}
          style={{
            width: "40px",
            height: "40px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Icon name="upload" aria-hidden="true" size={20} />
        </button>
      </div>

      {/* Right: Time display and speed selector (F5) */}
      <div
        style={{
          minWidth: "200px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          justifyContent: "flex-end",
        }}
      >
        {/* Time display */}
        <div
          style={{
            fontSize: "12px",
            color: "var(--eh-text-muted)",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {progressText}
        </div>

        {/* Speed selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--eh-text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            Speed:
          </span>
          <select
            value={rate}
            onChange={onRate}
            aria-label="Playback speed"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              borderRadius: "6px",
              padding: "4px 8px",
              color: "var(--eh-text)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {RATE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default BottomPlayerBar;

