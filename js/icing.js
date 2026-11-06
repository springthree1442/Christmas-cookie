// Christmas Cookie Atelier — smooth icing (Canvas 2D)
// This replaces the experimental Three.js mesh pen.

const FLAVORS = {
  strawberry: { body: '#e994a9', shade: 'rgba(126, 45, 67, 0.20)', light: 'rgba(255, 255, 255, 0.16)' },
  chocolate:  { body: '#804b37', shade: 'rgba(48, 20, 13, 0.23)', light: 'rgba(255, 232, 208, 0.12)' },
  vanilla:    { body: '#f6e8c0', shade: 'rgba(123, 92, 44, 0.18)', light: 'rgba(255, 255, 255, 0.20)' }
};

export class Icing {
  constructor(canvas, cookie) {
    this.canvas = canvas;
    this.cookie = cookie;
    this.flavor = 'strawberry';
    this.width = 13;
    this.strokes = [];
    this.currentStroke = null;
    this.drawing = false;
    this.pointerId = null;

    const makeCanvas = () => {
      const c = document.createElement('canvas');
      c.width = canvas.width;
      c.height = canvas.height;
      return c;
    };
    this.savedCanvas = makeCanvas();
    this.savedCtx = this.savedCanvas.getContext('2d');
    this.icingCanvas = makeCanvas();
    this.icingCtx = this.icingCanvas.getContext('2d');

    // Hide/remove any canvas left from the previous Three.js version.
    const oldLayer = document.getElementById('icing3dLayer');
    if (oldLayer) oldLayer.replaceChildren();
  }

  setFlavor(flavor) {
    if (!FLAVORS[flavor]) return false;
    this.flavor = flavor;
    return true;
  }

  getPosition(event) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - r.left) * this.canvas.width / r.width,
      y: (event.clientY - r.top) * this.canvas.height / r.height
    };
  }

  start(event) {
    if (this.drawing || !this.cookie.image) return;
    const p = this.getPosition(event);
    // Start on the cookie, but allow strokes to continue beyond its edge.
    if (!this.cookie.isInsideCookie(p.x, p.y)) return;

    this.drawing = true;
    this.pointerId = event.pointerId ?? null;
    this.currentStroke = {
      flavor: this.flavor,
      width: this.width,
      points: [p]
    };
    try {
      if (this.pointerId !== null) this.canvas.setPointerCapture(this.pointerId);
    } catch (_) {}
    this.renderIcing();
  }

  move(event) {
    if (!this.drawing || !this.currentStroke) return;
    if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
    const p = this.getPosition(event);
    const pts = this.currentStroke.points;
    const last = pts[pts.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) < 1.4) return;

    // Gentle stabilization: remove tiny pointer jitter without geometric joins.
    const previous = pts.length > 1 ? pts[pts.length - 2] : last;
    const smoothed = {
      x: 0.88 * p.x + 0.12 * last.x,
      y: 0.88 * p.y + 0.12 * last.y
    };
    if (Math.hypot(smoothed.x - previous.x, smoothed.y - previous.y) < 0.6) return;
    pts.push(smoothed);
    this.renderIcing();
  }

  end(event) {
    if (!this.drawing) return;
    if (event && this.pointerId !== null && event.pointerId !== undefined && event.pointerId !== this.pointerId) return;
    const stroke = this.currentStroke;
    this.drawing = false;
    this.currentStroke = null;
    if (stroke) {
      this.strokes.push(stroke);
      this.drawStroke(this.savedCtx, stroke);
    }
    const id = this.pointerId;
    this.pointerId = null;
    if (id !== null) {
      try { this.canvas.releasePointerCapture(id); } catch (_) {}
    }
    this.renderIcing();
  }

  pathFor(points) {
    const p = new Path2D();
    if (!points.length) return p;
    p.moveTo(points[0].x, points[0].y);
    if (points.length === 2) {
      p.lineTo(points[1].x, points[1].y);
    } else if (points.length > 2) {
      for (let i = 1; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        p.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      const last = points[points.length - 1];
      p.lineTo(last.x, last.y);
    }
    return p;
  }

  drawStroke(ctx, stroke) {
    const pts = stroke.points;
    if (!pts?.length) return;
    const col = FLAVORS[stroke.flavor];
    if (!col) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const w = stroke.width;
    if (pts.length === 1) {
      ctx.shadowColor = col.shade;
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1.2;
      ctx.fillStyle = col.body;
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const path = this.pathFor(pts);
      ctx.strokeStyle = col.body;
      ctx.lineWidth = w;
      ctx.shadowColor = col.shade;
      ctx.shadowBlur = 2.5;
      ctx.shadowOffsetY = 1.3;
      ctx.stroke(path);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Faint continuous reflected light, not separate rings or end caps.
      ctx.translate(-1.1, -1.2);
      ctx.strokeStyle = col.light;
      ctx.lineWidth = Math.max(2, w * 0.23);
      ctx.stroke(path);
    }
    ctx.restore();
  }

  renderIcing() {
    const ctx = this.icingCtx;
    ctx.clearRect(0, 0, this.icingCanvas.width, this.icingCanvas.height);
    ctx.drawImage(this.savedCanvas, 0, 0);
    if (this.currentStroke) this.drawStroke(ctx, this.currentStroke);
  }

  draw(ctx) {
    ctx.drawImage(this.icingCanvas, 0, 0);
  }

  rebuild() {
    this.savedCtx.clearRect(0, 0, this.savedCanvas.width, this.savedCanvas.height);
    for (const stroke of this.strokes) this.drawStroke(this.savedCtx, stroke);
    this.renderIcing();
  }

  undo() {
    if (!this.strokes.length) return;
    this.strokes.pop();
    this.rebuild();
  }

  clear() {
    this.strokes = [];
    this.currentStroke = null;
    this.drawing = false;
    this.pointerId = null;
    this.savedCtx.clearRect(0, 0, this.savedCanvas.width, this.savedCanvas.height);
    this.renderIcing();
  }

  getCanvas() { return this.icingCanvas; }
  reset() {
    this.clear();
    this.flavor = 'strawberry';
  }
}
