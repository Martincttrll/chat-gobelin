import * as THREE from "three/webgpu";
import type { Point } from "@/core/game/physics";

export default class Trail extends THREE.Mesh {
  constructor() {
    super();
  }

  createGeometry() {
    const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    return geometry;
  }

  createMaterial() {
    const material = new THREE.MeshBasicNodeMaterial({
      color: 0xff6bba,
      transparent: true,
      opacity: 0.5,
    });
    return material;
  }

  // point en px dans le repère du canvas, time en secondes (gsap.ticker.time).
  public addPoint(point: Point, time: number) {}

  public update() {}
}
