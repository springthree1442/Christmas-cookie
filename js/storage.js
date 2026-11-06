// CHRISTMAS COOKIE ATELIER
// js/storage.js

const DB_NAME = "ChristmasCookieAtelier";
const DB_VERSION = 1;
const STORE_NAME = "cookies";

export class Storage {
  constructor() {
    this.db = null;
    this.ready = this.openDatabase();
  }

  // 브라우저 작품 보관함 열기

  openDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB를 지원하지 않습니다."));
        return;
      }

      const request = indexedDB.open(
        DB_NAME,
        DB_VERSION
      );

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(
            STORE_NAME,
            {
              keyPath: "id",
              autoIncrement: true
            }
          );

          store.createIndex(
            "createdAt",
            "createdAt",
            { unique: false }
          );
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // 저장소 트랜잭션 생성

  async getStore(mode = "readonly") {
    await this.ready;

    const transaction = this.db.transaction(
      STORE_NAME,
      mode
    );

    return transaction.objectStore(STORE_NAME);
  }

  // 완성한 쿠키 저장

  async saveCookie({
    shape,
    bakeLevel,
    imageData,
    name = ""
  }) {
    const store = await this.getStore("readwrite");

    const cookie = {
      shape,
      bakeLevel,
      imageData,
      name,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(cookie);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // 저장한 쿠키 전체 불러오기

  async getAllCookies() {
    const store = await this.getStore();

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const cookies = request.result || [];

        cookies.sort(
          (a, b) => b.createdAt - a.createdAt
        );

        resolve(cookies);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // 쿠키 하나 불러오기

  async getCookie(id) {
    const store = await this.getStore();

    return new Promise((resolve, reject) => {
      const request = store.get(Number(id));

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // 저장한 쿠키 삭제

  async deleteCookie(id) {
    const store = await this.getStore("readwrite");

    return new Promise((resolve, reject) => {
      const request = store.delete(Number(id));

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // 모든 작품 삭제 (추후 필요 시 사용)

  async clearGallery() {
    const store = await this.getStore("readwrite");

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Canvas를 PNG 데이터로 변환

  canvasToDataURL(canvas) {
    return canvas.toDataURL("image/png");
  }

  // 쿠키와 초코펜을 합쳐 PNG 만들기

  createCookieCanvas(cookie, icing) {
    const canvas = document.createElement("canvas");

    canvas.width = cookie.canvas.width;
    canvas.height = cookie.canvas.height;

    const ctx = canvas.getContext("2d");

    // 쿠키 이미지
    cookie.draw(ctx);

    // 초코펜 그림
    icing.draw(ctx);

    return canvas;
  }

  // 크리스마스 배경 그리기

  drawSceneBackground(ctx, width, height) {
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.1,
      width / 2,
      height / 2,
      width * 0.75
    );

    gradient.addColorStop(0, "#fff9eb");
    gradient.addColorStop(1, "#e8d2af");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 장식용 테두리

    ctx.strokeStyle = "#b9434c";
    ctx.lineWidth = 12;

    ctx.strokeRect(
      28,
      28,
      width - 56,
      height - 56
    );

    ctx.strokeStyle = "#416c52";
    ctx.lineWidth = 4;

    ctx.strokeRect(
      43,
      43,
      width - 86,
      height - 86
    );

    // 작은 눈송이 장식

    const snowflakes = [
      [100, 100],
      [width - 100, 100],
      [100, height - 100],
      [width - 100, height - 100],
      [width / 2, 90],
      [width / 2, height - 90]
    ];

    ctx.fillStyle = "rgba(255,255,255,0.85)";

    for (const [x, y] of snowflakes) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 배경 포함 이미지 생성

  createSceneCanvas(cookie, icing) {
    const canvas = document.createElement("canvas");

    canvas.width = cookie.canvas.width;
    canvas.height = cookie.canvas.height;

    const ctx = canvas.getContext("2d");

    this.drawSceneBackground(
      ctx,
      canvas.width,
      canvas.height
    );

    cookie.draw(ctx);
    icing.draw(ctx);

    return canvas;
  }

  // PNG 파일 다운로드

  downloadCanvas(canvas, filename) {
    const url = canvas.toDataURL("image/png");

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    return url;
  }

  // 투명 배경 PNG 저장

  downloadTransparent(cookie, icing) {
    const canvas = this.createCookieCanvas(
      cookie,
      icing
    );

    const filename =
      `christmas-cookie-${Date.now()}.png`;

    return this.downloadCanvas(
      canvas,
      filename
    );
  }

  // 배경 포함 PNG 저장

  downloadScene(cookie, icing) {
    const canvas = this.createSceneCanvas(
      cookie,
      icing
    );

    const filename =
      `christmas-cookie-scene-${Date.now()}.png`;

    return this.downloadCanvas(
      canvas,
      filename
    );
  }

  // 작품을 보관함에 추가

  async saveFinishedCookie(cookie, icing) {
    const canvas = this.createCookieCanvas(
      cookie,
      icing
    );

    const imageData = this.canvasToDataURL(canvas);

    return await this.saveCookie({
      shape: cookie.shape,
      bakeLevel: cookie.bakeLevel,
      imageData
    });
  }

  // 작품 보관함 화면 표시

  async renderGallery(container, emptyMessage) {
    const cookies = await this.getAllCookies();

    container.innerHTML = "";

    if (emptyMessage) {
      emptyMessage.style.display =
        cookies.length === 0 ? "block" : "none";
    }

    for (const cookie of cookies) {
      const item = document.createElement("div");

      item.className = "gallery-item";

      item.style.position = "relative";
      item.style.padding = "10px";
      item.style.borderRadius = "15px";
      item.style.background = "#fff3df";

      // 작품 이미지

      const img = document.createElement("img");

      img.src = cookie.imageData;
      img.alt = "저장한 쿠키";

      img.style.cursor = "pointer";

      // 클릭하면 이미지 크게 열기

      img.addEventListener("click", () => {
        const preview = window.open("", "_blank");

        if (preview) {
          preview.document.body.style.margin = "0";
          preview.document.body.style.background =
            "#fff8ea";

          const previewImage =
            preview.document.createElement("img");

          previewImage.src = cookie.imageData;
          previewImage.style.display = "block";
          previewImage.style.width = "100%";
          previewImage.style.maxWidth = "800px";
          previewImage.style.margin = "auto";

          preview.document.body.appendChild(
            previewImage
          );
        }
      });

      item.appendChild(img);

      // 저장 날짜

      const date = document.createElement("p");

      date.textContent = new Date(
        cookie.createdAt
      ).toLocaleDateString("ko-KR");

      date.style.textAlign = "center";
      date.style.fontSize = "12px";
      date.style.color = "#896c58";

      item.appendChild(date);

      // 삭제 버튼

      const deleteButton =
        document.createElement("button");

      deleteButton.textContent = "삭제";

      deleteButton.style.width = "100%";
      deleteButton.style.padding = "8px";
      deleteButton.style.border = "none";
      deleteButton.style.borderRadius = "9px";
      deleteButton.style.background = "#b9434c";
      deleteButton.style.color = "white";
      deleteButton.style.fontWeight = "700";

      deleteButton.addEventListener(
        "click",
        async () => {
          const confirmed = window.confirm(
            "이 쿠키를 보관함에서 삭제할까요?"
          );

          if (!confirmed) return;

          await this.deleteCookie(cookie.id);

          await this.renderGallery(
            container,
            emptyMessage
          );
        }
      );

      item.appendChild(deleteButton);
      container.appendChild(item);
    }
  }
}
