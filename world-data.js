// ============================================================================
//  WORLD-DATA.JS  —  Single source of truth for the entire 3D CV experience
// ============================================================================
//
//  HOW TO ADD A NEW OBJECT:
//    1. Add an entry to WORLD_OBJECTS below
//    2. If it's an STL model, drop the .stl file in /assets/
//    3. Hard-refresh. The engine reads this file and builds everything.
//
//  HOW TO ADD A NEW FEATURE to an object:
//    - "interaction": controls what happens on Enter/click
//    - "content": the HTML/text shown in panels
//    - "puzzle": config for interactive puzzles
//    - "viewerUrl": opens an embedded iframe viewer
//    - "shareConfig": turns the object into a share button
//
// ============================================================================

// ---------------------------------------------------------------------------
//  WORLD CONFIG  — global settings for the experience
// ---------------------------------------------------------------------------
export const WORLD_CONFIG = {
  // Player
  spawn: { x: 0, y: 10, z: 5 },

  // London terrain
  terrain: {
    stlPath: "./assets/Londres.stl",
    targetSize: 175,
    color: 0x7aa5d6,
    roughness: 0.62,
    metalness: 0.1,
  },

  // Day / night cycle
  dayNight: {
    enabled: true,
    cycleDurationSec: 180,            // full day→night→day in 3 minutes
    dayAmbientColor: 0x95b3df,
    dayAmbientIntensity: 0.35,
    nightAmbientColor: 0x0a1838,
    nightAmbientIntensity: 0.12,
    daySkyColor: 0x071124,
    nightSkyColor: 0x010409,
    dayFogNear: 12,
    dayFogFar: 130,
    nightFogNear: 6,
    nightFogFar: 80,
  },

  // Weather
  weather: {
    enabled: true,
    rainProbability: 0.35,            // chance of rain per cycle
    particleCount: 4000,
    rainColor: 0xaaccff,
    rainOpacity: 0.35,
    fogDensityMultiplier: 1.6,        // fog thickens during rain
  },

  // Ghost visitors (simulated presence)
  ghosts: {
    enabled: true,
    count: 8,                         // how many ghosts wander the map
    color: 0x5599cc,
    opacity: 0.18,
    speed: 1.8,
    heightOffset: 1.7,
  },

  // Progress / discovery
  progress: {
    showCounter: true,                // "4 / 14 discovered"
    showMinimap: true,
    minimapSize: 140,                 // px
    minimapBeaconDotSize: 4,
    completionReward: "shareCard",    // what happens at 100%
  },

  // Guestbook
  guestbook: {
    enabled: true,
    position: { x: -8, z: -12 },     // a wall on the map
    maxMessages: 200,
    storageKey: "oz_cv_guestbook",    // localStorage key (or future API)
  },

  // Share card (generated on 100% completion)
  shareCard: {
    enabled: true,
    title: "I explored every corner of Oz Kilim's 3D London CV",
    hashtag: "#InteractiveCV",
    siteUrl: "https://ozkilim.com",
    bgColor: "#030711",
    accentColor: "#57e6ff",
  },

  // Audio
  audio: {
    ambientEnabled: true,
    discoveryChimePath: null,         // optional: "./assets/audio/chime.mp3"
    footstepPath: null,               // optional: "./assets/audio/step.mp3"
  },
};

