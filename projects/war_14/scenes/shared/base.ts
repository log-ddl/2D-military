import { Scene, type Frame } from '@engine/scene';
import { Layer2D, clearRT } from '@engine/gl';
import type * as THREE from 'three';

/** Base class for Canvas2D scenes with light background and optimal render pipeline */
export abstract class CanvasScene extends Scene {
  layer!: Layer2D;

  protected abstract draw(c: CanvasRenderingContext2D, t: number, lt: number): void;

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    this.layer ??= new Layer2D();
    this.layer.clear('#f4f8fb'); // Clean military explainer light background
    const c = this.layer.ctx;
    c.save();
    this.draw(c, f.t, f.lt);
    c.restore();

    clearRT(this.ctx.renderer, out, [0.95, 0.97, 0.98]);
    this.ctx.comp.draw(this.ctx.renderer, this.layer.upload(), out);
    return {
      bloom: 0,
      halation: 0,
      ca: 0,
      grain: 0,
      vignette: 0,
      hud: 0,
      frame: 0,
      pdoom: 0,
      fade: 0,
      exposure: 1,
    };
  }

  override dispose() {
    if (this.layer) {
      this.layer.texture.dispose();
      this.layer.canvas.width = 1;
      this.layer.canvas.height = 1;
    }
  }
}
