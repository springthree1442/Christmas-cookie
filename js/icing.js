// CHRISTMAS COOKIE ATELIER
// js/icing.js

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

    this.minWidth = 10;
    this.maxWidth = 23;

    this.lastPoint = null;
    this.lastTime = 0;

    this.maskCanvas = document.createElement("canvas");
    this.maskCanvas.width = canvas.width;
    this.maskCanvas.height = canvas.height;

    this.maskCtx = this.maskCanvas.getContext("2d");

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

  // 화면 좌표를 캔버스 좌표로 변환

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

  start(event) {
    if (!this.cookie.image) return;

    const point = this.getPosition(event);

    if (!this.cookie.isInsideCookie(point.x, point.y)) {
      return;
    }

    this.drawing = true;

    this.lastTime = performance.now();

    this.lastPoint = {
      x: point.x,
      y: point.y,
      width: this.maxWidth * 0.75
    };

    this.currentStroke = {
      flavor: this.flavor,
      points: [this.lastPoint]
    };

    if (event.pointerId !== undefined) {
      try {
        this.canvas.setPointerCapture(event.pointerId);
      } catch (error) {
        // 포인터 캡처를 지원하지 않는 환경
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

    if (distance < 1.5) return;

    const deltaTime = Math.max(
      1,
      now - this.lastTime
    );

    const speed = distance / deltaTime;

    // 빠르게 움직일수록 가늘어지는 초콜릿

    const targetWidth = Math.max(
      this.minWidth,
      Math.min(
        this.maxWidth,
        this.maxWidth - speed * 3.2
      )
    );

    // 선 굵기가 갑자기 변하지 않도록 보간

    const width =
      this.lastPoint.width * 0.68 +
      targetWidth * 0.32;

    const newPoint = {
      x: point.x,
      y: point.y,
      width
    };

    // 간격이 넓어도 선이 끊어지지 않도록 보간

    const steps = Math.max(
      1,
      Math.ceil(distance / 5)
    );

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;

      const interpolated = {
        x:
          this.lastPoint.x +
          (newPoint.x - this.lastPoint.x) * t,

        y:
          this.lastPoint.y +
          (newPoint.y - this.lastPoint.y) * t,

        width:
          this.lastPoint.width +
          (newPoint.width - this.lastPoint.width) * t
      };

      this.currentStroke.points.push(interpolated);
    }

    this.lastPoint = newPoint;
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
        // 이미 포인터 캡처가 해제된 경우
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

  // 초콜릿 한 방울 그리기

  drawDrop(ctx, x, y, width, flavor) {
    const colors = FLAVORS[flavor];

    const radius = width / 2;

    // 초콜릿의 어두운 테두리

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);

    ctx.fillStyle = colors.shadow;
    ctx.fill();

    // 초콜릿 본체

    ctx.beginPath();
    ctx.arc(
      x - radius * 0.06,
      y - radius * 0.08,
      radius * 0.88,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = colors.color;
    ctx.fill();

    // 반사광

    ctx.beginPath();
    ctx.ellipse(
      x - radius * 0.27,
      y - radius * 0.28,
      radius * 0.26,
      radius * 0.13,
      -0.5,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = colors.highlight;
    ctx.globalAlpha = 0.52;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 한 획 그리기

  drawStroke(ctx, stroke) {
    const points = stroke.points;

    if (!points || points.length === 0) return;

    const flavor = stroke.flavor;

    // 일정 간격으로 초콜릿을 쌓는 방식

    for (let i = 0; i < points.length; i++) {
      const point = points[i];

      this.drawDrop(
        ctx,
        point.x,
        point.y,
        point.width,
        flavor
      );
    }
  }

  // 쿠키 모양으로 마스크 생성

  updateMask() {
    const ctx = this.maskCtx;

    ctx.clearRect(
      0,
      0,
      this.maskCanvas.width,
      this.maskCanvas.height
    );

    if (!this.cookie.image) return;

    this.cookie.updatePosition();

    const cookie = this.cookie;

    ctx.drawImage(
      cookie.image,
      cookie.x,
      cookie.y,
      cookie.size,
      cookie.size
    );
  }

  // 초코펜 전체 다시 그리기

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

    // 쿠키 바깥쪽 초콜릿 제거

    this.updateMask();

    ctx.save();

    ctx.globalCompositeOperation = "destination-in";

    ctx.drawImage(
      this.maskCanvas,
      0,
      0
    );

    ctx.restore();
  }

  // 메인 캔버스에 초코펜 표시

  draw(ctx) {
    ctx.drawImage(
      this.icingCanvas,
      0,
      0
    );
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

  // 저장을 위한 초코펜 이미지 반환

  getCanvas() {
    return this.icingCanvas;
  }

  // 새 쿠키 제작 시 초기화

  reset() {
    this.flavor = "strawberry";
    this.clear();
  }
}
