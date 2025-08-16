import { analyserBus } from '@/lib/audio/AnalyserBus'
import { useVizStore } from '@/lib/state/useVizStore'

export class VisualizerScene {
  private three!: typeof import('three')
  private renderer!: import('three').WebGLRenderer
  private scene!: import('three').Scene
  private camera!: import('three').PerspectiveCamera
  private points!: import('three').Points
  private uniforms!: Record<string, { value: any }>
  private disposed = false

  async init(container: HTMLElement) {
    // Lazy load Three.js to keep TTI fast
    this.three = await import('three')

    const { WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, Float32BufferAttribute, ShaderMaterial, Points } = this.three

    this.renderer = new WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setClearColor(0x000000, 0) // transparent
    container.appendChild(this.renderer.domElement)

    this.scene = new Scene()
    this.camera = new PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 100)
    this.camera.position.z = 6

    // Geometry: simple grid of particles
    const count = useVizStore.getState().particleCount
    const positions = new Float32Array(count * 3)
    const side = Math.floor(Math.sqrt(count))
    let ptr = 0
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        positions[ptr++] = (x / side - 0.5) * 8
        positions[ptr++] = (y / side - 0.5) * 8
        positions[ptr++] = 0
        if (ptr >= positions.length) break
      }
    }
    const geom = new BufferGeometry()
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3))

    const { baseColor, accentColor, intensity } = useVizStore.getState()
    this.uniforms = {
      u_time: { value: 0 },
      u_low: { value: 0 },
      u_mid: { value: 0 },
      u_high: { value: 0 },
      u_intensity: { value: intensity },
      u_base: { value: new this.three.Color(baseColor) },
      u_accent: { value: new this.three.Color(accentColor) }
    }

    const vert = /* glsl */`
      uniform float u_time;
      uniform float u_low, u_mid, u_high, u_intensity;
      attribute vec3 position;
      void main() {
        float e = (u_low*0.6 + u_mid*0.3 + u_high*0.1) * u_intensity;
        vec3 p = position;
        p.z = sin(p.x*0.8 + u_time*1.6) * e * 1.2 + cos(p.y*0.8 + u_time*1.3) * e * 1.2;
        gl_PointSize = 1.5 + e * 3.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `
    const frag = /* glsl */`
      precision mediump float;
      uniform vec3 u_base;
      uniform vec3 u_accent;
      uniform float u_high;
      void main(){
        vec2 uv = gl_PointCoord - 0.5;
        float d = dot(uv, uv);
        if (d > 0.25) discard;              // soft round point
        vec3 c = mix(u_base, u_accent, clamp(u_high*1.2, 0.0, 1.0));
        float a = smoothstep(0.25, 0.0, d);
        gl_FragColor = vec4(c, a);
      }
    `
    const mat = new ShaderMaterial({ uniforms: this.uniforms, vertexShader: vert, fragmentShader: frag, transparent: true })
    this.points = new Points(geom, mat)
    this.scene.add(this.points)

    const onResize = () => {
      if (!this.renderer) return
      this.camera.aspect = container.clientWidth / container.clientHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(container.clientWidth, container.clientHeight)
    }
    const ro = new ResizeObserver(onResize); ro.observe(container)

    let raf = 0
    const loop = (t: number) => {
      if (this.disposed) return
      const e = analyserBus.sample()
      const viz = useVizStore.getState()
      this.uniforms.u_time.value = t * 0.001
      this.uniforms.u_low.value = e.low
      this.uniforms.u_mid.value = e.mid
      this.uniforms.u_high.value = e.high
      this.uniforms.u_intensity.value = viz.intensity

      this.renderer.render(this.scene, this.camera)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // teardown
    return () => {
      this.disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      this.scene.clear()
      this.renderer.dispose()
      container.replaceChildren()
    }
  }
}
