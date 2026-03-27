import * as THREE from "https://esm.sh/three@0.162.0";
import { PointerLockControls } from "https://esm.sh/three@0.162.0/examples/jsm/controls/PointerLockControls.js";
import {
  buildTransitStage,
  setupPoemIntro,
  spawnSparkles,
  stylePoemTokens,
  updateTransit
} from "./entrance.js";
import { createMainRoom, getTerrainHeight, tickTerrainShader } from "./main-room.js";
import { WORLD_CONFIG, WORLD_OBJECTS, TOTAL_DISCOVERABLE } from "./world-data.js";
import { THEMES, createTerrainMaterial, createSakuraParticles } from "./themes.js";
import {
  createDayNightSystem,
  createWeatherSystem,
  createGhostSystem,
  createMinimap,
  createProgressTracker,
} from "./systems.js";

// ---------------------------------------------------------------------------
//  DOM refs
// ---------------------------------------------------------------------------
const canvas = document.querySelector("#bg");
const cvIntroOverlay = document.querySelector("#cv-intro-overlay");
const cvEnterBtn = document.querySelector("#cv-enter-btn");
const poemOverlay = document.querySelector("#poem-overlay");
const poemInput = document.querySelector("#poem-input");
const sparkleBurst = document.querySelector("#sparkle-burst");
const hudEl = document.querySelector("#hud");
const crosshairEl = document.querySelector("#crosshair");
const transitHintEl = document.querySelector("#transit-hint");
const focusNameEl = document.querySelector("#focus-name");
const objectiveEl = document.querySelector("#objective");
const interactionTip = document.querySelector("#interaction-tip");
const panel = document.querySelector("#content-panel");
const panelBody = document.querySelector("#panel-body");
const closePanelBtn = document.querySelector("#close-panel");
const viewerPanel = document.querySelector("#viewer-panel");
const viewerIframe = document.querySelector("#viewer-iframe");
const viewerTitle = document.querySelector("#viewer-title");
const viewerOpenNewTab = document.querySelector("#viewer-open-new-tab");
const closeViewerPanelBtn = document.querySelector("#close-viewer-panel");
const minifyViewerPanelBtn = document.querySelector("#minify-viewer-panel");
const expandViewerPanelBtn = document.querySelector("#expand-viewer-panel");
const toastEl = document.querySelector("#toast");
const controlsOverlay = document.querySelector("#controls-overlay");

const progressHud = document.querySelector("#progress-hud");
const progressText = document.querySelector("#progress-text");
const progressRingFill = document.querySelector("#progress-ring-fill");
const minimapCanvas = document.querySelector("#minimap-canvas");
const guestbookPanel = document.querySelector("#guestbook-panel");
const puzzleOverlay = document.querySelector("#puzzle-overlay");
const shareOverlay = document.querySelector("#share-overlay");
const qrOverlay = document.querySelector("#qr-overlay");
const photoOverlay = document.querySelector("#photo-overlay");
const speedrunHud = document.querySelector("#speedrun-hud");
const speedrunTimeEl = document.querySelector("#speedrun-time");
const themePicker = document.querySelector("#theme-picker");
const themeOptions = document.querySelector("#theme-options");

// ---------------------------------------------------------------------------
//  Scene
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030711);
scene.fog = new THREE.Fog(0x071124, 12, 130);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 1.7, 10);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

const mainWorldGroup = new THREE.Group();
scene.add(mainWorldGroup);
const transitGroup = new THREE.Group();
transitGroup.visible = false;
scene.add(transitGroup);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const londonCollisionRaycaster = new THREE.Raycaster();
const move = { forward: false, backward: false, left: false, right: false };
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const eyeHeight = 1.7;
let verticalVelocity = 0;
let isGrounded = true;
let jumpRequested = false;
let jumpsRemaining = 2;

let activeObject = null;
let stage = "cv";
let pointerState = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let viewerCanMinimize = false;

const transitState = { car: null, portal: null, speed: 0 };

// ---------------------------------------------------------------------------
//  Systems (initialised after mainRoom)
// ---------------------------------------------------------------------------
let dayNightSys, weatherSys, ghostSys, minimap, progress;
let speedrunStart = null;
let challengeTime = null;

// Check URL for challenge param
try {
  const h = window.location.hash;
  const m = h.match(/challenge=(\d+)/);
  if (m) challengeTime = parseInt(m[1], 10);
} catch { /* ignore */ }

// ---------------------------------------------------------------------------
//  Toast
// ---------------------------------------------------------------------------
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toastEl.classList.remove("visible");
  }, 1800);
}

// ---------------------------------------------------------------------------
//  Panels
// ---------------------------------------------------------------------------
function openPanel(html) {
  panelBody.innerHTML = html;
  panel.classList.remove("hidden");
  controls.unlock();
}

function closePanel() {
  panel.classList.add("hidden");
  controls.lock();
}

