import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';

/** Scene tạm do init_video.py tạo. Thay theo SHOT_PLAN. API: kit/KIT.md */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, _t: number, _lt: number) {
    A.clear(c);
    K.begin(c, { x: A.W / 2, y: A.H / 2, z: 1 });
    K.end(c);
  }
}
