// Furniture catalogue for the planner. Every piece is built around its own
// centre, front facing +z, sizes in metres. w = width (x), d = depth (z), h = height.
// build(g, M, s) gets the actual size s = { w, d, h }; `resize` lists what the
// user may change, as [min, max] in metres.
import * as THREE from 'three';
import { plainMat } from './materials.js?v=7';
import { addMesh, bx, rbx, cyl, group, chair, trippTrapp, bookcase, dresser, bed, sofa, armchair, bike, plant } from './model.js?v=7';

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


// --- Nordic pieces added for the five layouts ---------------------------------
const roundTable = (g, M, s) => {
  const r = s.w / 2;
  cyl(g, M.oak, 0, 0.70, 0.74, 0, r, { lines: 0.6, seg: 48 });
  cyl(g, M.oakPlain, 0, 0.03, 0.70, 0, 0.06, { lines: 0.3 });
  cyl(g, M.oakPlain, 0, 0, 0.03, 0, r * 0.45, { lines: 0.3, seg: 32 });
};
const longTable = (g, M, s) => {
  bx(g, M.oak, -s.w / 2, s.w / 2, 0.71, 0.74, -s.d / 2, s.d / 2, { lines: 0.6 });
  legs(g, M.oakPlain, s.w, s.d, 0.71, 0.03, 0.10);
  bx(g, M.oakPlain, -s.w / 2 + 0.12, s.w / 2 - 0.12, 0.64, 0.71, -0.01, 0.01, { lines: 0.3 });
};
const sideboard = (g, M, s) => {
  const n = Math.max(2, Math.round(s.w / 0.5)), dw = s.w / n;
  bx(g, M.oak, -s.w / 2, s.w / 2, 0.14, 0.75, -s.d / 2, s.d / 2 - 0.012, { lines: 0.6 });
  for (let i = 0; i < n; i++) bx(g, M.oak, -s.w / 2 + i * dw + 0.004, -s.w / 2 + (i + 1) * dw - 0.004, 0.16, 0.73, s.d / 2 - 0.012, s.d / 2, { lines: 0.45 });
  legs(g, M.oakPlain, s.w, s.d, 0.14, 0.015, 0.07);
  cyl(g, M.ceramic, -s.w / 4, 0.75, 0.97, 0, 0.07, { lines: 0.3, rTop: 0.05 });
  cyl(g, M.terracotta, s.w / 5, 0.75, 0.88, 0.02, 0.09, { lines: 0.3 });
};
const lowSofa = (g, M, s) => {
  bx(g, M.oakPlain, -s.w / 2, s.w / 2, 0.04, 0.12, -s.d / 2, s.d / 2, { lines: 0.4 });
  rbx(g, M.linenGrey, -s.w / 2, s.w / 2, 0.12, 0.30, -s.d / 2, s.d / 2, 0.03, { lines: 0.5 });
  rbx(g, M.linenGrey, -s.w / 2, s.w / 2, 0.30, 0.66, -s.d / 2, -s.d / 2 + 0.18, 0.05, { lines: 0.5 });
  const n = Math.max(2, Math.round(s.w / 0.9)), cw = s.w / n;
  for (let i = 0; i < n; i++) rbx(g, M.linenGrey, -s.w / 2 + i * cw + 0.01, -s.w / 2 + (i + 1) * cw - 0.01, 0.30, 0.42, -s.d / 2 + 0.18, s.d / 2 - 0.01, 0.05, { lines: 0.4 });
  rbx(g, M.linenWhite, -s.w / 2 + 0.15, -s.w / 2 + 0.6, 0.42, 0.78, -s.d / 2 + 0.2, -s.d / 2 + 0.34, 0.07, { lines: 0.3 });
  rbx(g, M.gingham, s.w / 2 - 0.55, s.w / 2 - 0.15, 0.42, 0.74, -s.d / 2 + 0.2, -s.d / 2 + 0.34, 0.07, { lines: 0.3 });
};
// L-shaped: back along -z, the chaise at the +x end runs the full depth
const SEAT = 0.95;
const cornerParts = (s) => [[-s.w / 2, s.w / 2, -s.d / 2, -s.d / 2 + SEAT], [s.w / 2 - SEAT, s.w / 2, -s.d / 2 + SEAT, s.d / 2]];
const cornerSofa = (g, M, s) => {
  const x0 = -s.w / 2, x1 = s.w / 2, z0 = -s.d / 2, z1 = s.d / 2, o = { lines: 0.5 };
  [[x0 + 0.06, z0 + 0.06], [x1 - 0.06, z0 + 0.06], [x0 + 0.06, z0 + SEAT - 0.06], [x1 - 0.06, z1 - 0.06], [x1 - SEAT + 0.06, z1 - 0.06]].forEach(([x, z]) => cyl(g, M.oakPlain, x, 0, 0.1, z, 0.02, { lines: 0.2 }));
  rbx(g, M.linenGrey, x0, x1, 0.1, 0.40, z0, z0 + SEAT, 0.03, o);
  rbx(g, M.linenGrey, x1 - SEAT, x1, 0.1, 0.40, z0 + SEAT - 0.02, z1, 0.03, o);
  rbx(g, M.linenGrey, x0, x1, 0.40, 0.80, z0, z0 + 0.2, 0.06, o);
  rbx(g, M.linenGrey, x0, x0 + 0.16, 0.40, 0.60, z0 + 0.2, z0 + SEAT, 0.06, o);
  const n = Math.max(2, Math.round((s.w - SEAT) / 0.8)), cw = (s.w - SEAT - 0.16) / n;
  for (let i = 0; i < n; i++) rbx(g, M.linenGrey, x0 + 0.16 + i * cw + 0.01, x0 + 0.16 + (i + 1) * cw - 0.01, 0.40, 0.52, z0 + 0.2, z0 + SEAT - 0.01, 0.05, { lines: 0.4 });
  rbx(g, M.linenGrey, x1 - SEAT + 0.01, x1 - 0.01, 0.40, 0.52, z0 + 0.2, z1 - 0.01, 0.05, { lines: 0.4 });
  rbx(g, M.linenWhite, x0 + 0.25, x0 + 0.7, 0.52, 0.86, z0 + 0.2, z0 + 0.34, 0.07, { lines: 0.3 });
  rbx(g, M.gingham, x1 - SEAT + 0.1, x1 - SEAT + 0.5, 0.52, 0.84, z0 + 0.2, z0 + 0.34, 0.07, { lines: 0.3 });
  rbx(g, M.linenWhite, x1 - 0.55, x1 - 0.12, 0.52, 0.86, z0 + 0.2, z0 + 0.34, 0.07, { lines: 0.3 });
};
const dayBed = (g, M, s) => {
  bx(g, M.oak, -s.w / 2, s.w / 2, 0.12, 0.28, -s.d / 2, s.d / 2, { lines: 0.6 });
  legs(g, M.oakPlain, s.w, s.d, 0.12, 0.02, 0.05);
  rbx(g, M.linenWhite, -s.w / 2 + 0.02, s.w / 2 - 0.02, 0.28, 0.42, -s.d / 2 + 0.02, s.d / 2 - 0.02, 0.04, { lines: 0.4 });
  for (let i = 0; i < 3; i++) rbx(g, i === 1 ? M.gingham : M.linenGrey, -s.w / 2 + 0.1 + i * 0.62, -s.w / 2 + 0.66 + i * 0.62, 0.42, 0.78, -s.d / 2 + 0.02, -s.d / 2 + 0.2, 0.07, { lines: 0.3 });
};
const platformBed = (g, M, s) => {
  bx(g, M.oak, -s.w / 2, s.w / 2, 0.02, 0.20, -s.d / 2, s.d / 2, { lines: 0.6 });
  bx(g, M.oak, -s.w / 2, s.w / 2, 0.20, 0.85, -s.d / 2, -s.d / 2 + 0.06, { lines: 0.5 });
  const g2 = group(g, 0, -s.d / 2 + 0.07, 0);
  rbx(g2, M.linenWhite, -s.w / 2 + 0.06, s.w / 2 - 0.06, 0.20, 0.42, 0, s.d - 0.12, 0.04, { lines: 0.5 });
  rbx(g2, M.linenGrey, -s.w / 2 + 0.03, s.w / 2 - 0.03, 0.36, 0.48, 0.5, s.d - 0.1, 0.06, { lines: 0.5 });
  [0, 1].forEach((i) => rbx(g2, M.linenWhite, -s.w / 2 + 0.12 + i * (s.w / 2 - 0.06), -s.w / 2 + 0.06 + (i + 1) * (s.w / 2 - 0.06) - 0.06, 0.40, 0.56, 0.05, 0.45, 0.06, { lines: 0.4 }));
};
const loftBed = (g, M, s) => {
  const hw = s.w / 2, hd = s.d / 2, top = 1.15;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => bx(g, M.pine, sx * hw - (sx > 0 ? 0.06 : 0), sx * hw + (sx < 0 ? 0.06 : 0), 0, 1.6, sz * hd - (sz > 0 ? 0.06 : 0), sz * hd + (sz < 0 ? 0.06 : 0), { lines: 0.5 }));
  bx(g, M.pine, -hw, hw, top - 0.08, top, -hd, hd, { lines: 0.6 });
  rbx(g, M.linenWhite, -hw + 0.06, hw - 0.06, top, top + 0.15, -hd + 0.06, hd - 0.06, 0.04, { lines: 0.4 });
  rbx(g, M.linenWhite, -hw + 0.04, hw - 0.04, top + 0.12, top + 0.24, -hd + 0.5, hd - 0.05, 0.05, { lines: 0.4 });
  rbx(g, M.gingham, -hw + 0.12, hw - 0.12, top + 0.15, top + 0.29, -hd + 0.08, -hd + 0.42, 0.05, { lines: 0.3 });
  [-1, 1].forEach((sx) => bx(g, M.pine, sx * hw - 0.03, sx * hw + 0.03, 1.48, 1.54, -hd, sx > 0 ? hd - 0.55 : hd, { lines: 0.4 }));
  bx(g, M.pine, -hw, hw, 1.48, 1.54, -hd, -hd + 0.06, { lines: 0.4 });
  // ladder on the +x side near the foot, and a curtain that makes a den underneath
  [hd - 0.5, hd - 0.1].forEach((z) => bx(g, M.pine, hw - 0.05, hw, 0, 1.6, z - 0.025, z + 0.025, { lines: 0.4 }));
  for (let y = 0.25; y < 1.1; y += 0.28) bx(g, M.pine, hw - 0.05, hw, y, y + 0.03, hd - 0.5, hd - 0.1, { lines: 0.3 });
  const c = new THREE.PlaneGeometry(s.d - 0.7, top - 0.12, 20, 1);
  const p = c.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, 0.02 * Math.sin(p.getX(i) * 30));
  c.computeVertexNormals();
  c.rotateY(Math.PI / 2);
  const m = addMesh(g, c, M.gingham, { lines: 0.3, threshold: 80 });
  m.material.side = THREE.DoubleSide;
  m.position.set(hw - 0.02, (top - 0.12) / 2 + 0.02, -0.35);
  bx(g, M.rugKid, -hw + 0.06, hw - 0.06, 0, 0.03, -hd + 0.06, hd - 0.6, { lines: 0.3, cast: false });
  rbx(g, M.linenGrey, -hw + 0.1, -hw + 0.45, 0.03, 0.18, -hd + 0.15, -hd + 0.6, 0.06, { lines: 0.3 });
};
const alcoveBed = (g, M, s) => {
  const hw = s.w / 2, hd = s.d / 2, cw = (s.w - 2.05) / 2;
  [-1, 1].forEach((sx) => {
    const a = sx < 0 ? -hw : hw - cw, b = sx < 0 ? -hw + cw : hw;
    bx(g, M.whitePaint, a, b, 0, 2.36, -hd, hd - 0.02, { lines: 0.6 });
    bx(g, M.whitePaint, a + 0.004, b - 0.004, 0.02, 2.34, hd - 0.02, hd, { lines: 0.45 });
    cyl(g, M.oakPlain, sx < 0 ? b - 0.06 : a + 0.06, 1.0, 1.15, hd + 0.015, 0.012, { lines: 0 });
  });
  bx(g, M.whitePaint, -hw + cw, hw - cw, 1.95, 2.36, -hd, -hd + 0.35, { lines: 0.5 });
  bx(g, M.whitePaint, -hw + cw, hw - cw, 1.95, 1.98, -hd + 0.35, hd, { lines: 0.4 });
  for (let i = 0; i < 7; i++) bx(g, M.books[i], -0.5 + i * 0.05, -0.46 + i * 0.05, 1.98, 2.18 + (i % 3) * 0.03, -hd + 0.05, -hd + 0.28, { lines: 0.2 });
  bed(group(g, -1.0, 0, 90), M, 0.9, 2.0, 0.30, M.whitePaint, M.linenWhite);
};
const lowShelf = (g, M, s) => {
  bx(g, M.whitePaint, -s.w / 2, s.w / 2, 0, 0.62, -s.d / 2, s.d / 2, { lines: 0.6 });
  const n = Math.max(2, Math.round(s.w / 0.4)), cw = s.w / n;
  for (let i = 0; i < n; i++) {
    bx(g, M.whitePaint, -s.w / 2 + i * cw, -s.w / 2 + i * cw + 0.018, 0.02, 0.6, s.d / 2 - 0.005, s.d / 2 + 0.005, { lines: 0.3 });
    bx(g, M.toy[i % 4], -s.w / 2 + i * cw + 0.05, -s.w / 2 + (i + 1) * cw - 0.05, 0.03, 0.26, -s.d / 2 + 0.03, s.d / 2 - 0.02, { lines: 0.3 });
    if (i % 2 === 0) bx(g, M.books[(i * 3) % 10], -s.w / 2 + i * cw + 0.08, -s.w / 2 + i * cw + 0.12, 0.32, 0.55, -s.d / 2 + 0.04, s.d / 2 - 0.04, { lines: 0.2 });
  }
  bx(g, M.whitePaint, -s.w / 2, s.w / 2, 0.29, 0.31, -s.d / 2, s.d / 2, { lines: 0.4 });
};
const divider = (g, M, s) => {
  const n = Math.max(3, Math.round(s.w / 0.075));
  for (let i = 0; i < n; i++) {
    const x = -s.w / 2 + (i + 0.5) * (s.w / n);
    bx(g, M.oak, x - 0.016, x + 0.016, 0.06, 2.1, -s.d / 2, s.d / 2, { lines: 0.3 });
  }
  bx(g, M.oakPlain, -s.w / 2, s.w / 2, 0, 0.06, -s.d / 2 - 0.02, s.d / 2 + 0.02, { lines: 0.4 });
};
const wallBars = (g, M, s) => {
  [-1, 1].forEach((sx) => bx(g, M.oak, sx * s.w / 2 - (sx > 0 ? 0.05 : 0), sx * s.w / 2 + (sx < 0 ? 0.05 : 0), 0, 2.36, -s.d / 2, s.d / 2, { lines: 0.5 }));
  for (let y = 0.16; y < 2.3; y += 0.155) {
    const r = new THREE.CylinderGeometry(0.017, 0.017, s.w - 0.1, 10);
    r.rotateZ(Math.PI / 2);
    addMesh(g, r, M.oakPlain, { lines: 0.2, threshold: 40 }).position.set(0, y, 0.01);
  }
};
const tent = (g, M, s) => {
  const h = 1.5, cone = new THREE.ConeGeometry(s.w / 2 * 1.38, h, 4, 1, true);
  cone.rotateY(Math.PI / 4);
  const m = addMesh(g, cone, M.linenWhite, { lines: 0.4, threshold: 30 });
  m.material.side = THREE.DoubleSide;
  m.position.y = h / 2;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const pole = new THREE.CylinderGeometry(0.012, 0.012, 1.85, 6);
    const pm = addMesh(g, pole, M.oakPlain, { lines: 0, cast: false });
    pm.position.set(sx * s.w * 0.3, 0.88, sz * s.w * 0.3);
    pm.rotation.set(sz * -0.42, 0, sx * 0.42);
  });
  bx(g, M.rugKid, -s.w / 2 + 0.05, s.w / 2 - 0.05, 0, 0.02, -s.w / 2 + 0.05, s.w / 2 - 0.05, { lines: 0, cast: false });
  rbx(g, M.gingham, -0.25, 0.15, 0.02, 0.16, -0.3, 0.1, 0.06, { lines: 0.3 });
};
const kidTable = (g, M) => {
  bx(g, M.whitePaint, -0.27, 0.27, 0.48, 0.51, -0.27, 0.27, { lines: 0.5 });
  legs(g, M.oakPlain, 0.54, 0.54, 0.48, 0.018, 0.04);
  [-0.37, 0.37].forEach((x) => { cyl(g, M.oakPlain, x, 0, 0.27, 0, 0.09, { lines: 0.3, seg: 16 }); cyl(g, M.toy[x < 0 ? 1 : 2], x, 0.27, 0.30, 0, 0.1, { lines: 0.3, seg: 16 }); });
  bx(g, M.linenWhite, -0.1, 0.12, 0.51, 0.515, -0.12, 0.05, { lines: 0.2 });
};
const floorCushions = (g, M) => {
  rbx(g, M.linenGrey, -0.45, 0.15, 0, 0.14, -0.4, 0.2, 0.06, { lines: 0.4 });
  rbx(g, M.gingham, -0.40, 0.10, 0.14, 0.26, -0.35, 0.15, 0.06, { lines: 0.4 });
  rbx(g, M.linenWhite, 0.0, 0.45, 0, 0.14, -0.05, 0.4, 0.06, { lines: 0.4 });
};

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
  { type: 'cornersofa', group: 'Stue', name: 'Hjørnesofa', w: 2.6, d: 2.0, h: 0.86, resize: { w: [2.2, 3.4], d: [1.6, 2.6] }, parts: cornerParts, build: cornerSofa },
  { type: 'lowsofa', group: 'Stue', name: 'Lav sofa', w: 2.0, d: 0.9, h: 0.7, resize: { w: [1.4, 3.0] }, build: lowSofa },
  { type: 'sofabed', group: 'Stue', name: 'Sovesofa', w: 2.0, d: 0.95, h: 0.86, resize: { w: [1.4, 2.4] }, build: (g, M, s) => sofa(g, M, s.w, s.d) },
  { type: 'daybed', group: 'Stue', name: 'Daybed', w: 2.0, d: 0.9, h: 0.78, resize: { w: [1.8, 2.1], d: [0.8, 1.0] }, build: dayBed },
  { type: 'sideboard', group: 'Stue', name: 'Skænk', w: 1.6, d: 0.45, h: 0.75, resize: { w: [0.8, 2.4] }, build: sideboard },
  { type: 'tallshelf', group: 'Stue', name: 'Høj reol', w: 1.0, d: 0.30, h: 2.3, resize: { w: [0.5, 1.6] }, build: (g, M, s) => bookcase(g, M, s.w, 2.3) },
  { type: 'floorcushions', group: 'Stue', name: 'Gulvpuder', w: 0.9, d: 0.8, h: 0.26, build: floorCushions },
  { type: 'divider', group: 'Stue', name: 'Lamel-rumdeler', w: 1.5, d: 0.06, h: 2.1, resize: { w: [0.6, 3.0] }, build: divider },
  { type: 'bike', group: 'Stue', name: 'Cykel på hometrainer', w: 1.7, d: 0.8, h: 1.0, build: (g, M) => bike(g, M) },
  { type: 'rug', group: 'Stue', name: 'Tæppe', w: 2.0, d: 1.35, h: 0.012, flat: true, resize: { w: [0.6, 4], d: [0.6, 4] }, build: rugOf('rug') },
  { type: 'bookcase', group: 'Stue', name: 'Reol', w: 1.1, d: 0.30, h: 1.85, resize: { w: [0.5, 2.4] }, build: (g, M, s) => bookcase(g, M, s.w, 1.85) },
  { type: 'plant', group: 'Stue', name: 'Plante i krukke', w: 0.5, d: 0.5, h: 1.5, build: (g, M) => plant(g, M, 0, 0, 1.5) },

  { type: 'table', group: 'Spisestue', name: 'Ovalt spisebord, udtrukket', w: 2.0, d: 1.1, h: 0.74, resize: { w: [0.9, 3.0], d: [0.7, 1.3] }, build: ovalTable },
  { type: 'table170', group: 'Spisestue', name: 'Ovalt spisebord', w: 1.7, d: 1.1, h: 0.74, resize: { w: [0.9, 3.0], d: [0.7, 1.3] }, build: ovalTable },
  { type: 'roundtable', group: 'Spisestue', name: 'Rundt spisebord', w: 1.2, d: 1.2, h: 0.74, round: true, resize: { w: [0.9, 1.5] }, build: roundTable },
  { type: 'longtable', group: 'Spisestue', name: 'Langbord', w: 2.2, d: 0.95, h: 0.74, resize: { w: [1.6, 3.0], d: [0.8, 1.1] }, build: longTable },
  { type: 'chair', group: 'Spisestue', name: 'Spisebordsstol', w: 0.42, d: 0.42, h: 0.82, build: (g, M) => chair(g, M) },
  { type: 'tripptrapp', group: 'Spisestue', name: 'Tripp Trapp', w: 0.46, d: 0.5, h: 0.8, build: (g, M) => trippTrapp(g, M) },
  {
    type: 'desk', group: 'Kontor', name: 'Skrivebord', w: 1.2, d: 0.62, h: 0.74, resize: { w: [0.8, 2.2], d: [0.5, 0.9] }, build: (g, M, s) => {
      bx(g, M.oak, -s.w / 2, s.w / 2, 0.71, 0.74, -s.d / 2, s.d / 2, { lines: 0.6 });
      legs(g, M.whitePaint, s.w, s.d, 0.71);
    },
  },

  { type: 'bed160', group: 'Soveværelse', name: 'Dobbeltseng', w: 1.7, d: 2.08, h: 0.62, resize: { w: [1.3, 2.1], d: [1.98, 2.28] }, build: bedOf('gingham') },
  { type: 'platformbed', group: 'Soveværelse', name: 'Platformseng 180', w: 1.9, d: 2.1, h: 0.85, resize: { w: [1.5, 2.1] }, build: platformBed },
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

  { type: 'floorbed', group: 'Børneværelse', name: 'Gulvseng 90 × 200', w: 0.95, d: 2.05, h: 0.4, build: (g, M, s) => bed(group(g, 0, -s.d / 2, 0), M, 0.9, 2.0, 0.12, M.oakPlain, M.linenWhite) },
  { type: 'loftbed', group: 'Børneværelse', name: 'Højseng med hule', w: 1.0, d: 2.05, h: 1.6, build: loftBed },
  { type: 'alcovebed', group: 'Børneværelse', name: 'Alkoveseng med skabe', w: 3.2, d: 0.95, h: 2.36, resize: { w: [2.85, 3.5] }, build: alcoveBed },
  { type: 'lowshelf', group: 'Børneværelse', name: 'Lav reol med kasser', w: 1.2, d: 0.30, h: 0.62, resize: { w: [0.6, 2.4] }, build: lowShelf },
  { type: 'wallbars', group: 'Børneværelse', name: 'Ribbe', w: 0.9, d: 0.15, h: 2.36, build: wallBars },
  { type: 'tent', group: 'Børneværelse', name: 'Legetelt', w: 1.1, d: 1.1, h: 1.5, build: tent },
  { type: 'kidtable', group: 'Børneværelse', name: 'Legebord med to skamler', w: 0.94, d: 0.6, h: 0.51, build: kidTable },
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

