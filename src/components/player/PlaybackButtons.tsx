import React from "react";
import { motion } from "framer-motion";
import { getIcon } from "@/lib/utils/IconRegistry";
import { usePlayerStore } from "@/lib/state/usePlayerStore";

/**
 * PlaybackButtons
 * Transport controls: Prev | Play/Pause | Next + optional Shuffle/Repeat + Mute
 *
 * A11y:
 * - role="group" with accessible label
 * - aria-pressed on toggle buttons (shuffle, repeat, mute)
 * - distinct aria-labels for each action
 *
 * Design:
 * - Glass buttons via existing utility classes (glass-btn, glass-btn--primary)
 * - 44px min tap target
 */

type ButtonProps = {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  icon: ReturnType<typeof getIcon>;
  variant?: "default" | "primary";
};

const GlassIconButton: React.FC<ButtonProps> = ({
  label,
  pressed,
  onClick,
  icon: Icon,
  variant = "default",
}) => {
  return (
    <motion.button
      type="button"
      className={`glass-btn ${variant === "primary" ? "glass-btn--primary" : ""}`}
      aria-label={label}
      aria-pressed={pressed ?? undefined}
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
    >
      <Icon aria-hidden width={20} height={20} />
    </motion.button>
  );
};

export const PlaybackButtons: React.FC = () => {
  // Player state and actions from the store.
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);

  const shuffle = usePlayerStore((s) => s.shuffle);
  const setShuffle = usePlayerStore((s) => s.setShuffle);

  const repeatMode = usePlayerStore((s) => s.repeat); // "off" | "one" | "all"
  const setRepeat = usePlayerStore((s) => s.setRepeat);

  // Mute handling: either explicit isMuted or derived from volume === 0
  const isMuted = usePlayerStore((s) => s.isMuted ?? s.volume === 0);
  const toggleMute = usePlayerStore((s) => s.toggleMute ?? (() => s.setVolume(isMuted ? 0.8 : 0)));

  const handlePlayPause = () => {
    if (isPlaying) pause();
    else play();
  };

  const handleToggleShuffle = () => setShuffle(!shuffle);

  const handleCycleRepeat = () => {
    // Cycle off -> all -> one -> off (matches common native players)
    if (repeatMode === "off") setRepeat("all");
    else if (repeatMode === "all") setRepeat("one");
    else setRepeat("off");
  };

  const PlayPauseIcon = getIcon(isPlaying ? "pause" : "play");
  const MuteIcon = getIcon(isMuted ? "mute" : "volume");
  const RepeatIcon = getIcon(repeatMode === "one" ? "repeatOne" : "repeat");

  return (
    <div
      role="group"
      aria-label="Playback controls"
      className="playback-buttons"
    >
      {/* Left cluster (A / Prev) */}
      <GlassIconButton
        label="Previous track"
        onClick={prev}
        icon={getIcon("prev")}
      />

      {/* Center cluster (B: Play/Pause) */}
      <GlassIconButton
        label={isPlaying ? "Pause" : "Play"}
        onClick={handlePlayPause}
        icon={PlayPauseIcon}
        variant="primary"
      />

      {/* Right cluster (C / Next) */}
      <GlassIconButton
        label="Next track"
        onClick={next}
        icon={getIcon("next")}
      />

      {/* Spacer */}
      <span className="playback-buttons__spacer" aria-hidden />

      {/* Toggles: Shuffle / Repeat / Mute */}
      <GlassIconButton
        label="Toggle shuffle"
        onClick={handleToggleShuffle}
        icon={getIcon("shuffle")}
        pressed={shuffle}
      />

      <GlassIconButton
        label={
          repeatMode === "one"
            ? "Repeat single track"
            : repeatMode === "all"
            ? "Repeat all tracks"
            : "Repeat off"
        }
        onClick={handleCycleRepeat}
        icon={RepeatIcon}
        pressed={repeatMode !== "off"}
      />

      <GlassIconButton
        label={isMuted ? "Unmute" : "Mute"}
        onClick={toggleMute}
        icon={MuteIcon}
        pressed={isMuted}
      />
    </div>
  );
};

export default PlaybackButtons;
