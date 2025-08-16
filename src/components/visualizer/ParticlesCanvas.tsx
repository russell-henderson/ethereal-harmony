// src/components/visualizer/ParticlesCanvas.tsx
import { useEffect, useRef } from 'react'
import { ParticlesField } from '@/lib/three/components/ParticlesField'

export const ParticlesCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const field = new ParticlesField(containerRef.current)
    const dispose = field.init()

    return () => {
      dispose?.()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-label="Audio-reactive visualizer"
      role="presentation"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    />
  )
}
