/**
 * SceneController
 * - Creates renderer, scene, camera, and PostProcessing in correct order.
 * - Listens to store for HDR/AA/exposure/bufferScale changes.
 */

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Color,
} from "three";
import { PostProcessing } from "./components/PostProcessing";
import { useVizStore } from "@/lib/state/useVizStore";

export class SceneController {
  private canvas: HTMLCanvasElement;
  private renderer: WebGLRenderer;
  private scene: Scene;
  private camera: PerspectiveCamera;
  private post: PostProcessing;

  private unsubscribers: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // 1) Renderer first
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // we do post AA if enabled
      alpha: true,
      powerPreference: "high-performance",
    });

    // Get initial store values
    const s = useVizStore.getState();
    const { aaEnabled, bufferScale, hdrEnabled, exposure } = {
      aaEnabled: s.aaEnabled,
      bufferScale: s.bufferScale,
      hdrEnabled: s.hdrEnabled,
      exposure: s.exposure,
    };

    // 2) Initial size BEFORE post so passes can compute uniforms
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(dpr * bufferScale);
    this.renderer.setSize(width, height, false);

    // 3) Scene & camera
    this.scene = new Scene();
    this.scene.background = new Color("#000000");
    this.camera = new PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    // 4) Post-processing (composer is always created)
    this.post = new PostProcessing(this.renderer, this.scene, this.camera, {
      hdrEnabled,
      exposure,
      aaEnabled,
      bloomStrength: s.params.bloom, // from store
      bufferScale,
    });
    this.post.setSize(width, height, dpr);

    // 5) Subscribe to store changes we care about
    this.unsubscribers.push(
      useVizStore.subscribe((st) => st.hdrEnabled, (on) => this.post.setHdrEnabled(on)),
      useVizStore.subscribe((st) => st.exposure, (v) => this.post.setExposure(v)),
      useVizStore.subscribe((st) => st.aaEnabled, (on) => this.post.setAAEnabled(on)),
      useVizStore.subscribe((st) => st.params.bloom, (v) => this.post.setBloomStrength(v)),
      useVizStore.subscribe((st) => st.bufferScale, (scale) => this.post.setBufferScale(scale)),
    );
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1;
    this.post.setSize(width, height, dpr);
    // Update camera aspect if you use perspective
    this.camera.aspect = Math.max(0.0001, width / Math.max(1, height));
    this.camera.updateProjectionMatrix();
  }

  /** render one frame */
  render() {
    this.post.render();
  }

  dispose() {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
    this.post.dispose();
    this.renderer.dispose();
  }

  /** Expose scene/camera if your Parts need to add meshes */
  getScene() { return this.scene; }
  getCamera() { return this.camera; }
  getRenderer() { return this.renderer; }
}
