// Shared drawing state and the shader patch that turns every material into
// "ink on paper until revealed". The cut height clamps all geometry, so the
// plan view is the model itself, cut at uCut.
import * as THREE from 'three';

export const NR = 10; // max reveal regions

const srgb = (hex) => {
  // display-space values: the mix happens after tone mapping and encoding
  return new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
};

export const PAPER_HEX = 0xf2eee6;
export const INK_HEX = 0x1f1d1a;

export const U = {
  uCut: { value: 1.2 },
  uRoomBox: { value: Array.from({ length: NR }, () => new THREE.Vector4(1e5, 1e5, -1e5, -1e5)) },
  uRoomP: { value: Array.from({ length: NR }, () => new THREE.Vector4(0, 0, 1, 0)) },
  uPaper: { value: srgb(PAPER_HEX) },
  uInk: { value: srgb(INK_HEX) },
};

const REVEAL = /* glsl */ `
uniform float uCut;
uniform vec4 uRoomBox[${NR}];
uniform vec4 uRoomP[${NR}];
uniform vec3 uPaper;
uniform vec3 uInk;
varying vec3 vWPos;
float revealAt(vec3 p){
  float r = 0.0;
  for (int i = 0; i < ${NR}; i++) {
    vec4 b = uRoomBox[i]; vec4 s = uRoomP[i];
    if (s.x <= 0.0) continue;
    if (p.x < b.x - 0.06 || p.x > b.z + 0.06 || p.z < b.y - 0.06 || p.z > b.w + 0.06) continue;
    vec2 d = s.yz;
    float c1 = dot(b.xy, d), c2 = dot(vec2(b.z, b.y), d), c3 = dot(vec2(b.x, b.w), d), c4 = dot(b.zw, d);
    float lo = min(min(c1, c2), min(c3, c4)), hi = max(max(c1, c2), max(c3, c4));
    float t = (dot(p.xz, d) - lo) / max(hi - lo, 1e-3);
    float w = 0.28;
    r = max(r, smoothstep(0.0, 1.0, clamp((s.x * (1.0 + w) - t) / w, 0.0, 1.0)));
  }
  return r;
}
`;

// Patch a MeshStandard/Physical material
export function patch(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uCut = U.uCut;
    sh.uniforms.uRoomBox = U.uRoomBox;
    sh.uniforms.uRoomP = U.uRoomP;
    sh.uniforms.uPaper = U.uPaper;
    sh.uniforms.uInk = U.uInk;
    sh.vertexShader =
      'uniform float uCut;\nvarying vec3 vWPos;\nvarying vec3 vWNrm;\n' +
      sh.vertexShader
        .replace(
          '#include <beginnormal_vertex>',
          '#include <beginnormal_vertex>\nvWNrm = normalize(mat3(modelMatrix) * objectNormal);'
        )
        .replace(
          '#include <project_vertex>',
          `vec4 wp_ = modelMatrix * vec4(transformed, 1.0);
           wp_.y = min(wp_.y, uCut);
           vWPos = wp_.xyz;
           vec4 mvPosition = viewMatrix * wp_;
           gl_Position = projectionMatrix * mvPosition;`
        );
    sh.fragmentShader =
      REVEAL + 'varying vec3 vWNrm;\n' +
      sh.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
         float rv_ = revealAt(vWPos);
         vec3 n_ = normalize(vWNrm);
         bool cap_ = vWPos.y > uCut - 0.004 && n_.y > 0.5;
         float tone_ = 0.93 + 0.07 * dot(n_, normalize(vec3(-0.35, 0.8, 0.45)));
         vec3 drawn_ = cap_ ? uInk : uPaper * tone_;
         gl_FragColor.rgb = cap_ ? uInk : mix(drawn_, gl_FragColor.rgb, rv_);`
      );
  };
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = 1;
  mat.polygonOffsetUnits = 1;
  return mat;
}

export function lineMaterial(alpha = 1) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCut: U.uCut, uRoomBox: U.uRoomBox, uRoomP: U.uRoomP, uPaper: U.uPaper, uInk: U.uInk,
      uAlpha: { value: alpha },
    },
    vertexShader: /* glsl */ `
      uniform float uCut; varying vec3 vWPos;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        wp.y = min(wp.y, uCut);
        vWPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: REVEAL + /* glsl */ `
      uniform float uAlpha;
      void main(){
        float rv = revealAt(vWPos);
        gl_FragColor = vec4(uInk, (1.0 - rv) * uAlpha);
      }`,
    transparent: true,
    depthWrite: false,
  });
}

