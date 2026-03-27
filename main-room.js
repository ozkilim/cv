import * as THREE from "https://esm.sh/three@0.162.0";
import { STLLoader } from "https://esm.sh/three@0.162.0/examples/jsm/loaders/STLLoader.js";
import { WORLD_OBJECTS, WORLD_CONFIG, TOTAL_DISCOVERABLE } from "./world-data.js";

// ---------------------------------------------------------------------------
//  Terrain helpers
// ---------------------------------------------------------------------------
const LONDON_CLUSTER_OFFSET = new THREE.Vector3(0, 0, 0);
const londonPlacementRaycaster = new THREE.Raycaster();
let londonSurfaceMesh = null;
const londonReadyCallbacks = [];

function whenLondonReady(cb) {
  if (londonSurfaceMesh) {
    cb();
  } else {
    londonReadyCallbacks.push(cb);
  }
}

function getLondonHeightAt(x, z) {
  if (!londonSurfaceMesh) return null;
  londonPlacementRaycaster.set(
    new THREE.Vector3(x, 260, z),
    new THREE.Vector3(0, -1, 0)
  );
  const hits = londonPlacementRaycaster.intersectObject(londonSurfaceMesh, true);
  if (!hits.length) return null;
  return hits[0].point.y;
}

function placeOnLondonSurface(group, label, x, z, yOffset = 0) {
  group.position.x = x;
  group.position.z = z;
  const apply = () => {
    const h = getLondonHeightAt(x, z);
    if (h == null) return;
    group.position.y = h + yOffset;
    if (label) {
      label.position.set(x, group.position.y + 2.05, z);
    }
  };
  whenLondonReady(apply);
}

// ---------------------------------------------------------------------------
//  Labels
// ---------------------------------------------------------------------------
function makeLabelTexture(text) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(7,18,40,0.9)";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "rgba(129,197,255,0.55)";
  ctx.lineWidth = 5;
  ctx.strokeRect(7, 7, c.width - 14, c.height - 14);
  ctx.fillStyle = "#dff0ff";
  ctx.font = "bold 48px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, c.width / 2, c.height / 2);
  return new THREE.CanvasTexture(c);
}

function addFloatingLabel(parent, text, pos, faceBackward = false) {
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 0.9),
    new THREE.MeshBasicMaterial({
      map: makeLabelTexture(text),
      transparent: true,
    })
  );
  label.position.set(pos.x, pos.y + 2.05, pos.z);
  if (faceBackward) label.rotation.y = Math.PI;
  parent.add(label);
  return label;
}

// ---------------------------------------------------------------------------
//  Beacons
// ---------------------------------------------------------------------------
let _beaconTex = null;
function getBeaconTexture() {
  if (_beaconTex) return _beaconTex;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(220,240,255,0.7)");
  g.addColorStop(1, "rgba(100,180,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  _beaconTex = new THREE.CanvasTexture(c);
  return _beaconTex;
}

function addBeacon(parent, linkedObj) {
  const color = linkedObj.userData?.color || 0x88ddff;
  const bGroup = new THREE.Group();
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getBeaconTexture(),
      color,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sprite.scale.set(3.5, 3.5, 1);
  bGroup.add(sprite);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 14, 6),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  beam.position.y = -4;
  bGroup.add(beam);
  bGroup.position.copy(linkedObj.position);
  bGroup.position.y += 10;
  parent.add(bGroup);
  linkedObj.userData._beacon = bGroup;
  linkedObj.userData._beaconSprite = sprite;
}

function markAsDiscoverable(object, label, revealRadius, parent) {
  revealRadius = revealRadius || 12;
  object.visible = false;
  if (label) label.visible = false;
  object.userData.discovery = { revealed: false, revealRadius };
  if (parent) addBeacon(parent, object);
}

