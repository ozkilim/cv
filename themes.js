import * as THREE from "https://esm.sh/three@0.162.0";

// ============================================================================
//  THEME DEFINITIONS
// ============================================================================
export const THEMES = [
  {
    id: "london",
    name: "London Blue",
    swatch: "#7aa5d6",
    terrain: { color: 0x7aa5d6, emissive: 0x10253f, ei: 0.08, rough: 0.62, metal: 0.1 },
    pattern: 0,
    scale: 1.0,
    sky: 0x071124,
    fog: 0x071124,
    wire: false,
  },
  {
    id: "ukiyoe",
    name: "Ukiyo-e",
    swatch: "#c4956a",
    terrain: { color: 0x1a2744, emissive: 0x2a1a0a, ei: 0.15, rough: 0.75, metal: 0.04 },
    color2: 0xc4956a,
    accent: 0xd4a574,
    pattern: 1,
    scale: 0.35,
    sky: 0x0a0815,
    fog: 0x1a0e08,
    wire: false,
    particles: "sakura",
  },
  {
    id: "neon",
    name: "Neon City",
    swatch: "#00ffff",
    terrain: { color: 0x08080f, emissive: 0x001122, ei: 0.25, rough: 0.3, metal: 0.6 },
    color2: 0x08080f,
    accent: 0x00ffff,
    pattern: 2,
    scale: 0.25,
    sky: 0x020208,
    fog: 0x040410,
    wire: false,
  },
];

// ============================================================================
//  GLSL pattern injection for MeshStandardMaterial
// ============================================================================
const VERT_HEADER = `
varying vec3 vWP;
`;

const VERT_BODY = `
vWP = (modelMatrix * vec4(position, 1.0)).xyz;
`;

const FRAG_HEADER = `
uniform int uPattern;
uniform vec3 uColor2;
uniform vec3 uAccent;
uniform float uScale;
uniform float uTime;
varying vec3 vWP;

float _ph(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float _pn(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(_ph(i),_ph(i+vec2(1,0)),f.x),mix(_ph(i+vec2(0,1)),_ph(i+vec2(1,1)),f.x),f.y);
}
`;

const FRAG_PATTERN = `
if(uPattern==1){
  float w=sin(vWP.x*uScale+vWP.z*uScale*.7+uTime*.3)*.5+.5;
  float w2=sin(vWP.z*uScale*1.3-vWP.x*uScale*.4+uTime*.15)*.5+.5;
  diffuseColor.rgb=mix(diffuseColor.rgb,uColor2,w*w2*.7);
  diffuseColor.rgb+=uAccent*w*.06;
}else if(uPattern==2){
  float gx=abs(fract(vWP.x*uScale)-.5);
  float gz=abs(fract(vWP.z*uScale)-.5);
  float g=1.-smoothstep(.008,.035,min(gx,gz));
  diffuseColor.rgb=mix(diffuseColor.rgb,uAccent,g*.85);
}else if(uPattern==3){
  float c=abs(fract(vWP.y*uScale)-.5);
  float l=1.-smoothstep(.01,.05,c);
  diffuseColor.rgb=mix(diffuseColor.rgb,uColor2,l*.9);
}else if(uPattern==4){
  float n=_pn(vWP.xz*uScale);
  diffuseColor.rgb=mix(diffuseColor.rgb,uColor2,n*.55);
}
`;

// ============================================================================
//  Create themed terrain material
// ============================================================================
export function createTerrainMaterial(theme) {
  const t = theme.terrain;
  const mat = new THREE.MeshStandardMaterial({
    color: t.color,
    emissive: t.emissive,
    emissiveIntensity: t.ei,
    roughness: t.rough,
    metalness: t.metal,
    wireframe: theme.wire || false,
  });

  if (theme.pattern > 0) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uPattern = { value: theme.pattern };
      shader.uniforms.uColor2 = { value: new THREE.Color(theme.color2 ?? t.color) };
      shader.uniforms.uAccent = { value: new THREE.Color(theme.accent ?? 0xffffff) };
      shader.uniforms.uScale = { value: theme.scale ?? 1.0 };
      shader.uniforms.uTime = { value: 0 };

      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\n" + VERT_HEADER)
        .replace("#include <begin_vertex>", "#include <begin_vertex>\n" + VERT_BODY);

      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\n" + FRAG_HEADER)
        .replace("#include <color_fragment>", "#include <color_fragment>\n" + FRAG_PATTERN);

      mat.userData.shader = shader;
    };
  }

  return mat;
}

// ============================================================================
//  Sakura particle system (cherry blossoms)
// ============================================================================
export function createSakuraParticles(scene) {
  const count = 600;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const drift = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 120;
    pos[i * 3 + 1] = Math.random() * 40;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    drift[i * 2]     = (Math.random() - 0.5) * 2;
    drift[i * 2 + 1] = 1.5 + Math.random() * 2;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffaacc,
    size: 0.35,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });

  const pts = new THREE.Points(geo, mat);
  pts.visible = false;
  scene.add(pts);

  function tick(delta, playerPos) {
    if (!pts.visible) return;
    const arr = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3]     += drift[i * 2] * delta;
      arr[i * 3 + 1] -= drift[i * 2 + 1] * delta;
      arr[i * 3 + 2] += drift[i * 2] * 0.6 * delta;
      if (arr[i * 3 + 1] < -1) {
        arr[i * 3 + 1] = 35 + Math.random() * 5;
        arr[i * 3]     = (playerPos?.x ?? 0) + (Math.random() - 0.5) * 120;
        arr[i * 3 + 2] = (playerPos?.z ?? 0) + (Math.random() - 0.5) * 120;
      }
    }
    if (playerPos) {
      pts.position.x = playerPos.x * 0.3;
      pts.position.z = playerPos.z * 0.3;
    }
    geo.attributes.position.needsUpdate = true;
  }

  return { points: pts, tick, show() { pts.visible = true; }, hide() { pts.visible = false; } };
}