function openSharePanel(shareConfig, objectName) {
  if (!shareConfig) return;
  const pageUrl = shareConfig.url || window.location.href;
  const shareText = shareConfig.text || "Check out this interactive portfolio experience.";
  const platform = shareConfig.platform || "x";

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`;
  const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + pageUrl)}`;

  const btnStyle = "display:inline-block;padding:0.5rem 0.75rem;border:1px solid rgba(120,180,255,0.5);border-radius:8px;";
  const labels = { x: "Post on X", linkedin: "Share on LinkedIn", whatsapp: "Send via WhatsApp" };
  const urls = { x: xUrl, linkedin: liUrl, whatsapp: waUrl };

  openPanel(`
    <h2>Share This Experience</h2>
    <p>${shareText}</p>
    <div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:0.8rem;">
      <a href="${urls[platform]}" target="_blank" rel="noopener noreferrer"
        style="${btnStyle}color:${platform === 'linkedin' ? '#5ba4f5' : platform === 'whatsapp' ? '#25d366' : '#8dd8ff'};">
        ${labels[platform]}
      </a>
      <button id="copy-share-link-btn" type="button"
        style="${btnStyle}background:rgba(10,18,36,0.9);color:#dff0ff;">
        Copy Link
      </button>
    </div>
    <details style="margin-top:1rem;color:#9fbcde;font-size:0.82rem;">
      <summary style="cursor:pointer;">More ways to share</summary>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem;">
        ${platform !== "x" ? `<a href="${xUrl}" target="_blank" rel="noopener noreferrer" style="${btnStyle}font-size:0.8rem;">X</a>` : ""}
        ${platform !== "linkedin" ? `<a href="${liUrl}" target="_blank" rel="noopener noreferrer" style="${btnStyle}font-size:0.8rem;">LinkedIn</a>` : ""}
        ${platform !== "whatsapp" ? `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" style="${btnStyle}font-size:0.8rem;">WhatsApp</a>` : ""}
      </div>
    </details>
  `);

  document.querySelector("#copy-share-link-btn")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      showToast("Link copied.");
    } catch { showToast("Could not copy link."); }
  });
}

// ---------------------------------------------------------------------------
//  Viewer
// ---------------------------------------------------------------------------
function openViewer(url, name, options = {}) {
  if (!url || !viewerPanel || !viewerIframe) return;
  viewerCanMinimize = options.canMinimize === true;
  if (viewerTitle) viewerTitle.textContent = name ? `${name} Viewer` : "Viewer";
  if (viewerOpenNewTab) viewerOpenNewTab.href = url;
  viewerOpenNewTab?.classList.toggle("hidden", viewerCanMinimize);
  minifyViewerPanelBtn?.classList.toggle("hidden", !viewerCanMinimize);
  expandViewerPanelBtn?.classList.add("hidden");
  viewerPanel.classList.remove("mini-bar");
  viewerIframe.src = url;
  viewerPanel.classList.remove("hidden");
  controls.unlock();
}

function closeViewer() {
  if (!viewerPanel || !viewerIframe) return;
  viewerCanMinimize = false;
  viewerPanel.classList.add("hidden");
  viewerPanel.classList.remove("mini-bar");
  viewerOpenNewTab?.classList.remove("hidden");
  minifyViewerPanelBtn?.classList.add("hidden");
  expandViewerPanelBtn?.classList.add("hidden");
  viewerIframe.src = "about:blank";
  controls.lock();
}

function minimizeViewer() {
  if (!viewerPanel || viewerPanel.classList.contains("hidden") || !viewerCanMinimize) return;
  viewerPanel.classList.add("mini-bar");
  expandViewerPanelBtn?.classList.remove("hidden");
  controls.lock();
  showToast("Music minimized. Keep exploring.");
}

function expandViewer() {
  if (!viewerPanel || viewerPanel.classList.contains("hidden")) return;
  viewerPanel.classList.remove("mini-bar");
  if (!viewerCanMinimize) expandViewerPanelBtn?.classList.add("hidden");
  controls.unlock();
}

// ---------------------------------------------------------------------------
//  Guestbook (localStorage, frontend-only)
// ---------------------------------------------------------------------------
const GB_KEY = WORLD_CONFIG.guestbook?.storageKey || "oz_cv_guestbook";
const SEED_MSGS = [
  { name: "visitor_tokyo", text: "すごい! Amazing interactive CV!", time: Date.now() - 86400000 * 3 },
  { name: "visitor_london", text: "Love the London map concept. Really creative!", time: Date.now() - 86400000 * 2 },
  { name: "visitor_nyc", text: "Best portfolio I've seen. The 3D experience is wild.", time: Date.now() - 86400000 },
  { name: "visitor_berlin", text: "Die interaktive Erfahrung ist fantastisch!", time: Date.now() - 3600000 * 5 },
];

function loadGuestbook() {
  try {
    const s = JSON.parse(localStorage.getItem(GB_KEY));
    if (s && s.length) return s;
  } catch { /* empty */ }
  localStorage.setItem(GB_KEY, JSON.stringify(SEED_MSGS));
  return [...SEED_MSGS];
}

function saveGuestbook(msgs) {
  localStorage.setItem(GB_KEY, JSON.stringify(msgs.slice(-(WORLD_CONFIG.guestbook?.maxMessages || 200))));
}

function openGuestbook() {
  const msgs = loadGuestbook();
  const container = guestbookPanel.querySelector("#gb-messages");
  container.innerHTML = msgs.map(m =>
    `<div class="gb-msg"><strong>${escHtml(m.name)}</strong><span class="gb-time">${new Date(m.time).toLocaleDateString()}</span><p>${escHtml(m.text)}</p></div>`
  ).join("");
  container.scrollTop = container.scrollHeight;
  guestbookPanel.classList.remove("hidden");
  controls.unlock();
}

function closeGuestbook() {
  guestbookPanel.classList.add("hidden");
  controls.lock();
}

function submitGuestbookEntry() {
  const nameIn = guestbookPanel.querySelector("#gb-name");
  const textIn = guestbookPanel.querySelector("#gb-text");
  const name = (nameIn.value.trim() || "Anonymous").slice(0, 40);
  const text = textIn.value.trim().slice(0, 280);
  if (!text) return;
  const msgs = loadGuestbook();
  msgs.push({ name, text, time: Date.now() });
  saveGuestbook(msgs);
  nameIn.value = "";
  textIn.value = "";
  openGuestbook();
  showToast("Message saved!");
}

function escHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// ---------------------------------------------------------------------------
//  Puzzle — untangle the planar graph
// ---------------------------------------------------------------------------
let puzzleCleanup = null;

function openPuzzle(puzzleCfg) {
  puzzleOverlay.classList.remove("hidden");
  controls.unlock();

  const cv = puzzleOverlay.querySelector("#puzzle-canvas");
  const ctx = cv.getContext("2d");
  const W = 500, H = 500;
  cv.width = W; cv.height = H;

  const N = 8;
  const nodes = [];
  const edges = [];
  for (let i = 0; i < N; i++) {
    nodes.push({ x: 60 + Math.random() * (W - 120), y: 60 + Math.random() * (H - 120) });
  }
  for (let i = 1; i < N; i++) edges.push([i - 1, i]);
  edges.push([N - 1, 0]);
  for (let i = 0; i < 3; i++) {
    const a = Math.floor(Math.random() * N);
    let b = Math.floor(Math.random() * N);
    while (b === a) b = Math.floor(Math.random() * N);
    if (!edges.some(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a))) {
      edges.push([a, b]);
    }
  }

  let dragging = -1;

  function segsX(p1, p2, p3, p4) {
    const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
    const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
    const cross = d1x * d2y - d1y * d2x;
    if (Math.abs(cross) < 1e-10) return false;
    const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / cross;
    const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / cross;
    return t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98;
  }

  function countX() {
    let c = 0;
    for (let i = 0; i < edges.length; i++)
      for (let j = i + 1; j < edges.length; j++) {
        const [a1, a2] = edges[i], [b1, b2] = edges[j];
        if (a1 === b1 || a1 === b2 || a2 === b1 || a2 === b2) continue;
        if (segsX(nodes[a1], nodes[a2], nodes[b1], nodes[b2])) c++;
      }
    return c;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#040a18";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(87,230,255,0.2)";
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, W - 6, H - 6);

    const cx = countX();
    for (const [a, b] of edges) {
      ctx.beginPath();
      ctx.moveTo(nodes[a].x, nodes[a].y);
      ctx.lineTo(nodes[b].x, nodes[b].y);
      ctx.strokeStyle = cx === 0 ? "#57e6ff" : "rgba(150,190,255,0.55)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    for (let i = 0; i < nodes.length; i++) {
      ctx.beginPath();
      ctx.arc(nodes[i].x, nodes[i].y, 12, 0, Math.PI * 2);
      ctx.fillStyle = i === dragging ? "#57e6ff" : "#5599cc";
      ctx.fill();
      ctx.strokeStyle = "#e8f3ff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = "#9fbcde";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Crossings: ${cx}  |  Drag nodes to untangle`, W / 2, H - 14);
    if (cx === 0) {
      ctx.fillStyle = "#57e6ff";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText("Untangled!", W / 2, 35);
    }
  }

  function mpos(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  function onDown(e) {
    const p = mpos(e);
    for (let i = 0; i < nodes.length; i++) {
      if ((p.x - nodes[i].x) ** 2 + (p.y - nodes[i].y) ** 2 < 250) { dragging = i; return; }
    }
  }
  function onMove(e) {
    if (dragging < 0) return;
    const p = mpos(e);
    nodes[dragging].x = Math.max(16, Math.min(W - 16, p.x));
    nodes[dragging].y = Math.max(16, Math.min(H - 16, p.y));
    draw();
  }
  function onUp() {
    if (dragging >= 0 && countX() === 0) showToast("Puzzle solved! You untangled the graph!");
    dragging = -1;
    draw();
  }

  cv.addEventListener("mousedown", onDown);
  cv.addEventListener("mousemove", onMove);
  cv.addEventListener("mouseup", onUp);
  cv.addEventListener("touchstart", e => { e.preventDefault(); onDown(e.touches[0]); }, { passive: false });
  cv.addEventListener("touchmove", e => { e.preventDefault(); onMove(e.touches[0]); }, { passive: false });
  cv.addEventListener("touchend", onUp);

  puzzleCleanup = () => {
    cv.removeEventListener("mousedown", onDown);
    cv.removeEventListener("mousemove", onMove);
    cv.removeEventListener("mouseup", onUp);
  };

  draw();
}

