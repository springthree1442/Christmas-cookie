// CHRISTMAS COOKIE ATELIER
// js/icing.js
// Omurice-ketchup-like icing version

const FLAVORS = {
  strawberry: {
    color: "#ee91a5",
    shadow: "#c7657d",
    highlight: "#ffd2dc"
  },

  chocolate: {
    color: "#75412f",
    shadow: "#4a241a",
    highlight: "#b88468"
  },

  vanilla: {
    color: "#fff0c7",
    shadow: "#d9bf86",
    highlight: "#fff9e9"
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

    this.minWidth = 10;
    this.maxWidth = 24;

    this.lastPoint = null;
    this.lastTime = 0;

    this.icingCanvas = document.createElement("canvas");
    this.icingCanvas.width = canvas.width;
    this.icingCanvas.height = canvas.height;

    this.icingCtx = this.icingCanvas.getContext("2d");
  }

  // 초코펜 색상 선택

  setFlavor(flavor) {
    if (!FLAVORS[flavor]) return false;
    this.flavor = flavor;
    return true;
  }

  // 화면 좌표 -> 캔버스 좌표

  getPosition(event) {
    const rect = this.canvas.getBoundingClientRect();

    return {
      x:
        (event.clientX - rect.left) *
        (this.canvas.width / rect.width),

      y:
        (event.clientY - rect.top) *
        (this.canvas.height / rect.height)
    };
  }

  // 그리기 시작
  // 시작만 쿠키 안쪽에서 가능
  // 이후에는 바깥으로 이어져도 허용

  start(event) {
    if (!this.cookie.image) return;
    if (this.drawing) return;

    const point = this.getPosition(event);

    if (!this.cookie.isInsideCookie(point.x, point.y)) {
      return;
    }

    this.drawing = true;
    this.lastTime = performance.now();

    const startWidth = 17;

    this.lastPoint = {
      x: point.x,
      y: point.y,
      width: startWidth
    };

    this.currentStroke = {
      flavor: this.flavor,
      points: [{ ...this.lastPoint }]
    };

    if (event.pointerId !== undefined) {
      try {
        this.canvas.setPointerCapture(event.pointerId);
      } catch (error) {
        // 일부 환경에서는 지원되지 않을 수 있음
      }
    }

    this.renderIcing();
  }

  // 그리기 진행

  move(event) {
    if (!this.drawing || !this.currentStroke) return;

    const point = this.getPosition(event);
    const now = performance.now();

    const dx = point.x - this.lastPoint.x;
    const dy = point.y - this.lastPoint.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 1.2) return;

    const deltaTime = Math.max(1, now - this.lastTime);
    const speed = distance / deltaTime;

    // 빠를수록 얇게, 느릴수록 두껍게
    const targetWidth = Math.max(
      this.minWidth,
      Math.min(this.maxWidth, this.maxWidth - speed * 2.6)
    );

    // 급격한 굵기 변화 완화
    const width =
      this.lastPoint.width * 0.78 +
      targetWidth * 0.22;

    // 촘촘하게 보간해서 선이 끊기지 않도록 함
    const steps = Math.max(1, Math.ceil(distance / 4));

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;

      this.currentStroke.points.push({
        x: this.lastPoint.x + dx * t,
        y: this.lastPoint.y + dy * t,
        width:
          this.lastPoint.width +
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

  // 그리기 종료

  end(event) {
    if (!this.drawing) return;

    if (event && event.pointerId !== undefined) {
      try {
        this.canvas.releasePointerCapture(event.pointerId);
      } catch (error) {
        // 이미 해제되었거나 미지원
      }
    }

    this.drawing = false;

    if (
      this.currentStroke &&
      this.currentStroke.points.length > 0
    ) {
      this.strokes.push(this.currentStroke);
    }

    this.currentStroke = null;
    this.lastPoint = null;

    this.renderIcing();
  }

  // 작은 시작/끝 맺힘 표현

  drawBlob(ctx, x, y, width, colors) {
    const radius = Math.max(2, width / 2);

    // 아래쪽 진한 면
    ctx.beginPath();
    ctx.arc(x + 0.8, y + 1.1, radius, 0, Math.PI * 2);
    ctx.fillStyle = colors.shadow;
    ctx.fill();

    // 본체
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.95, 0, Math.PI * 2);
    ctx.fillStyle = colors.color;
    ctx.fill();

    // 하이라이트
    ctx.beginPath();
    ctx.ellipse(
      x - radius * 0.28,
      y - radius * 0.28,
      radius * 0.33,
      radius * 0.16,
      -0.45,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = colors.highlight;
    ctx.globalAlpha = 0.42;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 실제 액체 라인 한 겹 그리기
  // offsetX / offsetY 로 바닥면과 하이라이트 위치를 살짝 어긋나게 함

  drawLineLayer(ctx, points, color, widthAdjust, offsetX, offsetY) {
    if (points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      const width = Math.max(
        1,
        ((prev.width + curr.width) / 2) + widthAdjust
      );

      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(prev.x + offsetX, prev.y + offsetY);
      ctx.lineTo(curr.x + offsetX, curr.y + offsetY);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 한 획 전체 그리기

  drawStroke(ctx, stroke) {
    const points = stroke.points;

    if (!points || points.length === 0) return;

    const colors = FLAVORS[stroke.flavor];
    if (!colors) return;

    // 점 하나만 찍은 경우
    if (points.length === 1) {
      const p = points[0];
      this.drawBlob(ctx, p.x, p.y, p.width, colors);
      return;
    }

    // 1) 바닥 진한 면
    this.drawLineLayer(
      ctx,
      points,
      colors.shadow,
      2.6,
      0.9,
      1.2
    );

    // 2) 본체
    this.drawLineLayer(
      ctx,
      points,
      colors.color,
      0,
      0,
      0
    );

    // 3) 얇은 하이라이트
    ctx.save();
    ctx.globalAlpha = 0.42;

    this.drawLineLayer(
      ctx,
      points,
      colors.highlight,
      -points[0].width * 0.42,
      -1.1,
      -1.2
    );

    ctx.restore();

    // 시작과 끝부분의 맺힘
    const first = points[0];
    const last = points[points.length - 1];

    this.drawBlob(
      ctx,
      first.x,
      first.y,
      first.width * 0.92,
      colors
    );

    this.drawBlob(
      ctx,
      last.x,
      last.y,
      last.width * 1.03,
      colors
    );
  }

  // 전체 다시 그리기

  renderIcing() {
    const ctx = this.icingCtx;

    ctx.clearRect(
      0,
      0,
      this.icingCanvas.width,
      this.icingCanvas.height
    );

    for (const stroke of this.strokes) {
      this.drawStroke(ctx, stroke);
    }

    if (this.currentStroke) {
      this.drawStroke(ctx, this.currentStroke);
    }
  }

  // 메인 캔버스에 표시

  draw(ctx) {
    ctx.drawImage(this.icingCanvas, 0, 0);
  }

  // 마지막 획 되돌리기

  undo() {
    if (this.strokes.length === 0) return;

    this.strokes.pop();
    this.renderIcing();
  }

  // 전체 지우기

  clear() {
    this.strokes = [];
    this.currentStroke = null;
    this.drawing = false;
    this.lastPoint = null;

    this.renderIcing();
  }

  // 저장용 캔버스 반환

  getCanvas() {
    return this.icingCanvas;
  }

  // 새 쿠키 제작 시 초기화

  reset() {
    this.flavor = "strawberry";
    this.clear();
  }
}