// ---------------------------------------------------------------------------
//  Poster texture (generic, driven by title)
// ---------------------------------------------------------------------------
function makePosterTexture(title) {
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 1250;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f4f8ff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "#1d3a60";
  ctx.lineWidth = 14;
  ctx.strokeRect(10, 10, c.width - 20, c.height - 20);

  ctx.fillStyle = "#0d2b4a";
  ctx.font = "bold 48px serif";
  let line = "";
  let y = 120;
  for (const w of title.split(" ")) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > 780) {
      ctx.fillText(line, 58, y);
      y += 60;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, 58, y);
  y += 80;
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("Walk close + press Enter to read.", 58, y);
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------------------
//  Shape factory for geometry objects
// ---------------------------------------------------------------------------
function createShapeMesh(def) {
  const color = def.color;
  const defaultEmissive = {
    column: [0x2d2461, 0.32],
    cube: [0x4a311f, 0.28],
    icosa: [0x5e2148, 0.34],
    torus: [0x1f5d71, 0.34],
    sphere: [0x163957, 0.4],
    dodeca: [0x14443f, 0.35],
  };
  const [defEmissive, defEI] = defaultEmissive[def.shape] || [0x000000, 0];
  const emissive = def.emissive ?? defEmissive;
  const emissiveIntensity = def.emissiveIntensity ?? defEI;

  function mat(extra) {
    return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, ...extra });
  }

  switch (def.shape) {
    case "column":
      return new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 2.2, 20), mat());
    case "cube":
      return new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 1.6), mat());
    case "icosa":
      return new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 0), mat());
    case "torus":
      return new THREE.Mesh(new THREE.TorusKnotGeometry(0.85, 0.25, 120, 18), mat());
    case "sphere":
      return new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 24), mat());
    case "dodeca":
      return new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), mat());
    case "poster": {
      const title = def.content?.title || def.name;
      const poster = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 4.7),
        new THREE.MeshBasicMaterial({
          map: makePosterTexture(title),
          side: THREE.DoubleSide,
        })
      );
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 4.9, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x1a2e4a, emissive: 0x223952, emissiveIntensity: 0.2 })
      );
      const group = new THREE.Group();
      group.add(frame);
      poster.position.z = 0.06;
      group.add(poster);
      return group;
    }
    default:
      return new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.5, 1.5),
        new THREE.MeshStandardMaterial({ color })
      );
  }
}

// ---------------------------------------------------------------------------
//  Generic spawners
// ---------------------------------------------------------------------------
function spawnGeometryObject(def, parent, objects) {
  const mesh = createShapeMesh(def);
  const x = def.position.x;
  const z = def.position.z;
  const yOff = def.yOffset ?? 1.5;

  mesh.position.set(x, 2, z);
  if (def.shape === "poster") mesh.rotation.y = Math.PI;

  mesh.userData = {
    key: def.id,
    name: def.name,
    interaction: def.interaction,
    content: def.content,
    viewerUrl: def.viewerUrl,
    viewerCanMinimize: def.viewerCanMinimize,
    shareConfig: def.shareConfig,
    puzzle: def.puzzle,
    color: def.color,
    shape: def.shape,
    fixed: false,
    hiddenEasterEgg: def.hiddenEasterEgg || false,
    spinSpeed: def.spinSpeed || 0,
  };

  parent.add(mesh);
  objects.push(mesh);

  const label = addFloatingLabel(
    parent,
    def.name,
    mesh.position,
    def.shape === "poster"
  );
  mesh.userData.labelMesh = label;

  if (def.placeOnTerrain) {
    placeOnLondonSurface(mesh, label, x, z, yOff);
    whenLondonReady(() => {
      mesh.userData._baseY = mesh.position.y;
    });
  }

  if (def.discoverable) {
    markAsDiscoverable(mesh, label, def.revealRadius, parent);
  }
}

