// src/components/settings/VisualizerControls.tsx
import { useVizStore } from '@/lib/state/useVizStore'

export const VisualizerControls = () => {
  const params = useVizStore((s) => s.params)
  const setParam = useVizStore((s) => s.setParam)

  return (
    <div
      className="eh-vstack"
      style={{ gap: 10 }}
      aria-label="Visualizer controls"
    >
      {/* Intensity */}
      <label className="eh-hstack" style={{ gap: 8, alignItems: 'center' }}>
        <span style={{ minWidth: 72 }}>Intensity</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={params.intensity}
          onChange={(e) => setParam('intensity', parseFloat(e.target.value))}
          aria-label="Visualizer intensity"
          style={{ width: 200, accentColor: 'var(--eh-highlight)', cursor: 'pointer' }}
        />
        <span style={{ width: 48, textAlign: 'right' }}>{params.intensity.toFixed(2)}</span>
      </label>

      {/* Motion */}
      <label className="eh-hstack" style={{ gap: 8, alignItems: 'center' }}>
        <span style={{ minWidth: 72 }}>Motion</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={params.motionScale}
          onChange={(e) => setParam('motionScale', parseFloat(e.target.value))}
          aria-label="Visualizer motion"
          style={{ width: 200, accentColor: 'var(--eh-highlight)', cursor: 'pointer' }}
        />
        <span style={{ width: 48, textAlign: 'right' }}>{params.motionScale.toFixed(2)}</span>
      </label>

      {/* Density (particle count) */}
      <label className="eh-hstack" style={{ gap: 8, alignItems: 'center' }}>
        <span style={{ minWidth: 72 }}>Density</span>
        <input
          type="range"
          min={1024}
          max={16384}
          step={512}
          value={params.particleCount}
          onChange={(e) => setParam('particleCount', parseInt(e.target.value, 10))}
          aria-label="Particle density"
          style={{ width: 200, accentColor: 'var(--eh-highlight)', cursor: 'pointer' }}
        />
        <span style={{ width: 64, textAlign: 'right' }}>{params.particleCount}</span>
      </label>
    </div>
  )
}
