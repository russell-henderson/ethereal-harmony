// src/lib/three/components/ParticlesField.ts
import * as THREE from 'three'
import vertexShader from '../shaders/particles.vert?raw'
import fragmentShader from '../shaders/particles.frag?raw'
import { analyserBus } from '@/lib/audio/AnalyserBus'
import { useVizStore } from '@/lib/state/useVizStore'
import { usePlayerStore } from '@/lib/state/usePlayerStore'
import { FpsGuard } from '@/lib/utils/FpsGuard'
import { onVisibilityChange } from '@/lib/utils/Visibility'
import { onReducedMotionChange } from '@/lib/utils/ReducedMotion'

const modeFromCurve = (curve: 'nebula' | 'waves' | 'strobe'): number => {
  if (curve === 'waves') return 1
  if (curve === 'strobe') return 2
  return 0
}

export class ParticlesField {
  private renderer!: THREE.WebGLRenderer
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private points!: THREE.Points
  private uniforms!: Record<string, THREE.IUniform>
  private disposed = false
  private animationId: number | null = null

  private unsubViz?: () => void
  private unsubPlayer?: () => void
  private offVisibility?: () => void
  private offReducedMotion?: () => void

  private pixelRatioSteps = [0.75, 1, 1.5, 2] as const
  private prIndex = 1
  private guard!: FpsGuard

  private hidden = false
  private reducedMotion = false
  private isPlaying = false
  private particleCount = 0

  constructor(private container: HTMLElement) {}

  init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    const initialPR = Math.min(2, window.devicePixelRatio || 1)
    this.prIndex = this.pixelRatioSteps.findIndex((p) => p >= initialPR)
    if (this.prIndex < 0) this.prIndex = 1
    this.renderer.setPixelRatio(this.pixelRatioSteps[this.prIndex])
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.container.appendChild(this.renderer.domElement)

    // FPS guard
    this.guard = new FpsGuard((dir) => {
      if (dir === 'down' && this.prIndex > 0) {
        this.prIndex -= 1
        this.renderer.setPixelRatio(this.pixelRatioSteps[this.prIndex])
      } else if (dir === 'up' && this.prIndex < this.pixelRatioSteps.length - 1) {
        this.prIndex += 1
        this.renderer.setPixelRatio(this.pixelRatioSteps[this.prIndex])
      }
    })

    // Scene + Camera
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(
      55,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100
    )
    this.camera.position.z = 8

    // Initial params
    const p = useVizStore.getState().params
    this.particleCount = p.particleCount

    // Geometry + material
    const geometry = this.buildGeometry(this.particleCount)
    this.uniforms = {
      u_energyLow: { value: 0 },
      u_energyMid: { value: 0 },
      u_energyHigh: { value: 0 },
      u_time: { value: 0 },
      u_baseColor: { value: new THREE.Color(p.baseColor) },
      u_accentColor: { value: new THREE.Color(p.accentColor) },
      u_intensity: { value: p.intensity },
      u_motionScale: { value: p.motionScale },
      u_mode: { value: modeFromCurve(p.curve) }
    }
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    this.points = new THREE.Points(geometry, material)
    this.scene.add(this.points)

    // Subscribe: visualizer params
    this.unsubViz = useVizStore.subscribe(
      (s) => s.params,
      (params) => {
        ;(this.uniforms.u_baseColor.value as THREE.Color).set(params.baseColor)
        ;(this.uniforms.u_accentColor.value as THREE.Color).set(params.accentColor)
        this.uniforms.u_intensity.value = params.intensity
        this.uniforms.u_motionScale.value = params.motionScale
        this.uniforms.u_mode.value = modeFromCurve(params.curve)

        if (params.particleCount !== this.particleCount) {
          this.particleCount = params.particleCount
          this.rebuildGeometry(this.particleCount)
        }
      },
      { fireImmediately: false }
    )

    // Subscribe: player state
    this.isPlaying = usePlayerStore.getState().isPlaying
    this.unsubPlayer = usePlayerStore.subscribe(
      (s) => s.isPlaying,
      (v) => {
        this.isPlaying = v
      },
      { fireImmediately: false }
    )

    // Visibility + reduced motion
    this.offVisibility = onVisibilityChange((hidden) => {
      this.hidden = hidden
    })
    this.offReducedMotion = onReducedMotionChange((reduced) => {
      this.reducedMotion = reduced
    })

    // Resize
    const resizeObserver = new ResizeObserver(() => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    })
    resizeObserver.observe(this.container)

    // Animation loop
    const loop = (time: number) => {
      if (this.disposed) return

      if (!this.hidden) {
        const { low, mid, high } = analyserBus.sample()
        this.uniforms.u_energyLow.value = this.isPlaying ? low : low * 0.2
        this.uniforms.u_energyMid.value = this.isPlaying ? mid : mid * 0.2
        this.uniforms.u_energyHigh.value = this.isPlaying ? high : high * 0.2
        this.uniforms.u_time.value = time * 0.001

        const rmFactor = this.reducedMotion ? 0 : 1
        const ms = (this.uniforms.u_motionScale.value as number) * rmFactor
        this.camera.position.x = Math.sin(time * 0.0003) * 0.15 * ms
        this.camera.position.y = Math.cos(time * 0.00025) * 0.12 * ms
        this.camera.lookAt(0, 0, 0)

        this.renderer.render(this.scene, this.camera)
        this.guard.tick(time)
      }

      this.animationId = requestAnimationFrame(loop)
    }
    this.animationId = requestAnimationFrame(loop)

    // Cleanup
    return () => {
      this.disposed = true
      if (this.animationId) cancelAnimationFrame(this.animationId)
      resizeObserver.disconnect()
      this.unsubViz?.()
      this.unsubPlayer?.()
      this.offVisibility?.()
      this.offReducedMotion?.()
      this.scene.clear()
      this.renderer.dispose()
      this.container.innerHTML = ''
    }
  }

  private buildGeometry(count: number) {
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const area = 6
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * area
      positions[i * 3 + 1] = (Math.random() - 0.5) * area
      positions[i * 3 + 2] = (Math.random() - 0.5) * area
      scales[i] = Math.random() * 2 + 1
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('scale', new THREE.Float32BufferAttribute(scales, 1))
    return geometry
  }

  private rebuildGeometry(count: number) {
    const newGeom = this.buildGeometry(count)
    const oldGeom = this.points.geometry
    this.points.geometry = newGeom
    oldGeom.dispose()
  }
}