function closePuzzle() {
  puzzleCleanup?.();
  puzzleCleanup = null;
  puzzleOverlay.classList.add("hidden");
  controls.lock();
}

// ---------------------------------------------------------------------------
//  Share card (100% completion reward, canvas-generated image)
// ---------------------------------------------------------------------------
function getSpeedrunText() {
  if (!speedrunStart) return "";
  const ms = performance.now() - speedrunStart;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function getSpeedrunMs() {
  return speedrunStart ? Math.floor(performance.now() - speedrunStart) : 0;
}

function openShareCard() {
  shareOverlay.classList.remove("hidden");
  controls.unlock();

  const cv = shareOverlay.querySelector("#share-canvas");
  const ctx = cv.getContext("2d");
  cv.width = 600; cv.height = 380;
  const cfg = WORLD_CONFIG.shareCard;
  const timeStr = getSpeedrunText();

  ctx.fillStyle = cfg?.bgColor || "#030711";
  ctx.fillRect(0, 0, 600, 380);
  ctx.strokeStyle = cfg?.accentColor || "#57e6ff";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 584, 364);

  ctx.fillStyle = cfg?.accentColor || "#57e6ff";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(cfg?.title || "I explored Oz Kilim's 3D London CV", 300, 50);

  ctx.fillStyle = "#e8f3ff";
  ctx.font = "15px sans-serif";
  ctx.fillText(`${progress?.getCount?.() ?? "?"} / ${mainRoom.totalDiscoverable} objects discovered`, 300, 105);
  if (timeStr) {
    ctx.fillStyle = cfg?.accentColor || "#57e6ff";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(`Speedrun: ${timeStr}`, 300, 155);
  }

  ctx.fillStyle = cfg?.accentColor || "#57e6ff";
  ctx.font = "bold 17px sans-serif";
  ctx.fillText(cfg?.hashtag || "#InteractiveCV", 300, 225);

  ctx.fillStyle = "#9fbcde";
  ctx.font = "13px sans-serif";
  ctx.fillText(cfg?.siteUrl || window.location.href, 300, 300);
  ctx.fillText("ozkilim.com", 300, 330);
}