// --- textures ---------------------------------------------------------------
const loader = new THREE.TextureLoader();
const texCache = {};
export function pbrSet(name, repeat = 1) {
  const key = name + repeat;
  if (texCache[key]) return texCache[key];
  const base = `assets/tex/${name}/`;
  const load = (f, srgbSpace) => {
    const t = loader.load(base + f);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 8;
    if (srgbSpace) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  texCache[key] = { map: load('diff.jpg', true), normalMap: load('nor.jpg'), arm: load('arm.jpg') };
  return texCache[key];
}

export function texturedMat(name, { repeat = 1, color = 0xffffff, rough = 1, normal = 1 } = {}) {
  const t = pbrSet(name, repeat);
  return patch(new THREE.MeshStandardMaterial({
    map: t.map, normalMap: t.normalMap, roughnessMap: t.arm, aoMap: t.arm,
    color, roughness: rough, metalness: 0, normalScale: new THREE.Vector2(normal, normal),
  }));
}

export function plainMat(color, { rough = 0.8, metal = 0, emissive = 0x000000, emissiveIntensity = 1, transparent = false, opacity = 1, side = THREE.FrontSide } = {}) {
  return patch(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive, emissiveIntensity, transparent, opacity, side }));
}

export function buildMaterials() {
  const M = {};
  M.wall = plainMat(0xefece6, { rough: 0.92 });
  M.ceiling = plainMat(0xf4f2ee, { rough: 0.95 });
  M.floor = texturedMat('ash_planks', { repeat: 0.5, color: 0xffffff, rough: 0.62, normal: 0.5 });
  M.curtain = texturedMat('linen_neutral', { repeat: 2, color: 0xece6da, rough: 1 });
  M.curtain.side = THREE.DoubleSide;
  M.whitePaint = plainMat(0xf0eeea, { rough: 0.45 });
  M.frame = plainMat(0xf3f2ef, { rough: 0.4 });
  M.kitchenFront = plainMat(0xe9e7e1, { rough: 0.38 });
  M.worktop = texturedMat('ash_planks', { repeat: 0.35, color: 0xffffff, rough: 0.6 });
  M.oak = texturedMat('oak_honey', { repeat: 0.55, color: 0xffffff, rough: 0.6 });
  M.oakPlain = plainMat(0xd2ad7c, { rough: 0.6 });
  M.pine = plainMat(0xd4a66d, { rough: 0.7 });
  M.cord = texturedMat('cord_weave', { repeat: 1.6, color: 0xffffff, rough: 1, normal: 1.4 });
  M.linenGrey = texturedMat('linen_neutral', { repeat: 1.5, color: 0xcfcbc3, rough: 1 });
  M.linenWhite = texturedMat('linen_neutral', { repeat: 1.5, color: 0xf6f2ea, rough: 1 });
  M.gingham = texturedMat('linen_neutral', { repeat: 1.5, color: 0xc6d2e0, rough: 1 });
  M.marble = texturedMat('marble_01', { repeat: 0.6, color: 0xffffff, rough: 0.35 });
  M.steel = plainMat(0xb8bbbe, { rough: 0.3, metal: 0.9 });
  M.black = plainMat(0x161616, { rough: 0.3 });
  M.blackGlass = plainMat(0x0d0d0e, { rough: 0.12 });
  M.glass = plainMat(0xdfeef2, { rough: 0.05, transparent: true, opacity: 0.12 });
  M.rattan = plainMat(0xc58f4f, { rough: 0.8, side: THREE.DoubleSide });
  M.bulb = plainMat(0xfff3d6, { emissive: 0xffd9a0, emissiveIntensity: 6 });
  M.ledStrip = plainMat(0xfff3d6, { emissive: 0xffd7a8, emissiveIntensity: 3 });
  M.leaf = plainMat(0x3f5a33, { rough: 0.7, side: THREE.DoubleSide });
  M.pot = plainMat(0xb9a58e, { rough: 0.9 });
  M.terracotta = plainMat(0xa86846, { rough: 0.9 });
  M.ceramic = plainMat(0xe8e2d6, { rough: 0.4 });
  M.rug = plainMat(0xcfc6b8, { rough: 1 });
  M.rugKid = plainMat(0x8a9a86, { rough: 1 });
  M.radiator = plainMat(0xf2f1ee, { rough: 0.35 });
  M.trunk = plainMat(0x4a3d33, { rough: 1 });
  M.grass = plainMat(0x7d8865, { rough: 1 });
  M.tree = [0x7e8c66, 0x6f7f5a, 0x8b9670, 0x75836a].map((c) => plainMat(c, { rough: 1 }));
  M.shade = plainMat(0xfaf3e6, { rough: 1, emissive: 0xffe1b8, emissiveIntensity: 0.9 });
  M.books = [0x2f4a5c, 0xc4b59a, 0x8c3b2e, 0xe0d7c2, 0x4f5d47, 0xd9a441, 0x1f2a36, 0xb5694b, 0xefe9dd, 0x6e7f8c].map((c) => plainMat(c, { rough: 0.85 }));
  M.toy = [0xd2463a, 0x2f6fb5, 0xf0c13b, 0x45a05a].map((c) => plainMat(c, { rough: 0.5 }));
  M.screen = plainMat(0x111214, { rough: 0.2 });
  M.bikeFrame = plainMat(0x2b2e33, { rough: 0.35, metal: 0.4 });
  M.tire = plainMat(0x161616, { rough: 0.9 });
  return M;
}
