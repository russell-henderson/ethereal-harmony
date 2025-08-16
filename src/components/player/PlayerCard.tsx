// src/components/player/PlayerCard.tsx
/**
 * PlayerCard (Phase 2)
 * -----------------------------------------------------------------------------
 * A glassy, accessible playback surface that talks **only** to PlaybackController.
 *
 * Responsibilities
 * - Display current track metadata (title/artist/artwork).
 * - Provide transport controls: prev / play-pause / next.
 * - Provide timeline scrubbing (seek), volume, and rate controls.
 * - Reflect live playback state from the controller’s events (no direct engine refs).
 *
 * A11y
 * - Buttons have aria-labels and pressed state where applicable.
 * - Timeline is an <input type="range"> with min/max equal to media duration.
 * - Live regions announce track/time changes to assistive tech.
 *
 * Styling
 * - Uses global glass tokens via `.eh-glass` and spacing variables.
 *
 * NOTE
 * - This component does not own queue logic; it relies on PlaybackController.
 * - Hardware media-keys are handled separately by MediaKeyBridge (also using controller).
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import playbackController from "@/lib/audio/PlaybackController";
import { Icon } from "@/lib/utils/IconRegistry";

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

const PlayerCard: React.FC = () => {
  // UI state mirrored from controller events
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [rate, setRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [muted, setMuted] = useState<boolean>(false);
  const [track, setTrack] = useState<TrackMeta | null>(null);

  // Scrub state (avoid fighting controller timeupdates while the user drags)
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubValueRef = useRef<number>(0);

  // Subscribe to controller lifecycle
  useEffect(() => {
    const offPlay = playbackController.on("play", () => setIsPlaying(true));
    const offPause = playbackController.on("pause", () => setIsPlaying(false));
    const offEnded = playbackController.on("ended", () => setIsPlaying(false));
    const offTime = playbackController.on("timeupdate", (e) => {
      if (!isScrubbing) setCurrentTime(e.currentTime);
    });
    const offDur = playbackController.on("durationchange", (e) => setDuration(e.duration));
    const offRate = playbackController.on("ratechange", (e) => setRate(e.rate));
    const offVol = playbackController.on("volumechange", (e) => {
      setVolume(e.volume);
      setMuted(e.muted);
    });
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
    setRate(1);
    setMuted(false);

    return () => {
      offPlay();
      offPause();
      offEnded();
      offTime();
      offDur();
      offRate();
      offVol();
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

  // Handlers: volume / mute
  const onVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.currentTarget.value);
    setVolume(v);
    playbackController.setVolume(v);
    if (v > 0 && muted) playbackController.setMuted(false);
  };
  const onMute = () => {
    const next = !muted;
    setMuted(next);
    playbackController.setMuted(next);
  };

  // Handlers: rate
  const onRate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const r = Number(e.currentTarget.value);
    setRate(r);
    playbackController.setRate(r);
  };

  const progressText = useMemo(() => {
    return `${fmtTime(currentTime)} / ${fmtTime(duration || 0)}`;
  }, [currentTime, duration]);

  return (
    <article className="eh-glass" aria-label="Audio player" style={{ padding: "16px" }}>
      {/* Metadata row */}
      <div className="eh-hstack" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <div className="eh-hstack" style={{ gap: 12 }}>
          {/* Artwork */}
          <div
            aria-hidden="true"
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              overflow: "hidden",
              background: "rgba(255,255,255,0.1)",
              border: "var(--eh-glass-border)",
            }}
          >
            {track?.artworkUrl ? (
              <img
                src={track.artworkUrl}
                alt=""
                width={56}
                height={56}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : null}
          </div>

          {/* Text */}
          <div className="eh-vstack" style={{ gap: 2 }}>
            <div className="eh-title" style={{ fontSize: "var(--eh-fs-md)" }}>
              {track?.title ?? "No track loaded"}
            </div>
            <div style={{ fontSize: "var(--eh-fs-sm)", color: "var(--eh-text-muted)" }}>
              {track?.artist ?? ""}
            </div>
          </div>
        </div>

        {/* Rate selector */}
        <label className="eh-hstack" style={{ gap: 8 }}>
          <span style={{ fontSize: "var(--eh-fs-sm)" }}>Speed</span>
          <select
            aria-label="Playback speed"
            value={rate}
            onChange={onRate}
            style={{
              height: 32,
              padding: "0 10px",
              borderRadius: "var(--eh-button-radius)",
              border: "var(--eh-glass-border)",
              background: "var(--eh-glass-bg)",
              color: "var(--eh-text)",
            }}
          >
            {RATE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Transport row */}
      <div
        className="eh-hstack"
        role="group"
        aria-label="Transport controls"
        style={{ justifyContent: "center", gap: 12, marginBottom: 8 }}
      >
        <button
          className="eh-btn eh-iconbtn"
          type="button"
          aria-label="Previous track"
          onClick={onPrev}
          title="Previous"
        >
          <Icon name="transport.prev" aria-hidden="true" />
        </button>

        <button
          className="eh-btn eh-iconbtn"
          type="button"
          aria-pressed={isPlaying}
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={onToggle}
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          style={{ width: 44, height: 44 }}
        >
          <Icon name={isPlaying ? "transport.pause" : "transport.play"} aria-hidden="true" />
        </button>

        <button
          className="eh-btn eh-iconbtn"
          type="button"
          aria-label="Next track"
          onClick={onNext}
          title="Next"
        >
          <Icon name="transport.next" aria-hidden="true" />
        </button>
      </div>

      {/* Timeline */}
      <div className="eh-vstack" style={{ gap: 6 }}>
        <input
          type="range"
          min={0}
          max={Math.max(0, duration || 0)}
          step={0.01}
          value={Math.min(currentTime, duration || 0)}
          onChange={onSeekInput}
          onMouseUp={commitSeek}
          onKeyUp={(e) => (e.key === "Enter" || e.key === " " ? commitSeek() : undefined)}
          aria-label="Seek"
        />
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{ fontSize: "var(--eh-fs-sm)", color: "var(--eh-text-muted)" }}
        >
          {progressText}
        </div>
      </div>

      {/* Volume row */}
      <div
        className="eh-hstack"
        style={{ justifyContent: "space-between", alignItems: "center", marginTop: 10 }}
      >
        <button
          className="eh-btn eh-iconbtn"
          type="button"
          aria-pressed={muted}
          aria-label={muted ? "Unmute" : "Mute"}
          onClick={onMute}
          title={muted ? "Unmute" : "Mute"}
        >
          <Icon name={muted || volume === 0 ? "volume.mute" : "volume.on"} aria-hidden="true" />
        </button>

        <label className="eh-hstack" style={{ gap: 8, flex: 1, marginInline: 12 }}>
          <span className="sr-only">Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={onVolume}
            aria-label="Volume"
          />
        </label>
      </div>
    </article>
  );
};

export default PlayerCard;