function downloadShareCard() {
  const cv = shareOverlay.querySelector("#share-canvas");
  const a = document.createElement("a");
  a.download = "oz-kilim-cv-discovery.png";
  a.href = cv.toDataURL("image/png");
  a.click();
}

function shareCardOnX() {
  const cfg = WORLD_CONFIG.shareCard;
  const timeStr = getSpeedrunText();
  const timeMsg = timeStr ? ` Speedrun: ${timeStr}` : "";
  const text = `${cfg?.title || "I explored Oz Kilim's 3D CV"}${timeMsg} ${cfg?.hashtag || "#InteractiveCV"}`;
  const url = cfg?.siteUrl || window.location.href;
  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    "_blank"
  );
}

function challengeFriend() {
  const ms = getSpeedrunMs();
  const base = WORLD_CONFIG.shareCard?.siteUrl || window.location.origin + window.location.pathname;
  const challengeUrl = `${base}#challenge=${ms}`;
  navigator.clipboard.writeText(challengeUrl).then(
    () => showToast("Challenge link copied! Send it to a friend."),
    () => showToast("Could not copy link.")
  );
}

function closeShareCard() {
  shareOverlay.classList.add("hidden");
  controls.lock();
}

// ---------------------------------------------------------------------------
//  QR code (canvas-drawn, no external dependencies)
// ---------------------------------------------------------------------------
function openQRCode() {
  qrOverlay.classList.remove("hidden");
  controls.unlock();
  const url = WORLD_CONFIG.shareCard?.siteUrl || window.location.href;
  const urlEl = qrOverlay.querySelector("#qr-url-text");
  if (urlEl) urlEl.textContent = url;
  const cv = qrOverlay.querySelector("#qr-canvas");
  const ctx = cv.getContext("2d");
  drawSimpleQR(ctx, url, 250);
}

function drawSimpleQR(ctx, text, size) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  const data = encodeQRData(text);
  const cellSize = size / data.length;
  ctx.fillStyle = "#030711";
  for (let r = 0; r < data.length; r++)
    for (let c = 0; c < data[r].length; c++)
      if (data[r][c]) ctx.fillRect(c * cellSize, r * cellSize, cellSize + 0.5, cellSize + 0.5);
}

function encodeQRData(text) {
  const n = Math.max(21, Math.ceil(text.length / 2) + 15);
  const grid = Array.from({ length: n }, () => Array(n).fill(0));
  const addFinder = (r, c) => {
    for (let dr = 0; dr < 7; dr++)
      for (let dc = 0; dc < 7; dc++) {
        const border = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        if (border || inner) grid[r + dr]?.[c + dc] !== undefined && (grid[r + dr][c + dc] = 1);
      }
  };
  addFinder(0, 0);
  addFinder(0, n - 7);
  addFinder(n - 7, 0);
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0) {
      if (grid[6]) grid[6][i] = 1;
      if (grid[i]) grid[i][6] = 1;
    }
  }
  let bit = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    for (let b = 7; b >= 0; b--) {
      const row = 9 + Math.floor(bit / (n - 16));
      const col = 9 + (bit % (n - 16));
      if (row < n && col < n && grid[row][col] === 0) {
        grid[row][col] = (code >> b) & 1;
      }
      bit++;
    }
  }
  for (let r = 9; r < n - 7; r++)
    for (let c = 9; c < n - 7; c++)
      if (grid[r][c] === 0) grid[r][c] = ((r + c) % 3 === 0) ? 1 : 0;
  return grid;
}

