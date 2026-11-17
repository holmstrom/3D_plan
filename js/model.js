// The apartment at Ny Munkegade, version 2 layout.
// Units are metres. x runs left to right on the plan, z runs top to bottom.
// z = 0 is the garden facade (balcony, morning sun), z = 8.35 is the street.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../lib/three-addons/RoundedBoxGeometry.js';
import { lineMaterial, INK_HEX } from './materials.js?v=7';

export const H = 2.5;      // ceiling height
export const EXT = 0.30;   // exterior wall thickness
export const W = 9.35;     // interior width
export const D = 8.35;     // interior depth

// Reveal regions: [x0, z0, x1, z1] and sweep direction
export const ROOMS = {
  hall:    { box: [3.20, 4.05, 9.35, 4.95], dir: [-1, 0] },
  kitchen: { box: [1.80, 0.00, 6.50, 3.95], dir: [0, -1] },
  balcony: { box: [3.40, -1.75, 6.40, -0.30], dir: [0, -1] },
  garden:  { box: [-40, -60, 50, -0.31], dir: [0, -1] },
  street:  { box: [-40, 8.66, 50, 60], dir: [0, 1] },
  child:   { box: [6.60, 0.00, 9.35, 3.95], dir: [0, -1] },
  living:  { box: [3.20, 5.05, 6.80, 8.35], dir: [0, 1] },
  master:  { box: [0.00, 4.05, 3.10, 8.35], dir: [-1, 0] },
  bath:    { box: [0.00, 0.00, 1.70, 3.95], dir: [-1, 0] },
};

const lmCache = new Map();
const lm = (a) => {
  const k = Math.round(a * 100);
  if (!lmCache.has(k)) lmCache.set(k, lineMaterial(a));
  return lmCache.get(k);
};

function addMesh(parent, geo, mat, { lines = 0.55, cast = true, receive = true, threshold = 25 } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (lines > 0) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, threshold), lm(lines)));
  parent.add(m);
  return m;
}

// Axis-aligned box from min/max in the parent's space
function bx(parent, mat, x0, x1, y0, y1, z0, z1, opts) {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  const m = addMesh(parent, g, mat, opts);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return m;
}
function rbx(parent, mat, x0, x1, y0, y1, z0, z1, r = 0.03, opts) {
  const g = new RoundedBoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 3, r);
  const m = addMesh(parent, g, mat, { threshold: 40, ...opts });
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return m;
}
function cyl(parent, mat, x, y0, y1, z, r, opts = {}) {
  const g = new THREE.CylinderGeometry(opts.rTop ?? r, r, y1 - y0, opts.seg ?? 20);
  const m = addMesh(parent, g, mat, { threshold: 30, ...opts });
  m.position.set(x, (y0 + y1) / 2, z);
  return m;
}
function group(parent, x, z, yawDeg = 0, y = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = (yawDeg * Math.PI) / 180;
  parent.add(g);
  return g;
}

