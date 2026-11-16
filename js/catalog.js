// Furniture catalogue for the planner. Every piece is built around its own
// centre, front facing +z, sizes in metres. w = width (x), d = depth (z), h = height.
import * as THREE from 'three';
import { plainMat } from './materials.js';
import { addMesh, bx, rbx, cyl, group, chair, trippTrapp, bookcase, dresser, bed, sofa, armchair, bike, plant } from './model.js';

const legs = (g, mat, w, d, h, t = 0.02, inset = 0.04) => {
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const x = sx * (w / 2 - inset), z = sz * (d / 2 - inset);
    bx(g, mat, x - t, x + t, 0, h, z - t, z + t, { lines: 0.3 });
  });
};

export const CATALOG = [
  { type: 'sofa', group: 'Stue', name: 'Sofa, 3 pers.', w: 2.0, d: 0.95, h: 0.86, build: (g, M) => sofa(g, M, 2.0, 0.95) },
  { type: 'sofa2', group: 'Stue', name: 'Sofa, 2 pers.', w: 1.5, d: 0.9, h: 0.86, build: (g, M) => sofa(g, M, 1.5, 0.9) },
  { type: 'armchair', group: 'Stue', name: 'Lænestol', w: 0.62, d: 0.62, h: 0.78, build: (g, M) => armchair(g, M) },
  {
    type: 'sidetable', group: 'Stue', name: 'Rundt sofabord Ø60', w: 0.6, d: 0.6, h: 0.45, build: (g, M) => {
      cyl(g, M.oak, 0, 0.42, 0.45, 0, 0.30, { lines: 0.5, seg: 40 });
      cyl(g, M.oak, 0, 0.18, 0.20, 0, 0.28, { lines: 0.4, seg: 40 });
      [0, 1, 2, 3].forEach((i) => { const a = (i / 4) * Math.PI * 2 + 0.6; cyl(g, M.oakPlain, Math.cos(a) * 0.24, 0, 0.42, Math.sin(a) * 0.24, 0.017, { lines: 0.3 }); });
    },
  },
  {
    type: 'tvshelf', group: 'Stue', name: 'Lav reol 74 × 35', w: 0.74, d: 0.35, h: 0.45, build: (g, M) => {
      bx(g, M.whitePaint, -0.37, 0.37, 0, 0.45, -0.175, 0.175, { lines: 0.5 });
      for (let i = 0; i < 6; i++) bx(g, M.books[i], -0.31 + i * 0.05, -0.27 + i * 0.05, 0.03, 0.28 + (i % 3) * 0.03, -0.1, 0.12, { lines: 0.2 });
    },
  },
  { type: 'tv', group: 'Stue', name: 'TV 55" på væg', w: 1.24, d: 0.05, h: 1.51, wall: true, build: (g, M) => bx(g, M.screen, -0.62, 0.62, 0.80, 1.51, -0.02, 0.02, { lines: 0.6 }) },
  { type: 'bike', group: 'Stue', name: 'Cykel på hometrainer', w: 1.7, d: 0.8, h: 1.0, build: (g, M) => bike(g, M) },
  { type: 'rug', group: 'Stue', name: 'Tæppe 200 × 135', w: 2.0, d: 1.35, h: 0.012, flat: true, build: (g, M) => bx(g, M.rug, -1.0, 1.0, 0, 0.012, -0.675, 0.675, { lines: 0.5, cast: false }) },
  { type: 'bookcase', group: 'Stue', name: 'Reol 110 × 30', w: 1.1, d: 0.30, h: 1.85, build: (g, M) => bookcase(g, M, 1.10, 1.85) },
  { type: 'plant', group: 'Stue', name: 'Plante i krukke', w: 0.5, d: 0.5, h: 1.5, build: (g, M) => plant(g, M, 0, 0, 1.5) },

  {
    type: 'table', group: 'Spisestue', name: 'Ovalt spisebord 200 × 110', w: 2.0, d: 1.1, h: 0.74, build: (g, M) => {
      const top = new THREE.CylinderGeometry(1, 1, 0.04, 64);
      top.scale(1.0, 1, 0.55);
      top.computeVertexNormals();
      addMesh(g, top, M.oak, { threshold: 30, lines: 0.7 }).position.y = 0.72;
      [[-0.62, -0.30], [0.62, -0.30], [-0.62, 0.30], [0.62, 0.30]].forEach(([x, z]) => cyl(g, M.oakPlain, x, 0, 0.70, z, 0.03, { lines: 0.3, seg: 12 }));
    },
  },
  {
    type: 'table170', group: 'Spisestue', name: 'Ovalt spisebord 170 × 110', w: 1.7, d: 1.1, h: 0.74, build: (g, M) => {
      const top = new THREE.CylinderGeometry(1, 1, 0.04, 64);
      top.scale(0.85, 1, 0.55);
      top.computeVertexNormals();
      addMesh(g, top, M.oak, { threshold: 30, lines: 0.7 }).position.y = 0.72;
      [[-0.5, -0.30], [0.5, -0.30], [-0.5, 0.30], [0.5, 0.30]].forEach(([x, z]) => cyl(g, M.oakPlain, x, 0, 0.70, z, 0.03, { lines: 0.3, seg: 12 }));
    },
  },
  { type: 'chair', group: 'Spisestue', name: 'Spisebordsstol', w: 0.42, d: 0.42, h: 0.82, build: (g, M) => chair(g, M) },
  { type: 'tripptrapp', group: 'Spisestue', name: 'Tripp Trapp', w: 0.46, d: 0.5, h: 0.8, build: (g, M) => trippTrapp(g, M) },
  {
    type: 'desk', group: 'Kontor', name: 'Skrivebord 120 × 62', w: 1.2, d: 0.62, h: 0.74, build: (g, M) => {
      bx(g, M.oak, -0.6, 0.6, 0.71, 0.74, -0.31, 0.31, { lines: 0.6 });
      legs(g, M.whitePaint, 1.2, 0.62, 0.71);
    },
  },

  { type: 'bed160', group: 'Soveværelse', name: 'Dobbeltseng 160 × 200', w: 1.7, d: 2.08, h: 0.62, build: (g, M) => bed(group(g, 0, -1.04, 0), M, 1.60, 2.00, 0.30, M.pine, M.gingham) },
  { type: 'bed90', group: 'Soveværelse', name: 'Enkeltseng 90 × 200', w: 1.0, d: 2.08, h: 0.62, build: (g, M) => bed(group(g, 0, -1.04, 0), M, 0.90, 2.00, 0.30, M.pine, M.linenWhite) },
  {
    type: 'wardrobe', group: 'Soveværelse', name: 'Garderobeskab 215 × 60', w: 2.15, d: 0.62, h: 2.36, build: (g, M) => {
      bx(g, M.whitePaint, -1.075, 1.075, 0, 2.36, -0.31, 0.29, { lines: 0.6 });
      for (let i = 0; i < 4; i++) bx(g, M.whitePaint, -1.075 + i * 0.5375 + 0.003, -1.075 + (i + 1) * 0.5375 - 0.003, 0.02, 2.34, 0.29, 0.31, { lines: 0.45 });
    },
  },
  {
    type: 'wardrobe100', group: 'Soveværelse', name: 'Garderobeskab 100 × 60', w: 1.0, d: 0.62, h: 2.36, build: (g, M) => {
      bx(g, M.whitePaint, -0.5, 0.5, 0, 2.36, -0.31, 0.29, { lines: 0.6 });
      for (let i = 0; i < 2; i++) bx(g, M.whitePaint, -0.5 + i * 0.5 + 0.003, i * 0.5 - 0.003, 0.02, 2.34, 0.29, 0.31, { lines: 0.45 });
    },
  },
  { type: 'dresser', group: 'Soveværelse', name: 'Kommode 100 × 48', w: 1.04, d: 0.52, h: 0.95, build: (g, M) => dresser(g, M, 1.0, 0.95) },
  { type: 'nightstand', group: 'Soveværelse', name: 'Natbord 40 × 35', w: 0.4, d: 0.35, h: 0.5, build: (g, M) => bx(g, M.pine, -0.2, 0.2, 0, 0.5, -0.175, 0.175, { lines: 0.5 }) },
  {
    type: 'bench', group: 'Soveværelse', name: 'Bænk 100 × 38', w: 1.0, d: 0.38, h: 0.45, build: (g, M) => {
      bx(g, M.oakPlain, -0.5, 0.5, 0.42, 0.45, -0.19, 0.19, { lines: 0.5 });
      bx(g, M.cord, -0.48, 0.48, 0.40, 0.42, -0.17, 0.17, { lines: 0.3 });
      legs(g, M.oakPlain, 1.0, 0.38, 0.40);
    },
  },

  { type: 'kidrug', group: 'Børneværelse', name: 'Legetæppe 110 × 200', w: 1.1, d: 2.0, h: 0.012, flat: true, build: (g, M) => bx(g, M.rugKid, -0.55, 0.55, 0, 0.012, -1.0, 1.0, { lines: 0.5, cast: false }) },
  {
    type: 'toybox', group: 'Børneværelse', name: 'Legetøjskasse 50 × 50', w: 0.5, d: 0.5, h: 0.63, build: (g, M) => {
      bx(g, M.whitePaint, -0.25, 0.25, 0, 0.58, -0.25, 0.25, { lines: 0.6 });
      [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]].forEach(([x, z]) => cyl(g, M.whitePaint, x, 0.58, 0.63, z, 0.06, { lines: 0.3 }));
    },
  },
  {
    type: 'crates', group: 'Børneværelse', name: 'Tre kasser 36 × 120', w: 0.36, d: 1.24, h: 0.28, build: (g, M) => {
      [0, 1, 2].forEach((i) => bx(g, M.toy[i], -0.18, 0.18, 0, 0.28, -0.62 + i * 0.42, -0.24 + i * 0.42, { lines: 0.4 }));
    },
  },
];

