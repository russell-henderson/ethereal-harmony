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
  const [playbackRate, setPlaybackRate] = useState<number>(1);

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
          // Create a basic track object from the file
          const newTrack = {
            title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
            artist: "Uploaded Track",
            album: "Local Files",
            artworkUrl: undefined
          };
          
          // Set the track and load it into the player
          setTrack(newTrack);
          
          // Load the audio file into the playback controller using the correct method
          await playbackController.loadFromFile(file, true);
          
        } catch (error) {
          console.error('Error loading audio file:', error);
          alert('Error loading audio file. Please try again.');
        }
      }
    };
    
    input.click();
  };

  const progressText = useMemo(() => {
    return `${fmtTime(currentTime)} / ${fmtTime(duration || 0)}`;
  }, [currentTime, duration]);

  return (
    <article 
      className="eh-glass" 
      aria-label="Audio player" 
      style={{ 
        padding: "20px",
        marginTop: "var(--eh-controls-gap)"
      }}
    >
      {/* Metadata row */}
      <div className="eh-hstack" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <div className="eh-hstack" style={{ gap: 12 }}>
          {/* Artwork - 50% larger with enhanced glassmorphism */}
          <div
            aria-hidden="true"
            style={{
              width: 84, // Increased from 56 (50% larger)
              height: 84, // Increased from 56 (50% larger)
              borderRadius: 8,
              overflow: "hidden",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              backdropFilter: "blur(12px)",
              opacity: 0.75
            }}
          >
            {track?.artworkUrl ? (
              <img src={track.artworkUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ 
                width: "100%", 
                height: "100%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                color: "rgba(255,255,255,0.3)",
                fontSize: "12px"
              }}>
                No Art
              </div>
            )}
          </div>
          
          {/* Track info - positioned further right */}
          <div className="eh-vstack" style={{ gap: 8, minWidth: 200 }}>
            <div style={{ 
              fontSize: "16px", 
              fontWeight: 600, 
              color: "var(--eh-text)",
              textAlign: "left",
              width: "100%"
            }}>
              {track?.title || "No track loaded"}
            </div>
            <div style={{ 
              fontSize: "14px", 
              color: "var(--eh-text-muted)",
              textAlign: "left",
              width: "100%"
            }}>
              {track?.artist || "Unknown Artist"}
            </div>
          </div>
        </div>
        {/* Upload button - enhanced glassmorphism with subtle shadows */}
        <button
          type="button"
          className="icon-btn"
          aria-label="Upload audio file"
          onClick={handleFileUpload}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(12px)",
            opacity: 0.75
          }}
        >
          <Icon name="upload" aria-hidden="true" />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16, position: "relative" }}>
        <div style={{ 
          height: 4, 
          background: "rgba(255,255,255,0.1)", 
          borderRadius: 2,
          marginBottom: 8
        }}>
          <div style={{ 
            width: `${((currentTime / duration) * 100) || 0}%`, 
            height: "100%", 
            background: "var(--eh-aqua)", 
            borderRadius: 2 
          }} />
        </div>
        <div style={{ 
          fontSize: "12px", 
          color: "var(--eh-text-muted)",
          textAlign: "center"
        }}>
          {progressText}
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
            height: "4px",
            background: "transparent",
            position: "absolute",
            top: 0,
            left: 0,
            opacity: 0,
            cursor: "pointer"
          }}
          aria-label="Seek through track"
        />
      </div>

      {/* Player controls - enhanced glassmorphism with subtle shadows */}
      <div className="eh-hstack" style={{ 
        justifyContent: "center", 
        gap: 16, 
        marginBottom: 16 
      }}>
        <button
          type="button"
          className="icon-btn"
          aria-label="Previous track"
          onClick={onPrev}
          style={{
            width: "52px", // 30% larger from 40px
            height: "52px", // 30% larger from 40px
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(12px)",
            opacity: 0.75
          }}
        >
          <Icon name="prev" aria-hidden="true" size={24} />
        </button>
        
        <button
          type="button"
          className="icon-btn"
          aria-label={isPlaying ? "Pause" : "Play"}
          aria-pressed={isPlaying ? "true" : "false"}
          onClick={onToggle}
          style={{
            width: "52px", // 30% larger from 40px
            height: "52px", // 30% larger from 40px
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(12px)",
            opacity: 0.75
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
            width: "52px", // 30% larger from 40px
            height: "52px", // 30% larger from 40px
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(12px)",
            opacity: 0.75
          }}
        >
          <Icon name="next" aria-hidden="true" size={24} />
        </button>
      </div>

      {/* Volume control - enhanced glassmorphism with subtle shadows */}
      <div className="eh-hstack" style={{ 
        gap: 12, 
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div className="eh-hstack" style={{ gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="icon-btn"
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted ? "true" : "false"}
            onClick={onMute}
            style={{
              width: "37px", // 15% larger from 32px
              height: "37px", // 15% larger from 32px
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              backdropFilter: "blur(12px)",
              opacity: 0.75
            }}
          >
            <Icon name={muted ? "mute" : "volume"} aria-hidden="true" size={20} />
          </button>
          
          {/* Volume slider - extended to arrow tip position */}
          <label className="eh-hstack" style={{ gap: 8, alignItems: "center" }}>
            <span className="sr-only">Volume</span>
            <div style={{ width: "200px" }}> {/* Extended from 120px to arrow tip position */}
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                style={{
                  width: "100%",
                  height: "4px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "2px",
                  outline: "none",
                  cursor: "pointer"
                }}
              />
            </div>
          </label>
        </div>

        {/* Speed control - moved to right side with enhanced glassmorphism */}
        <div className="eh-hstack" style={{ gap: 8, alignItems: "center" }}>
          <span style={{ 
            fontSize: "12px", 
            color: "var(--eh-text-muted)",
            whiteSpace: "nowrap"
          }}>
            Speed:
          </span>
          <select
            value={rate}
            onChange={onRate}
            aria-label="Playback speed"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              borderRadius: "8px",
              padding: "4px 8px",
              color: "var(--eh-text)",
              fontSize: "12px",
              backdropFilter: "blur(12px)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              opacity: 0.75
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
    </article>
  );
};

export default PlayerCard;