// -----------------------------------------------------------------------------
export function buildApartment(M) {
  const root = new THREE.Group();
  const hanging = new THREE.Group();   // objects above the cut: shown once walls are up
  const ceilings = new THREE.Group();
  const outside = new THREE.Group();
  const doors = {};
  const swap = {};
  const lights = [];
  root.add(hanging, ceilings);
  // movable furniture lives in its own group, so the planner can replace it
  const furn = new THREE.Group();
  root.add(furn);
  const fixedRoot = root;
  const walls2d = [];

  // --- floors ---------------------------------------------------------------
  const floor = (mat, x0, x1, z0, z1, y = 0) => {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    g.rotateX(-Math.PI / 2);
    g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), -p.getZ(i));
    const m = addMesh(root, g, mat, { lines: 0, cast: false });
    return m;
  };
  floor(M.floor, 0, W, 0, 5.05);
  floor(M.floor, 0, 6.90, 5.05, D);
  floor(M.marble, 6.90, W, 5.05, 6.20);
  // door thresholds through exterior wall at the balcony
  floor(M.marble, 4.70, 5.90, -EXT, 0);

  // --- ceilings (face down, hidden until the walls are full height) ----------
  const ceil = (x0, x1, z0, z1) => {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    g.rotateX(Math.PI / 2);
    g.translate((x0 + x1) / 2, H, (z0 + z1) / 2);
    addMesh(ceilings, g, M.ceiling, { lines: 0 });
  };
  ceil(0, W, 0, 5.05);
  ceil(0, 6.90, 5.05, D);
  ceil(-EXT, W + EXT, -EXT, 0); ceil(-EXT, W + EXT, D, D + EXT);
  ceil(-EXT, 0, 0, D); ceil(W, W + EXT, 0, D);
  ceil(9.35 - 2.45, W, 5.05, D); // the stairwell gets a ceiling too, raised later
  ceilings.children[ceilings.children.length - 1].visible = false;

  // --- walls ------------------------------------------------------------------
  // along x: thickness z0..z1, runs a0..a1. along z: thickness x0..x1.
  const wallRun = (axis, t0, t1, a0, a1, openings = [], mat = M.wall) => {
    const piece = (s0, s1, y0, y1) => {
      if (s1 - s0 < 0.001 || y1 - y0 < 0.001) return;
      if (axis === 'x') bx(root, mat, s0, s1, y0, y1, t0, t1, { lines: 1 });
      else bx(root, mat, t0, t1, y0, y1, s0, s1, { lines: 1 });
      if (y0 === 0) walls2d.push(axis === 'x' ? { x0: s0, x1: s1, z0: t0, z1: t1 } : { x0: t0, x1: t1, z0: s0, z1: s1 });
      if (y0 === 0 && mat === M.wall) {
        const o = { lines: 0, cast: false };
        if (axis === 'x') { bx(root, M.whitePaint, s0, s1, 0, 0.08, t0 - 0.012, t0, o); bx(root, M.whitePaint, s0, s1, 0, 0.08, t1, t1 + 0.012, o); }
        else { bx(root, M.whitePaint, t0 - 0.012, t0, 0, 0.08, s0, s1, o); bx(root, M.whitePaint, t1, t1 + 0.012, 0, 0.08, s0, s1, o); }
      }
    };
    let cur = a0;
    [...openings].sort((p, q) => p.a - q.a).forEach((o) => {
      piece(cur, o.a, 0, H);
      piece(o.a, o.b, 0, o.sill || 0);
      piece(o.a, o.b, o.head, H);
      cur = o.b;
      if (!o.kind) {
        const c = (u0, u1, y0, y1) => (axis === 'x'
          ? bx(root, M.whitePaint, u0, u1, y0, y1, t0 - 0.015, t1 + 0.015, { lines: 0.4 })
          : bx(root, M.whitePaint, t0 - 0.015, t1 + 0.015, y0, y1, u0, u1, { lines: 0.4 }));
        c(o.a - 0.05, o.a + 0.008, 0, o.head + 0.05);
        c(o.b - 0.008, o.b + 0.05, 0, o.head + 0.05);
        c(o.a - 0.05, o.b + 0.05, o.head - 0.008, o.head + 0.05);
      }
    });
    piece(cur, a1, 0, H);
  };

  const north = [
    { a: 1.97, b: 3.12, sill: 0.85, head: 2.2, kind: 'win' },
    { a: 4.70, b: 5.90, sill: 0, head: 2.2, kind: 'bdoor' },
    { a: 7.55, b: 8.65, sill: 0.85, head: 2.2, kind: 'win' },
  ];
  const south = [
    { a: 0.85, b: 2.60, sill: 0.85, head: 2.2, kind: 'win' },
    { a: 3.70, b: 4.60, sill: 0.85, head: 2.2, kind: 'win' },
    { a: 5.70, b: 6.55, sill: 0.85, head: 2.2, kind: 'win' },
    { a: 7.75, b: 8.95, sill: 0.85, head: 2.2, kind: 'win' },
  ];
  wallRun('x', -EXT, 0, -EXT, W + EXT, north);
  wallRun('x', D, D + EXT, -EXT, W + EXT, south);
  wallRun('z', -EXT, 0, 0, D);
  wallRun('z', W, W + EXT, 0, D);

  // interior partitions
  wallRun('x', 3.95, 4.05, 0, W, [
    { a: 3.35, b: 5.50, sill: 0, head: 2.25 },
    { a: 6.85, b: 7.65, sill: 0, head: 2.05 },
  ]);
  wallRun('z', 1.70, 1.80, 0, 3.95, [{ a: 1.40, b: 2.20, sill: 0, head: 2.05 }]);
  wallRun('x', 1.65, 1.75, 0, 1.0);
  wallRun('z', 6.50, 6.60, 0, 3.95);
  wallRun('z', 3.10, 3.20, 4.05, D, [{ a: 4.10, b: 4.90, sill: 0, head: 2.05 }]);
  wallRun('x', 4.95, 5.05, 3.20, W, [
    { a: 4.05, b: 4.85, sill: 0, head: 2.05 },
    { a: 7.95, b: 8.75, sill: 0, head: 2.1 },
  ]);
  wallRun('z', 6.80, 6.90, 5.05, D);

  // --- windows ----------------------------------------------------------------
  const windowIn = (o, zOut, zIn, inward) => {
    const zc = zOut + (zIn - zOut) * 0.4;
    const f = 0.06, dpt = 0.07;
    const z0 = zc - dpt / 2, z1 = zc + dpt / 2;
    const y0 = o.sill || 0;
    bx(root, M.frame, o.a, o.b, o.head - f, o.head, z0, z1);
    bx(root, M.frame, o.a, o.b, y0, y0 + f, z0, z1);
    bx(root, M.frame, o.a, o.a + f, y0, o.head, z0, z1);
    bx(root, M.frame, o.b - f, o.b, y0, o.head, z0, z1);
    const mid = (o.a + o.b) / 2;
    if (o.b - o.a > 0.8) bx(root, M.frame, mid - f / 2, mid + f / 2, y0, o.head, z0, z1);
    if (o.kind === 'win') bx(root, M.frame, o.a, o.b, o.head - 0.5, o.head - 0.5 + f, z0, z1);
    bx(root, M.glass, o.a + f, o.b - f, y0 + f, o.head - f, zc - 0.006, zc + 0.006, { lines: 0, cast: false });
    // inner sill board
    const zr = zc + (inward * dpt) / 2, zEnd = zIn + inward * 0.03;
    if (o.kind === 'win') {
      bx(root, M.marble, o.a - 0.02, o.b + 0.02, o.sill - 0.03, o.sill, Math.min(zr, zEnd), Math.max(zr, zEnd));
      // radiator under the window
      const rz0 = inward > 0 ? zIn + 0.03 : zIn - 0.11;
      bx(root, M.radiator, o.a + 0.05, o.b - 0.05, 0.15, 0.68, rz0, rz0 + 0.08, { lines: 0.45 });
    }
  };
  north.forEach((o) => windowIn(o, -EXT, 0, +1));
  south.forEach((o) => windowIn(o, D + EXT, D, -1));

  // --- doors --------------------------------------------------------------------
  // hinge at (hx, hz); leaf extends along local +x; yaw = atan2(-dz, dx)
  const yawOf = (dx, dz) => Math.atan2(-dz, dx);
  const door = (name, hx, hz, closedDir, openDir, w, h, openFrac = 1, mat = M.whitePaint) => {
    const pivot = new THREE.Group();
    pivot.position.set(hx, 0, hz);
    const leaf = bx(pivot, mat, 0.01, w - 0.01, 0, h, -0.02, 0.02, { lines: 0.8 });
    // handle
    cyl(pivot, M.steel, w - 0.08, 1.0, 1.02, 0.05, 0.01, { lines: 0 });
    root.add(pivot);
    const c = yawOf(...closedDir), o = yawOf(...openDir);
    let delta = o - c;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    const d = { pivot, closed: c, delta, w, hx, hz, set(f) { pivot.rotation.y = c + delta * f; } };
    d.set(openFrac);
    doors[name] = d;
    return d;
  };
  door('front', 8.75, 5.0, [-1, 0], [0, -1], 0.80, 2.08, 0, M.oakPlain);
  door('child', 6.85, 4.0, [1, 0], [0, -1], 0.80, 2.03);
  door('master', 3.15, 4.10, [0, 1], [-1, 0], 0.80, 2.03);
  door('living', 4.05, 5.0, [1, 0], [0, 1], 0.80, 2.03);
  door('lobby', 1.75, 2.20, [0, -1], [-1, 0], 0.80, 2.03);

  // =========================================================================
  // KITCHEN / DINING  (x 1.80-6.50, z 0-3.95), kitchen run on the east wall
  // =========================================================================
  const kx0 = 5.90, kx1 = 6.50;
  // plinth, carcass, worktop
  bx(root, M.kitchenFront, kx0 + 0.06, kx1, 0, 0.10, 0.60, 3.35, { lines: 0.4 });
  bx(root, M.kitchenFront, kx0 + 0.02, kx1, 0.10, 0.88, 0.60, 3.35, { lines: 0 });
  const fronts = [[0.60, 1.20], [1.20, 1.80], [1.80, 2.40], [2.40, 2.75], [2.75, 3.35]];
  fronts.forEach(([a, b]) => {
    bx(root, M.kitchenFront, kx0, kx0 + 0.02, 0.105, 0.875, a + 0.002, b - 0.002, { lines: 0.45 });
  });
  bx(root, M.worktop, kx0 - 0.02, kx1, 0.88, 0.92, 0.60, 3.35, { lines: 0.6 });
  // sink and tap
  bx(root, M.steel, kx0 + 0.06, kx0 + 0.46, 0.905, 0.922, 1.15, 1.65, { lines: 0.4, cast: false });
  cyl(root, M.steel, kx1 - 0.08, 0.92, 1.22, 1.40, 0.014, { lines: 0.3 });
  bx(root, M.steel, kx1 - 0.30, kx1 - 0.08, 1.20, 1.225, 1.39, 1.41, { lines: 0.3 });
  // hob
  bx(root, M.blackGlass, kx0 + 0.04, kx0 + 0.56, 0.92, 0.926, 2.50, 3.10, { lines: 0.4, cast: false });
  // tall units: oven column at the window end, fridge column at the hall end
  const tall = (z0, z1) => {
    bx(root, M.kitchenFront, kx0 + 0.02, kx1, 0, 2.25, z0, z1, { lines: 0.5 });
    bx(root, M.kitchenFront, kx0, kx0 + 0.02, 0.10, 2.23, z0 + 0.003, z1 - 0.003, { lines: 0.45 });
  };
  tall(0.02, 0.60);
  tall(3.35, 3.93);
  bx(root, M.blackGlass, kx0 - 0.003, kx0, 0.95, 1.55, 0.08, 0.54, { lines: 0.3 });
  // upper cabinets with LED strip
  bx(root, M.kitchenFront, kx1 - 0.35, kx1, 1.55, 2.25, 0.60, 3.35, { lines: 0.5 });
  [[0.60, 1.30], [1.30, 2.00], [2.00, 2.68], [2.68, 3.35]].forEach(([a, b]) => {
    bx(root, M.kitchenFront, kx1 - 0.37, kx1 - 0.35, 1.555, 2.245, a + 0.002, b - 0.002, { lines: 0.4 });
  });
  bx(root, M.ledStrip, kx1 - 0.33, kx1 - 0.30, 1.545, 1.55, 0.65, 3.30, { lines: 0, cast: false });
  // a few things on the worktop
  cyl(root, M.ceramic, kx0 + 0.25, 0.92, 1.12, 0.85, 0.07, { lines: 0.3 });
  cyl(root, M.oakPlain, kx0 + 0.30, 0.92, 0.94, 2.10, 0.16, { lines: 0.3 });
  bx(root, M.oakPlain, kx0 + 0.12, kx0 + 0.47, 0.92, 0.945, 1.80, 2.25, { lines: 0.3 });

  // dining table: oval, extended to 200 x 110, turned legs
  const tcx = 3.35, tcz = 1.10;
  {
    const root = furn;
    const top = new THREE.CylinderGeometry(1, 1, 0.04, 64);
    top.scale(1.0, 1, 0.55);
    top.computeVertexNormals();
    const m = addMesh(root, top, M.oak, { threshold: 30, lines: 0.7 });
    m.position.set(tcx, 0.72, tcz);
    const apr = new THREE.CylinderGeometry(1, 1, 0.08, 64, 1, true);
    apr.scale(0.86, 1, 0.43);
    apr.computeVertexNormals();
    const a = addMesh(root, apr, M.oakPlain, { lines: 0.3, threshold: 30 });
    a.position.set(tcx, 0.66, tcz);
    const prof = [[0, 0], [0.028, 0], [0.03, 0.06], [0.022, 0.1], [0.034, 0.2], [0.024, 0.32], [0.03, 0.42], [0.02, 0.52], [0.026, 0.62], [0.026, 0.7], [0, 0.7]].map(([r, y]) => new THREE.Vector2(r, y));
    const legGeo = new THREE.LatheGeometry(prof, 14);
    [[-0.62, -0.30], [0.62, -0.30], [-0.62, 0.30], [0.62, 0.30]].forEach(([dx, dz]) => {
      const l = addMesh(root, legGeo, M.oakPlain, { lines: 0.3, threshold: 50 });
      l.position.set(tcx + dx, 0, tcz + dz);
    });
    // fruit bowl + candles + a jug
    const bowl = new THREE.SphereGeometry(0.13, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const b = addMesh(root, bowl, M.ceramic, { lines: 0.3, threshold: 40 });
    b.material.side = THREE.DoubleSide;
    b.position.set(tcx - 0.15, 0.87, tcz);
    b.scale.set(1, 0.6, 1);
    cyl(root, M.ceramic, tcx + 0.35, 0.74, 0.80, tcz - 0.05, 0.035, { lines: 0.3 });
    cyl(root, M.linenWhite, tcx + 0.35, 0.80, 1.02, tcz - 0.05, 0.011, { lines: 0.2 });
    cyl(root, M.ceramic, tcx + 0.55, 0.74, 0.80, tcz + 0.08, 0.035, { lines: 0.3 });
    cyl(root, M.linenWhite, tcx + 0.55, 0.80, 0.98, tcz + 0.08, 0.011, { lines: 0.2 });
    cyl(root, M.ceramic, tcx - 0.55, 0.74, 0.92, tcz + 0.12, 0.06, { lines: 0.3, rTop: 0.045 });
  }
  // six paper-cord chairs and the Tripp Trapp
  [2.82, 3.35, 3.88].forEach((x) => {
    chair(group(furn, x, 0.30, 0), M);
    chair(group(furn, x, 1.92, 180), M);
  });
  trippTrapp(group(furn, 4.58, 1.10, -90), M);

  // rattan pendant over the table
  {
    const g = new THREE.SphereGeometry(0.32, 40, 20);
    g.scale(1, 0.72, 1);
    const c = document.createElement('canvas');
    c.width = 512; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, 512, 64);
    x.fillStyle = '#fff';
    for (let i = 0; i < 48; i++) x.fillRect(i * (512 / 48), 0, 4, 64);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    const mat = M.rattan.clone();
    mat.onBeforeCompile = M.rattan.onBeforeCompile;
    mat.alphaMap = t; mat.alphaTest = 0.5;
    const m = addMesh(hanging, g, mat, { lines: 0, cast: false });
    m.position.set(tcx, 1.82, tcz);
    const rim = new THREE.TorusGeometry(0.32, 0.006, 6, 48);
    rim.rotateX(Math.PI / 2);
    const r = addMesh(hanging, rim, M.rattan, { lines: 0, cast: false });
    r.position.set(tcx, 1.82, tcz);
    cyl(hanging, M.black, tcx, 2.05, H, tcz, 0.004, { lines: 0, cast: false });
    const bulb = new THREE.SphereGeometry(0.045, 16, 10);
    addMesh(hanging, bulb, M.bulb, { lines: 0, cast: false }).position.set(tcx, 1.80, tcz);
    lights.push({ kind: 'pendant', pos: new THREE.Vector3(tcx, 1.76, tcz), room: 'kitchen' });
  }

  // bookcase on the west wall, facing east
  bookcase(group(furn, 1.95, 0.72, 90), M, 1.10, 1.85);
  // desk with lamp and laptop, chair
  {
    const root = furn;
    bx(root, M.oak, 1.80, 2.42, 0.71, 0.74, 2.70, 3.90, { lines: 0.6 });
    [[1.84, 2.74], [2.38, 2.74], [1.84, 3.86], [2.38, 3.86]].forEach(([x, z]) => bx(root, M.whitePaint, x - 0.02, x + 0.02, 0, 0.71, z - 0.02, z + 0.02, { lines: 0.3 }));
    // flowerpot-style lamp
    cyl(root, M.ceramic, 1.98, 0.74, 0.76, 3.70, 0.08, { lines: 0.3 });
    cyl(root, M.ceramic, 1.98, 0.76, 1.08, 3.70, 0.012, { lines: 0.2 });
    const sh = new THREE.SphereGeometry(0.11, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const s = addMesh(root, sh, M.ceramic, { lines: 0.3, threshold: 40 });
    s.position.set(1.98, 1.06, 3.70);
    // laptop
    bx(root, M.steel, 2.05, 2.30, 0.74, 0.755, 3.05, 3.40, { lines: 0.3 });
    const lid = bx(root, M.steel, 0, 0.012, 0, 0.23, -0.175, 0.175, { lines: 0.3 });
    lid.position.set(2.05, 0.755 + 0.11, 3.225);
    lid.rotation.z = -0.25;
    chair(group(root, 2.62, 3.25, -90), M);
  }
  // fig tree in a pot by the window
  plant(furn, M, 4.55, 0.35, 1.5);
  curtain(fixedRoot, M, 4.30, 4.66, 0.06);

  // =========================================================================
  // BALCONY (x 3.40-6.40, z -1.60 to -0.30)
  // =========================================================================
  {
    const bz0 = -1.60, bz1 = -EXT;
    bx(root, M.marble, 3.40, 6.40, -0.18, -0.03, bz0, bz1, { lines: 0.8 });
    const rail = (x0, x1, z0, z1) => bx(root, M.bikeFrame, x0, x1, 1.0, 1.04, z0, z1, { lines: 0.5 });
    rail(3.40, 6.40, bz0, bz0 + 0.04); rail(3.40, 3.44, bz0, bz1); rail(6.36, 6.40, bz0, bz1);
    for (let x = 3.42; x <= 6.40; x += 0.75) bx(root, M.bikeFrame, x - 0.02, x + 0.02, -0.03, 1.0, bz0, bz0 + 0.04, { lines: 0.5 });
    bx(root, M.glass, 3.42, 6.38, 0.05, 0.98, bz0 + 0.01, bz0 + 0.03, { lines: 0, cast: false });
    // bistro table and two chairs
    cyl(root, M.bikeFrame, 4.20, -0.03, 0.72, -1.05, 0.02, { lines: 0.3 });
    cyl(root, M.oakPlain, 4.20, 0.72, 0.745, -1.05, 0.30, { lines: 0.5, seg: 32 });
    chair(group(root, 3.80, -1.00, 90, -0.03), M);
    chair(group(root, 4.62, -0.98, -90, -0.03), M);
    plant(root, M, 6.05, -1.25, 1.1);
    plant(root, M, 5.75, -1.30, 0.7);
  }

  // =========================================================================
  // HALL
  // =========================================================================
  bx(root, M.whitePaint, 8.76, W, 0, 2.30, 4.05, 4.95, { lines: 0.6 });   // tall cupboard
  bx(root, M.whitePaint, 8.75, 8.76, 0.05, 2.28, 4.06, 4.49, { lines: 0.5 });
  bx(root, M.whitePaint, 8.75, 8.76, 0.05, 2.28, 4.51, 4.94, { lines: 0.5 });
  // coat rail and a bench at the entrance
  bx(root, M.oakPlain, 5.70, 6.70, 0.42, 0.45, 4.06, 4.36, { lines: 0.5 });
  bx(root, M.cord, 5.72, 6.68, 0.40, 0.42, 4.08, 4.34, { lines: 0.3 });
  [[5.73, 4.09], [6.67, 4.09], [5.73, 4.33], [6.67, 4.33]].forEach(([x, z]) => bx(root, M.oakPlain, x - 0.02, x + 0.02, 0, 0.40, z - 0.02, z + 0.02, { lines: 0.3 }));
  // hall pendant lights
  [5.2, 7.4].forEach((x) => {
    const s = new THREE.SphereGeometry(0.11, 20, 12);
    addMesh(hanging, s, M.shade, { lines: 0, cast: false }).position.set(x, 2.25, 4.5);
  });
  lights.push({ kind: 'hall', pos: new THREE.Vector3(6.3, 2.2, 4.5), room: 'hall' });

  // =========================================================================
  // CHILD (x 6.60-9.35, z 0-3.95)
  // =========================================================================
  {
    const root = furn;
    const g = group(root, 8.90, 0.25, 0);
    bed(g, M, 0.90, 2.00, 0.30, M.pine, M.linenWhite);
    dresser(group(root, 6.86, 2.00, 90), M, 1.0, 0.95);
    bx(root, M.whitePaint, 6.62, 7.12, 0, 0.58, 2.62, 3.12, { lines: 0.6 });
    [[6.75, 2.75], [6.99, 2.75], [6.75, 2.99], [6.99, 2.99]].forEach(([x, z]) => cyl(root, M.whitePaint, x, 0.58, 0.63, z, 0.06, { lines: 0.3 }));
    bx(root, M.rugKid, 7.25, 8.35, 0, 0.012, 0.60, 2.60, { lines: 0.5, cast: false });
    cyl(hanging, M.shade, 7.95, 2.0, 2.35, 1.9, 0.22, { lines: 0, cast: false, seg: 24 });
    lights.push({ kind: 'room', pos: new THREE.Vector3(7.95, 1.85, 1.9), room: 'child' });
    [0, 1, 2].forEach((i) => bx(root, M.toy[i], 8.97, 9.33, 0, 0.28, 2.50 + i * 0.42, 2.88 + i * 0.42, { lines: 0.4 }));
    curtain(fixedRoot, M, 7.12, 7.50, 0.06);
  }

  // =========================================================================
  // LIVING / TV (x 3.20-6.80, z 5.05-8.35) with the bike trainer
  // =========================================================================
  {
    const root = furn;
    bx(root, M.rug, 4.05, 6.05, 0, 0.012, 5.95, 7.30, { lines: 0.5, cast: false });
    swap.sofa = group(root, 3.68, 7.00, 90);
    sofa(swap.sofa, M, 2.0, 0.95);
    // two-tier round side table
    cyl(root, M.oak, 4.80, 0.42, 0.45, 6.70, 0.30, { lines: 0.5, seg: 40 });
    cyl(root, M.oak, 4.80, 0.18, 0.20, 6.70, 0.28, { lines: 0.4, seg: 40 });
    [0, 1, 2, 3].forEach((i) => {
      const a = (i / 4) * Math.PI * 2 + 0.6;
      cyl(root, M.oakPlain, 4.80 + Math.cos(a) * 0.24, 0, 0.42, 6.70 + Math.sin(a) * 0.24, 0.017, { lines: 0.3 });
    });
    // TV on the stairwell wall, low shelf under it
    bx(root, M.screen, 6.765, 6.80, 0.80, 1.51, 6.05, 7.29, { lines: 0.6 });
    bx(root, M.whitePaint, 6.45, 6.80, 0, 0.45, 6.30, 7.04, { lines: 0.5 });
    for (let i = 0; i < 6; i++) bx(root, M.books[i], 6.50, 6.72, 0.03, 0.28 + (i % 3) * 0.03, 6.36 + i * 0.05, 6.40 + i * 0.05, { lines: 0.2 });
    swap.armchair = group(root, 6.25, 5.55, -45);
    armchair(swap.armchair, M);
    bike(group(root, 5.45, 7.85, 0), M);
    swap.lamp = cyl(hanging, M.shade, 5.0, 2.05, 2.4, 6.7, 0.25, { lines: 0, cast: false, seg: 24, rTop: 0.12 });
    lights.push({ kind: 'room', pos: new THREE.Vector3(5.0, 1.9, 6.7), room: 'living' });
    curtain(fixedRoot, M, 4.64, 4.98, 8.28); curtain(fixedRoot, M, 5.32, 5.66, 8.28);
    art(fixedRoot, M, 3.2, 6.20, 6.85, 1.15, 2.0, 3);
    art(fixedRoot, M, 3.2, 7.10, 7.60, 1.30, 1.95, 8);
  }

  // =========================================================================
  // MASTER (x 0-3.10, z 4.05-8.35)
  // =========================================================================
  {
    const root = furn;
    bx(root, M.whitePaint, 0, 2.15, 0, 2.36, 4.05, 4.65, { lines: 0.6 });
    for (let i = 0; i < 4; i++) bx(root, M.whitePaint, i * 0.5375 + 0.003, (i + 1) * 0.5375 - 0.003, 0.02, 2.34, 4.65, 4.67, { lines: 0.45 });
    bed(group(root, 0.02, 6.20, 90), M, 1.60, 2.00, 0.30, M.pine, M.gingham);
    bx(root, M.pine, 0, 0.40, 0, 0.50, 5.00, 5.35, { lines: 0.5 });
    bx(root, M.pine, 0, 0.40, 0, 0.50, 7.05, 7.40, { lines: 0.5 });
    dresser(group(root, 2.86, 7.10, -90), M, 1.0, 0.95);
    // paper-cord bench under the window
    bx(root, M.oakPlain, 0.95, 1.95, 0.42, 0.45, 7.82, 8.20, { lines: 0.5 });
    bx(root, M.cord, 0.97, 1.93, 0.40, 0.42, 7.84, 8.18, { lines: 0.3 });
    const sg = new THREE.SphereGeometry(0.28, 24, 16);
    addMesh(hanging, sg, M.shade, { lines: 0, cast: false }).position.set(1.4, 2.0, 6.2);
    lights.push({ kind: 'room', pos: new THREE.Vector3(1.4, 1.6, 6.2), room: 'master' });
    curtain(fixedRoot, M, 0.42, 0.82, 8.28); curtain(fixedRoot, M, 2.63, 3.02, 8.28);
    art(fixedRoot, M, 0, 5.75, 6.65, 1.30, 1.95, 5);
  }

  // =========================================================================
  // BATH, BACK STAIR, STAIRWELL
  // =========================================================================
  {
    // toilet, basin, shower, washer column
    bx(root, M.ceramic, 0.02, 0.22, 0.40, 0.80, 2.45, 2.85, { lines: 0.5 });
    rbx(root, M.ceramic, 0.18, 0.66, 0, 0.42, 2.47, 2.83, 0.08, { lines: 0.5 });
    rbx(root, M.ceramic, 0.02, 0.48, 0.80, 0.92, 3.25, 3.80, 0.04, { lines: 0.5 });
    bx(root, M.glass, 0.80, 0.82, 0, 2.0, 3.0, 3.95, { lines: 0.6, cast: false });
    bx(root, M.whitePaint, 1.12, 1.70, 0, 1.75, 2.30, 2.88, { lines: 0.6 });
    // spiral back stair
    cyl(root, M.bikeFrame, 0.85, -0.5, H, 0.80, 0.035, { lines: 0.4 });
    for (let i = 0; i < 13; i++) {
      const p = new THREE.Group();
      p.position.set(0.85, 0, 0.80);
      p.rotation.y = -i * 0.42;
      root.add(p);
      bx(p, M.oakPlain, 0.03, 0.74, -0.30 + i * 0.19, -0.26 + i * 0.19, -0.13, 0.13, { lines: 0.6 });
    }
    // main stair: two flights with a centre wall
    const steps = 11;
    for (let i = 0; i < steps; i++) {
      const z0 = 6.20 + i * 0.19;
      bx(root, M.marble, 6.92, 8.28, -0.17 * (i + 1) - 0.05, -0.17 * (i + 1), z0, z0 + 0.19, { lines: 0.6 });
      bx(root, M.marble, 8.42, 9.33, 0.17 * i, 0.17 * (i + 1), z0, z0 + 0.19, { lines: 0.6 });
    }
    bx(root, M.wall, 8.30, 8.40, -2.0, 1.0, 6.20, 8.35, { lines: 1 });
    bx(root, M.oakPlain, 8.28, 8.42, 1.0, 1.05, 6.20, 8.35, { lines: 0.5 });
  }

  // =========================================================================
  // OUTSIDE: garden, trees and sky beyond the balcony
  // =========================================================================
  {
    const gnd = new THREE.PlaneGeometry(120, 80);
    gnd.rotateX(-Math.PI / 2);
    const g = addMesh(outside, gnd, M.grass, { lines: 0, cast: false });
    g.position.set(4.7, -1.3, -38);
    const rnd = mulberry(7);
    const trees = [[-2.5, -13], [4.0, -16], [9.0, -12], [14, -17], [0.5, -24], [7.0, -26], [17, -24], [-8, -19], [11.5, -33], [2.5, -36]];
    trees.forEach(([x, z], i) => {
      cyl(outside, M.trunk, x, -1.3, 2.2, z, 0.28, { lines: 0, rTop: 0.16 });
      for (let k = 0; k < 13; k++) {
        const r = 0.9 + rnd() * 1.5;
        const s = new THREE.SphereGeometry(r, 16, 12);
        {
          const pa = s.attributes.position;
          for (let q = 0; q < pa.count; q++) {
            const X = pa.getX(q), Y = pa.getY(q), Z = pa.getZ(q);
            const n = 1 + 0.16 * Math.sin(X * 4.1 + i) * Math.sin(Y * 3.7 + k) + 0.1 * Math.sin(Z * 6.3 + X * 2.0);
            pa.setXYZ(q, X * n, Y * n, Z * n);
          }
          s.computeVertexNormals();
        }
        const m = addMesh(outside, s, M.tree[(i + k) % 4], { lines: 0, cast: false });
        m.position.set(x + (rnd() - 0.5) * 4.2, 2.2 + rnd() * rnd() * 8.0, z + (rnd() - 0.5) * 4.2);
        m.scale.set(1, 0.9 + rnd() * 0.3, 1);
      }
    });
    bx(outside, M.tree[1], -25, 35, -1.3, 0.7, -9.2, -8.2, { lines: 0, cast: false });
  }

  // the street side: pavement and the houses opposite, seen from the ground floor
  {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const x = c.getContext('2d');
    const cols = ['#a8644f', '#d9d3c7', '#b9755c', '#c9b79a'];
    for (let i = 0; i < 4; i++) {
      x.fillStyle = cols[i]; x.fillRect(i * 256, 0, 256, 512);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
        x.fillStyle = '#f1eee6'; x.fillRect(i * 256 + 28 + k * 60, 36 + r * 118, 22, 84);
        x.fillStyle = '#39424a'; x.fillRect(i * 256 + 31 + k * 60, 40 + r * 118, 16, 76);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const mat = M.grass.clone();
    mat.onBeforeCompile = M.grass.onBeforeCompile;
    mat.color.set(0xffffff); mat.map = t;
    const g = new THREE.PlaneGeometry(64, 14);
    g.rotateY(Math.PI);
    addMesh(outside, g, mat, { lines: 0, cast: false }).position.set(4.7, 5.7, 27);
    const pg = new THREE.PlaneGeometry(90, 20);
    pg.rotateX(-Math.PI / 2);
    addMesh(outside, pg, M.pot, { lines: 0, cast: false }).position.set(4.7, -1.3, 18);
  }

  root.add(outside);
  return { root, hanging, ceilings, outside, doors, lights, swap, furn, walls2d };
}

// ---------------------------------------------------------------------------
// Furniture, built in local space. Front faces local +z unless noted.
// ---------------------------------------------------------------------------
function chair(g, M) {
  const s = 0.21;
  [[-s + 0.02, -s + 0.02], [s - 0.02, -s + 0.02], [-s + 0.02, s - 0.02], [s - 0.02, s - 0.02]].forEach(([x, z], i) => {
    const top = i < 2 ? 0.82 : 0.44;
    cyl(g, M.oakPlain, x, 0, top, z, 0.016, { lines: 0.35, seg: 10 });
  });
  bx(g, M.oakPlain, -s, s, 0.40, 0.44, -s, s, { lines: 0.4 });
  bx(g, M.cord, -s + 0.02, s - 0.02, 0.44, 0.455, -s + 0.02, s - 0.02, { lines: 0.3 });
  bx(g, M.oakPlain, -s, s, 0.68, 0.80, -s, -s + 0.03, { lines: 0.45 });
  bx(g, M.oakPlain, -s, s, 0.18, 0.20, -s + 0.01, -s + 0.03, { lines: 0.25 });
}

function trippTrapp(g, M) {
  const side = (x) => {
    const p = bx(g, M.oakPlain, x - 0.013, x + 0.013, 0, 0.82, -0.04, 0.04, { lines: 0.45 });
    p.rotation.x = -0.32; p.position.z = -0.07;
    bx(g, M.oakPlain, x - 0.013, x + 0.013, 0, 0.04, -0.25, 0.20, { lines: 0.4 });
  };
  side(-0.20); side(0.20);
  bx(g, M.oakPlain, -0.20, 0.20, 0.50, 0.52, -0.08, 0.20, { lines: 0.4 });
  bx(g, M.oakPlain, -0.20, 0.20, 0.25, 0.27, 0.00, 0.24, { lines: 0.4 });
  bx(g, M.oakPlain, -0.20, 0.20, 0.62, 0.68, -0.20, -0.18, { lines: 0.4 });
  bx(g, M.oakPlain, -0.20, 0.20, 0.74, 0.80, -0.24, -0.22, { lines: 0.4 });
}

function bookcase(g, M, w, h) {
  const d = 0.30, t = 0.02;
  bx(g, M.whitePaint, -w / 2, -w / 2 + t, 0, h, -d / 2, d / 2, { lines: 0.6 });
  bx(g, M.whitePaint, w / 2 - t, w / 2, 0, h, -d / 2, d / 2, { lines: 0.6 });
  bx(g, M.whitePaint, -w / 2, w / 2, h - t, h, -d / 2, d / 2, { lines: 0.6 });
  bx(g, M.whitePaint, -w / 2, w / 2, 0, 0.08, -d / 2, d / 2, { lines: 0.6 });
  bx(g, M.whitePaint, -w / 2, w / 2, 0, h, -d / 2, -d / 2 + 0.01, { lines: 0 });
  const rnd = mulberry(11);
  const shelves = [0.08, 0.46, 0.84, 1.22, 1.55];
  shelves.forEach((y, si) => {
    if (si > 0) bx(g, M.whitePaint, -w / 2 + t, w / 2 - t, y - t, y, -d / 2, d / 2, { lines: 0.5 });
    if (si >= 4) return;
    let x = -w / 2 + t + 0.01;
    const lim = w / 2 - t - (si === 1 ? 0.35 : 0.02);
    while (x < lim) {
      const bw = 0.025 + rnd() * 0.03, bh = 0.2 + rnd() * 0.1;
      if (x + bw > lim) break;
      bx(g, M.books[Math.floor(rnd() * M.books.length)], x, x + bw, y, y + bh, -d / 2 + 0.03, d / 2 - 0.04 - rnd() * 0.04, { lines: 0.18 });
      x += bw + 0.002;
    }
    if (si === 1) {
      const v = addMesh(g, new THREE.CylinderGeometry(0.06, 0.08, 0.22, 20), M.terracotta, { lines: 0.3, threshold: 30 });
      v.position.set(w / 2 - 0.17, y + 0.11, 0);
    }
  });
  // vase with flowers on top
  cyl(g, M.ceramic, -0.25, h, h + 0.24, 0, 0.07, { lines: 0.3, rTop: 0.05 });
  cyl(g, M.terracotta, 0.20, h, h + 0.16, 0, 0.06, { lines: 0.3 });
}

function dresser(g, M, w, h) {
  const d = 0.48;
  bx(g, M.whitePaint, -w / 2, w / 2, 0.08, h, -d / 2, d / 2, { lines: 0.6 });
  bx(g, M.whitePaint, -w / 2 - 0.02, w / 2 + 0.02, h - 0.03, h, -d / 2 - 0.02, d / 2 + 0.02, { lines: 0.5 });
  [0.12, 0.33, 0.54, 0.74].forEach((y) => {
    bx(g, M.whitePaint, -w / 2 + 0.04, w / 2 - 0.04, y, y + 0.18, d / 2, d / 2 + 0.012, { lines: 0.4 });
    bx(g, M.steel, -0.06, 0.06, y + 0.08, y + 0.10, d / 2 + 0.012, d / 2 + 0.03, { lines: 0.2 });
  });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => cyl(g, M.whitePaint, sx * (w / 2 - 0.04), 0, 0.08, sz * (d / 2 - 0.04), 0.025, { lines: 0.3 }));
}

