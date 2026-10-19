// Blank: fills timeline gaps and empty projects with the plain light background used by every scene.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '@engine/scene';
import { clearRT } from '@engine/gl';

export default class BlankScene extends Scene {
  render(_f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    clearRT(this.ctx.renderer, out, [0.95, 0.97, 0.98]);
    return { bloom: 0, halation: 0, ca: 0, grain: 0, vignette: 0, hud: 0, frame: 0, pdoom: 0, fade: 0, exposure: 1 };
  }
}
