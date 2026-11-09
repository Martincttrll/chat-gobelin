import * as THREE from "three/webgpu";
import type { Size } from "@/core/game/physics";
import Trail from "./Trail";

export default class TrailScene {
  private renderer: THREE.WebGPURenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private meshes: Map<number, Trail>;
  private ready = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = this.createRenderer(canvas);
    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.meshes = new Map<number, Trail>();
  }

  public async init() {
    await this.renderer.init();
    this.ready = true;
  }

  private createRenderer(canvas: HTMLCanvasElement): THREE.WebGPURenderer {
    const renderer = new THREE.WebGPURenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    return renderer;
  }

  private createScene(): THREE.Scene {
    return new THREE.Scene();
  }

  // Repère en pixels, origine en haut à gauche et y vers le bas, comme le SVG du jeu.
  private createCamera(): THREE.OrthographicCamera {
    return new THREE.OrthographicCamera(0, 1, 0, 1, -1, 1);
  }

  public createTrail(id: number): Trail {
    const trail = new Trail();
    this.meshes.set(id, trail);
    this.scene.add(trail);
    return trail;
  }

  public resize(size: Size) {
    this.renderer.setSize(size.width, size.height, false);
    this.camera.right = size.width;
    this.camera.bottom = size.height;
    this.camera.updateProjectionMatrix();
  }

  public update() {
    if (!this.ready) return;

    this.meshes.forEach((trail) => {
      trail.update();
    });
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    this.ready = false;
    this.renderer.dispose();
  }
}