// head at local z = 0, foot at z = l, width along x
function bed(g, M, w, l, frameH, frameMat, duvetMat) {
  bx(g, frameMat, -w / 2 - 0.05, w / 2 + 0.05, 0.08, frameH, 0, l + 0.08, { lines: 0.6 });
  [[-1, 0.2], [1, 0.2], [-1, l - 0.1], [1, l - 0.1]].forEach(([sx, z]) => bx(g, frameMat, sx * (w / 2 - 0.05) - 0.05, sx * (w / 2 - 0.05) + 0.05, 0, 0.08, z - 0.05, z + 0.05, { lines: 0.4 }));
  rbx(g, M.linenWhite, -w / 2 + 0.01, w / 2 - 0.01, frameH, frameH + 0.20, 0.02, l, 0.04, { lines: 0.5 });
  rbx(g, duvetMat, -w / 2 - 0.02, w / 2 + 0.02, frameH + 0.14, frameH + 0.27, 0.45, l + 0.02, 0.06, { lines: 0.5 });
  const pw = w > 1 ? w / 2 - 0.08 : w - 0.15;
  const n = w > 1 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + 0.06 + i * (pw + 0.04);
    rbx(g, M.linenWhite, x0, x0 + pw, frameH + 0.18, frameH + 0.32, 0.06, 0.42, 0.06, { lines: 0.4 });
  }
}

