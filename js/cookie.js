// CHRISTMAS COOKIE ATELIER
// js/cookie.js

const COOKIE_IMAGES = {
  circle:
    "./assets/DE1BD1EE-181D-475B-83C7-D8C2913E8FC8.png",

  heart:
    "./assets/BFF6C4B0-4841-449E-8DC2-3C25C5A00780.png"
};

export class Cookie {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.shape = null;
    this.image = null;

    this.bakeLevel = 0;
    this.baking = false;

    this.bakeStartTime = 0;
    this.bakeDuration = 15000;

    this.x = 0;
    this.y = 0;
    this.size = 0;

    this.images = {};

    this.ready = this.loadImages();
  }

  // 쿠키 이미지 불러오기

  async loadImages() {
    const entries = Object.entries(COOKIE_IMAGES);

    await Promise.all(
      entries.map(([shape, src]) => {
        return new Promise((resolve) => {
          const img = new Image();

          img.onload = () => {
            this.images[shape] = img;
            resolve();
          };

          img.onerror = () => {
            console.error("쿠키 이미지 로드 실패:", src);
            resolve();
          };

          img.src = src;
        });
      })
    );
  }

  // 쿠키 선택

  selectShape(shape) {
    if (!this.images[shape]) {
      console.error("쿠키 이미지를 찾을 수 없습니다.");
      return false;
    }

    this.shape = shape;
    this.image = this.images[shape];

    this.bakeLevel = 0;
    this.baking = false;

    this.updatePosition();

    return true;
  }

  // 쿠키 위치 및 크기

  updatePosition() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.size = Math.min(w, h) * 0.68;

    this.x = (w - this.size) / 2;
    this.y = (h - this.size) / 2;
  }

  // 굽기 시작

  startBaking() {
    if (!this.image) return;

    this.baking = true;

    this.bakeStartTime =
      performance.now() -
      this.bakeLevel * this.bakeDuration;
  }

  // 굽기 진행

  updateBaking(now = performance.now()) {
    if (!this.baking) {
      return this.bakeLevel;
    }

    const elapsed = now - this.bakeStartTime;

    this.bakeLevel = Math.min(
      1,
      Math.max(0, elapsed / this.bakeDuration)
    );

    return this.bakeLevel;
  }

  // 쿠키 꺼내기

  stopBaking() {
    this.updateBaking();
    this.baking = false;
  }

  // 굽기 상태 퍼센트

  getBakePercent() {
    return Math.round(this.bakeLevel * 100);
  }

  // 쿠키 그리기

  draw(ctx = this.ctx) {
    if (!this.image) return;

    this.updatePosition();

    const x = this.x;
    const y = this.y;
    const size = this.size;

    ctx.save();

    // 원본 쿠키 이미지
    ctx.drawImage(
      this.image,
      x,
      y,
      size,
      size
    );

    // 굽는 정도에 따른 갈색 변화
    if (this.bakeLevel > 0) {
      const layer = document.createElement("canvas");

      layer.width = Math.ceil(size);
      layer.height = Math.ceil(size);

      const lctx = layer.getContext("2d");

      lctx.drawImage(
        this.image,
        0,
        0,
        layer.width,
        layer.height
      );

      // 이미지의 불투명한 부분에만 색 입히기
      lctx.globalCompositeOperation = "source-atop";

      const strength = this.bakeLevel;

      lctx.fillStyle =
        `rgba(100, 43, 16, ${strength * 0.48})`;

      lctx.fillRect(
        0,
        0,
        layer.width,
        layer.height
      );

      lctx.globalCompositeOperation = "source-over";

      ctx.drawImage(
        layer,
        x,
        y,
        size,
        size
      );
    }

    ctx.restore();
  }

  // 좌표가 쿠키 내부인지 확인
  // 투명 PNG의 알파값을 이용함

  isInsideCookie(px, py) {
    if (!this.image) return false;

    const localX = (px - this.x) / this.size;
    const localY = (py - this.y) / this.size;

    if (
      localX < 0 ||
      localX > 1 ||
      localY < 0 ||
      localY > 1
    ) {
      return false;
    }

    const temp = document.createElement("canvas");

    temp.width = this.image.naturalWidth;
    temp.height = this.image.naturalHeight;

    const tctx = temp.getContext("2d", {
      willReadFrequently: true
    });

    tctx.drawImage(this.image, 0, 0);

    const ix = Math.min(
      temp.width - 1,
      Math.floor(localX * temp.width)
    );

    const iy = Math.min(
      temp.height - 1,
      Math.floor(localY * temp.height)
    );

    const pixel = tctx.getImageData(
      ix,
      iy,
      1,
      1
    ).data;

    return pixel[3] > 100;
  }

  // 새 쿠키 만들기

  reset() {
    this.shape = null;
    this.image = null;

    this.baking = false;
    this.bakeLevel = 0;
    this.bakeStartTime = 0;
  }
}
