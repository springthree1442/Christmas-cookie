
// CHRISTMAS COOKIE ATELIER
// js/icing.js
// Smooth chocolate pen version

const FLAVORS = {
  strawberry: {
    color: "#ee91a5",
    shadow: "#c7657d",
    highlight: "#ffd0da"
  },
  chocolate: {
    color: "#75412f",
    shadow: "#4a241a",
    highlight: "#b67c62"
  },
  vanilla: {
    color: "#fff0c7",
    shadow: "#d7bc85",
    highlight: "#fffbea"
  }
};

export class Icing {
  constructor(canvas, cookie) {
    this.canvas = canvas;
    this.cookie = cookie;

    this.flavor = "strawberry";
    this.strokes = [];
    this.currentStroke = null;
    this.drawing = false;

    this.minWidth = 12;
    this.maxWidth = 22;

    this.lastPoint = null;
    this.lastTime = 0;

    this.icingCanvas = document.createElement("canvas");
    this.icingCanvas.width = canvas.width;
    this.icingCanvas.height = canvas.height;
    this.icingCtx = this.icingCanvas.getContext("2d");

    this.maskCanvas = document.createElement("canvas");
    this.maskCanvas.width = canvas.width;
    this.maskCanvas.height = canvas.height;
    this.maskCtx = this.maskCanvas.getContext("2d");

    this.maskShape = null;
  }

  setFlavor(flavor) {
    if (!FLAVORS[flavor]) return false;
    this.flavor = flavor;
    return true;
  }

  getPosition(event) {
    const rect = this.canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) *
         this.canvas.width / rect.width,
      y: (event.clientY - rect.top) *
         this.canvas.height / rect.height
    };
  }

  start(event) {
    if (!this.cookie.image || this.drawing) return;

    const point = this.getPosition(event);

    if (!this.cookie.isInsideCookie(point.x, point.y)) {
      return;
    }

    this.drawing = true;
    this.lastTime = performance.now();

    this.lastPoint = {
      x: point.x,
      y: point.y,
      width: 17
    };

    this.currentStroke = {
      flavor: this.flavor,
      points: [{ ...this.lastPoint }]
    };

    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch (error) {}

    this.renderIcing();
  }

  move(event) {
    if (!this.drawing || !this.currentStroke) return;

    const point = this.getPosition(event);
    const now = performance.now();

    const dx = point.x - this.lastPoint.x;
    const dy = point.y - this.lastPoint.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 1.2) return;

    const elapsed = Math.max(1, now - this.lastTime);
    const speed = distance / elapsed;

    const targetWidth = Math.max(
      this.minWidth,
      Math.min(this.maxWidth, 22 - speed * 2)
    );

    const width =
      this.lastPoint.width * 0.8 +
      targetWidth * 0.2;

    const steps = Math.max(1, Math.ceil(distance / 4));

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;

      this.currentStroke.points.push({
        x: this.lastPoint.x + dx * t,
        y: this.lastPoint.y + dy * t,
        width: this.lastPoint.width +
          (width - this.lastPoint.width) * t
      });
    }

    this.lastPoint = {
      x: point.x,
      y: point.y,
      width
    };

    this.lastTime = now;
    this.renderIcing();
  }

  end(event) {
    if (!this.drawing) return;

    try {
      if (event && event.pointerId !== undefined) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
    } catch (error) {}

    this.drawing = false;

    if (this.currentStroke) {
      this.strokes.push(this.currentStroke);
    }

    this.currentStroke = null;
    this.lastPoint = null;

    this.renderIcing();
  }

  // 부드러운 곡선 경로 생성

  createPath(points) {
    const path = new Path2D();

    if (!points.length) return path;

    path.moveTo(points[0].x, points[0].y);

    if (points.length === 1) return path;

    for (let i = 1; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;

      path.quadraticCurveTo(
        current.x,
        current.y,
        midX,
        midY
      );
    }

    const last = points[points.length - 1];

    path.lineTo(last.x, last.y);

    return path;
  }

  // 연속된 초콜릿 선 그리기

  drawStroke(ctx, stroke) {
    const points = stroke.points;
    if (!points || !points.length) return;

    const colors = FLAVORS[stroke.flavor];
    if (!colors) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // 점 하나만 찍은 경우
    if (points.length === 1) {
      const p = points[0];
      const radius = p.width / 2;

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 1, 0, Math.PI * 2);
      ctx.fillStyle = colors.shadow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = colors.color;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(
        p.x - radius * 0.25,
        p.y - radius * 0.27,
        radius * 0.32,
        radius * 0.15,
        -0.5,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = colors.highlight;
      ctx.globalAlpha = 0.45;
      ctx.fill();

      ctx.restore();
      return;
    }

    // 1. 어두운 외곽선
    this.drawVariableLine(
      ctx, points, colors.shadow, 2, 0, 0
    );

    // 2. 초콜릿 본체
    this.drawVariableLine(
      ctx, points, colors.color, 0, 0, 0
    );

    // 3. 한쪽에 이어지는 얇은 광택
    ctx.globalAlpha = 0.34;

    this.drawVariableLine(
      ctx, points, colors.highlight, -13, -2, -2
    );

    ctx.restore();
  }

  // 구간별 굵기를 자연스럽게 연결

  drawVariableLine(
    ctx, points, color, widthOffset, offsetX, offsetY
  ) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (points.length === 1) {
      const p = points[0];
      const radius = Math.max(
        0.5, (p.width + widthOffset) / 2
      );

      ctx.beginPath();
      ctx.arc(
        p.x + offsetX,
        p.y + offsetY,
        radius,
        0,
        Math.PI * 2
      );
      ctx.fill();
      return;
    }

    // 같은 색상의 짧은 선분을 연결
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];

      const width = Math.max(
        1,
        (a.width + b.width) / 2 + widthOffset
      );

      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x + offsetX, a.y + offsetY);
      ctx.lineTo(b.x + offsetX, b.y + offsetY);
      ctx.stroke();
    }
  }

  // 쿠키 이미지 마스크 캐싱

  updateMask() {
    if (!this.cookie.image) return;

    const shape = this.cookie.shape;

    if (this.maskShape === shape) return;

    const ctx = this.maskCtx;

    ctx.clearRect(
      0, 0,
      this.maskCanvas.width,
      this.maskCanvas.height
    );

    this.cookie.updatePosition();

    ctx.drawImage(
      this.cookie.image,
      this.cookie.x,
      this.cookie.y,
      this.cookie.size,
      this.cookie.size
    );

    this.maskShape = shape;
  }

  renderIcing() {
    const ctx = this.icingCtx;

    ctx.clearRect(
      0, 0,
      this.icingCanvas.width,
      this.icingCanvas.height
    );

    for (const stroke of this.strokes) {
      this.drawStroke(ctx, stroke);
    }

    if (this.currentStroke) {
      this.drawStroke(ctx, this.currentStroke);
    }

    this.updateMask();

    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(this.maskCanvas, 0, 0);
    ctx.restore();
  }

  draw(ctx) {
    ctx.drawImage(this.icingCanvas, 0, 0);
  }

  undo() {
    if (!this.strokes.length) return;

    this.strokes.pop();
    this.renderIcing();
  }

  clear() {
    this.strokes = [];
    this.currentStroke = null;
    this.drawing = false;
    this.lastPoint = null;
    this.renderIcing();
  }

  getCanvas() {
    return this.icingCanvas;
  }

  reset() {
    this.flavor = "strawberry";
    this.maskShape = null;
    this.clear();
  }
}
