import * as THREE from "https://esm.sh/three@0.162.0";

export const POEM_WORDS = ["明日", "あした", "アシタ", "tomorrow"];

export function spawnSparkles(sparkleBurst, x = window.innerWidth / 2, y = window.innerHeight / 2) {
  const count = 46;
  for (let i = 0; i < count; i += 1) {
    const s = document.createElement("div");
    s.className = "spark";
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const r = 90 + Math.random() * 220;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty("--tx", `${Math.cos(angle) * r}px`);
    s.style.setProperty("--ty", `${Math.sin(angle) * r}px`);
    s.style.animationDelay = `${Math.random() * 120}ms`;
    sparkleBurst.appendChild(s);
    window.setTimeout(() => s.remove(), 1200);
  }
}

export function setupPoemIntro(poemInput, getStage, onCorrectWord) {
  poemInput.focus();
  const tryUnlock = () => {
    if (getStage() !== "poem") return;
    const value = poemInput.value.trim();
    if (POEM_WORDS.includes(value) || POEM_WORDS.includes(value.toLowerCase())) {
      onCorrectWord();
    }
  };

  poemInput.addEventListener("input", tryUnlock);
  poemInput.addEventListener("keydown", (e) => {
    if (e.code !== "Enter") return;
    e.preventDefault();
    tryUnlock();
  });
}

export function stylePoemTokens() {
  const palette = [
    { bg: "rgba(123, 145, 189, 0.52)" },
    { bg: "rgba(106, 130, 173, 0.52)" },
    { bg: "rgba(136, 158, 198, 0.52)" },
    { bg: "rgba(116, 139, 181, 0.52)" }
  ];

  let tokenIndex = 0;
  const poemLines = Array.from(document.querySelectorAll(".poem-line"));
  poemLines.forEach((line) => {
    const nodes = Array.from(line.childNodes);
    nodes.forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) return;
      const text = node.textContent || "";
      if (!text.trim()) return;

      const frag = document.createDocumentFragment();
      const parts = text.split(/(\s+)/);
      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
          return;
        }
        const span = document.createElement("span");
        const colors = palette[tokenIndex % palette.length];
        span.className = "poem-token";
        span.style.setProperty("--token-bg", colors.bg);
        span.textContent = part;
        frag.appendChild(span);
        tokenIndex += 1;
      });
      node.parentNode.replaceChild(frag, node);
    });
  });
}

export function buildTransitStage(transitGroup, transitState) {
  const amb = new THREE.AmbientLight(0x5f8dba, 0.55);
  transitGroup.add(amb);
  const key = new THREE.PointLight(0x7fd7ff, 1.6, 90, 2.2);
  key.position.set(0, 8, 2);
  transitGroup.add(key);
  const rim = new THREE.PointLight(0x9578ff, 1.0, 60, 2.2);
  rim.position.set(0, 3, -58);
  transitGroup.add(rim);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 92),
    new THREE.MeshStandardMaterial({ color: 0x0d1324, roughness: 0.88, emissive: 0x0a1122, emissiveIntensity: 0.5 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, -24);
  transitGroup.add(road);

  const laneMat = new THREE.MeshBasicMaterial({ color: 0x69ceff, transparent: true, opacity: 0.65 });
  for (let i = 0; i < 20; i += 1) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 2.1), laneMat);
    seg.position.set(0, 0.03, -2 - i * 4.4);
    transitGroup.add(seg);
  }

  const car = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.34, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x96cbff, emissive: 0x2b4f79, emissiveIntensity: 0.3, roughness: 0.34, metalness: 0.2 })
  );
  base.position.y = 0.35;
  car.add(base);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.28, 1.0),
    new THREE.MeshStandardMaterial({ color: 0xd8ecff, emissive: 0x355d88, emissiveIntensity: 0.2, roughness: 0.25, metalness: 0.15 })
  );
  cabin.position.set(0, 0.64, -0.1);
  car.add(cabin);
  const wheelGeo = new THREE.TorusGeometry(0.19, 0.06, 10, 18);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
  const wheelPos = [
    [-0.52, 0.18, -0.66],
    [0.52, 0.18, -0.66],
    [-0.52, 0.18, 0.66],
    [0.52, 0.18, 0.66]
  ];
  wheelPos.forEach((p3) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.y = Math.PI / 2;
    w.position.set(p3[0], p3[1], p3[2]);
    car.add(w);
  });
  car.position.set(0, 0, 12);
  transitGroup.add(car);
  transitState.car = car;

  const portal = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.22, 16, 72),
    new THREE.MeshStandardMaterial({
      color: 0x9ce7ff,
      emissive: 0x37a5c9,
      emissiveIntensity: 1.0,
      roughness: 0.2,
      metalness: 0.15
    })
  );
  portal.position.set(0, 2.8, -64);
  transitGroup.add(portal);
  transitState.portal = portal;
}

export function updateTransit(delta, transitState, move, camera, onReachPortal) {
  const car = transitState.car;
  const portal = transitState.portal;
  if (!car || !portal) return;

  const accel = move.forward ? 2.6 : 0;
  const brake = move.backward ? 2.6 : 0;
  transitState.speed += (accel - brake) * delta;
  transitState.speed *= 0.97;
  transitState.speed = THREE.MathUtils.clamp(transitState.speed, 0, 3.6);

  const steer = (Number(move.right) - Number(move.left)) * (1.6 + transitState.speed * 0.35);
  car.position.x += steer * delta;
  car.position.x = THREE.MathUtils.clamp(car.position.x, -2.8, 2.8);
  car.position.z -= transitState.speed * delta * 13;
  car.rotation.y = THREE.MathUtils.damp(car.rotation.y, -steer * 0.18, 7.5, delta);

  const camPos = new THREE.Vector3(car.position.x * 0.45, 3.2, car.position.z + 9.2);
  camera.position.lerp(camPos, 0.08);
  camera.lookAt(car.position.x * 0.15, 1.1, car.position.z - 5.5);

  const t = performance.now() * 0.001;
  portal.rotation.y += 0.9 * delta;
  portal.scale.setScalar(1 + Math.sin(t * 4.8) * 0.08);

  if (car.position.z < -58) {
    onReachPortal();
  }
}
