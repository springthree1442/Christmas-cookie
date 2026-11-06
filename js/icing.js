
// CHRISTMAS COOKIE ATELIER
// js/icing.js
// Three.js 3D Chocolate Pen - v1

import * as THREE from "three";

const FLAVORS = {
  strawberry: 0xee91a5,
  chocolate: 0x75412f,
  vanilla: 0xffedc4
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

    this.width = 17;
    this.lastPoint = null;

    this.w = canvas.width;
    this.h = canvas.height;

    // 3D 레이어 준비
    this.layer = document.getElementById("icing3dLayer");

    this.scene = new THREE.Scene();

    // 화면과 좌표가 일치하는 직교 카메라
    this.camera = new THREE.OrthographicCamera(
      0, this.w,
      0, this.h,
      0.1, 2000
    );

    this.camera.position.set(0, 0, 1000);
    this.camera.lookAt(0, 0, 0);

    // 투명한 WebGL 캔버스
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "default"
    });

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.w, this.h, false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const element = this.renderer.domElement;

    element.style.width = "100%";
    element.style.height = "100%";
    element.style.display = "block";
    element.style.pointerEvents = "none";

    this.layer.appendChild(element);

    // 조명
    const ambient = new THREE.AmbientLight(
      0xffffff, 1.45
    );
    this.scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(
      0xffffff, 2.0
    );
    mainLight.position.set(-300, -400, 700);
    this.scene.add(mainLight);

    const softLight = new THREE.DirectionalLight(
      0xffe3ca, 0.45
    );
    softLight.position.set(350, 250, 500);
    this.scene.add(softLight);

    // 쿠키 위 초콜릿을 담는 그룹
    this.chocolateGroup = new THREE.Group();
    this.scene.add(this.chocolateGroup);

    // 기존 저장 코드와 호환되는 속성
    this.icingCanvas = element;

    this.renderIcing();
  }

  setFlavor(flavor) {
    if (!FLAVORS[flavor]) return false;
    this.flavor = flavor;
    return true;
  }

  // 화면 좌표를 800x800 좌표로 변환
  getPosition(event) {
    const rect = this.canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) *
        this.w / rect.width,
      y: (event.clientY - rect.top) *
        this.h / rect.height
    };
  }

  // 초콜릿 재질
  createMaterial(flavor) {
    return new THREE.MeshPhysicalMaterial({
      color: FLAVORS[flavor],
      roughness: 0.36,
      metalness: 0.0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.3
    });
  }

  // 하나의 연속된 입체 튜브 생성
  createStrokeMesh(stroke) {
    const points = stroke.points;

    if (!points.length) return null;

    const material = this.createMaterial(
      stroke.flavor
    );

    const group = new THREE.Group();

    const radius = stroke.width / 2;

    // 한 번 터치한 경우
    if (points.length === 1) {
      const p = points[0];

      const geometry = new THREE.SphereGeometry(
        radius, 16, 12
      );

      const mesh = new THREE.Mesh(
        geometry, material
      );

      mesh.position.set(p.x, p.y, 8);
      group.add(mesh);

      return group;
    }

    // 곡선의 경유점
    const vectors = points.map(p =>
      new THREE.Vector3(p.x, p.y, 8)
    );

    // 손가락 움직임을 부드럽게 보간
    const curve = new THREE.CatmullRomCurve3(
      vectors,
      false,
      "centripetal",
      0.5
    );

    const segments = Math.min(
      500,
      Math.max(12, points.length * 3)
    );

    // 실제 원형 단면을 가진 표면 생성
    const geometry = new THREE.TubeGeometry(
      curve,
      segments,
      radius,
      12,
      false
    );

    const tube = new THREE.Mesh(
      geometry, material
    );

    group.add(tube);

    // 양 끝의 열린 단면을 둥글게 막기
    // 튜브와 동일한 3D 재질 사용
    const capGeometry = new THREE.SphereGeometry(
      radius, 16, 12
    );

    const first = vectors[0];
    const last = vectors[vectors.length - 1];

    for (const p of [first, last]) {
      const cap = new THREE.Mesh(
        capGeometry, material
      );
      cap.position.copy(p);
      group.add(cap);
    }

    return group;
  }

  // 사용이 끝난 메시 메모리 정리
  disposeObject(object) {
    if (!object) return;

    const materials = new Set();

    object.traverse(child => {
      if (!child.isMesh) return;

      child.geometry.dispose();

      if (Array.isArray(child.material)) {
        child.material.forEach(m => materials.add(m));
      } else {
        materials.add(child.material);
      }
    });

    materials.forEach(material => material.dispose());
  }

  // 그리기 시작
  start(event) {
    if (!this.cookie.image || this.drawing) return;

    const p = this.getPosition(event);

    // 시작은 쿠키 안쪽에서만
    if (!this.cookie.isInsideCookie(p.x, p.y)) {
      return;
    }

    this.drawing = true;
    this.pointerId = event.pointerId ?? null;
    this.lastPoint = p;

    this.currentStroke = {
      flavor: this.flavor,
      width: this.width,
      points: [p],
      object: null
    };

    try {
      if (event.pointerId !== undefined) {
        this.canvas.setPointerCapture(event.pointerId);
      }
    } catch (e) {}

    this.updateCurrentMesh();
  }

  // 그리기 진행
  move(event) {
    if (!this.drawing || !this.currentStroke) return;

    if (
      this.pointerId !== null &&
      event.pointerId !== this.pointerId
    ) return;

    const p = this.getPosition(event);
    const last = this.lastPoint;

    if (!last) return;

    const dx = p.x - last.x;
    const dy = p.y - last.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 2) return;

    // 경로가 너무 촘촘해지지 않도록 제한
    const steps = Math.max(
      1,
      Math.ceil(distance / 7)
    );

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;

      this.currentStroke.points.push({
        x: last.x + dx * t,
        y: last.y + dy * t
      });
    }

    this.lastPoint = p;

    this.updateCurrentMesh();
  }

  // 현재 그리고 있는 3D 선만 갱신
  updateCurrentMesh() {
    if (!this.currentStroke) return;

    const oldObject = this.currentStroke.object;

    if (oldObject) {
      this.chocolateGroup.remove(oldObject);
      this.disposeObject(oldObject);
    }

    const newObject = this.createStrokeMesh(
      this.currentStroke
    );

    this.currentStroke.object = newObject;

    if (newObject) {
      this.chocolateGroup.add(newObject);
    }

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
    ) return;

    if (this.currentStroke) {
      this.strokes.push(this.currentStroke);
    }

    this.currentStroke = null;
    this.drawing = false;

    const oldId = this.pointerId;

    this.pointerId = null;
    this.lastPoint = null;

    if (oldId !== null) {
      try {
        this.canvas.releasePointerCapture(oldId);
      } catch (e) {}
    }

    this.renderIcing();
  }

  // WebGL 화면 갱신
  renderIcing() {
    this.renderer.render(
      this.scene,
      this.camera
    );
  }

  // 기존 script.js의 draw()와 호환
  draw(ctx) {
    // 메인 화면에서는 투명한 3D 레이어가
    // 초콜릿을 별도로 표시하므로 중복 출력하지 않음
    if (ctx.canvas === this.canvas) {
      return;
    }

    // PNG 저장용 캔버스에는 3D 결과 합성
    this.renderIcing();

    ctx.drawImage(
      this.renderer.domElement,
      0, 0,
      this.w, this.h
    );
  }

  // 마지막 획 되돌리기
  undo() {
    if (!this.strokes.length) return;

    const stroke = this.strokes.pop();

    if (stroke.object) {
      this.chocolateGroup.remove(stroke.object);
      this.disposeObject(stroke.object);
    }

    this.renderIcing();
  }

  // 모든 초코펜 그림 삭제
  clear() {
    for (const stroke of this.strokes) {
      if (stroke.object) {
        this.chocolateGroup.remove(stroke.object);
        this.disposeObject(stroke.object);
      }
    }

    if (
      this.currentStroke &&
      this.currentStroke.object
    ) {
      this.chocolateGroup.remove(
        this.currentStroke.object
      );

      this.disposeObject(
        this.currentStroke.object
      );
    }

    this.strokes = [];
    this.currentStroke = null;
    this.drawing = false;
    this.pointerId = null;
    this.lastPoint = null;

    this.renderIcing();
  }

  // 저장용 캔버스
  getCanvas() {
    this.renderIcing();
    return this.renderer.domElement;
  }

  // 새 쿠키 제작
  reset() {
    this.clear();
    this.flavor = "strawberry";
  }
}
