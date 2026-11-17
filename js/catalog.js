// Furniture catalogue for the planner. Every piece is built around its own
// centre, front facing +z, sizes in metres. w = width (x), d = depth (z), h = height.
// build(g, M, s) gets the actual size s = { w, d, h }; `resize` lists what the
// user may change, as [min, max] in metres.
import * as THREE from 'three';
import { plainMat } from './materials.js?v=6';
import { addMesh, bx, cyl, group, chair, trippTrapp, bookcase, dresser, bed, sofa, armchair, bike, plant } from './model.js?v=6';

const legs = (g, mat, w, d, h, t = 0.02, inset = 0.04) => {
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const x = sx * (w / 2 - inset), z = sz * (d / 2 - inset);
    bx(g, mat, x - t, x + t, 0, h, z - t, z + t, { lines: 0.3 });
  });
};
const ovalTable = (g, M, s) => {
  const top = new THREE.CylinderGeometry(1, 1, 0.04, 64);
  top.scale(s.w / 2, 1, s.d / 2);
  top.computeVertexNormals();
  addMesh(g, top, M.oak, { threshold: 30, lines: 0.7 }).position.y = 0.72;
  const lx = s.w * 0.31, lz = s.d * 0.27;
  [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([x, z]) => cyl(g, M.oakPlain, x, 0, 0.70, z, 0.03, { lines: 0.3, seg: 12 }));
};
const wardrobe = (g, M, s) => {
  const hw = s.w / 2, n = Math.max(1, Math.round(s.w / 0.54)), dw = s.w / n;
  bx(g, M.whitePaint, -hw, hw, 0, s.h, -s.d / 2, s.d / 2 - 0.02, { lines: 0.6 });
  for (let i = 0; i < n; i++) bx(g, M.whitePaint, -hw + i * dw + 0.003, -hw + (i + 1) * dw - 0.003, 0.02, s.h - 0.02, s.d / 2 - 0.02, s.d / 2, { lines: 0.45 });
};
const rugOf = (mat) => (g, M, s) => bx(g, M[mat], -s.w / 2, s.w / 2, 0, 0.012, -s.d / 2, s.d / 2, { lines: 0.5, cast: false });
const bedOf = (duvet) => (g, M, s) => bed(group(g, 0, -s.d / 2, 0), M, s.w - 0.1, s.d - 0.08, 0.30, M.pine, M[duvet]);

