import * as THREE from "https://esm.sh/three@0.162.0";

// ============================================================================
//  DAY / NIGHT CYCLE
// ============================================================================
export function createDayNightSystem(scene, ambientLight, directionalLight, starPoints, config) {
  if (!config?.enabled) return { tick() {}, paused: false };

  const dayColor = new THREE.Color(config.daySkyColor ?? 0x071228);
  const nightColor = new THREE.Color(config.nightSkyColor ?? 0x010409);
  const sunsetColor = new THREE.Color(0x1a0e08);
  const dayAmbient = new THREE.Color(config.dayAmbientColor ?? 0x95b3df);
  const nightAmbient = new THREE.Color(config.nightAmbientColor ?? 0x0a1838);
  const tmp = new THREE.Color();
  const dur = config.cycleDurationSec ?? 180;
  let paused = false;

  function tick(t) {
    if (paused) return;
    const p = (t % dur) / dur;
    const sun = Math.sin(p * Math.PI * 2);
    const day = Math.max(0, sun);
    const night = Math.max(0, -sun);

    if (sun > 0.15) {
      tmp.copy(dayColor);
    } else if (sun > -0.1) {
      const b = (sun + 0.1) / 0.25;
      tmp.copy(nightColor).lerp(sunsetColor, 1 - Math.abs(b));
    } else {
      tmp.copy(nightColor);
    }
    scene.background.copy(tmp);
    if (scene.fog) {
      scene.fog.color.copy(tmp);
      scene.fog.near = THREE.MathUtils.lerp(config.nightFogNear ?? 6, config.dayFogNear ?? 12, day);
      scene.fog.far = THREE.MathUtils.lerp(config.nightFogFar ?? 80, config.dayFogFar ?? 130, day);
    }

    ambientLight.color.lerpColors(dayAmbient, nightAmbient, night);
    ambientLight.intensity = THREE.MathUtils.lerp(
      config.dayAmbientIntensity ?? 0.35,
      config.nightAmbientIntensity ?? 0.12,
      night
    );
    directionalLight.intensity = THREE.MathUtils.lerp(0.75, 0.05, night);
    if (starPoints) {
      starPoints.material.opacity = THREE.MathUtils.clamp(night * 1.6, 0, 0.85);
    }
  }

  return {
    tick,
    get paused() { return paused; },
    set paused(v) { paused = v; },
  };
}

// ============================================================================
//  WEATHER (rain)
// ============================================================================
export function createWeatherSystem(scene, config) {
  if (!config?.enabled) return { tick() {}, get isRaining() { return false; } };

  const count = config.particleCount ?? 4000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 100;
    pos[i * 3 + 1] = Math.random() * 50;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
    vel[i] = 18 + Math.random() * 12;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    color: config.rainColor ?? 0xaaccff,
    size: 0.13,
    transparent: true,
    opacity: config.rainOpacity ?? 0.35,
    depthWrite: false,
  });

  const rain = new THREE.Points(geo, mat);
  rain.visible = false;
  scene.add(rain);

  const state = { raining: false, nextToggle: 40 + Math.random() * 80 };
  let savedFogFar = null;

  function tick(delta, t, playerPos) {
    if (savedFogFar === null && scene.fog) savedFogFar = scene.fog.far;

    if (t > state.nextToggle) {
      state.raining = !state.raining;
      rain.visible = state.raining;
      state.nextToggle = t + (state.raining
        ? 25 + Math.random() * 30
        : 60 + Math.random() * 120);
      if (!state.raining && scene.fog && savedFogFar) {
        scene.fog.far = savedFogFar;
      }
    }

    if (!state.raining) return;

    if (playerPos) {
      rain.position.x = playerPos.x;
      rain.position.z = playerPos.z;
    }

    const arr = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= vel[i] * delta;
      if (arr[i * 3 + 1] < -2) {
        arr[i * 3 + 1] = 42 + Math.random() * 8;
        arr[i * 3]     = (Math.random() - 0.5) * 100;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 100;
      }
    }
    geo.attributes.position.needsUpdate = true;

    if (scene.fog && savedFogFar) {
      scene.fog.far = savedFogFar / (config.fogDensityMultiplier ?? 1.6);
    }
  }

  return { tick, get isRaining() { return state.raining; } };
}

