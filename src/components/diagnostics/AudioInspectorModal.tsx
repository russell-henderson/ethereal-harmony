import React, { useRef, useState, useEffect } from "react";
import styles from "./AudioInspectorModal.module.css";
import { parseId3, ParsedId3 } from "@/lib/audio/Id3Parser";
import { playbackController } from "@/lib/audio/PlaybackController";

interface AudioInspectorModalProps {
  open: boolean;
  onClose: () => void;
}

interface AudioStats {
  duration: number;
  sampleRate: number;
  channels: number;
  peakDb: number;
  rmsDb: number;
  waveform: number[];
}

export const AudioInspectorModal: React.FC<AudioInspectorModalProps> = ({ open, onClose }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [tags, setTags] = useState<ParsedId3 | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; type: string } | null>(null);
  const [audioStats, setAudioStats] = useState<AudioStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const analyzeAudioBuffer = async (audioBuffer: AudioBuffer): Promise<AudioStats> => {
    const duration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;
    const channels = audioBuffer.numberOfChannels;

    // Scan channel 0 for analysis
    const data = audioBuffer.getChannelData(0);
    let maxVal = 0;
    let sumSquares = 0;

    for (let i = 0; i < data.length; i++) {
      const val = Math.abs(data[i]);
      if (val > maxVal) maxVal = val;
      sumSquares += val * val;
    }

    const peakDb = 20 * Math.log10(maxVal || 0.0001);
    const rms = Math.sqrt(sumSquares / Math.max(1, data.length));
    const rmsDb = 20 * Math.log10(rms || 0.0001);

    // Generate downsampled waveform
    const numBars = 75;
    const blockSize = Math.floor(data.length / numBars);
    const waveform: number[] = [];
    for (let i = 0; i < numBars; i++) {
      let max = 0;
      const start = i * blockSize;
      const end = Math.min(start + blockSize, data.length);
      for (let j = start; j < end; j++) {
        const val = Math.abs(data[j]);
        if (val > max) max = val;
      }
      waveform.push(max);
    }

    return {
      duration,
      sampleRate,
      channels,
      peakDb,
      rmsDb,
      waveform,
    };
  };

  const processFile = async (file: File) => {
    setAnalyzing(true);
    setError(null);
    setTags(null);
    setAudioStats(null);

    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type || "Unknown MIME",
    });

    try {
      // 1. Parse ID3 tags
      const arrayBuffer = await file.arrayBuffer();
      const parsedTags = parseId3(arrayBuffer.slice(0));
      setTags({
        title: parsedTags.title || file.name.replace(/\.[^/.]+$/, ""),
        artist: parsedTags.artist || "Unknown Artist",
        album: parsedTags.album || "Unknown Album",
        year: parsedTags.year || "N/A",
        genre: parsedTags.genre || "N/A",
        artworkUrl: parsedTags.artworkUrl,
      });

      // 2. Analyze audio using Web Audio API
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio API is not supported in this browser.");
      }
      const audioCtx = new AudioContextClass();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const stats = await analyzeAudioBuffer(decodedBuffer);
      setAudioStats(stats);
      await audioCtx.close();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to analyze audio file. Ensure it is a valid, uncorrupted audio format.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleInspectCurrent = async () => {
    const track = playbackController.getCurrentTrack();
    if (!track) {
      setError("No track is currently loaded in the player.");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setTags(null);
    setAudioStats(null);

    try {
      const res = await fetch(track.url);
      const blob = await res.blob();
      const file = new File([blob], track.title || "current-track.mp3", {
        type: blob.type || "audio/mpeg",
      });
      void processFile(file);
    } catch (err: any) {
      console.error(err);
      setError("Unable to inspect the currently playing track. Remote tracks may block analysis due to CORS policies.");
      setAnalyzing(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      void processFile(file);
    } else {
      setError("Please drop a valid audio file.");
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.modal} eh-glass glass-surface`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspector-title"
      tabIndex={-1}
      open
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 id="inspector-title" className={styles.title}>Audio Metadata & Signal Inspector</h2>
          <button type="button" onClick={onClose} className={styles.closeHeaderBtn} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {/* File input / Selection controls */}
          <div className={styles.controlRow}>
            <button
              type="button"
              className="eh-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzing}
            >
              Choose Audio File…
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            
            {playbackController.getCurrentTrack() && (
              <button
                type="button"
                className="eh-btn"
                onClick={handleInspectCurrent}
                disabled={analyzing}
              >
                Inspect Now Playing
              </button>
            )}
          </div>

          {/* Drag & Drop Zone */}
          {!fileInfo && !analyzing && !error && (
            <div
              className={styles.dropZone}
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              <div className={styles.dropIcon}>📡</div>
              <p className={styles.dropText}>Drag and drop an audio file here to inspect</p>
            </div>
          )}

          {/* Analyzing loader */}
          {analyzing && (
            <div className={styles.loader}>
              <div className={styles.spinner} />
              <p>Decoding signal & extracting metadata…</p>
            </div>
          )}

          {/* Error Message */}
          {error && <div className={styles.errorMsg}>⚠️ {error}</div>}

          {/* Inspector Results */}
          {!analyzing && (fileInfo || tags || audioStats) && (
            <div className={styles.resultsGrid}>
              {/* Technical / File specifications */}
              {fileInfo && (
                <div className={`${styles.card} eh-glass`}>
                  <h3>File Details</h3>
                  <div className={styles.statList}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Name:</span>
                      <span className={styles.statValue} title={fileInfo.name}>{fileInfo.name}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>MIME Type:</span>
                      <span className={styles.statValue}>{fileInfo.type}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Size:</span>
                      <span className={styles.statValue}>{formatSize(fileInfo.size)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ID3v2 Tags */}
              {tags && (
                <div className={`${styles.card} eh-glass`}>
                  <h3>Metadata Tags (ID3v2)</h3>
                  <div className={styles.metaInfoRow}>
                    {tags.artworkUrl && (
                      <div className={styles.artworkWrapper}>
                        <img src={tags.artworkUrl} alt="Cover Art" />
                      </div>
                    )}
                    <div className={styles.statList} style={{ flex: 1 }}>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Title:</span>
                        <span className={styles.statValue}>{tags.title || "N/A"}</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Artist:</span>
                        <span className={styles.statValue}>{tags.artist || "N/A"}</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Album:</span>
                        <span className={styles.statValue}>{tags.album || "N/A"}</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Year:</span>
                        <span className={styles.statValue}>{tags.year || "N/A"}</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Genre:</span>
                        <span className={styles.statValue}>{tags.genre || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Signal specifications (Web Audio) */}
              {audioStats && (
                <div className={`${styles.card} ${styles.signalCard} eh-glass`}>
                  <h3>Web Audio Signal Analysis</h3>
                  <div className={styles.signalGrid}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Duration:</span>
                      <span className={styles.statValue}>{audioStats.duration.toFixed(3)} s</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Sample Rate:</span>
                      <span className={styles.statValue}>{audioStats.sampleRate} Hz</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Channels:</span>
                      <span className={styles.statValue}>
                        {audioStats.channels === 1 ? "1 (Mono)" : audioStats.channels === 2 ? "2 (Stereo)" : `${audioStats.channels} Channels`}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Peak Level:</span>
                      <span className={styles.statValue} style={{ color: audioStats.peakDb > -1 ? "var(--eh-warning)" : "var(--eh-success)" }}>
                        {audioStats.peakDb.toFixed(2)} dBFS
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Average RMS:</span>
                      <span className={styles.statValue}>{audioStats.rmsDb.toFixed(2)} dBFS</span>
                    </div>
                  </div>

                  {/* SVG Waveform Visualizer */}
                  <div className={styles.waveformContainer}>
                    <div className={styles.waveformLabel}>Signal Envelope Waveform</div>
                    <svg viewBox="0 0 380 80" className={styles.waveformSvg}>
                      <defs>
                        <linearGradient id="wfGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--eh-aqua)" />
                          <stop offset="100%" stopColor="var(--eh-lavender)" stopOpacity="0.3" />
                        </linearGradient>
                      </defs>
                      {audioStats.waveform.map((val, idx) => {
                        const height = Math.max(3, val * 64);
                        const x = idx * 5;
                        const y = 40 - height / 2;
                        return (
                          <rect
                            key={idx}
                            x={x}
                            y={y}
                            width={3}
                            height={height}
                            rx={1.5}
                            fill="url(#wfGrad)"
                          />
                        );
                      })}
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" onClick={onClose} className={styles.closeBtn}>
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default AudioInspectorModal;