export const CATALOG = [
  { type: 'sofa', group: 'Stue', name: 'Sofa, 3 pers.', w: 2.0, d: 0.95, h: 0.86, resize: { w: [1.2, 3.2], d: [0.75, 1.2] }, build: (g, M, s) => sofa(g, M, s.w, s.d) },
  { type: 'sofa2', group: 'Stue', name: 'Sofa, 2 pers.', w: 1.5, d: 0.9, h: 0.86, resize: { w: [1.2, 3.2], d: [0.75, 1.2] }, build: (g, M, s) => sofa(g, M, s.w, s.d) },
  { type: 'armchair', group: 'Stue', name: 'Lænestol', w: 0.62, d: 0.62, h: 0.78, build: (g, M) => armchair(g, M) },
  {
    type: 'sidetable', group: 'Stue', name: 'Rundt sofabord', w: 0.6, d: 0.6, h: 0.45, resize: { w: [0.4, 1.2] }, round: true, build: (g, M, s) => {
      const r = s.w / 2;
      cyl(g, M.oak, 0, 0.42, 0.45, 0, r, { lines: 0.5, seg: 40 });
      cyl(g, M.oak, 0, 0.18, 0.20, 0, r * 0.93, { lines: 0.4, seg: 40 });
      [0, 1, 2, 3].forEach((i) => { const a = (i / 4) * Math.PI * 2 + 0.6; cyl(g, M.oakPlain, Math.cos(a) * r * 0.8, 0, 0.42, Math.sin(a) * r * 0.8, 0.017, { lines: 0.3 }); });
    },
  },
  {
    type: 'tvshelf', group: 'Stue', name: 'Lav reol / TV-bord', w: 0.74, d: 0.35, h: 0.45, resize: { w: [0.5, 2.4], d: [0.25, 0.6] }, build: (g, M, s) => {
      bx(g, M.whitePaint, -s.w / 2, s.w / 2, 0, 0.45, -s.d / 2, s.d / 2, { lines: 0.5 });
      for (let i = 0; i < 6; i++) bx(g, M.books[i], -s.w / 2 + 0.06 + i * 0.05, -s.w / 2 + 0.10 + i * 0.05, 0.03, 0.28 + (i % 3) * 0.03, -s.d / 2 + 0.07, s.d / 2 - 0.05, { lines: 0.2 });
    },
  },
  { type: 'tv', group: 'Stue', name: 'TV på væg', w: 1.24, d: 0.05, h: 1.51, wall: true, resize: { w: [0.7, 2.0] }, build: (g, M, s) => bx(g, M.screen, -s.w / 2, s.w / 2, 0.80, 0.80 + s.w * 0.57, -0.02, 0.02, { lines: 0.6 }) },
  { type: 'bike', group: 'Stue', name: 'Cykel på hometrainer', w: 1.7, d: 0.8, h: 1.0, build: (g, M) => bike(g, M) },
  { type: 'rug', group: 'Stue', name: 'Tæppe', w: 2.0, d: 1.35, h: 0.012, flat: true, resize: { w: [0.6, 4], d: [0.6, 4] }, build: rugOf('rug') },
  { type: 'bookcase', group: 'Stue', name: 'Reol', w: 1.1, d: 0.30, h: 1.85, resize: { w: [0.5, 2.4] }, build: (g, M, s) => bookcase(g, M, s.w, 1.85) },
  { type: 'plant', group: 'Stue', name: 'Plante i krukke', w: 0.5, d: 0.5, h: 1.5, build: (g, M) => plant(g, M, 0, 0, 1.5) },

  { type: 'table', group: 'Spisestue', name: 'Ovalt spisebord, udtrukket', w: 2.0, d: 1.1, h: 0.74, resize: { w: [0.9, 3.0], d: [0.7, 1.3] }, build: ovalTable },
  { type: 'table170', group: 'Spisestue', name: 'Ovalt spisebord', w: 1.7, d: 1.1, h: 0.74, resize: { w: [0.9, 3.0], d: [0.7, 1.3] }, build: ovalTable },
  { type: 'chair', group: 'Spisestue', name: 'Spisebordsstol', w: 0.42, d: 0.42, h: 0.82, build: (g, M) => chair(g, M) },
  { type: 'tripptrapp', group: 'Spisestue', name: 'Tripp Trapp', w: 0.46, d: 0.5, h: 0.8, build: (g, M) => trippTrapp(g, M) },
  {
    type: 'desk', group: 'Kontor', name: 'Skrivebord', w: 1.2, d: 0.62, h: 0.74, resize: { w: [0.8, 2.2], d: [0.5, 0.9] }, build: (g, M, s) => {
      bx(g, M.oak, -s.w / 2, s.w / 2, 0.71, 0.74, -s.d / 2, s.d / 2, { lines: 0.6 });
      legs(g, M.whitePaint, s.w, s.d, 0.71);
    },
  },

  { type: 'bed160', group: 'Soveværelse', name: 'Dobbeltseng', w: 1.7, d: 2.08, h: 0.62, resize: { w: [1.3, 2.1], d: [1.98, 2.28] }, build: bedOf('gingham') },
  { type: 'bed90', group: 'Soveværelse', name: 'Enkeltseng', w: 1.0, d: 2.08, h: 0.62, resize: { w: [0.8, 1.3], d: [1.68, 2.18] }, build: bedOf('linenWhite') },
  { type: 'wardrobe', group: 'Soveværelse', name: 'Garderobeskab', w: 2.15, d: 0.62, h: 2.36, resize: { w: [0.5, 4.0], d: [0.4, 0.7] }, build: wardrobe },
  { type: 'wardrobe100', group: 'Soveværelse', name: 'Garderobeskab, smalt', w: 1.0, d: 0.62, h: 2.36, resize: { w: [0.5, 4.0], d: [0.4, 0.7] }, build: wardrobe },
  { type: 'dresser', group: 'Soveværelse', name: 'Kommode', w: 1.04, d: 0.52, h: 0.95, resize: { w: [0.6, 1.8] }, build: (g, M, s) => dresser(g, M, s.w - 0.04, 0.95) },
  { type: 'nightstand', group: 'Soveværelse', name: 'Natbord', w: 0.4, d: 0.35, h: 0.5, resize: { w: [0.3, 0.7], d: [0.3, 0.6] }, build: (g, M, s) => bx(g, M.pine, -s.w / 2, s.w / 2, 0, 0.5, -s.d / 2, s.d / 2, { lines: 0.5 }) },
  {
    type: 'bench', group: 'Soveværelse', name: 'Bænk', w: 1.0, d: 0.38, h: 0.45, resize: { w: [0.6, 2.2] }, build: (g, M, s) => {
      bx(g, M.oakPlain, -s.w / 2, s.w / 2, 0.42, 0.45, -0.19, 0.19, { lines: 0.5 });
      bx(g, M.cord, -s.w / 2 + 0.02, s.w / 2 - 0.02, 0.40, 0.42, -0.17, 0.17, { lines: 0.3 });
      legs(g, M.oakPlain, s.w, 0.38, 0.40);
    },
  },

  { type: 'kidrug', group: 'Børneværelse', name: 'Legetæppe', w: 1.1, d: 2.0, h: 0.012, flat: true, resize: { w: [0.6, 3], d: [0.6, 3] }, build: rugOf('rugKid') },
  {
    type: 'toybox', group: 'Børneværelse', name: 'Legetøjskasse', w: 0.5, d: 0.5, h: 0.63, build: (g, M) => {
      bx(g, M.whitePaint, -0.25, 0.25, 0, 0.58, -0.25, 0.25, { lines: 0.6 });
      [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]].forEach(([x, z]) => cyl(g, M.whitePaint, x, 0.58, 0.63, z, 0.06, { lines: 0.3 }));
    },
  },
  {
    type: 'crates', group: 'Børneværelse', name: 'Tre kasser', w: 0.36, d: 1.24, h: 0.28, build: (g, M) => {
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

const mk = (rows, p) => rows.map(([type, x, z, rot, size], i) => ({ id: p + i, type, x, z, rot, mirror: false, ...(size ? { size } : {}) }));
const CHILD = [['bed90', 8.85, 1.29, 0], ['dresser', 6.86, 2.00, 90], ['toybox', 6.87, 2.87, 0], ['kidrug', 7.80, 1.60, 0], ['crates', 9.15, 3.12, 0]];
const MASTER = [['wardrobe', 1.075, 4.36, 0], ['bed160', 1.06, 6.20, 90], ['nightstand', 0.20, 5.175, 90], ['nightstand', 0.20, 7.225, 90], ['dresser', 2.84, 7.10, -90], ['bench', 1.45, 8.01, 0]];

// The layouts proposed earlier, as planner items
export const PRESETS = {
  'Forslag A: stue i gadeværelset': mk([
    ['table', 3.35, 1.10, 0], ['chair', 2.82, 0.30, 0], ['chair', 3.35, 0.30, 0], ['chair', 3.88, 0.30, 0],
    ['chair', 2.82, 1.92, 180], ['chair', 3.35, 1.92, 180], ['chair', 3.88, 1.92, 180], ['tripptrapp', 4.58, 1.10, -90],
    ['bookcase', 1.95, 0.72, 90], ['desk', 2.11, 3.30, 90], ['chair', 2.62, 3.25, -90], ['plant', 4.55, 0.35, 0],
    ...CHILD,
    ['rug', 5.05, 6.625, 0], ['sofa', 3.68, 7.00, 90], ['sidetable', 4.80, 6.70, 0], ['tvshelf', 6.625, 6.67, -90], ['tv', 6.775, 6.67, -90],
    ['armchair', 6.25, 5.55, -45], ['bike', 5.45, 7.85, 0],
    ...MASTER,
  ], 'a'),
  'Forslag B: sofa i køkken-alrum': mk([
    ['sofa', 3.20, 0.53, 0], ['sidetable', 4.48, 0.42, 0], ['bookcase', 1.95, 0.72, 90],
    ['table170', 3.30, 2.75, 0], ['chair', 2.85, 1.95, 0], ['chair', 3.75, 1.95, 0], ['chair', 2.85, 3.55, 180], ['chair', 3.75, 3.55, 180],
    ['tripptrapp', 4.40, 2.75, -90], ['tv', 2.55, 3.92, 180],
    ...CHILD,
    ['bed90', 3.72, 6.60, 0], ['desk', 4.95, 8.00, 0], ['chair', 4.95, 7.42, 0], ['desk', 6.17, 8.00, 0], ['chair', 6.17, 7.42, 0],
    ['armchair', 6.30, 5.60, -45], ['bike', 5.60, 6.35, 0],
    ...MASTER,
  ], 'b'),
};