function sofa(g, M, w, d) {
  const legH = 0.12;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => cyl(g, M.steel, sx * (w / 2 - 0.06), 0, legH, sz * (d / 2 - 0.08), 0.015, { lines: 0.3 }));
  rbx(g, M.linenGrey, -w / 2, w / 2, legH, legH + 0.26, -d / 2, d / 2, 0.03, { lines: 0.55 });
  rbx(g, M.linenGrey, -w / 2, w / 2, legH + 0.20, 0.80, -d / 2, -d / 2 + 0.20, 0.06, { lines: 0.55 });
  rbx(g, M.linenGrey, -w / 2, -w / 2 + 0.14, legH + 0.20, 0.62, -d / 2, d / 2, 0.06, { lines: 0.55 });
  rbx(g, M.linenGrey, w / 2 - 0.14, w / 2, legH + 0.20, 0.62, -d / 2, d / 2, 0.06, { lines: 0.55 });
  const cw = (w - 0.28) / 2;
  for (let i = 0; i < 2; i++) {
    const x0 = -w / 2 + 0.14 + i * cw;
    rbx(g, M.linenGrey, x0 + 0.005, x0 + cw - 0.005, legH + 0.26, legH + 0.42, -d / 2 + 0.20, d / 2 - 0.01, 0.06, { lines: 0.45 });
    rbx(g, M.linenGrey, x0 + 0.01, x0 + cw - 0.01, legH + 0.40, 0.86, -d / 2 + 0.10, -d / 2 + 0.32, 0.08, { lines: 0.45 });
  }
  // cushions
  rbx(g, M.linenWhite, -w / 2 + 0.2, -w / 2 + 0.62, 0.55, 0.92, -d / 2 + 0.30, -d / 2 + 0.44, 0.07, { lines: 0.35 });
  rbx(g, M.linenWhite, w / 2 - 0.62, w / 2 - 0.2, 0.55, 0.92, -d / 2 + 0.30, -d / 2 + 0.44, 0.07, { lines: 0.35 });
}