// ============================================================================
//  GHOST VISITORS (simulated)
// ============================================================================
export function createGhostSystem(parent, getTerrainHeight, config) {
  if (!config?.enabled) return { tick() {} };

  const names = [
    "visitor_tokyo", "visitor_london", "visitor_nyc",
    "visitor_berlin", "visitor_sydney",
  ];
  const ghosts = [];

  for (let i = 0; i < (config.count ?? 4); i++) {
    const g = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: config.color ?? 0x5599cc,
      transparent: true,
      opacity: config.opacity ?? 0.18,
      emissive: config.color ?? 0x5599cc,
      emissiveIntensity: 0.3,
    });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.1, 8), bodyMat);
    body.position.y = 0.55;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), bodyMat);
    head.position.y = 1.25;
    g.add(head);

    const c = document.createElement("canvas");
    c.width = 256; c.height = 64;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(100,180,255,0.55)";
    ctx.font = "22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(names[i % names.length], 128, 40);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      depthWrite: false,
    }));
    sp.scale.set(2, 0.5, 1);
    sp.position.y = 1.8;
    g.add(sp);

    const x = (Math.random() - 0.5) * 80;
    const z = (Math.random() - 0.5) * 70;
    g.position.set(x, 1, z);
    parent.add(g);

    ghosts.push({
      mesh: g,
      target: new THREE.Vector3((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 70),
      waitUntil: Math.random() * 4,
      speed: config.speed ?? 1.8,
    });
  }

  function tick(delta, t) {
    for (const g of ghosts) {
      if (t < g.waitUntil) continue;
      const dx = g.target.x - g.mesh.position.x;
      const dz = g.target.z - g.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 1.2) {
        g.waitUntil = t + 2 + Math.random() * 5;
        g.target.set((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 70);
        continue;
      }

      const step = Math.min(g.speed * delta, dist);
      g.mesh.position.x += (dx / dist) * step;
      g.mesh.position.z += (dz / dist) * step;
      g.mesh.rotation.y = Math.atan2(dx, dz);

      const h = getTerrainHeight(g.mesh.position.x, g.mesh.position.z);
      g.mesh.position.y = (h ?? 0) + (config.heightOffset ?? 0);
    }
  }

  return { tick };
}

// ============================================================================
//  MINIMAP
// ============================================================================
export function createMinimap(canvasEl, config) {
  if (!canvasEl || !config?.showMinimap) return { tick() {}, addMarker() {}, markDiscovered() {} };

  const size = config.minimapSize ?? 140;
  canvasEl.width = size;
  canvasEl.height = size;
  const ctx = canvasEl.getContext("2d");
  const bounds = { minX: -85, maxX: 85, minZ: -85, maxZ: 85 };
  const markers = new Map();

  function w2m(wx, wz) {
    return [
      ((wx - bounds.minX) / (bounds.maxX - bounds.minX)) * size,
      ((wz - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * size,
    ];
  }

  function addMarker(id, wx, wz, color, discovered) {
    markers.set(id, { wx, wz, color, discovered });
  }

  function markDiscovered(id) {
    const m = markers.get(id);
    if (m) m.discovered = true;
  }

  function tick(playerPos, playerYaw) {
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = "rgba(3,11,28,0.82)";
    ctx.fillRect(0, 0, size, size);

    const t = performance.now() * 0.001;
    const dot = config.minimapBeaconDotSize ?? 4;
    for (const [, m] of markers) {
      const [mx, my] = w2m(m.wx, m.wz);
      if (m.discovered) {
        ctx.fillStyle = "#" + (m.color ?? 0x88ddff).toString(16).padStart(6, "0");
        ctx.beginPath();
        ctx.arc(mx, my, dot, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const pulse = 0.5 + Math.sin(t * 3 + mx) * 0.5;
        ctx.fillStyle = `rgba(200,220,255,${(0.25 + pulse * 0.45).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(mx, my, dot * (0.5 + pulse * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (playerPos) {
      const [px, py] = w2m(playerPos.x, playerPos.z);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-(playerYaw ?? 0));
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(-4.5, 5);
      ctx.lineTo(4.5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    ctx.strokeStyle = "rgba(87,230,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  }

  return { tick, addMarker, markDiscovered };
}

// ============================================================================
//  PROGRESS TRACKER
// ============================================================================
export function createProgressTracker(textEl, ringFillEl, total, onComplete) {
  if (!textEl) return { increment() {}, getCount() { return 0; }, isComplete() { return false; } };

  let count = 0;
  const R = 20;
  const C = 2 * Math.PI * R;

  if (ringFillEl) {
    ringFillEl.setAttribute("stroke-dasharray", C);
    ringFillEl.setAttribute("stroke-dashoffset", C);
  }

  function refresh() {
    textEl.textContent = `${count} / ${total}`;
    if (ringFillEl) {
      ringFillEl.setAttribute("stroke-dashoffset", C - (count / total) * C);
    }
  }

  function increment(name) {
    count++;
    refresh();
    if (count >= total && onComplete) onComplete();
    return count;
  }

  refresh();
  return { increment, getCount() { return count; }, isComplete() { return count >= total; } };
}