export const byType = Object.fromEntries(CATALOG.map((c) => [c.type, c]));

// A box with the user's own measurements, optionally with their photo on the front.
export function buildCustom(g, M, c) {
  const col = new THREE.Color(c.color || '#c9b79a');
  const side = plainMat(col.getHex(), { rough: 0.8 });
  // top face: colour plus name and size, readable in the plan view
  const cv = document.createElement('canvas');
  const k = 256 / Math.max(c.w, c.d);
  cv.width = Math.max(32, Math.round(c.w * k)); cv.height = Math.max(32, Math.round(c.d * k));
  const x = cv.getContext('2d');
  x.fillStyle = '#' + col.getHexString(); x.fillRect(0, 0, cv.width, cv.height);
  x.fillStyle = col.getHSL({}).l > 0.55 ? '#1f1d1a' : '#ffffff';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const fs = Math.max(11, Math.min(26, cv.width / Math.max(6, (c.name || '').length) * 1.5, cv.height / 3));
  x.font = `600 ${fs}px Helvetica, Arial, sans-serif`;
  x.fillText(c.name || 'Møbel', cv.width / 2, cv.height / 2 - fs * 0.55);
  x.font = `400 ${fs * 0.75}px Helvetica, Arial, sans-serif`;
  x.fillText(`${Math.round(c.w * 100)} × ${Math.round(c.d * 100)}`, cv.width / 2, cv.height / 2 + fs * 0.6);
  const topTex = new THREE.CanvasTexture(cv);
  topTex.colorSpace = THREE.SRGBColorSpace;
  const top = plainMat(0xffffff, { rough: 0.8 });
  top.map = topTex;
  let front = side;
  if (c.img) {
    const t = new THREE.TextureLoader().load(c.img);
    t.colorSpace = THREE.SRGBColorSpace;
    front = plainMat(0xffffff, { rough: 0.8 });
    front.map = t;
  }
  const geo = new THREE.BoxGeometry(c.w, c.h, c.d);
  const m = new THREE.Mesh(geo, [side, side, top, side, front, front]);
  m.position.y = c.h / 2;
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
}