function armchair(g, M) {
  const s = 0.29;
  [[-s, -s], [s, -s], [-s, s], [s, s]].forEach(([x, z]) => cyl(g, M.oakPlain, x, 0, 0.62, z, 0.02, { lines: 0.35 }));
  bx(g, M.oakPlain, -s, s, 0.40, 0.44, -s, s, { lines: 0.4 });
  bx(g, M.cord, -s + 0.02, s - 0.02, 0.44, 0.46, -s + 0.02, s - 0.02, { lines: 0.3 });
  // curved back as a ring of spindles
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    cyl(g, M.oakPlain, Math.cos(a) * s, 0.44, 0.76, -Math.abs(Math.sin(a)) * s * 0.9 - (i === 0 || i === 8 ? 0 : 0.0), 0.01, { lines: 0.2, seg: 8 });
  }
  const arc = new THREE.TorusGeometry(s, 0.022, 6, 24, Math.PI);
  arc.rotateX(Math.PI / 2);
  const a = addMesh(g, arc, M.oakPlain, { lines: 0.3, threshold: 40 });
  a.position.y = 0.76; a.scale.z = 0.9; a.rotation.y = Math.PI;
}

// bike on a trainer, facing local +x
function bike(g, M) {
  const wr = 0.34;
  const wheel = (x) => {
    const t = new THREE.TorusGeometry(wr, 0.014, 8, 48);
    addMesh(g, t, M.tire, { lines: 0.5, threshold: 60 }).position.set(x, wr + 0.06, 0);
    const r = new THREE.TorusGeometry(wr - 0.025, 0.012, 6, 48);
    addMesh(g, r, M.bikeFrame, { lines: 0, threshold: 60 }).position.set(x, wr + 0.06, 0);
    cyl(g, M.steel, x, wr + 0.05, wr + 0.07, 0, 0.03, { lines: 0 }).rotation.x = Math.PI / 2;
  };
  wheel(-0.50); wheel(0.50);
  const hub = (x) => new THREE.Vector3(x, wr + 0.06, 0);
  const tube = (a, b, r = 0.016) => {
    const len = a.distanceTo(b);
    const c = new THREE.CylinderGeometry(r, r, len, 10);
    const m = addMesh(g, c, M.bikeFrame, { lines: 0.35, threshold: 40 });
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  };
  const bb = new THREE.Vector3(-0.08, 0.33, 0);
  const seatTop = new THREE.Vector3(-0.22, 0.86, 0);
  const headTop = new THREE.Vector3(0.38, 0.86, 0);
  const headLow = new THREE.Vector3(0.42, 0.72, 0);
  tube(bb, seatTop); tube(seatTop, headTop, 0.014); tube(bb, headLow, 0.02); tube(headTop, headLow);
  tube(bb, hub(-0.50), 0.01); tube(seatTop, hub(-0.50), 0.01);
  tube(headLow, hub(0.50), 0.012);
  tube(seatTop, new THREE.Vector3(-0.26, 0.95, 0), 0.013);
  bx(g, M.black, -0.36, -0.14, 0.95, 0.99, -0.06, 0.06, { lines: 0.4 });
  tube(headTop, new THREE.Vector3(0.44, 0.95, 0), 0.014);
  const bar = new THREE.CylinderGeometry(0.013, 0.013, 0.42, 10);
  bar.rotateX(Math.PI / 2);
  addMesh(g, bar, M.black, { lines: 0.3 }).position.set(0.47, 0.95, 0);
  // trainer frame under the rear wheel and a riser block under the front
  bx(g, M.bikeFrame, -0.62, -0.38, 0, 0.04, -0.35, 0.35, { lines: 0.5 });
  bx(g, M.bikeFrame, -0.56, -0.52, 0.04, 0.42, -0.06, 0.06, { lines: 0.4 });
  bx(g, M.bikeFrame, -0.64, -0.48, 0.04, 0.22, 0.06, 0.12, { lines: 0.4 });
  bx(g, M.black, 0.40, 0.60, 0, 0.06, -0.10, 0.10, { lines: 0.4 });
  // mat underneath
  bx(g, M.black, -0.85, 0.85, 0, 0.006, -0.40, 0.40, { lines: 0.4, cast: false });
}