// --- five Nordic layouts: same walls and floors, different use of the rooms ----
const SKID = [
  ['floorbed', 6.32, 6.65, 0], ['lowshelf', 3.36, 6.8, 90], ['wardrobe100', 3.52, 7.85, 90, { w: 0.8 }],
  ['kidrug', 4.75, 6.9, 90, { w: 1.1, d: 1.8 }], ['kidtable', 5.3, 6.2, 0], ['tent', 4.6, 7.65, 0], ['toybox', 6.4, 8.05, 0],
];
const GPARENTS = [
  ['rug', 8.0, 1.7, 90, { w: 2.0, d: 1.4 }], ['bed160', 8.31, 1.70, -90], ['nightstand', 9.15, 0.62, -90], ['nightstand', 9.15, 2.78, -90],
  ['wardrobe', 8.55, 3.64, 180, { w: 1.6 }], ['plant', 6.9, 0.35, 0],
];
export const NEW_LAYOUTS = {
  '1 · Dag mod haven, nat mod gaden': mk([
    ['roundtable', 3.45, 1.55, 0], ['chair', 3.45, 0.73, 0], ['chair', 3.45, 2.37, 180], ['chair', 2.63, 1.55, 90], ['tripptrapp', 4.31, 1.55, -90],
    ['bench', 2.55, 0.33, 0, { w: 1.1 }], ['desk', 2.11, 3.20, 90, { w: 1.2, d: 0.6 }], ['chair', 2.64, 3.20, -90], ['plant', 4.45, 0.33, 0],
    ['rug', 7.95, 2.35, 90, { w: 2.0, d: 1.6 }], ['lowsofa', 8.90, 2.35, -90], ['tv', 6.625, 2.35, 90], ['sidetable', 7.75, 2.35, 0, { w: 0.7 }],
    ['divider', 8.2, 1.05, 0], ['bike', 8.2, 0.55, 0], ['floorcushions', 7.15, 1.5, 0],
    ...SKID,
    ['rug', 1.35, 6.9, 0, { w: 2.4, d: 1.7 }], ['wardrobe', 1.08, 5.27, 180, { w: 2.15 }], ['platformbed', 1.35, 6.64, 0],
    ['nightstand', 0.20, 5.80, 0], ['nightstand', 2.50, 5.80, 0], ['bench', 1.35, 7.95, 0, { w: 1.2 }], ['plant', 2.80, 8.05, 0],
  ], 'n1'),
  '2 · Stuen for enden af gangen': mk([
    ['longtable', 3.45, 1.6, 0], ['chair', 2.75, 0.70, 0], ['chair', 3.45, 0.70, 0], ['chair', 4.15, 0.70, 0],
    ['chair', 2.75, 2.50, 180], ['chair', 3.45, 2.50, 180], ['chair', 4.15, 2.50, 180], ['chair', 2.12, 1.6, 90], ['tripptrapp', 4.82, 1.6, -90],
    ['sideboard', 2.03, 3.15, 90, { w: 1.5 }],
    ...GPARENTS,
    ...SKID,
    ['rug', 1.6, 7.05, 0, { w: 2.2, d: 1.8 }], ['cornersofa', 1.0, 6.8, 90], ['sidetable', 1.55, 7.3, 0, { w: 0.7 }],
    ['sideboard', 2.87, 7.25, -90], ['tv', 3.075, 7.25, -90], ['armchair', 2.45, 5.65, -45], ['bike', 0.95, 4.47, 0], ['plant', 2.35, 8.05, 0],
  ], 'n2'),
  '3 · Barnets rige': mk([
    ['longtable', 3.75, 1.15, 0, { w: 2.0, d: 0.9 }], ['bench', 3.75, 0.40, 0, { w: 1.6 }], ['chair', 3.25, 1.95, 180], ['chair', 4.25, 1.95, 180],
    ['tripptrapp', 5.02, 1.15, -90], ['desk', 2.30, 0.33, 0, { w: 0.95, d: 0.6 }], ['chair', 2.30, 0.85, 180],
    ['sofa2', 2.25, 3.05, 90], ['sidetable', 3.15, 3.05, 0, { w: 0.5 }],
    ...GPARENTS,
    ['rug', 5.0, 6.5, 0, { w: 1.6, d: 1.3 }], ['desk', 5.2, 8.04, 180, { w: 2.4, d: 0.62 }], ['chair', 4.6, 7.45, 0], ['chair', 5.8, 7.45, 0],
    ['sofabed', 6.32, 6.2, -90], ['bike', 3.65, 6.8, 90], ['tv', 3.225, 6.6, 90],
    ['loftbed', 0.52, 5.25, 0], ['wardrobe100', 1.62, 4.36, 0, { w: 0.8 }], ['wallbars', 0.08, 7.3, 90],
    ['kidrug', 1.55, 7.1, 0, { w: 1.6, d: 1.8 }], ['tent', 2.45, 7.65, 0], ['kidtable', 1.55, 6.0, 0], ['lowshelf', 2.95, 6.2, -90], ['toybox', 0.4, 8.05, 0],
  ], 'n3'),
  '4 · Bibliotek og træning': mk([
    ['table170', 3.40, 1.25, 0], ['bench', 3.40, 0.42, 0, { w: 1.4 }], ['chair', 3.0, 2.15, 180], ['chair', 3.8, 2.15, 180], ['tripptrapp', 4.52, 1.25, -90],
    ['bookcase', 1.95, 0.72, 90], ['sofa2', 2.25, 3.05, 90], ['sidetable', 3.2, 3.05, 0, { w: 0.5 }],
    ['bed90', 8.85, 1.29, 0], ['dresser', 6.86, 2.00, 90], ['toybox', 6.87, 2.87, 0], ['kidrug', 7.80, 1.60, 0], ['crates', 9.15, 3.12, 0],
    ['rug', 5.3, 6.85, 90, { w: 2.4, d: 1.7 }], ['platformbed', 5.75, 6.85, -90], ['nightstand', 6.60, 5.68, -90], ['nightstand', 6.60, 8.02, -90],
    ['wardrobe', 3.51, 7.0, 90, { w: 2.15 }], ['plant', 4.4, 8.05, 0],
    ['tallshelf', 0.18, 5.05, 90], ['tallshelf', 0.18, 6.05, 90], ['tallshelf', 0.18, 7.05, 90], ['sofabed', 1.35, 4.53, 0, { w: 1.9 }],
    ['rug', 1.6, 6.3, 0, { w: 2.0, d: 1.4 }], ['tv', 3.075, 6.3, -90], ['bike', 2.0, 6.3, 0], ['desk', 1.45, 8.04, 180, { w: 2.0 }],
    ['chair', 0.95, 7.42, 0], ['chair', 1.95, 7.42, 0], ['armchair', 0.70, 5.65, 90],
  ], 'n4'),
  '5 · Alt bygget ind': mk([
    ['longtable', 3.45, 1.35, 0, { w: 2.4 }], ['chair', 2.75, 0.45, 0], ['chair', 3.45, 0.45, 0], ['chair', 4.15, 0.45, 0],
    ['chair', 3.05, 2.25, 180], ['chair', 3.85, 2.25, 180], ['tripptrapp', 4.45, 2.27, 180], ['sofa2', 2.25, 3.10, 90], ['sidetable', 3.25, 3.1, 0, { w: 0.5 }],
    ['alcovebed', 8.875, 1.95, -90], ['lowshelf', 6.76, 1.6, 90], ['kidrug', 7.6, 1.8, 0, { w: 1.1, d: 1.6 }], ['armchair', 7.05, 0.65, 90],
    ['wardrobe', 3.43, 7.05, 90, { w: 2.0, d: 0.45 }], ['daybed', 6.33, 7.0, -90], ['kidtable', 4.6, 6.55, 0], ['tent', 4.75, 7.75, 0],
    ['kidrug', 4.75, 7.0, 90, { w: 1.1, d: 2.0 }], ['lowshelf', 5.75, 5.21, 0],
    ['wardrobe', 1.1, 4.36, 0, { w: 2.2 }], ['bed160', 1.06, 6.2, 90], ['nightstand', 0.20, 5.14, 90], ['nightstand', 0.20, 7.26, 90],
    ['bike', 1.75, 7.92, 0], ['dresser', 2.84, 6.6, -90],
  ], 'n5'),
};
Object.assign(PRESETS, NEW_LAYOUTS);