function spawnSTLObject(def, parent, objects, onNotify) {
  const loader = new STLLoader();
  loader.load(
    def.stlPath,
    (geometry) => {
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      const matOpts = {
        color: def.color,
        roughness: def.roughness ?? 0.5,
        metalness: def.metalness ?? 0.1,
      };
      if (def.emissive != null) {
        matOpts.emissive = def.emissive;
        matOpts.emissiveIntensity = def.emissiveIntensity ?? 0.2;
      }
      const material = new THREE.MeshStandardMaterial(matOpts);
      const mesh = new THREE.Mesh(geometry, material);
      const group = new THREE.Group();
      group.add(mesh);

      const bbox = geometry.boundingBox;
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const center = new THREE.Vector3();
      bbox.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      const s = def.targetSize / maxDim;

      if (def.hasBase) {
        mesh.position.set(-center.x, -bbox.min.y, -center.z);
        mesh.rotation.x = -Math.PI / 2;
        group.scale.setScalar(s);

        const modelBounds = new THREE.Box3().setFromObject(group);
        group.position.set(
          def.position.x,
          (def.yOffset || 0.4) - modelBounds.min.y,
          def.position.z
        );

        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(2.4, 2.8, 0.4, 40),
          new THREE.MeshStandardMaterial({ color: 0x2a3954, roughness: 0.85, metalness: 0.06 })
        );
        base.position.set(def.position.x, 0.2, def.position.z);
        parent.add(base);

        group.userData = {
          key: def.id,
          name: def.name,
          interaction: def.interaction,
          content: def.content,
          viewerUrl: def.viewerUrl,
          viewerCanMinimize: def.viewerCanMinimize,
          shareConfig: def.shareConfig,
          puzzle: def.puzzle,
          color: def.color,
          shape: def.shape || "landmark",
          fixed: true,
          spinSpeed: def.spinSpeed || 0,
          hiddenEasterEgg: def.hiddenEasterEgg || false,
        };

        parent.add(group);
        objects.push(group);

        const label = addFloatingLabel(parent, def.name, group.position, false);
        group.userData.labelMesh = label;

        whenLondonReady(() => {
          const h = getLondonHeightAt(group.position.x, group.position.z);
          if (h == null) return;
          group.position.y = h + (def.yOffset || 0.4);
          base.position.y = h + 0.2;
        });
      } else {
        mesh.position.set(-center.x, -center.y, -center.z);
        group.scale.setScalar(s);

        if (def.rotation) {
          if (def.rotation.x !== undefined) group.rotation.x = def.rotation.x;
          if (def.rotation.y !== undefined) group.rotation.y = def.rotation.y;
          if (def.rotation.z !== undefined) group.rotation.z = def.rotation.z;
        }

        group.position.set(def.position.x, 2, def.position.z);

        group.userData = {
          key: def.id,
          name: def.name,
          interaction: def.interaction,
          content: def.content,
          viewerUrl: def.viewerUrl,
          viewerCanMinimize: def.viewerCanMinimize,
          shareConfig: def.shareConfig,
          puzzle: def.puzzle,
          color: def.color,
          shape: def.shape || "landmark",
          fixed: true,
          spinSpeed: def.spinSpeed || 0,
          hiddenEasterEgg: def.hiddenEasterEgg || false,
        };

        parent.add(group);
        objects.push(group);

        const label = addFloatingLabel(parent, def.name, group.position, false);
        group.userData.labelMesh = label;

        if (def.placeOnTerrain) {
          placeOnLondonSurface(group, label, def.position.x, def.position.z, def.yOffset || 1);
        }
      }

      if (def.discoverable) {
        markAsDiscoverable(group, group.userData.labelMesh, def.revealRadius, parent);
      }

      onNotify?.();
    },
    undefined,
    () => {
      onNotify?.(`Could not load ${def.name} STL model.`);
    }
  );
}

// ---------------------------------------------------------------------------
//  Londres terrain
// ---------------------------------------------------------------------------
function addLondresFloorModel(mainWorldGroup, colliders, onNotify) {
  const loader = new STLLoader();
  loader.load(
    "./assets/Londres.stl",
    (geometry) => {
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      const material = new THREE.MeshStandardMaterial({
        color: 0x7aa5d6,
        roughness: 0.62,
        metalness: 0.1,
        emissive: 0x10253f,
        emissiveIntensity: 0.08,
      });

      const mesh = new THREE.Mesh(geometry, material);
      const group = new THREE.Group();
      group.add(mesh);

      const bbox = geometry.boundingBox;
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      mesh.position.set(-center.x, -bbox.min.z, center.y);
      mesh.rotation.x = -Math.PI / 2;

      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 175;
      const s = targetSize / maxDim;
      group.scale.setScalar(s);

      const groundedBounds = new THREE.Box3().setFromObject(group);
      group.position.set(
        LONDON_CLUSTER_OFFSET.x,
        -1.15 - groundedBounds.min.y,
        LONDON_CLUSTER_OFFSET.z
      );

      mainWorldGroup.add(group);
      group.updateMatrixWorld(true);
      colliders.push(mesh);
      londonSurfaceMesh = mesh;
      while (londonReadyCallbacks.length) {
        const cb = londonReadyCallbacks.shift();
        cb?.();
      }
      onNotify?.("Londres floor model added.");
    },
    undefined,
    () => {
      onNotify?.("Could not load Londres STL model.");
    }
  );
}