function plant(parent, M, x, z, h) {
  cyl(parent, M.pot, x, 0, 0.32, z, 0.17, { lines: 0.45, rTop: 0.19 });
  cyl(parent, M.trunk, x, 0.3, h * 0.75, z, 0.015, { lines: 0.2 });
  const rnd = mulberry(Math.round(x * 100 + z * 10));
  for (let i = 0; i < 18; i++) {
    const g = new THREE.SphereGeometry(0.11, 8, 6);
    const m = addMesh(parent, g, M.leaf, { lines: 0.15, threshold: 80 });
    const a = rnd() * Math.PI * 2, r = 0.05 + rnd() * 0.22;
    m.position.set(x + Math.cos(a) * r, h * (0.45 + rnd() * 0.55), z + Math.sin(a) * r);
    m.scale.set(1, 0.25, 0.6);
    m.rotation.set(rnd() * 1.2, rnd() * 3, rnd() * 1.2);
  }
}

// linen curtain panel hanging in front of a wall, in the x-y plane at depth z
function curtain(parent, M, x0, x1, z, top = 2.3, _unused = false) {
  const w = x1 - x0, h = top - 0.03;
  const g = new THREE.PlaneGeometry(w, h, 28, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, 0.025 * Math.sin((p.getX(i) / w) * Math.PI * 9));
  g.computeVertexNormals();
  const m = addMesh(parent, g, M.curtain, { lines: 0.3, threshold: 80 });
  m.position.set((x0 + x1) / 2, 0.03 + h / 2, z);
  const rod = new THREE.CylinderGeometry(0.008, 0.008, w + 0.2, 8);
  rod.rotateZ(Math.PI / 2);
  addMesh(parent, rod, M.black, { lines: 0, cast: false }).position.set((x0 + x1) / 2, top + 0.01, z);
}