function closeQR() {
  qrOverlay.classList.add("hidden");
  controls.lock();
}

// ---------------------------------------------------------------------------
//  Photo mode — screenshot + branded overlay
// ---------------------------------------------------------------------------
function openPhotoMode() {
  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL("image/png");
  const img = new Image();
  img.onload = () => {
    const cv = photoOverlay.querySelector("#photo-canvas");
    const ctx = cv.getContext("2d");
    cv.width = img.width;
    cv.height = img.height;
    ctx.drawImage(img, 0, 0);

    const w = cv.width, h = cv.height;
    const barH = Math.max(48, h * 0.08);
    ctx.fillStyle = "rgba(3,7,17,0.6)";
    ctx.fillRect(0, h - barH, w, barH);
    ctx.fillStyle = "#57e6ff";
    ctx.font = `bold ${Math.round(barH * 0.38)}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Oz Kilim's 3D London CV", 14, h - barH / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#9fbcde";
    ctx.font = `${Math.round(barH * 0.28)}px sans-serif`;
    ctx.fillText("ozkilim.com", w - 14, h - barH / 2);

    photoOverlay.classList.remove("hidden");
    controls.unlock();
  };
  img.src = dataUrl;
}

function downloadPhoto() {
  const cv = photoOverlay.querySelector("#photo-canvas");
  const a = document.createElement("a");
  a.download = "oz-kilim-cv-photo.png";
  a.href = cv.toDataURL("image/png");
  a.click();
}

function sharePhotoOnX() {
  const cfg = WORLD_CONFIG.shareCard;
  const text = `Exploring Oz Kilim's 3D London CV ${cfg?.hashtag || "#InteractiveCV"}`;
  const url = cfg?.siteUrl || window.location.href;
  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    "_blank"
  );
}

function closePhoto() {
  photoOverlay.classList.add("hidden");
  controls.lock();
}

// ---------------------------------------------------------------------------
//  Stage transitions
// ---------------------------------------------------------------------------
function startTransitStage() {
  if (stage !== "poem") return;
  stage = "transit";
  canvas.classList.add("ready");
  spawnSparkles(sparkleBurst, pointerState.x, pointerState.y);
  poemOverlay.classList.add("unlocked");
  mainWorldGroup.visible = false;
  transitGroup.visible = true;
  transitHintEl.classList.add("ready");
  objectiveEl.textContent = "Drive into the gate.";
  showToast("Drive forward.");
  window.setTimeout(() => { poemOverlay.classList.remove("visible"); }, 1200);
}

function enterMainRoom() {
  if (stage !== "transit" && stage !== "cv-transition") return;
  stage = "main";
  transitGroup.visible = false;
  transitHintEl.classList.remove("ready");
  mainWorldGroup.visible = true;
  hudEl.classList.add("ready");
  crosshairEl.classList.add("ready");
  objectiveEl.textContent = "Explore the London map. Discover hidden objects.";

  const sp = WORLD_CONFIG.spawn;
  controls.getObject().position.set(sp.x, sp.y, sp.z);
  controls.lock();
  spawnSparkles(sparkleBurst, window.innerWidth * 0.5, window.innerHeight * 0.45);
  showToast("Welcome in.");

  if (controlsOverlay) {
    controlsOverlay.classList.remove("gone", "fade-out");
    window.setTimeout(dismissControls, 8000);
  }
  if (progressHud) { progressHud.classList.remove("gone"); progressHud.classList.add("ready"); }
  if (minimapCanvas) { minimapCanvas.classList.remove("gone"); minimapCanvas.classList.add("ready"); }
  if (speedrunHud) { speedrunHud.classList.remove("gone"); speedrunHud.classList.add("ready"); }
  if (themePicker) { themePicker.classList.remove("gone"); }
  restoreSavedTheme();
  speedrunStart = performance.now();
  if (challengeTime) {
    const cs = Math.floor(challengeTime / 1000);
    const cm = Math.floor(cs / 60);
    const csec = cs % 60;
    showToast(`Challenge: beat ${cm}:${csec.toString().padStart(2, "0")}!`);
  }
}

// ---------------------------------------------------------------------------
//  Interaction
// ---------------------------------------------------------------------------
function getInteractiveRoot(obj) {
  let n = obj;
  while (n) { if (n.userData?.name) return n; n = n.parent; }
  return null;
}