// ---------------------------------------------------------------------------
//  Room shell (floor, walls, ceiling, stars, lights)
// ---------------------------------------------------------------------------
function buildRoom(mainWorldGroup) {
  const roomHeight = 72;
  const roomSize = 180;
  const halfRoom = roomSize / 2;

  const ambient = new THREE.AmbientLight(0x95b3df, 0.35);
  mainWorldGroup.add(ambient);

  const directional = new THREE.DirectionalLight(0xbad6ff, 0.75);
  directional.position.set(10, 14, 8);
  mainWorldGroup.add(directional);

  const point = new THREE.PointLight(0x5cc7ff, 1.4, 58, 2.1);
  point.position.set(0, 4.8, 0);
  mainWorldGroup.add(point);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(roomSize, 0.6, roomSize),
    new THREE.MeshStandardMaterial({ color: 0x141d31, roughness: 0.78 })
  );
  floor.position.set(0, -0.3, 0);
  mainWorldGroup.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x172641, roughness: 0.68 });
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.5, roomHeight, roomSize), wallMat);
  left.position.set(-halfRoom, roomHeight / 2, 0);
  mainWorldGroup.add(left);
  const right = left.clone();
  right.position.x = halfRoom;
  mainWorldGroup.add(right);
  const back = new THREE.Mesh(new THREE.BoxGeometry(roomSize, roomHeight, 0.5), wallMat);
  back.position.set(0, roomHeight / 2, -halfRoom);
  mainWorldGroup.add(back);
  const front = back.clone();
  front.position.z = halfRoom;
  mainWorldGroup.add(front);

  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(roomSize, 0.5, roomSize),
    new THREE.MeshStandardMaterial({ color: 0x0c1526, roughness: 0.93 })
  );
  ceiling.position.set(0, roomHeight, 0);
  mainWorldGroup.add(ceiling);

  const starsGeo = new THREE.BufferGeometry();
  const count = 650;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    pos[i * 3] = THREE.MathUtils.randFloatSpread(80);
    pos[i * 3 + 1] = THREE.MathUtils.randFloat(1, 28);
    pos[i * 3 + 2] = THREE.MathUtils.randFloatSpread(80);
  }
  starsGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const starPoints = new THREE.Points(
    starsGeo,
    new THREE.PointsMaterial({ color: 0x9dd6ff, size: 0.11, opacity: 0.6, transparent: true })
  );
  mainWorldGroup.add(starPoints);

  return { ambient, directional, point, starPoints };
}

// ---------------------------------------------------------------------------
//  Main entry point
// ---------------------------------------------------------------------------
export function createMainRoom(mainWorldGroup, onNotify, onDiscover) {
  const objects = [];
  const colliders = [];
  const lights = buildRoom(mainWorldGroup);
  addLondresFloorModel(mainWorldGroup, colliders, onNotify);

  for (const def of WORLD_OBJECTS) {
    if (def.type === "geometry") {
      spawnGeometryObject(def, mainWorldGroup, objects);
    } else if (def.type === "stl") {
      spawnSTLObject(def, mainWorldGroup, objects, onNotify);
    }
  }

  const tick = (delta, t, playerPosition) => {
    objects.forEach((o, i) => {
      const discovery = o.userData?.discovery;
      if (discovery && !discovery.revealed && playerPosition) {
        if (o.position.distanceTo(playerPosition) <= discovery.revealRadius) {
          discovery.revealed = true;
          o.visible = true;
          const label = o.userData?.labelMesh;
          if (label) label.visible = true;
          const beacon = o.userData?._beacon;
          if (beacon) beacon.visible = false;
          onNotify?.(`${o.userData?.name || "Object"} discovered.`);
          onDiscover?.(o.userData);
        }
      }

      const beacon = o.userData?._beacon;
      if (beacon && beacon.visible) {
        beacon.position.x = o.position.x;
        beacon.position.z = o.position.z;
        beacon.position.y = (o.position.y || 0) + 10 + Math.sin(t * 1.8 + i * 1.3) * 0.5;
        const bSprite = o.userData._beaconSprite;
        if (bSprite) {
          bSprite.material.opacity = 0.4 + Math.sin(t * 2.5 + i) * 0.2;
          const bs = 3.2 + Math.sin(t * 2 + i * 0.7) * 0.5;
          bSprite.scale.set(bs, bs, 1);
        }
      }

      const isPoster = o.userData?.shape === "poster";
      const isFixed = o.userData?.fixed === true;
      const spinSpeed = o.userData?.spinSpeed;
      if (spinSpeed) {
        o.rotation.y += spinSpeed * delta;
      } else if (!isPoster && !isFixed) {
        o.rotation.y += 0.27 * delta;
      }
      if (isPoster || isFixed) return;
      if (o.userData?._baseY != null) {
        o.position.y = o.userData._baseY + Math.sin(t * 1.6 + i) * 0.08;
      }
    });
  };

  function setTerrainMaterial(mat) {
    if (londonSurfaceMesh) londonSurfaceMesh.material = mat;
  }

  return { objects, colliders, tick, lights, totalDiscoverable: TOTAL_DISCOVERABLE, setTerrainMaterial };
}

export function getTerrainHeight(x, z) {
  return getLondonHeightAt(x, z);
}

export function tickTerrainShader(t) {
  if (londonSurfaceMesh?.material?.userData?.shader?.uniforms?.uTime) {
    londonSurfaceMesh.material.userData.shader.uniforms.uTime.value = t;
  }
}