// framed abstract print on a wall at x = wx, facing +x
function art(parent, M, wx, z0, z1, y0, y1, seed) {
  const rnd = mulberry(seed * 31 + 7);
  const c = document.createElement('canvas');
  c.width = 384; c.height = Math.round((384 * (y1 - y0)) / (z1 - z0));
  const x = c.getContext('2d');
  x.fillStyle = '#efe9dd'; x.fillRect(0, 0, c.width, c.height);
  const pal = ['#b9c4c9', '#c8a98a', '#8f9f8c', '#d8c7a6', '#7d8a95', '#b98a78'];
  for (let i = 0; i < 6; i++) {
    x.globalAlpha = 0.55 + rnd() * 0.3;
    x.fillStyle = pal[Math.floor(rnd() * pal.length)];
    x.beginPath();
    x.ellipse(rnd() * c.width, rnd() * c.height, 40 + rnd() * 110, 30 + rnd() * 90, rnd() * 3, 0, Math.PI * (1 + rnd()));
    x.fill();
  }
  x.globalAlpha = 0.8; x.strokeStyle = '#3b3a37'; x.lineWidth = 2;
  for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(rnd() * c.width, rnd() * c.height, 60 + rnd() * 120, rnd() * 6, rnd() * 6 + 2); x.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const mat = M.ceramic.clone();
  mat.onBeforeCompile = M.ceramic.onBeforeCompile;
  mat.color.set(0xffffff); mat.roughness = 0.9; mat.map = t;
  bx(parent, M.oakPlain, wx, wx + 0.025, y0, y1, z0, z1, { lines: 0.5 });
  const g = new THREE.PlaneGeometry(z1 - z0 - 0.04, y1 - y0 - 0.04);
  g.rotateY(Math.PI / 2);
  addMesh(parent, g, mat, { lines: 0, cast: false }).position.set(wx + 0.027, (y0 + y1) / 2, (z0 + z1) / 2);
}

