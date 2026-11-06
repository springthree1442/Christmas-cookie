
// CHRISTMAS COOKIE ATELIER
// js/icing.js
// Smooth liquid icing - version 4

const FLAVORS = {
  strawberry: {
    color: "#ed93aa",
    shadow: "rgba(159, 63, 91, 0.25)",
    highlight: "rgba(255, 232, 239, 0.24)"
  },

  chocolate: {
    color: "#79503c",
    shadow: "rgba(54, 25, 17, 0.3)",
    highlight: "rgba(239, 185, 151, 0.19)"
  },

  vanilla: {
    color: "#f5e6b9",
    shadow: "rgba(159, 127, 71, 0.24)",
    highlight: "rgba(255, 255, 247, 0.3)"
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
    this.pointerId = null;

    // 초코펜 굵기
    this.baseWidth = 15;
    this.minWidth = 12;
    this.maxWidth = 19;

    this.lastPoint = null;
    this.lastTime = 0;

    // 완성된 선을 보관하는 캔버스
    this.savedCanvas = document.createElement("canvas");
    this.savedCanvas.width = canvas.width;
    this.savedCanvas.height = canvas.height;

    this.savedCtx = this.savedCanvas.getContext("2d");

    // 현재 초코펜 그림
    this.icingCanvas = document.createElement("canvas");
    this.icingCanvas.width = canvas.width;
    this.icingCanvas.height = canvas.height;

    this.icingCtx = this.icingCanvas.getContext("2d");
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

  // 그리기 시작

  start(event) {
    if (!this.cookie.image || this.drawing) return;

    const point = this.getPosition(event);

    // 시작 위치는 쿠키 안으로 제한
    if (!this.cookie.isInsideCookie(point.x, point.y)) {
      return;
    }

    this.drawing = true;
    this.pointerId = event.pointerId ?? null;

    this.lastTime = performance.now();

    const firstPoint = {
      x: point.x,
      y: point.y
    };

    this.lastPoint = firstPoint;

    this.currentStroke = {
      flavor: this.flavor,
      width: this.baseWidth,
      points: [firstPoint]
    };

    if (event.pointerId !== undefined) {
      try {
        this.canvas.setPointerCapture(event.pointerId);
      } catch (error) {}
    }

    this.renderIcing();
  }

  // 그리기 진행

  move(event) {
    if (!this.drawing || !this.currentStroke) return;

    if (
      this.pointerId !== null &&
      event.pointerId !== this.pointerId
    ) {
      return;
    }

    const point = this.getPosition(event);

    const dx = point.x - this.lastPoint.x;
    const dy = point.y - this.lastPoint.y;

    const distance = Math.hypot(dx, dy);

    if (distance < 1) return;

    const now = performance.now();
    const delta = Math.max(1, now - this.lastTime);

    const speed = distance / delta;

    // 속도 변화는 부드럽고 미세하게 반영
    const targetWidth = Math.max(
      this.minWidth,
      Math.min(
        this.maxWidth,
        this.maxWidth - speed * 1.5
      )
    );

    this.currentStroke.width =
      this.currentStroke.width * 0.96 +
      targetWidth * 0.04;

    // 커서 좌표 기록
    // 곡선 렌더러가 점들을 부드럽게 연결함
    this.currentStroke.points.push({
      x: point.x,
      y: point.y
    });

    this.lastPoint = {
      x: point.x,
      y: point.y
    };

    this.lastTime = now;

    this.renderIcing();
  }

  // 그리기 종료

  end(event) {
    if (!this.drawing) return;

    if (
      event &&
      this.pointerId !== null &&
      event.pointerId !== undefined &&
      event.pointerId !== this.pointerId
    ) {
      return;
    }

    // 마지막 포인터 위치 반영
    if (event && event.clientX !== undefined) {
      const point = this.getPosition(event);
      const last = this.lastPoint;

      if (last && Math.hypot(
        point.x - last.x,
        point.y - last.y
      ) > 0.5) {
        this.currentStroke.points.push(point);
      }
    }

    if (this.currentStroke) {
      this.strokes.push(this.currentStroke);

      // 완성된 선은 별도 캔버스에 저장
      this.drawStroke(
        this.savedCtx,
        this.currentStroke
      );
    }

    this.currentStroke = null;
    this.drawing = false;

    const oldPointerId = this.pointerId;

    this.pointerId = null;
    this.lastPoint = null;

    if (oldPointerId !== null) {
      try {
        this.canvas.releasePointerCapture(
          oldPointerId
        );
      } catch (error) {}
    }

    this.renderIcing();
  }

  // 부드러운 곡선 경로

  createSmoothPath(points) {
    const path = new Path2D();

    if (!points.length) return path;

    path.moveTo(points[0].x, points[0].y);

    if (points.length === 1) {
      return path;
    }

    if (points.length === 2) {
      path.lineTo(points[1].x, points[1].y);
      return path;
    }

    // 중간점을 이용한 연속 곡선
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

  // 초콜릿 선 그리기

  drawStroke(ctx, stroke) {
    const points = stroke.points;

    if (!points || points.length === 0) return;

    const colors = FLAVORS[stroke.flavor];

    if (!colors) return;

    const width = stroke.width;

    ctx.save();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // 한 점을 찍었을 때
    if (points.length === 1) {
      const point = points[0];

      ctx.shadowColor = colors.shadow;
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 1.5;

      ctx.fillStyle = colors.color;

      ctx.beginPath();
      ctx.arc(
        point.x,
        point.y,
        width / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.restore();
      return;
    }

    const path = this.createSmoothPath(points);

    // 1. 초콜릿의 부드러운 그림자
    // 선명한 이중 테두리를 만들지 않음

    ctx.lineWidth = width;

    ctx.strokeStyle = colors.color;

    ctx.shadowColor = colors.shadow;
    ctx.shadowBlur = 3.5;
    ctx.shadowOffsetX = 0.5;
    ctx.shadowOffsetY = 1.5;

    ctx.stroke(path);

    // 2. 그림자를 제거하고 본체 그리기

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.lineWidth = width;
    ctx.strokeStyle = colors.color;

    ctx.stroke(path);

    // 3. 아주 연한 광택
    // 전체 선 위에 부드럽게 얹음

    ctx.save();

    ctx.translate(-1.1, -1.3);

    ctx.lineWidth = Math.max(2, width * 0.32);
    ctx.strokeStyle = colors.highlight;

    ctx.stroke(path);

    ctx.restore();
    ctx.restore();
  }

  // 현재 화면 갱신

  renderIcing() {
    const ctx = this.icingCtx;

    ctx.clearRect(
      0,
      0,
      this.icingCanvas.width,
      this.icingCanvas.height
    );

    // 완성된 선은 복사만 함
    ctx.drawImage(this.savedCanvas, 0, 0);

    // 지금 그리고 있는 선만 새로 계산
    if (this.currentStroke) {
      this.drawStroke(ctx, this.currentStroke);
    }
  }

  // 되돌리기 후 저장된 선 재구성

  rebuildSavedCanvas() {
    this.savedCtx.clearRect(
      0,
      0,
      this.savedCanvas.width,
      this.savedCanvas.height
    );

    for (const stroke of this.strokes) {
      this.drawStroke(this.savedCtx, stroke);
    }

    this.renderIcing();
  }

  draw(ctx) {
    ctx.drawImage(this.icingCanvas, 0, 0);
  }

  undo() {
    if (!this.strokes.length) return;

    this.strokes.pop();
    this.rebuildSavedCanvas();
  }

  clear() {
    this.strokes = [];
    this.currentStroke = null;

    this.drawing = false;
    this.pointerId = null;
    this.lastPoint = null;

    this.savedCtx.clearRect(
      0,
      0,
      this.savedCanvas.width,
      this.savedCanvas.height
    );

    this.renderIcing();
  }

  getCanvas() {
    return this.icingCanvas;
  }

  reset() {
    this.flavor = "strawberry";
    this.clear();
  }
}
