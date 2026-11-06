
// CHRISTMAS COOKIE ATELIER
// script.js

import { Cookie } from "./js/cookie.js";
import { Icing } from "./js/icing.js";
import { Storage } from "./js/storage.js";

// HTML 요소 가져오기

const $ = (id) => document.getElementById(id);

const canvas = $("cookieCanvas");
const ctx = canvas.getContext("2d");

const message = $("gameMessage");

const panels = {
  shape: $("shapePanel"),
  bake: $("bakePanel"),
  decorate: $("decoratePanel"),
  complete: $("completePanel")
};

const startBakeBtn = $("startBakeBtn");
const finishBakeBtn = $("finishBakeBtn");
const finishDecorateBtn = $("finishDecorateBtn");

const undoBtn = $("undoBtn");
const clearIcingBtn = $("clearIcingBtn");

const saveGalleryBtn = $("saveGalleryBtn");
const saveTransparentBtn = $("saveTransparentBtn");
const saveSceneBtn = $("saveSceneBtn");
const newCookieBtn = $("newCookieBtn");

const galleryBtn = $("galleryBtn");
const closeGalleryBtn = $("closeGalleryBtn");
const galleryModal = $("galleryModal");
const galleryGrid = $("galleryGrid");
const emptyGalleryMessage = $("emptyGalleryMessage");

const shapeButtons = document.querySelectorAll(
  ".shape-button"
);

const penButtons = document.querySelectorAll(
  ".pen-button"
);

// 게임 객체

const cookie = new Cookie(canvas);
const icing = new Icing(canvas, cookie);
const storage = new Storage();

// 게임 상태

let stage = "shape";
let selectedShape = null;
let animationId = null;
let lastBakeFrame = 0;
let lastDrawFrame = 0;
let storageAvailable = true;

// 메시지 표시

function setMessage(text) {
  message.textContent = text;
}

// 단계 전환

function setStage(nextStage) {
  stage = nextStage;

  for (const [name, panel] of Object.entries(panels)) {
    panel.classList.toggle(
      "hidden",
      name !== nextStage
    );
  }

  render();
}

// 화면 그리기

function render() {
  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  // 중앙 작업 공간에 부드러운 원형 표시
  const w = canvas.width;
  const h = canvas.height;

  ctx.save();

  ctx.beginPath();
  ctx.arc(
    w / 2,
    h / 2,
    w * 0.39,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fill();

  ctx.restore();

  // 선택된 쿠키 그리기
  if (cookie.image) {
    cookie.draw(ctx);
  }

  // 꾸미기 단계부터 초코펜 표시
  if (
    stage === "decorate" ||
    stage === "complete"
  ) {
    icing.draw(ctx);
  }
}

// 굽기 애니메이션

function bakeLoop(now) {
  if (stage !== "bake") {
    animationId = null;
    return;
  }

  // 약 20fps로 굽기 화면 갱신
  if (now - lastBakeFrame >= 50) {
    lastBakeFrame = now;

    cookie.updateBaking(now);

    $("bakeProgressFill").style.width =
      cookie.getBakePercent() + "%";

    const percent = cookie.getBakePercent();

    if (percent < 35) {
      setMessage("쿠키가 천천히 익고 있어요.");
    } else if (percent < 70) {
      setMessage("맛있는 황금빛으로 구워지고 있어요!");
    } else if (percent < 95) {
      setMessage("점점 진한 갈색이 되고 있어요.");
    } else {
      setMessage("많이 구워졌어요! 이제 꺼내볼까요?");
    }

    render();
  }

  animationId = requestAnimationFrame(bakeLoop);
}

// 쿠키 모양 선택

shapeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (stage !== "shape") return;

    const shape = button.dataset.shape;

    if (!cookie.images[shape]) {
      setMessage("쿠키 이미지를 불러오지 못했어요.");
      return;
    }

    selectedShape = shape;

    shapeButtons.forEach((item) => {
      item.classList.toggle(
        "active",
        item === button
      );
    });

    cookie.selectShape(shape);
    icing.reset();

    startBakeBtn.disabled = false;

    setMessage(
      shape === "circle"
        ? "동그란 쿠키를 선택했어요!"
        : "하트 쿠키를 선택했어요!"
    );

    render();
  });
});

// 굽기 시작

startBakeBtn.addEventListener("click", () => {
  if (!selectedShape || !cookie.image) return;

  cookie.startBaking();

  $("bakeProgressFill").style.width = "0%";

  lastBakeFrame = 0;

  setStage("bake");
  setMessage("쿠키를 굽기 시작했어요!");

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }

  animationId = requestAnimationFrame(bakeLoop);
});

// 굽기 종료

finishBakeBtn.addEventListener("click", () => {
  if (stage !== "bake") return;

  cookie.stopBaking();

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  icing.clear();
  icing.setFlavor("strawberry");

  penButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.flavor === "strawberry"
    );
  });

  setStage("decorate");

  setMessage(
    "초코펜으로 쿠키를 자유롭게 꾸며주세요!"
  );
});

// 초코펜 색상 선택

penButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (stage !== "decorate") return;

    const flavor = button.dataset.flavor;

    if (!icing.setFlavor(flavor)) return;

    penButtons.forEach((item) => {
      item.classList.toggle(
        "active",
        item === button
      );
    });

    const names = {
      strawberry: "딸기",
      chocolate: "초코",
      vanilla: "바닐라"
    };

    setMessage(
      `${names[flavor]} 초코펜을 선택했어요!`
    );
  });
});

// 초코펜 그리기 시작