// The layout from the tour (version 2), as planner items
export const DEFAULT_LAYOUT = [
  ['table', 3.35, 1.10, 0], ['chair', 2.82, 0.30, 0], ['chair', 3.35, 0.30, 0], ['chair', 3.88, 0.30, 0],
  ['chair', 2.82, 1.92, 180], ['chair', 3.35, 1.92, 180], ['chair', 3.88, 1.92, 180], ['tripptrapp', 4.58, 1.10, -90],
  ['bookcase', 1.95, 0.72, 90], ['desk', 2.11, 3.30, 90], ['chair', 2.62, 3.25, -90], ['plant', 4.55, 0.35, 0],
  ['bed90', 8.85, 1.29, 0], ['dresser', 6.86, 2.00, 90], ['toybox', 6.87, 2.87, 0], ['kidrug', 7.80, 1.60, 0], ['crates', 9.15, 3.12, 0],
  ['rug', 5.05, 6.625, 0], ['sofa', 3.68, 7.00, 90], ['sidetable', 4.80, 6.70, 0], ['tvshelf', 6.625, 6.67, -90], ['tv', 6.775, 6.67, -90],
  ['armchair', 6.25, 5.55, -45], ['bike', 5.45, 7.85, 0],
  ['wardrobe', 1.075, 4.36, 0], ['bed160', 1.06, 6.20, 90], ['nightstand', 0.20, 5.175, 90], ['nightstand', 0.20, 7.225, 90],
  ['dresser', 2.84, 7.10, -90], ['bench', 1.45, 8.01, 0],
].map(([type, x, z, rot], i) => ({ id: 'd' + i, type, x, z, rot, mirror: false }));