function updateFocus(objects) {
  if (stage !== "main") {
    activeObject = null;
    focusNameEl.textContent = "None";
    interactionTip.classList.remove("visible");
    return;
  }
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = raycaster.intersectObjects(objects, true)[0];
  if (!hit || !controls.isLocked) {
    activeObject = null;
    focusNameEl.textContent = "None";
    interactionTip.classList.remove("visible");
    return;
  }
  const root = getInteractiveRoot(hit.object);
  if (!root || hit.distance > 6.2) {
    activeObject = null;
    focusNameEl.textContent = "None";
    interactionTip.classList.remove("visible");
    return;
  }
  activeObject = root;
  focusNameEl.textContent = root.userData.name;
  interactionTip.classList.add("visible");
}

function interact() {
  if (stage !== "main" || !activeObject) return;
  const ud = activeObject.userData;
  const type = ud.interaction;

  switch (type) {
    case "viewer":
      openViewer(ud.viewerUrl, ud.name, { canMinimize: ud.viewerCanMinimize === true });
      break;
    case "share":
      openSharePanel(ud.shareConfig, ud.name);
      break;
    case "guestbook":
      openGuestbook();
      break;
    case "puzzle":
      openPuzzle(ud.puzzle);
      break;
    case "navigate":
      window.open(ud.navigateUrl, "_blank", "noopener,noreferrer");
      break;
    case "copylink":
      navigator.clipboard.writeText(WORLD_CONFIG.shareCard?.siteUrl || window.location.href).then(
        () => showToast("Link copied to clipboard!"),
        () => showToast("Could not copy link.")
      );
      break;
    case "qrcode":
      openQRCode();
      break;
    case "photomode":
      openPhotoMode();
      break;
    case "panel":
    default: {
      const c = ud.content;
      if (c?.bodyHtml) openPanel(c.bodyHtml);
      else if (c?.writing) openPanel(`<h2>${c.title || ud.name}</h2><p>${c.writing}</p>`);
      else openPanel(`<h2>${c?.title || ud.name}</h2><p>No details yet.</p>`);
      break;
    }
  }
  objectiveEl.textContent = `Opened: ${ud.name}`;
}

// ---------------------------------------------------------------------------
//  Movement
// ---------------------------------------------------------------------------
function getLondresSurfaceHeight(x, z) {
  if (!mainRoom.colliders?.length) return 0;
  londonCollisionRaycaster.set(new THREE.Vector3(x, 260, z), new THREE.Vector3(0, -1, 0));
  const hits = londonCollisionRaycaster.intersectObjects(mainRoom.colliders, true);
  if (!hits.length) return 0;
  return Math.max(0, hits[0].point.y);
}

function handleMovement(delta) {
  if (stage !== "main") return;
  velocity.x -= velocity.x * 8.8 * delta;
  velocity.z -= velocity.z * 8.8 * delta;
  direction.z = Number(move.forward) - Number(move.backward);
  direction.x = Number(move.right) - Number(move.left);
  direction.normalize();

  if (move.forward || move.backward) velocity.z -= direction.z * 25 * delta;
  if (move.left || move.right) velocity.x -= direction.x * 25 * delta;

  const pos = controls.getObject().position;
  const prevX = pos.x, prevZ = pos.z;

  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);

  const currentFeetY = pos.y - eyeHeight;
  const targetSurfaceY = getLondresSurfaceHeight(pos.x, pos.z);
  if (targetSurfaceY - currentFeetY > 0.6) { pos.x = prevX; pos.z = prevZ; }

  const groundY = getLondresSurfaceHeight(pos.x, pos.z);
  const minY = eyeHeight + groundY;

  if (jumpRequested && isGrounded) {
    verticalVelocity = 10.8;
    isGrounded = false;
    jumpsRemaining -= 1;
  } else if (jumpRequested && jumpsRemaining > 0) {
    verticalVelocity = 10.2;
    jumpsRemaining -= 1;
    isGrounded = false;
  }
  jumpRequested = false;

  verticalVelocity -= 14.5 * delta;
  pos.y += verticalVelocity * delta;
  if (pos.y < minY) {
    pos.y = minY;
    verticalVelocity = 0;
    isGrounded = true;
    jumpsRemaining = 2;
  } else {
    isGrounded = false;
  }

  pos.x = THREE.MathUtils.clamp(pos.x, -86, 86);
  pos.z = THREE.MathUtils.clamp(pos.z, -86, 86);
}

// ---------------------------------------------------------------------------
//  Create main room + systems
// ---------------------------------------------------------------------------
const mainRoom = createMainRoom(
  mainWorldGroup,
  (msg) => showToast(msg || "Model added."),
  (userData) => {
    if (userData.hiddenEasterEgg) {
      showToast(`SECRET FOUND: ${userData.name}!`);
    } else {
      progress?.increment(userData.name);
    }
    minimap?.markDiscovered(userData.key);
  }
);

buildTransitStage(transitGroup, transitState);
if (stage === "poem") {
  stylePoemTokens();
  setupPoemIntro(poemInput, () => stage, startTransitStage);
}

if (mainRoom.lights) {
  dayNightSys = createDayNightSystem(
    scene,
    mainRoom.lights.ambient,
    mainRoom.lights.directional,
    mainRoom.lights.starPoints,
    WORLD_CONFIG.dayNight
  );
}
weatherSys = createWeatherSystem(scene, WORLD_CONFIG.weather);
ghostSys = createGhostSystem(mainWorldGroup, getTerrainHeight, WORLD_CONFIG.ghosts);
minimap = createMinimap(minimapCanvas, WORLD_CONFIG.progress);
progress = createProgressTracker(
  progressText,
  progressRingFill,
  mainRoom.totalDiscoverable,
  () => {
    showToast("100% discovered! Generating your share card...");
    window.setTimeout(openShareCard, 1500);
  }
);