// ---------------------------------------------------------------------------
//  WORLD OBJECTS  — every discoverable / interactable thing on the map
// ---------------------------------------------------------------------------
//
//  Fields:
//    id            (string)   unique key
//    name          (string)   display name (shown in label + HUD)
//    category      (string)   "cv" | "project" | "social" | "fun" | "meta"
//
//  Visual:
//    type          (string)   "stl" | "geometry" | "puzzle"
//    stlPath       (string)   path to .stl file (for type "stl")
//    shape         (string)   "column"|"cube"|"icosa"|"torus"|"poster"|"sphere"|"dodeca"
//    color         (hex)      primary color
//    emissive      (hex)      emissive glow color
//    emissiveIntensity (num)  0–1
//    roughness     (num)      PBR roughness
//    metalness     (num)      PBR metalness
//    targetSize    (num)      scale to fit this bounding-box size
//    rotation      (obj)      { x, y, z } in radians
//    spinSpeed     (num)      auto-rotate speed (0 = no spin)
//
//  Placement:
//    position      (obj)      { x, z } — Y is computed from terrain
//    yOffset       (num)      height above terrain surface
//    placeOnTerrain (bool)    snap to London STL surface
//
//  Discovery:
//    discoverable  (bool)     hidden until player is close
//    revealRadius  (num)      distance to reveal
//    beaconColor   (hex)      glow beacon color (defaults to color)
//
//  Interaction:
//    interaction   (string)   "panel"|"viewer"|"share"|"puzzle"|"navigate"
//    viewerUrl     (string)   URL for embedded viewer
//    viewerCanMinimize (bool) allow minimizing viewer
//    navigateUrl   (string)   opens URL in new tab
//    shareConfig   (obj)      { platform, url, text }
//    puzzle        (obj)      { type: "unknot" | "jigsaw" | ... , config: {} }
//
//  Content (shown in panel):
//    content.title     (string)
//    content.writing   (string)  personal note paragraph
//    content.bodyHtml  (string)  rich HTML body
//
// ---------------------------------------------------------------------------
export const WORLD_OBJECTS = [

  // ========================  ALWAYS VISIBLE (spawn area)  ==================

  {
    id: "radcliffe-camera",
    name: "Radcliffe Camera",
    category: "cv",
    type: "stl",
    stlPath: "./assets/models/radcliffe-camera/JC_Workshop/radcliffe-camera/RadCamV1.2_Medium.stl",
    color: 0xbecde3,
    roughness: 0.72,
    metalness: 0.12,
    targetSize: 8,
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
    position: { x: 0, z: -5 },
    yOffset: 0.4,
    placeOnTerrain: true,
    hasBase: true,
    discoverable: false,
    revealRadius: 0,
    interaction: "panel",
    content: {
      title: "Radcliffe Camera (3D Scan)",
      writing:
        "I completed my undergraduate and master's degrees at Oxford, where I worked in the laboratories of Justin Benesch and Dame Carol Robinson. My research focused on small heat shock proteins, using gas-phase HDX and ion mobility to study their surface chemistry and chaperone function. Alongside my studies, I was a member of the varsity judo team.",
      bodyHtml: `
        <h2>Radcliffe Camera (3D Scan)</h2>
        <p>Rendered from <code>RadCamV1.2_Medium.stl</code> and placed in the room as an architectural centerpiece.</p>
      `,
    },
  },

  // ========================  CV SECTIONS (geometry shapes)  ================

  {
    id: "education",
    name: "Education",
    category: "cv",
    type: "geometry",
    shape: "column",
    color: 0xb8a9ff,
    position: { x: 30, z: -35 },
    yOffset: 1.5,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 20,
    interaction: "panel",
    content: {
      title: "Education",
      writing:
        "I completed my undergraduate and master's degrees at Oxford, where I worked in the laboratories of Justin Benesch and Dame Carol Robinson. My research focused on small heat shock proteins, using gas-phase HDX and ion mobility to study their surface chemistry and chaperone function. Alongside my studies, I was a member of the varsity judo team.",
      bodyHtml: `
        <h2>Education</h2>
        <ul>
          <li><strong>Harvard Medical School / Boston Children's Hospital (current):</strong> Computational Health Informatics Program, Postdoctoral research fellow</li>
          <li><strong>Eotvos Lorand University (2025):</strong> PhD in Physics, summa cum laude</li>
          <li><strong>University of Oxford (2018):</strong> MChem, Biophysical Chemistry</li>
          <li><strong>Harvard University / Boston Children's Hospital (2016):</strong> Immunology laboratory research with Prof. Talal Chatila</li>
        </ul>
      `,
    },
  },

  {
    id: "experience",
    name: "Experience",
    category: "cv",
    type: "geometry",
    shape: "cube",
    color: 0xffc28a,
    position: { x: -40, z: 30 },
    yOffset: 1.5,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 20,
    interaction: "panel",
    content: {
      title: "Experience",
      writing:
        "I enjoy building systems that are useful in real settings, from national-scale healthcare workflows to high-stakes research environments.",
      bodyHtml: `
        <h2>Experience</h2>
        <ul>
          <li><strong>Research Scientist, Semmelweis University (2023):</strong> managed multi-hospital oncology data for national AI mammography screening program</li>
          <li><strong>Research Scientist, IDF (2020):</strong> national security projects using statistical physics, signal processing, deep learning</li>
          <li><strong>Project Manager, ARDC (2018):</strong> launched coding boot-camp initiative for refugees</li>
        </ul>
      `,
    },
  },

  {
    id: "awards",
    name: "Awards",
    category: "cv",
    type: "geometry",
    shape: "icosa",
    color: 0xffa7da,
    position: { x: 25, z: 50 },
    yOffset: 1.5,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 20,
    interaction: "panel",
    content: {
      title: "Awards",
      writing:
        "These milestones reflect teamwork as much as individual contribution, and each one opened a new direction for translational impact.",
      bodyHtml: `
        <h2>Awards</h2>
        <ul>
          <li><strong>Microsoft + OCRA Grant (2025):</strong> ML approaches to predict and overcome ovarian cancer treatment resistance</li>
          <li><strong>Nightingale Winner (2023):</strong> deep learning Breast Cancer Histopathology Staging competition</li>
          <li><strong>Duke of Edinburgh Gold Award (2013):</strong> presented at St. James's Palace, London</li>
        </ul>
      `,
    },
  },

  {
    id: "unknotting-problem",
    name: "Unknotting Problem",
    category: "project",
    type: "geometry",
    shape: "torus",
    color: 0x9ee7ff,
    position: { x: -45, z: -45 },
    yOffset: 1.5,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 20,
    interaction: "puzzle",
    puzzle: {
      type: "unknot",
      difficulty: "medium",
      description: "Drag crossings to simplify the knot. Can you unknot it?",
    },
    content: {
      title: "Unknotting Problem",
      writing:
        "I first encountered the unknotting problem in the Department of Complex Systems under Professor István Csabai. It grabbed me instantly — a deceptively simple question that opens doors into topology, complexity theory, and algorithm design all at once. I've been playing with diffusion models for knot simplification and have a stack of half-baked ideas I keep coming back to. It's the kind of problem you can attack from pure maths, physics, or deep learning, and I love that versatility.",
      bodyHtml: `
        <h2>Unknotting Problem</h2>
        <p>Given a diagram of a knot, can you determine whether it's really just a tangled-up circle? That's the unknotting problem — and whether it admits a polynomial-time algorithm remains one of the great open questions in computational topology.</p>
        <p>I'm exploring generative approaches — including diffusion models — to learn knot-simplification moves directly from data. It's a playground where geometry, combinatorics, and machine learning collide.</p>
        <p>Read more: <a href="https://en.wikipedia.org/wiki/Unknotting_problem" target="_blank" rel="noreferrer">Wikipedia</a></p>
      `,
    },
  },

  {
    id: "publications",
    name: "Publications",
    category: "cv",
    type: "geometry",
    shape: "poster",
    color: 0xffffff,
    position: { x: 50, z: -15 },
    yOffset: 2.8,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 20,
    interaction: "panel",
    content: {
      title: "Publications",
      writing:
        "I care most about papers that do more than benchmark performance — they should offer biological insight and a path toward better decisions in care.",
      bodyHtml: `
        <h2>Publications</h2>

        <p><strong>1. Histopathology and proteomics are synergistic for high-grade serous ovarian cancer platinum response prediction</strong><br/>
        <em>npj Precision Oncology</em> (2025)<br/>
        <a href="https://www.nature.com/articles/s41698-025-00808-w" target="_blank" rel="noreferrer">Read paper</a></p>

        <p><strong>2. From Cosmos to Clinic: Spatial Statistics for Histopathology</strong><br/>
        <em>ICCV Workshop 2025</em>, pp. 922–929, IEEE/CVF<br/>
        Authors: Attila Barna, Oz Kilim, István Csabai<br/>
        <a href="https://scholar.google.com/citations?user=DtBgwP8AAAAJ" target="_blank" rel="noreferrer">Google Scholar</a></p>

        <p><strong>3. Transfer Learning May Explain Pigeons' Ability to Detect Cancer in Histopathology</strong><br/>
        <em>Bioinspiration &amp; Biomimetics</em>, 19 (2024) 056016<br/>
        Authors: Oz Kilim, János Báskay, András Biricz, Zsolt Bedőházi, Péter Pollner, István Csabai<br/>
        <a href="https://iopscience.iop.org/article/10.1088/1748-3190/ad6825" target="_blank" rel="noreferrer">Read paper (IOPscience)</a></p>

        <p><strong>4. SARS-CoV-2 Receptor-Binding Domain Deep Mutational AlphaFold2 Structures</strong><br/>
        <em>Scientific Data</em> (Nature), Vol. 10, Article 134 (2023)<br/>
        Authors: Oz Kilim, Anikó Mentes, Balázs Pál, István Csabai, Ákos Gellért<br/>
        <a href="https://www.nature.com/articles/s41597-023-02035-z" target="_blank" rel="noreferrer">Read paper (Nature Scientific Data)</a></p>

        <iframe class="paper-frame" title="Publication PDF" src="/papers/s41698-025-00808-w.pdf#page=1&zoom=page-width"></iframe>
      `,
    },
  },

  // ========================  STL MODELS (projects / links)  ================

  {
    id: "github",
    name: "GitHub",
    category: "social",
    type: "stl",
    stlPath: "./assets/GitHubLogo.stl",
    color: 0x9fb7ff,
    emissive: 0x1a2f63,
    emissiveIntensity: 0.25,
    roughness: 0.42,
    metalness: 0.35,
    targetSize: 2.8,
    position: { x: -15, z: 55 },
    yOffset: 1.1,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 16,
    interaction: "panel",
    content: {
      title: "GitHub",
      writing:
        "This is where some of my work lives — always growing, always a work in progress. If anything catches your eye, I'm always open to collaborations.",
      bodyHtml: `
        <p>Browse my repositories and see what I've been building:</p>
        <p><a href="https://github.com/ozkilim" target="_blank" rel="noreferrer">github.com/ozkilim</a></p>
      `,
    },
  },

  {
    id: "harvard",
    name: "Harvard / CHIP",
    category: "cv",
    type: "stl",
    stlPath: "./assets/harvard.stl",
    color: 0xffc7c7,
    emissive: 0x5a1f28,
    emissiveIntensity: 0.22,
    roughness: 0.45,
    metalness: 0.25,
    targetSize: 3.2,
    rotation: { x: 0, y: Math.PI, z: 0 },
    position: { x: 45, z: 35 },
    yOffset: 1.05,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 18,
    interaction: "panel",
    content: {
      title: "Harvard / CHIP",
      writing:
        "I'm a postdoctoral research fellow at the Computational Health Informatics Program (CHIP), Boston Children's Hospital, Harvard Medical School. My work focuses on building multimodal AI models that integrate histopathology, proteomics, and clinical data to better understand cancer phenotypes. The goal is always the same — help patients by turning complex data into actionable insight.",
      bodyHtml: null,
    },
  },

  {
    id: "fruit-fly",
    name: "Fruit Fly Model",
    category: "project",
    type: "stl",
    stlPath: "./assets/fly.stl",
    color: 0xffe7a8,
    emissive: 0x5a4516,
    emissiveIntensity: 0.25,
    roughness: 0.38,
    metalness: 0.18,
    targetSize: 2.4,
    rotation: { x: Math.PI / 2, y: Math.PI * 0.25, z: Math.PI / 2 },
    position: { x: -55, z: -10 },
    yOffset: 5.8,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 18,
    interaction: "panel",
    content: {
      title: "The Buzz on Wall Street",
      writing:
        "This piece was inspired by my time working alongside multi-strategy hedge funds. I kept noticing how the smartest quants were reinventing wheels that biology solved long ago. So I asked: what if a fruit fly's foraging algorithm could trade? The result is a fun, hopefully thought-provoking read about finding financial solutions in unexpected places.",
      bodyHtml: `
        <p><strong>The Buzz on Wall Street:</strong> How a Fruit Fly Outsmarted the Market</p>
        <p><a href="https://medium.com/@oz.kilim/the-buzz-on-wall-street-how-a-fruit-fly-outsmarted-the-market-4a2a2bd28c7e" target="_blank" rel="noreferrer">Read on Medium</a></p>
      `,
    },
  },

  {
    id: "path-oracle",
    name: "PATH-ORACLE",
    category: "project",
    type: "stl",
    stlPath: "./assets/path.stl",
    color: 0xb8ffe1,
    emissive: 0x1b5a45,
    emissiveIntensity: 0.2,
    roughness: 0.36,
    metalness: 0.22,
    targetSize: 3.0,
    rotation: { x: -Math.PI / 2, y: -Math.PI / 22.5, z: 0 },
    position: { x: 35, z: -55 },
    yOffset: 1.15,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 16,
    interaction: "viewer",
    viewerUrl:
      "https://www.cycif.org/data/lin-wang-coy-2021/viz.html#s=0#w=0#g=0&m=-1#a=-100_-100#v=1_0.4819_0.5#o=-100_-100_1_1#p=Q",
    content: {
      title: "PATH-ORACLE",
      writing:
        "This project came out of a collaboration with the Francis Crick Institute in London. During my visit, I worked on validating a multimodal biomarker for early-stage lung cancer recurrence. It's still a work in progress — we're assembling more patient cohorts to strengthen the validation — but the early results are promising and the clinical need is real.",
      bodyHtml: `
        <h3>PATH-ORACLE</h3>
        <p>A multimodal deep learning biomarker for stage I lung adenocarcinoma that predicts recurrence. Developed in collaboration with the <strong>Francis Crick Institute</strong>, London.</p>
        <p>We are currently assembling additional cohorts for extended biomarker validation.</p>
        <p><a href="https://www.cycif.org/data/lin-wang-coy-2021/viz.html#s=0#w=0#g=0&m=-1#a=-100_-100#v=1_0.4819_0.5#o=-100_-100_1_1#p=Q" target="_blank" rel="noreferrer">Open pathology slide viewer</a></p>
      `,
    },
  },

  {
    id: "coffee",
    name: "Coffee",
    category: "fun",
    type: "stl",
    stlPath: "./assets/Coffee.stl",
    color: 0xd7b388,
    emissive: 0x3b2a18,
    emissiveIntensity: 0.18,
    roughness: 0.58,
    metalness: 0.12,
    targetSize: 2.8,
    rotation: { x: -Math.PI / 2, y: Math.PI * 0.2, z: 0 },
    position: { x: -35, z: -55 },
    yOffset: 0.95,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 14,
    interaction: "panel",
    content: {
      title: "Coffee",
      writing:
        "Possibly humanity's greatest invention. Every good idea I've ever had started with a cup of coffee — and most of the bad ones too. If you're reading this, go make yourself one. You've earned it.",
      bodyHtml: null,
    },
  },

  {
    id: "portrait-painting",
    name: "Portrait Painting",
    category: "fun",
    type: "stl",
    stlPath: "./assets/art.stl",
    color: 0xf7d8bc,
    emissive: 0x4a2f24,
    emissiveIntensity: 0.12,
    roughness: 0.52,
    metalness: 0.08,
    targetSize: 3.6,
    rotation: { x: Math.PI / 24, y: Math.PI / 1.8, z: 0 },
    spinSpeed: 0.22,
    position: { x: 55, z: 10 },
    yOffset: 1.7,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 14,
    interaction: "viewer",
    viewerUrl: "https://ozkilim.com",
    content: {
      title: "Portrait Painting",
      writing:
        "I paint portraits in oil on commission. It's something I do rarely these days, but I still love it. If you're interested, check out my website and get in touch — I'm always happy to have a conversation about a piece.",
      bodyHtml: `
        <h2>Oil Portraits</h2>
        <p>I take on the occasional commission for oil portrait painting. Currently doing these rarely, but always open to a chat.</p>
        <p><a href="https://ozkilim.com" target="_blank" rel="noreferrer">See my work &amp; get in touch</a></p>
      `,
    },
  },

  {
    id: "electric-guitar",
    name: "Oz and Yon (Spotify)",
    category: "fun",
    type: "stl",
    stlPath: "./assets/Electric Guitar.stl",
    color: 0xb9c7ff,
    emissive: 0x25336a,
    emissiveIntensity: 0.18,
    roughness: 0.35,
    metalness: 0.22,
    targetSize: 4.1,
    rotation: { x: Math.PI / 12, y: -Math.PI / 3, z: 0 },
    position: { x: 6, z: 15 },
    yOffset: 1.35,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 16,
    interaction: "viewer",
    viewerUrl:
      "https://open.spotify.com/embed/artist/3OlXDXzWU8ewTcL1Mo22RJ?utm_source=generator&theme=0",
    viewerCanMinimize: true,
    content: {
      title: "Oz and Yon on Spotify",
      writing:
        "Check out our music! Hit play, then minimise the player and keep listening while you explore the rest of the world.",
      bodyHtml: `
        <h2>Oz and Yon</h2>
        <p>Open up Spotify and keep the music going while you wander. Minimise the player to keep exploring with a soundtrack.</p>
        <p><a href="https://open.spotify.com/artist/3OlXDXzWU8ewTcL1Mo22RJ" target="_blank" rel="noreferrer">Open in Spotify</a></p>
      `,
    },
  },

  {
    id: "share-on-x",
    name: "Share on X",
    category: "social",
    type: "stl",
    stlPath: "./assets/TwitterNewLogo_X.stl",
    color: 0xd9e6ff,
    emissive: 0x1a3f7a,
    emissiveIntensity: 0.18,
    roughness: 0.28,
    metalness: 0.42,
    targetSize: 2.7,
    rotation: { x: Math.PI / 2, y: Math.PI / 2, z: 0 },
    position: { x: -10, z: 65 },
    yOffset: 1.0,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 16,
    interaction: "share",
    shareConfig: {
      platform: "x",
      url: "https://ozkilim.com",
      text: "I just explored this interactive 3D portfolio by Oz Kilim and it is wild. Worth checking out.",
    },
    content: {
      title: "Share on X",
      writing: null,
      bodyHtml: null,
    },
  },

  // ========================  PUBLICATIONS (extra papers)  ==================

  {
    id: "iccv-cosmos-clinic",
    name: "ICCVW 2025 Paper",
    category: "project",
    type: "geometry",
    shape: "dodeca",
    color: 0xffe97a,
    emissive: 0x5a4400,
    emissiveIntensity: 0.28,
    roughness: 0.32,
    metalness: 0.18,
    position: { x: 70, z: -55 },
    yOffset: 1.5,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 20,
    interaction: "panel",
    content: {
      title: "From Cosmos to Clinic (ICCVW 2025)",
      writing:
        "Presented at ICCV Workshop 2025 in Hawaii. We showed that spatial statistics borrowed from cosmology — tools designed to analyse the large-scale structure of the universe — can be repurposed to extract prognostic signals from tumour tissue. A direct bridge from astrophysics to pathology.",
      bodyHtml: `
        <h2>From Cosmos to Clinic</h2>
        <p><strong>Venue:</strong> ICCV Workshop 2025, pp. 922–929 — <em>IEEE/CVF International Conference on Computer Vision</em></p>
        <p><strong>Authors:</strong> Attila Barna, Oz Kilim, István Csabai</p>
        <p>We applied interpretable spatial statistics — originally developed for mapping the cosmos — to histopathology whole-slide images. The resulting features provide robust, human-interpretable prognostic signals for cancer outcome prediction.</p>
        <p><a href="https://scholar.google.com/citations?user=DtBgwP8AAAAJ" target="_blank" rel="noreferrer">View on Google Scholar</a></p>
      `,
    },
  },

  {
    id: "pigeon-cancer",
    name: "Pigeon Paper",
    category: "project",
    type: "geometry",
    shape: "sphere",
    color: 0xd4c8b8,
    emissive: 0x3a3228,
    emissiveIntensity: 0.2,
    roughness: 0.55,
    metalness: 0.08,
    spinSpeed: 0.18,
    position: { x: -25, z: 72 },
    yOffset: 1.5,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 18,
    interaction: "panel",
    content: {
      title: "Can Pigeons Detect Cancer?",
      writing:
        "Pigeons have famously been shown to classify cancer in histopathology images nearly as well as trained pathologists. But why? We modelled their visual experience during flight using self-supervised pre-training on aerial imagery, and showed that this 'bird's-eye view' transfer learning closely reproduces their performance — explaining a decade-old mystery.",
      bodyHtml: `
        <h2>Transfer Learning May Explain Pigeons' Ability to Detect Cancer in Histopathology</h2>
        <p><strong>Journal:</strong> <em>Bioinspiration &amp; Biomimetics</em>, 19 (2024) 056016</p>
        <p><strong>Authors:</strong> Oz Kilim, János Báskay, András Biricz, Zsolt Bedőházi, Péter Pollner, István Csabai</p>
        <p>We trained a CNN with self-supervised learning on <strong>BirdsEyeViewNet</strong> — a large-scale aerial imagery dataset simulating a pigeon's flight view — and applied it to the same breast histopathology and mammography tasks given to pigeons in the original study. The model closely matched pigeon performance, suggesting transfer learning from aerial views is the mechanism behind their surprising diagnostic ability.</p>
        <p><a href="https://iopscience.iop.org/article/10.1088/1748-3190/ad6825" target="_blank" rel="noreferrer">Read the paper (IOPscience)</a></p>
      `,
    },
  },

  {
    id: "alphafold-covid",
    name: "AlphaFold COVID Paper",
    category: "project",
    type: "geometry",
    shape: "icosa",
    color: 0x7affd4,
    emissive: 0x0a4a35,
    emissiveIntensity: 0.25,
    roughness: 0.3,
    metalness: 0.22,
    spinSpeed: 0.12,
    position: { x: -70, z: -28 },
    yOffset: 1.5,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 18,
    interaction: "panel",
    content: {
      title: "SARS-CoV-2 AlphaFold2 Structures (Nature Scientific Data)",
      writing:
        "We used AlphaFold2 to predict the 3D structure of every single point mutation across all 7 major SARS-CoV-2 lineages' spike protein receptor-binding domain — 26,733 PDB structures in total. The dataset is freely available and designed to accelerate ML-driven virology research.",
      bodyHtml: `
        <h2>SARS-CoV-2 Receptor-Binding Domain Deep Mutational AlphaFold2 Structures</h2>
        <p><strong>Journal:</strong> <em>Scientific Data</em> (Nature), Vol. 10, Article 134 (2023)</p>
        <p><strong>Authors:</strong> Oz Kilim, Anikó Mentes, Balázs Pál, István Csabai, Ákos Gellért</p>
        <p>A complete curated dataset of all single mutations across 7 main SARS-CoV-2 lineages' spike protein RBD — <strong>26,733 PDB structures</strong> predicted with AlphaFold2. We show that AF2 pLDDT confidence scores correlate with structural disorder, enabling ML models to predict mutant phenotypes from structure alone.</p>
        <p><a href="https://www.nature.com/articles/s41597-023-02035-z" target="_blank" rel="noreferrer">Read the paper (Nature Scientific Data)</a></p>
      `,
    },
  },

  // ========================  META OBJECTS (guestbook, etc.)  ================

  {
    id: "guestbook",
    name: "Guestbook Wall",
    category: "meta",
    type: "geometry",
    shape: "cube",
    color: 0xffeebb,
    position: { x: -8, z: -12 },
    yOffset: 1.5,
    placeOnTerrain: true,
    discoverable: false,
    revealRadius: 0,
    interaction: "guestbook",
    content: {
      title: "Guestbook",
      writing: "Leave a mark. Others will see it too.",
      bodyHtml: null,
    },
  },

  // ========================  SHARING OBJECTS  ===============================

  {
    id: "linkedin-share",
    name: "LinkedIn",
    category: "social",
    type: "geometry",
    shape: "cube",
    color: 0x0a66c2,
    position: { x: -25, z: 20 },
    yOffset: 1.5,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 18,
    interaction: "share",
    shareConfig: {
      platform: "linkedin",
      url: "https://ozkilim.com",
      text: "This is the most creative CV I've ever seen — a full 3D London you walk through to discover research, projects, and more.",
    },
    content: {
      title: "Share on LinkedIn",
      writing: null,
      bodyHtml: null,
    },
  },

  {
    id: "copy-link",
    name: "Copy Link",
    category: "social",
    type: "geometry",
    shape: "sphere",
    color: 0xc0c8d8,
    position: { x: 20, z: -20 },
    yOffset: 1.5,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 16,
    interaction: "copylink",
    content: {
      title: "Copy Link",
      writing: "The fastest way to share — one click, link on your clipboard.",
      bodyHtml: null,
    },
  },

  {
    id: "whatsapp-share",
    name: "WhatsApp Share",
    category: "social",
    type: "geometry",
    shape: "dodeca",
    color: 0x25d366,
    position: { x: 60, z: 55 },
    yOffset: 1.5,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 16,
    interaction: "share",
    shareConfig: {
      platform: "whatsapp",
      url: "https://ozkilim.com",
      text: "You have to see this — it's a 3D interactive CV set in London. Walk around and discover research, music, art, and more.",
    },
    content: {
      title: "Share via WhatsApp",
      writing: null,
      bodyHtml: null,
    },
  },

  {
    id: "qr-monument",
    name: "QR Code Monument",
    category: "social",
    type: "geometry",
    shape: "column",
    color: 0xeeeeff,
    position: { x: 0, z: -65 },
    yOffset: 1.5,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 18,
    interaction: "qrcode",
    content: {
      title: "QR Code",
      writing: "Show this at a conference — others can scan to enter the world.",
      bodyHtml: null,
    },
  },

  // ========================  GAMIFICATION  ==================================

  {
    id: "photo-booth",
    name: "Photo Booth",
    category: "fun",
    type: "geometry",
    shape: "column",
    color: 0xcc66ff,
    position: { x: -20, z: -38 },
    yOffset: 1.5,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 16,
    interaction: "photomode",
    content: {
      title: "Photo Booth",
      writing: "Take a branded selfie in the 3D world and download or share it.",
      bodyHtml: null,
    },
  },

  {
    id: "hire-me",
    name: "Get in Touch",
    category: "meta",
    type: "geometry",
    shape: "icosa",
    color: 0xff6644,
    position: { x: 38, z: 15 },
    yOffset: 1.8,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 20,
    interaction: "panel",
    content: {
      title: "Get in Touch",
      writing: "Want to chat? I'd love to hear from you.",
      bodyHtml: `
        <h2>Get in Touch</h2>
        <p>Drop me a line — always happy to have a conversation.</p>
        <div style="display:flex;flex-wrap:wrap;gap:0.6rem;margin-top:1rem;">
          <a href="mailto:ozsamkilim@gmail.com" target="_blank" rel="noreferrer"
            style="display:inline-block;padding:0.5rem 0.9rem;border:1px solid #ff6644;border-radius:8px;color:#ff6644;">
            Email Me
          </a>
          <a href="https://www.linkedin.com/in/ozkilim/" target="_blank" rel="noreferrer"
            style="display:inline-block;padding:0.5rem 0.9rem;border:1px solid #0a66c2;border-radius:8px;color:#8db8ff;">
            LinkedIn
          </a>
        </div>
      `,
    },
  },

  // ========================  CONTENT  ======================================

  {
    id: "how-i-built-this",
    name: "How I Built This",
    category: "meta",
    type: "geometry",
    shape: "torus",
    color: 0x44ff88,
    position: { x: 62, z: -38 },
    yOffset: 1.5,
    placeOnTerrain: true,
    discoverable: true,
    revealRadius: 16,
    interaction: "panel",
    content: {
      title: "How I Built This",
      writing: "I build things I enjoy and hope they can bring others a bit of joy too. This project was no different.",
      bodyHtml: `
        <h2>How I Built This</h2>
        <p><strong>Stack:</strong> Three.js, vanilla JS, no framework, no build step.</p>
        <p><strong>Terrain:</strong> London STL map rendered as a 3D surface with raycasting for player collision and object placement.</p>
        <p><strong>Features:</strong> Day/night cycle, rain storms, ghost visitors, minimap, progress tracking, guestbook, graph puzzle, share card — all pure frontend, zero backend.</p>
        <p><strong>Data-driven:</strong> Every object lives in <code>world-data.js</code>. Add an entry, refresh, done.</p>
        <p><strong>Time to build:</strong> A few intense sessions with AI pair-programming.</p>
        <p><a href="https://github.com/ozkilim" target="_blank" rel="noreferrer">See the code on GitHub</a></p>
      `,
    },
  },


  // ========================  HIDDEN EASTER EGGS  ===========================
  // These are discoverable but NOT counted in the main progress total.
  // Finding them triggers a special toast. People will talk about these.

  {
    id: "easter-judo",
    name: "Black Belt",
    category: "fun",
    type: "geometry",
    shape: "sphere",
    color: 0x111111,
    position: { x: -72, z: -62 },
    yOffset: 0.6,
    placeOnTerrain: true,
    discoverable: true,
    hiddenEasterEgg: true,
    revealRadius: 8,
    interaction: "panel",
    content: {
      title: "Secret: Black Belt",
      writing: "You found a hidden object! Oz holds a black belt in judo and competed on the Oxford varsity team.",
      bodyHtml: `
        <h2>Secret Found: Black Belt</h2>
        <p>Oz trained judo for years and competed at varsity level for Oxford. The discipline of martial arts shaped his approach to research — persistence, adaptability, and knowing when to let go of a bad grip.</p>
      `,
    },
  },

  {
    id: "easter-42",
    name: "The Answer",
    category: "fun",
    type: "geometry",
    shape: "dodeca",
    color: 0xffcc00,
    position: { x: 74, z: 62 },
    yOffset: 0.6,
    placeOnTerrain: true,
    discoverable: true,
    hiddenEasterEgg: true,
    revealRadius: 8,
    interaction: "panel",
    content: {
      title: "Secret: 42",
      writing: "The answer to life, the universe, and everything. You found it at the edge of the map.",
      bodyHtml: `
        <h2>Secret Found: 42</h2>
        <p>If you've made it this far, you're the kind of person I'd love to work with. Say hi: <a href="mailto:ozsamkilim@gmail.com">ozsamkilim@gmail.com</a></p>
      `,
    },
  },

  {
    id: "easter-piano",
    name: "Hidden Track",
    category: "fun",
    type: "geometry",
    shape: "icosa",
    color: 0xff00ff,
    position: { x: -3, z: 78 },
    yOffset: 0.6,
    placeOnTerrain: true,
    discoverable: true,
    hiddenEasterEgg: true,
    revealRadius: 8,
    interaction: "viewer",
    viewerUrl: "https://open.spotify.com/embed/artist/3OlXDXzWU8ewTcL1Mo22RJ?utm_source=generator&theme=0",
    viewerCanMinimize: true,
    content: {
      title: "Secret: Hidden Track",
      writing: "You found the hidden listening post. Music brings people together — it crosses every boundary that research papers can't. Put this on and keep exploring.",
      bodyHtml: null,
    },
  },
];

// ---------------------------------------------------------------------------
//  COMPUTED HELPERS  — auto-derived from the arrays above
// ---------------------------------------------------------------------------

export const TOTAL_DISCOVERABLE = WORLD_OBJECTS.filter(
  (o) => o.discoverable && !o.hiddenEasterEgg
).length;

export function getObjectById(id) {
  return WORLD_OBJECTS.find((o) => o.id === id) || null;
}

export function getObjectsByCategory(cat) {
  return WORLD_OBJECTS.filter((o) => o.category === cat);
}