canvas.addEventListener("pointerdown", (event) => {
  if (stage !== "decorate") return;

  if (
    event.pointerType === "mouse" &&
    event.button !== 0
  ) {
    return;
  }

  icing.start(event);

  if (icing.drawing) {
    lastDrawFrame = performance.now();
    render();
  }
});

// 초코펜 그리기 진행

canvas.addEventListener("pointermove", (event) => {
  if (stage !== "decorate") return;
  if (!icing.drawing) return;

  const now = performance.now();

  // 화면 렌더링 횟수 제한
  if (now - lastDrawFrame < 25) return;

  lastDrawFrame = now;

  icing.move(event);
  render();
});

// 초코펜 그리기 종료

function finishStroke(event) {
  if (!icing.drawing) return;

  icing.end(event);
  render();
}

canvas.addEventListener(
  "pointerup",
  finishStroke
);

canvas.addEventListener(
  "pointercancel",
  finishStroke
);

canvas.addEventListener(
  "lostpointercapture",
  () => {
    if (icing.drawing) {
      icing.end();
      render();
    }
  }
);

// 마지막 획 되돌리기

undoBtn.addEventListener("click", () => {
  if (stage !== "decorate") return;

  icing.undo();
  render();

  setMessage("마지막 초코펜 그림을 되돌렸어요.");
});

// 초코펜 전체 지우기

clearIcingBtn.addEventListener("click", () => {
  if (stage !== "decorate") return;

  icing.clear();
  render();

  setMessage("초코펜 그림을 모두 지웠어요.");
});

// 꾸미기 완료

finishDecorateBtn.addEventListener(
  "click",
  () => {
    if (stage !== "decorate") return;

    if (icing.drawing) {
      icing.end();
    }

    setStage("complete");

    setMessage(
      "크리스마스 쿠키 완성! 저장해 보세요."
    );
  }
);

// 보관함에 작품 저장

saveGalleryBtn.addEventListener(
  "click",
  async () => {
    if (stage !== "complete") return;

    if (!storageAvailable) {
      setMessage(
        "이 브라우저에서는 작품 보관함을 사용할 수 없어요."
      );
      return;
    }

    saveGalleryBtn.disabled = true;

    try {
      await storage.saveFinishedCookie(
        cookie,
        icing
      );

      setMessage(
        "내 작품 보관함에 쿠키를 저장했어요!"
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "보관함 저장에 실패했어요. 저장 공간을 확인해 주세요."
      );
    } finally {
      saveGalleryBtn.disabled = false;
    }
  }
);

// 투명 배경 PNG

saveTransparentBtn.addEventListener(
  "click",
  () => {
    if (stage !== "complete") return;

    try {
      storage.downloadTransparent(
        cookie,
        icing
      );

      setMessage("쿠키 PNG 저장을 요청했어요!");
    } catch (error) {
      console.error(error);
      setMessage("PNG 저장에 실패했어요.");
    }
  }
);

// 크리스마스 배경 포함 PNG

saveSceneBtn.addEventListener(
  "click",
  () => {
    if (stage !== "complete") return;

    try {
      storage.downloadScene(
        cookie,
        icing
      );

      setMessage(
        "배경 포함 PNG 저장을 요청했어요!"
      );
    } catch (error) {
      console.error(error);
      setMessage("PNG 저장에 실패했어요.");
    }
  }
);

// 새로운 쿠키 제작

newCookieBtn.addEventListener("click", () => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  cookie.reset();
  icing.reset();

  selectedShape = null;

  shapeButtons.forEach((button) => {
    button.classList.remove("active");
  });

  startBakeBtn.disabled = true;

  $("bakeProgressFill").style.width = "0%";

  setStage("shape");
  setMessage("어떤 쿠키를 만들까요?");
});

// 작품 보관함 열기

galleryBtn.addEventListener(
  "click",
  async () => {
    galleryModal.classList.remove("hidden");

    try {
      await storage.renderGallery(
        galleryGrid,
        emptyGalleryMessage
      );
    } catch (error) {
      console.error(error);

      galleryGrid.replaceChildren();

      emptyGalleryMessage.style.display =
        "block";

      emptyGalleryMessage.textContent =
        "보관함을 불러오지 못했어요.";
    }
  }
);

// 작품 보관함 닫기

function closeGallery() {
  galleryModal.classList.add("hidden");
}

closeGalleryBtn.addEventListener(
  "click",
  closeGallery
);

galleryModal.addEventListener(
  "click",
  (event) => {
    if (event.target === galleryModal) {
      closeGallery();
    }
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Escape") {
      closeGallery();
    }
  }
);

// 게임 초기화

async function initializeGame() {
  setStage("shape");

  startBakeBtn.disabled = true;

  setMessage("쿠키 이미지를 준비하고 있어요...");

  await cookie.ready;

  const loadedShapes = Object.keys(
    cookie.images
  );

  if (loadedShapes.length === 0) {
    setMessage(
      "쿠키 이미지를 불러오지 못했어요. assets 폴더를 확인해 주세요."
    );

    shapeButtons.forEach((button) => {
      button.disabled = true;
    });

    return;
  }

  shapeButtons.forEach((button) => {
    button.disabled =
      !cookie.images[button.dataset.shape];
  });

  // IndexedDB 사용 가능 여부 확인

  try {
    await storage.ready;
  } catch (error) {
    console.warn(
      "작품 보관함을 사용할 수 없습니다.",
      error
    );

    storageAvailable = false;
    saveGalleryBtn.disabled = true;
  }

  render();

  setMessage("어떤 쿠키를 만들까요?");
}

initializeGame();