WORLD_OBJECTS.forEach(obj => {
  if (obj.discoverable && !obj.hiddenEasterEgg) {
    minimap?.addMarker(obj.id, obj.position.x, obj.position.z, obj.color, false);
  }
});

// ---------------------------------------------------------------------------
//  Theme system
// ---------------------------------------------------------------------------
let currentThemeIdx = 0;
const sakuraSys = createSakuraParticles(scene);

function buildThemeSwatches() {
  if (!themeOptions) return;
  themeOptions.innerHTML = "";
  THEMES.forEach((th, i) => {
    const el = document.createElement("div");
    el.className = "theme-swatch" + (i === currentThemeIdx ? " active" : "");
    el.style.backgroundColor = th.swatch;
    el.title = th.name;
    const lbl = document.createElement("span");
    lbl.className = "theme-swatch-label";
    lbl.textContent = th.name;
    el.appendChild(lbl);
    el.addEventListener("click", (e) => { e.stopPropagation(); applyTheme(i); });
    themeOptions.appendChild(el);
  });
}

function applyTheme(idx) {
  currentThemeIdx = idx;
  const th = THEMES[idx];
  const mat = createTerrainMaterial(th);
  mainRoom.setTerrainMaterial?.(mat);

  scene.background.set(th.sky);
  if (scene.fog) scene.fog.color.set(th.fog);

  if (dayNightSys) dayNightSys.paused = (th.id !== "london");

  if (th.particles === "sakura") { sakuraSys.show(); }
  else { sakuraSys.hide(); }

  themeOptions.querySelectorAll(".theme-swatch").forEach((el, i) => {
    el.classList.toggle("active", i === idx);
  });
  showToast(`Style: ${th.name}`);
  try { localStorage.setItem("oz_cv_theme", th.id); } catch { /* ignore */ }
}

function restoreSavedTheme() {
  try {
    const saved = localStorage.getItem("oz_cv_theme");
    if (saved) {
      const idx = THEMES.findIndex(t => t.id === saved);
      if (idx > 0) { applyTheme(idx); return; }
    }
  } catch { /* ignore */ }
}

buildThemeSwatches();

// ---------------------------------------------------------------------------
//  Init UI state
// ---------------------------------------------------------------------------
mainWorldGroup.visible = false;
poemOverlay?.classList.remove("visible", "unlocked");
canvas.classList.remove("ready");
hudEl.classList.remove("ready");
crosshairEl.classList.remove("ready");
transitHintEl.classList.remove("ready");
objectiveEl.textContent = "Open full CV to begin.";

function beginCvTransition() {
  if (stage !== "cv") return;
  stage = "cv-transition";
  cvEnterBtn?.setAttribute("disabled", "disabled");
  cvIntroOverlay?.classList.add("fading");
  window.setTimeout(() => {
    canvas.classList.add("ready");
    cvIntroOverlay?.classList.remove("visible");
    enterMainRoom();
  }, 700);
}

// ---------------------------------------------------------------------------
//  Animate
// ---------------------------------------------------------------------------
const _camDir = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const t = performance.now() * 0.001;

  if (stage === "main" && controls.isLocked) handleMovement(delta);
  if (stage === "transit") updateTransit(delta, transitState, move, camera, enterMainRoom);

  const playerPos = controls.getObject().position;
  mainRoom.tick(delta, t, playerPos);
  tickTerrainShader(t);
  sakuraSys.tick(delta, playerPos);
  updateFocus(mainRoom.objects);

  if (stage === "main") {
    dayNightSys?.tick(t);
    weatherSys?.tick(delta, t, playerPos);
    ghostSys?.tick(delta, t);

    camera.getWorldDirection(_camDir);
    const yaw = Math.atan2(_camDir.x, _camDir.z);
    minimap?.tick(playerPos, yaw);

    if (speedrunStart && speedrunTimeEl && !progress?.isComplete()) {
      speedrunTimeEl.textContent = getSpeedrunText();
    }
  }

  renderer.render(scene, camera);
}

// ---------------------------------------------------------------------------
//  Controls overlay
// ---------------------------------------------------------------------------
function dismissControls() {
  if (!controlsOverlay) return;
  controlsOverlay.classList.add("fade-out");
  window.setTimeout(() => controlsOverlay.classList.add("gone"), 600);
}

// ---------------------------------------------------------------------------
//  Input handlers
// ---------------------------------------------------------------------------
function anyOverlayOpen() {
  return (
    !panel.classList.contains("hidden") ||
    (viewerPanel && !viewerPanel.classList.contains("hidden") && !viewerPanel.classList.contains("mini-bar")) ||
    (guestbookPanel && !guestbookPanel.classList.contains("hidden")) ||
    (puzzleOverlay && !puzzleOverlay.classList.contains("hidden")) ||
    (shareOverlay && !shareOverlay.classList.contains("hidden")) ||
    (qrOverlay && !qrOverlay.classList.contains("hidden")) ||
    (photoOverlay && !photoOverlay.classList.contains("hidden"))
  );
}