export function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Plan annotations: room names, dimensions, door swings, north arrow.
// These are drawn on the sheet and fade as the camera leaves the plan.
// ---------------------------------------------------------------------------
export function buildAnnotations(doors) {
  const g = new THREE.Group();
  const ink = '#1f1d1a';
  const lineMat = new THREE.LineBasicMaterial({ color: INK_HEX, transparent: true, opacity: 1, depthWrite: false });
  const fades = [lineMat];
  const Y = 0.02;

  const text = (lines, x, z, height, align = 'center') => {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const px = 96;
    const fonts = lines.map((l) => `${l.w || 500} ${Math.round(px * (l.s || 1))}px "Helvetica Neue", Helvetica, Arial, sans-serif`);
    let wmax = 0;
    lines.forEach((l, i) => {
      ctx.font = fonts[i];
      ctx.letterSpacing = `${(l.ls ?? 0.08) * px}px`;
      wmax = Math.max(wmax, ctx.measureText(l.t).width);
    });
    const lh = px * 1.25;
    const hTot = lines.reduce((a, l) => a + lh * (l.s || 1), 0);
    c.width = Math.ceil(wmax + px * 0.4);
    c.height = Math.ceil(hTot + px * 0.2);
    let y = px * 0.1;
    lines.forEach((l, i) => {
      ctx.font = fonts[i];
      ctx.letterSpacing = `${(l.ls ?? 0.08) * px}px`;
      ctx.fillStyle = ink;
      ctx.textBaseline = 'top';
      ctx.textAlign = align === 'left' ? 'left' : 'center';
      ctx.fillText(l.t, align === 'left' ? px * 0.2 : c.width / 2, y);
      y += lh * (l.s || 1);
    });
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const worldH = height * (c.height / (px * 1.25));
    const worldW = worldH * (c.width / c.height);
    const geo = new THREE.PlaneGeometry(worldW, worldH);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
    fades.push(mat);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(align === 'left' ? x + worldW / 2 : x, Y + 0.002, z);
    m.renderOrder = 5;
    g.add(m);
    return m;
  };
  const room = (name, dims, x, z, s = 1) => text([{ t: name, s: 1, w: 600 }, { t: dims, s: 0.72, w: 400 }], x, z, 0.2 * s);

  room('KITCHEN / DINING', '470 × 395', 3.95, 2.95);
  room('CHILD', '275 × 395', 7.75, 3.05);
  room('LIVING / TV', '360 × 330', 5.35, 5.55, 0.9);
  room('MASTER BEDROOM', '310 × 430', 1.35, 7.30, 0.85);
  text([{ t: 'HALL  590 × 90', s: 1, w: 600 }], 6.25, 4.60, 0.15);
  text([{ t: 'BATH', s: 1, w: 600 }], 0.55, 2.15, 0.15);
  text([{ t: 'BACK STAIR', s: 1, w: 600 }], 0.85, 0.35, 0.11);
  text([{ t: 'STAIRWELL', s: 1, w: 600 }], 8.12, 5.55, 0.15);
  text([{ t: 'BALCONY', s: 1, w: 600 }, { t: '300 × 130', s: 0.72, w: 400 }], 5.30, -0.80, 0.17);

  const seg = [];
  const L = (x0, z0, x1, z1) => seg.push(x0, Y, z0, x1, Y, z1);
  // door swings: arc from closed to open position
  Object.values(doors).forEach((d) => {
    const n = 24;
    for (let i = 0; i < n; i++) {
      const a0 = d.closed + (d.delta * i) / n, a1 = d.closed + (d.delta * (i + 1)) / n;
      L(d.hx + Math.cos(a0) * d.w, d.hz - Math.sin(a0) * d.w, d.hx + Math.cos(a1) * d.w, d.hz - Math.sin(a1) * d.w);
    }
  });
  // dimension chains, like the architect's sheet
  const tick = (x, z) => L(x - 0.09, z + 0.09, x + 0.09, z - 0.09);
  const dimX = (z, xs, labels) => {
    L(xs[0] - 0.15, z, xs[xs.length - 1] + 0.15, z);
    xs.forEach((x) => { tick(x, z); L(x, z - 0.15, x, z + 0.25); });
    labels.forEach((t, i) => text([{ t, s: 1, w: 400, ls: 0.04 }], (xs[i] + xs[i + 1]) / 2, z - 0.2, 0.15));
  };
  const dimZ = (x, zs, labels) => {
    L(x, zs[0] - 0.15, x, zs[zs.length - 1] + 0.15);
    zs.forEach((z) => { tick(x, z); L(x - 0.25, z, x + 0.15, z); });
    labels.forEach((t, i) => text([{ t, s: 1, w: 400, ls: 0.04 }], x + 0.32, (zs[i] + zs[i + 1]) / 2, 0.15, 'left'));
  };
  dimX(D + EXT + 0.75, [0, 3.10, 6.80, W], ['310', '360', '255']);
  dimX(D + EXT + 1.35, [-EXT, W + EXT], ['995']);
  dimZ(W + EXT + 0.7, [0, 3.95, 4.95, D], ['395', '90', '330']);
  dimX(-EXT - 1.9, [1.80, 6.50, W], ['470', '275']);
  // north arrow: north is to the left on this sheet (the balcony faces east)
  {
    const cx = W + 1.9, cz = -1.2, r = 0.42;
    for (let i = 0; i < 40; i++) {
      const a0 = (i / 40) * Math.PI * 2, a1 = ((i + 1) / 40) * Math.PI * 2;
      L(cx + Math.cos(a0) * r, cz + Math.sin(a0) * r, cx + Math.cos(a1) * r, cz + Math.sin(a1) * r);
    }
    L(cx + r * 0.8, cz, cx - r * 1.25, cz);
    L(cx - r * 1.25, cz, cx - r * 0.85, cz - 0.12);
    L(cx - r * 1.25, cz, cx - r * 0.85, cz + 0.12);
    text([{ t: 'N', s: 1, w: 600 }], cx - r * 1.75, cz, 0.2);
  }
  // scale bar 0-5 m
  {
    const x0 = -EXT, z = D + EXT + 2.1;
    L(x0, z, x0 + 5, z);
    for (let i = 0; i <= 5; i++) L(x0 + i, z - 0.08, x0 + i, z + 0.08);
    text([{ t: '0', s: 1, w: 400 }], x0, z + 0.25, 0.13);
    text([{ t: '5 m', s: 1, w: 400 }], x0 + 5, z + 0.25, 0.13);
  }
  // title block
  text([
    { t: 'NY MUNKEGADE 80', s: 1, w: 600, ls: 0.14 },
    { t: 'Ground floor apartment · plan 1:50', s: 0.62, w: 400, ls: 0.03 },
    { t: 'Layout version 2 · cut at 1.2 m', s: 0.62, w: 400, ls: 0.03 },
  ], W - 2.6, D + EXT + 1.75, 0.3, 'left');

  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  const ls = new THREE.LineSegments(lg, lineMat);
  ls.renderOrder = 5;
  g.add(ls);

  g.userData.setOpacity = (o) => { fades.forEach((m) => { m.opacity = o; }); g.visible = o > 0.001; };
  return g;
}

export { addMesh, bx, rbx, cyl, group, chair, trippTrapp, bookcase, dresser, bed, sofa, armchair, bike, plant };
