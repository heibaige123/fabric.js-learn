import { FabricObject } from '../../../../fabric';

export class Cross extends FabricObject {
  animDirection: 'up' | 'down';
  w1: number;
  w2: number;
  h1: number;
  h2: number;

  constructor(options = {}) {
    super(options);

    this.transparentCorners = false;
    this.objectCaching = false;
    this.animDirection = 'up';

    this.width = 100;
    this.height = 100;

    this.w1 = this.h2 = 100;
    this.h1 = this.w2 = 30;
  }

  animateWidthHeight() {
    const interval = 2;

    if (this.h2 >= 30 && this.h2 <= 100) {
      const actualInterval = this.animDirection === 'up' ? interval : -interval;
      this.h2 += actualInterval;
      this.w1 += actualInterval;
    }

    if (this.h2 >= 100) {
      this.animDirection = 'down';
      this.h2 -= interval;
      this.w1 -= interval;
    }

    if (this.h2 <= 30) {
      this.animDirection = 'up';
      this.h2 += interval;
      this.w1 += interval;
    }
  }

  _render(ctx: CanvasRenderingContext2D) {
    ctx.fillRect(-this.w1 / 2, -this.h1 / 2, this.w1, this.h1);
    ctx.fillRect(-this.w2 / 2, -this.h2 / 2, this.w2, this.h2);
  }
}