document.addEventListener("keydown", (e) => {
  if (e.code === "ArrowUp" || e.code === "KeyW") move.forward = true;
  if (e.code === "ArrowDown" || e.code === "KeyS") move.backward = true;
  if (e.code === "ArrowLeft" || e.code === "KeyA") move.left = true;
  if (e.code === "ArrowRight" || e.code === "KeyD") move.right = true;
  if (e.code === "Space") { if (!e.repeat) jumpRequested = true; e.preventDefault(); }
  if (e.code.startsWith("Arrow")) e.preventDefault();
  if (stage === "main") dismissControls();

  if (e.code === "Enter") {
    if (viewerPanel && !viewerPanel.classList.contains("hidden") && !viewerPanel.classList.contains("mini-bar")) return closeViewer();
    if (!panel.classList.contains("hidden")) return closePanel();
    if (guestbookPanel && !guestbookPanel.classList.contains("hidden")) return closeGuestbook();
    if (puzzleOverlay && !puzzleOverlay.classList.contains("hidden")) return closePuzzle();
    if (shareOverlay && !shareOverlay.classList.contains("hidden")) return closeShareCard();
    if (qrOverlay && !qrOverlay.classList.contains("hidden")) return closeQR();
    if (photoOverlay && !photoOverlay.classList.contains("hidden")) return closePhoto();
    if (stage === "main" && controls.isLocked) interact();
  }
  if (e.code === "Escape") {
    if (viewerPanel && !viewerPanel.classList.contains("hidden") && !viewerPanel.classList.contains("mini-bar")) return closeViewer();
    if (!panel.classList.contains("hidden")) return closePanel();
    if (guestbookPanel && !guestbookPanel.classList.contains("hidden")) return closeGuestbook();
    if (puzzleOverlay && !puzzleOverlay.classList.contains("hidden")) return closePuzzle();
    if (shareOverlay && !shareOverlay.classList.contains("hidden")) return closeShareCard();
    if (qrOverlay && !qrOverlay.classList.contains("hidden")) return closeQR();
    if (photoOverlay && !photoOverlay.classList.contains("hidden")) return closePhoto();
  }
});

document.addEventListener("keyup", (e) => {
  if (e.code === "ArrowUp" || e.code === "KeyW") move.forward = false;
  if (e.code === "ArrowDown" || e.code === "KeyS") move.backward = false;
  if (e.code === "ArrowLeft" || e.code === "KeyA") move.left = false;
  if (e.code === "ArrowRight" || e.code === "KeyD") move.right = false;
});

closePanelBtn.addEventListener("click", closePanel);
closeViewerPanelBtn?.addEventListener("click", closeViewer);
minifyViewerPanelBtn?.addEventListener("click", minimizeViewer);
expandViewerPanelBtn?.addEventListener("click", expandViewer);

guestbookPanel?.querySelector("#close-guestbook")?.addEventListener("click", closeGuestbook);
guestbookPanel?.querySelector("#gb-submit")?.addEventListener("click", submitGuestbookEntry);
puzzleOverlay?.querySelector("#puzzle-close")?.addEventListener("click", closePuzzle);
shareOverlay?.querySelector("#share-close")?.addEventListener("click", closeShareCard);
shareOverlay?.querySelector("#share-download")?.addEventListener("click", downloadShareCard);
shareOverlay?.querySelector("#share-x-btn")?.addEventListener("click", shareCardOnX);
shareOverlay?.querySelector("#share-challenge")?.addEventListener("click", challengeFriend);
qrOverlay?.querySelector("#qr-close")?.addEventListener("click", closeQR);
photoOverlay?.querySelector("#photo-close")?.addEventListener("click", closePhoto);
photoOverlay?.querySelector("#photo-download")?.addEventListener("click", downloadPhoto);
photoOverlay?.querySelector("#photo-share-x")?.addEventListener("click", sharePhotoOnX);

canvas.addEventListener("click", () => {
  if (stage === "main" && !controls.isLocked && !anyOverlayOpen()) controls.lock();
});

const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini/i.test(navigator.userAgent)
  || (navigator.maxTouchPoints > 1 && !window.matchMedia("(pointer:fine)").matches);

if (isMobile && cvEnterBtn) {
  cvEnterBtn.disabled = true;
  cvEnterBtn.textContent = "Desktop Only";
  cvEnterBtn.style.opacity = "0.45";
  cvEnterBtn.style.cursor = "not-allowed";
  const hint = document.querySelector(".cv-hint");
  if (hint) hint.textContent = "Open on a computer to explore the interactive version.";
} else {
  cvEnterBtn?.addEventListener("click", beginCvTransition);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

controls.addEventListener("unlock", () => {
  if (stage === "main" && !anyOverlayOpen()) showToast("Click in scene to continue.");
});

document.addEventListener("pointermove", (e) => {
  pointerState.x = e.clientX;
  pointerState.y = e.clientY;
});

document.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (stage === "main") dismissControls();
  if (stage === "main" && controls.isLocked) interact();
});

animate();
