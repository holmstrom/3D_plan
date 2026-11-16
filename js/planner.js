// Planner: move, turn and add furniture on the plan, then walk through the rooms.
import * as THREE from 'three';
import { RoomEnvironment } from '../lib/three-addons/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from '../lib/three-addons/RectAreaLightUniformsLib.js';
import { U, buildMaterials, PAPER_HEX } from './materials.js?v=4';
import { buildApartment, H, W, D, EXT } from './model.js?v=4';
import { CATALOG, byType, buildCustom, DEFAULT_LAYOUT } from './catalog.js?v=4';

const STORE = 'nm80-layout-v1';
const PLAN_CUT = 2.0;          // below the door heads, so door openings show on the plan
const D2R = Math.PI / 180;
const $ = (s) => document.querySelector(s);

// --- renderer, scene, light ----------------------------------------------------
const canvas = $('#view');
const stage = $('.stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setClearColor(PAPER_HEX, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;

const M = buildMaterials();
const apt = buildApartment(M);
apt.furn.visible = false;          // the planner places its own furniture
apt.doors.front.set(1);
scene.add(apt.root);

// everything is shown with its materials: one reveal region covering the whole site
U.uRoomBox.value[0].set(-200, -200, 200, 200);
U.uRoomP.value[0].set(1, 1, 0, 0);

const skyTex = new THREE.TextureLoader().load('assets/sky/qwantani_late_afternoon_puresky.jpg');
skyTex.colorSpace = THREE.SRGBColorSpace;
const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false, toneMapped: false, fog: false }));
sky.rotation.y = Math.PI * 0.15;
sky.renderOrder = -10;
scene.add(sky);

const sun = new THREE.DirectionalLight(0xffcf9a, 3.2);
sun.position.set(11.2, 6.0, 15.7);
sun.target.position.set(4.7, 0, 4.2);
const skyFill = new THREE.DirectionalLight(0xe6eef5, 2.2);
skyFill.position.set(5.2, 7.5, -6.5);
skyFill.target.position.set(4.2, 0, 2.2);
[sun, skyFill].forEach((l) => {
  l.castShadow = true;
  l.shadow.mapSize.set(2048, 2048);
  Object.assign(l.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  l.shadow.bias = -0.0005; l.shadow.normalBias = 0.02;
  scene.add(l, l.target);
});
const hemi = new THREE.HemisphereLight(0xe3ecf3, 0xb59d84, 0.35);
scene.add(hemi);
const planLight = new THREE.DirectionalLight(0xffffff, 0.9);   // flat top light for the plan view
planLight.position.set(4.7, 20, 4.2); planLight.target.position.set(4.7, 0, 4.2);
scene.add(planLight, planLight.target);
const rectLights = [];
const rect = (x0, x1, y0, y1, z, inward, color, intensity) => {
  const l = new THREE.RectAreaLight(color, intensity, x1 - x0, y1 - y0);
  l.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
  l.lookAt((x0 + x1) / 2, (y0 + y1) / 2, z + inward);
  scene.add(l);
  rectLights.push(l);
};
rect(1.97, 3.12, 0.85, 2.2, 0.02, 1, 0xdfe9f2, 7);
rect(4.70, 5.90, 0.0, 2.2, 0.02, 1, 0xdfe9f2, 8);
rect(7.55, 8.65, 0.85, 2.2, 0.02, 1, 0xdfe9f2, 6);
[[0.85, 2.60], [3.70, 4.60], [5.70, 6.55], [7.75, 8.95]].forEach(([a, b]) => rect(a, b, 0.85, 2.2, 8.33, -1, 0xffd6a8, 6));
const roomLights = apt.lights.map((d) => {
  const l = new THREE.PointLight(d.kind === 'pendant' ? 0xffb468 : 0xffd4a8, d.kind === 'pendant' ? 5.5 : 2.2, 0, 2);
  l.position.copy(d.pos);
  scene.add(l);
  return l;
});
const fog = new THREE.Fog(0xdde3e4, 14, 75);

// --- obstacles on the plan -----------------------------------------------------
const FIXED = [
  { x0: 5.90, x1: 6.50, z0: 0.02, z1: 3.93 },   // kitchen run
  { x0: 8.76, x1: 9.35, z0: 4.05, z1: 4.95 },   // hall cupboard
];
const WALLS = apt.walls2d;
const WALK_BLOCK = [...WALLS, ...FIXED,
  { x0: 3.36, x1: 6.44, z0: -1.64, z1: -1.56 }, { x0: 3.36, x1: 3.44, z0: -1.6, z1: -0.3 }, { x0: 6.36, x1: 6.44, z0: -1.6, z1: -0.3 }, // balcony rail
  { x0: 6.9, x1: 9.35, z0: 6.15, z1: 6.25 },    // top of the stairs
];

// --- items ---------------------------------------------------------------------
const furniture = new THREE.Group();
scene.add(furniture);
let items = [];                 // { id, type, x, z, rot, mirror, custom? }
const live = new Map();         // id -> { group, def }
let selected = null;
let uid = 1;
let mode = 'plan';

const defOf = (it) => (it.type === 'custom'
  ? { name: it.custom.name, w: it.custom.w, d: it.custom.d, h: it.custom.h, custom: true }
  : byType[it.type]);

const fpMat = new THREE.LineBasicMaterial({ color: 0x1f1d1a, depthTest: false, transparent: true, opacity: 0.55 });
function place(it) {
  const o = live.get(it.id);
  o.group.position.set(it.x, 0, it.z);
  o.group.rotation.y = it.rot * D2R;
  o.group.scale.x = it.mirror ? -1 : 1;
  // on the plan, tall pieces are squashed under the cut so they are not drawn as solid black
  o.group.scale.y = mode === 'plan' && o.def.h > PLAN_CUT - 0.06 ? (PLAN_CUT - 0.06) / o.def.h : 1;
  const c = corners(it), p = o.fp.geometry.attributes.position;
  for (let i = 0; i < 5; i++) p.setXYZ(i, c[i % 4][0], PLAN_CUT + 0.01, c[i % 4][1]);
  p.needsUpdate = true;
  o.fp.visible = mode === 'plan';
  o.group.updateMatrixWorld(true);
}
function build(it) {
  const old = live.get(it.id);
  if (old) { furniture.remove(old.group); scene.remove(old.fp); }
  const def = defOf(it);
  const g = new THREE.Group();
  if (def.custom) buildCustom(g, M, it.custom); else def.build(g, M);
  g.userData.id = it.id;
  furniture.add(g);
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(15), 3));
  const fp = new THREE.Line(fg, fpMat);
  fp.renderOrder = 40; fp.frustumCulled = false;
  scene.add(fp);
  live.set(it.id, { group: g, def, fp });
  place(it);
}
function setItems(list) {
  live.forEach((o) => { furniture.remove(o.group); scene.remove(o.fp); });
  live.clear();
  items = list.filter((it) => (it.type === 'custom' ? it.custom && it.custom.w > 0 : byType[it.type]));
  items.forEach((it) => { if (!it.id) it.id = 'i' + uid++; build(it); });
  select(null);
}

// --- geometry helpers ------------------------------------------------------------
function corners(it, shrink = 0) {
  const def = defOf(it);
  const hw = def.w / 2 - shrink, hd = def.d / 2 - shrink, a = it.rot * D2R;
  const ux = [Math.cos(a), -Math.sin(a)], uz = [Math.sin(a), Math.cos(a)];
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [it.x + sx * hw * ux[0] + sz * hd * uz[0], it.z + sx * hw * ux[1] + sz * hd * uz[1]]);
}
const rectPoly = (r) => [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]];
function polysOverlap(A, B) {
  for (const P of [A, B]) {
    for (let i = 0; i < P.length; i++) {
      const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length];
      const nx = y1 - y0, ny = x0 - x1;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const [x, y] of A) { const p = x * nx + y * ny; a0 = Math.min(a0, p); a1 = Math.max(a1, p); }
      for (const [x, y] of B) { const p = x * nx + y * ny; b0 = Math.min(b0, p); b1 = Math.max(b1, p); }
      if (a1 <= b0 || b1 <= a0) return false;
    }
  }
  return true;
}
function aabb(it) {
  const c = corners(it);
  return { x0: Math.min(...c.map((p) => p[0])), x1: Math.max(...c.map((p) => p[0])), z0: Math.min(...c.map((p) => p[1])), z1: Math.max(...c.map((p) => p[1])) };
}
function collides(it) {
  const def = defOf(it);
  if (def.flat) return false;
  const P = corners(it, def.wall ? 0.03 : 0.012);
  if (!def.wall && [...WALLS, ...FIXED].some((r) => polysOverlap(P, rectPoly(r)))) return true;
  return items.some((o) => {
    if (o === it) return false;
    const od = defOf(o);
    if (od.flat || od.wall || def.wall) return false;
    return polysOverlap(P, corners(o, 0.012));
  });
}
// free distance from each side of the item to the nearest wall or furniture
function clearances(it) {
  const b = aabb(it), e = 0.02;
  const obs = [...WALLS, ...FIXED, ...items.filter((o) => o !== it && !defOf(o).flat && !defOf(o).wall).map(aabb)];
  const out = { left: null, right: null, up: null, down: null };
  for (const o of obs) {
    const zo = o.z0 < b.z1 - e && o.z1 > b.z0 + e, xo = o.x0 < b.x1 - e && o.x1 > b.x0 + e;
    if (zo && o.x1 <= b.x0 + e) out.left = Math.min(out.left ?? Infinity, b.x0 - o.x1);
    if (zo && o.x0 >= b.x1 - e) out.right = Math.min(out.right ?? Infinity, o.x0 - b.x1);
    if (xo && o.z1 <= b.z0 + e) out.up = Math.min(out.up ?? Infinity, b.z0 - o.z1);
    if (xo && o.z0 >= b.z1 - e) out.down = Math.min(out.down ?? Infinity, o.z0 - b.z1);
  }
  return { b, ...out };
}

// --- selection outline and labels ------------------------------------------------
const outlineGeo = new THREE.BufferGeometry();
outlineGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(15), 3));
const outline = new THREE.Line(outlineGeo, new THREE.LineBasicMaterial({ color: 0x1f6feb, depthTest: false, transparent: true }));
outline.renderOrder = 50; outline.frustumCulled = false; outline.visible = false;
scene.add(outline);

const labelBox = $('#labels');
const labs = {};
['dims', 'left', 'right', 'up', 'down'].forEach((k) => {
  const el = document.createElement('div');
  el.className = 'lab' + (k === 'dims' ? '' : ' gap');
  el.hidden = true;
  labelBox.appendChild(el);
  labs[k] = el;
});
const cm = (m) => Math.round(m * 100);

function refreshSelection() {
  const panel = $('#sel');
  if (!selected) { panel.hidden = true; outline.visible = false; Object.values(labs).forEach((l) => { l.hidden = true; }); return; }
  const def = defOf(selected);
  const bad = collides(selected);
  panel.hidden = false;
  $('#sel-name').textContent = def.name;
  $('#sel-dims').textContent = `${cm(def.w)} × ${cm(def.d)} × ${cm(def.h)} cm (B × D × H) · gulvareal ${(def.w * def.d).toFixed(2).replace('.', ',')} m²`;
  $('#sel-warn').hidden = !bad;
  $('#sel-size').hidden = !def.custom;
  if (def.custom && document.activeElement?.closest('#sel-size') == null) {
    $('#sel-w').value = cm(def.w); $('#sel-d').value = cm(def.d); $('#sel-h').value = cm(def.h);
  }
  const c = corners(selected), p = outlineGeo.attributes.position;
  const oy = mode === 'plan' ? PLAN_CUT + 0.02 : 0.03;
  for (let i = 0; i < 5; i++) p.setXYZ(i, c[i % 4][0], oy, c[i % 4][1]);
  p.needsUpdate = true;
  outline.material.color.set(bad ? 0xc0392b : 0x1f6feb);
  outline.visible = true;
}

function project(x, z, y = PLAN_CUT) {
  const v = new THREE.Vector3(x, y, z).project(mode === 'walk' ? walkCam : planCam);
  if (v.z > 1 || v.z < -1) return null;
  return [(v.x * 0.5 + 0.5) * stage.clientWidth, (-v.y * 0.5 + 0.5) * stage.clientHeight];
}
function updateLabels() {
  Object.values(labs).forEach((l) => { l.hidden = true; });
  if (!selected) return;
  const wk = mode === 'walk';
  const def = defOf(selected), cl = clearances(selected), b = cl.b;
  const put = (el, x, z, text, y) => { const q = project(x, z, y ?? (wk ? 0.05 : PLAN_CUT)); if (!q) return; el.style.left = q[0] + 'px'; el.style.top = q[1] + 'px'; el.textContent = text; el.hidden = false; };
  put(labs.dims, selected.x, selected.z, `${cm(def.w)} × ${cm(def.d)} cm`, wk ? def.h + 0.12 : PLAN_CUT);
  labs.dims.classList.toggle('bad', collides(selected));
  const mz = (b.z0 + b.z1) / 2, mx = (b.x0 + b.x1) / 2;
  const ok = (v) => v != null && v > 0.03 && v < 6;
  if (ok(cl.left)) put(labs.left, b.x0 - cl.left / 2, mz, `${cm(cl.left)} cm`);
  if (ok(cl.right)) put(labs.right, b.x1 + cl.right / 2, mz, `${cm(cl.right)} cm`);
  if (ok(cl.up)) put(labs.up, mx, b.z0 - cl.up / 2, `${cm(cl.up)} cm`);
  if (ok(cl.down)) put(labs.down, mx, b.z1 + cl.down / 2, `${cm(cl.down)} cm`);
}

function select(it) { selected = it; refreshSelection(); }
let flashTimer = 0;
function flash(text) {
  const el = $('#toast');
  el.textContent = text; el.hidden = false;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { el.hidden = true; }, 5000);
}

// --- saving ----------------------------------------------------------------------
let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ v: 1, items }));
      $('#save-state').textContent = 'Gemmes automatisk i denne browser.';
    } catch (e) {
      $('#save-state').textContent = 'Kunne ikke gemme i browseren (for lidt plads). Brug Eksportér.';
    }
  }, 250);
}
function changed() { refreshSelection(); save(); }
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (d && Array.isArray(d.items) && d.items.length) return d.items;
  } catch (e) { /* fall through to the default layout */ }
  return null;
}
const freshDefault = () => DEFAULT_LAYOUT.map((it) => ({ ...it }));

// --- cameras -----------------------------------------------------------------------
const planCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
planCam.up.set(0, 0, -1);
const view = { cx: 4.7, cz: 3.9, h: 12.6 };   // centre and visible height in metres
const walkCam = new THREE.PerspectiveCamera(66, 1, 0.03, 400);
const walk = { x: 7.9, z: 4.5, yaw: -90, pitch: -4 };

function applyPlanCam() {
  const a = stage.clientWidth / stage.clientHeight;
  planCam.left = -view.h * a / 2; planCam.right = view.h * a / 2;
  planCam.top = view.h / 2; planCam.bottom = -view.h / 2;
  planCam.position.set(view.cx, 60, view.cz);
  planCam.lookAt(view.cx, 0, view.cz);
  planCam.updateProjectionMatrix();
  planCam.updateMatrixWorld();
}
function applyWalkCam() {
  const y = walk.yaw * D2R, p = walk.pitch * D2R;
  walkCam.position.set(walk.x, 1.6, walk.z);
  walkCam.lookAt(walk.x + Math.sin(y) * Math.cos(p), 1.6 + Math.sin(p), walk.z - Math.cos(y) * Math.cos(p));
}
// see-through walls while walking, so the next room and its furniture show through
let wallT = 0.2;
try { const v = parseFloat(localStorage.getItem(STORE + '-walls')); if (v >= 0 && v <= 0.8) wallT = v; } catch (e) { /* default */ }
function applyWalls() {
  const o = mode === 'walk' ? 1 - wallT : 1;
  M.wall.transparent = o < 1;
  M.wall.opacity = o;
  M.wall.depthWrite = o >= 1;
  $('#walls').value = Math.round(wallT * 100);
  $('#walls-val').textContent = Math.round(wallT * 100) + ' %';
}
$('#walls').addEventListener('input', (ev) => {
  wallT = Math.max(0, Math.min(0.8, +ev.target.value / 100));
  try { localStorage.setItem(STORE + '-walls', String(wallT)); } catch (e) { /* not saved */ }
  applyWalls();
});
function setMode(m) {
  mode = m;
  const w = m === 'walk';
  $('#mode-plan').classList.toggle('on', !w);
  $('#mode-walk').classList.toggle('on', w);
  U.uCut.value = w ? H : PLAN_CUT;
  apt.ceilings.visible = w; apt.hanging.visible = w; apt.outside.visible = w; sky.visible = w;
  scene.fog = w ? fog : null;
  planLight.visible = !w; sun.visible = w; skyFill.visible = w;
  hemi.intensity = w ? 0.35 : 0.55;
  scene.environmentIntensity = w ? 0.3 : 0.15;
  roomLights.forEach((l) => { l.visible = w; });
  rectLights.forEach((l) => { l.visible = w; });
  $('#hint').textContent = w
    ? 'Gå med W A S D eller piletasterne. Træk i et møbel for at flytte det, træk på væg eller gulv for at se dig omkring. R drejer, F vender det valgte møbel.'
    : 'Klik på et møbel og træk for at flytte det. R drejer 90°, F vender. Træk på gulvet for at flytte planen, rul for at zoome. Dobbeltklik på gulvet for at stå dér.';
  canvas.style.cursor = w ? 'grab' : 'default';
  applyWalls();
  items.forEach(place);
  refreshSelection();
}
$('#mode-plan').onclick = () => setMode('plan');
$('#mode-walk').onclick = () => setMode('walk');

function resize() {
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  walkCam.aspect = stage.clientWidth / stage.clientHeight;
  walkCam.updateProjectionMatrix();
  applyPlanCam();
}
new ResizeObserver(resize).observe(stage);

// --- pointer: drag furniture, pan, zoom, look around ------------------------------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function groundAt(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  if (mode === 'walk') {
    walkCam.updateMatrixWorld();
    ray.setFromCamera(ndc, walkCam);
    const o = ray.ray.origin, d = ray.ray.direction;
    if (d.y > -0.02) return null;               // not pointing at the floor
    const t = -o.y / d.y;
    return t > 14 ? null : { x: o.x + d.x * t, z: o.z + d.z * t };
  }
  ray.setFromCamera(ndc, planCam);
  return { x: ray.ray.origin.x, z: ray.ray.origin.z };
}
function itemAt(ev) {
  groundAt(ev);
  const hit = ray.intersectObjects(furniture.children, true).find((h) => h.object.isMesh);
  if (!hit) return null;
  let o = hit.object;
  while (o && !o.userData.id) o = o.parent;
  return o ? items.find((it) => it.id === o.userData.id) : null;
}
const snap = (v, ev) => (ev.shiftKey ? v : Math.round(v / 0.05) * 0.05);
let drag = null;
canvas.addEventListener('pointerdown', (ev) => {
  canvas.setPointerCapture(ev.pointerId);
  if (mode === 'walk') {
    const hit = itemAt(ev), gp = hit && groundAt(ev);
    if (hit) select(hit);
    drag = hit && gp ? { kind: 'item', dx: hit.x - gp.x, dz: hit.z - gp.z } : { kind: 'look', x: ev.clientX, y: ev.clientY };
    canvas.style.cursor = 'grabbing';
    return;
  }
  const it = itemAt(ev);
  const g = groundAt(ev);
  if (it) { select(it); drag = { kind: 'item', dx: it.x - g.x, dz: it.z - g.z }; } else { select(null); drag = { kind: 'pan', x: ev.clientX, y: ev.clientY }; }
});
canvas.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  if (drag.kind === 'look') {
    walk.yaw -= (ev.clientX - drag.x) * 0.22; walk.pitch = Math.max(-60, Math.min(60, walk.pitch + (ev.clientY - drag.y) * 0.18));
    drag.x = ev.clientX; drag.y = ev.clientY;
  } else if (drag.kind === 'pan') {
    const k = view.h / stage.clientHeight;
    view.cx -= (ev.clientX - drag.x) * k; view.cz -= (ev.clientY - drag.y) * k;
    drag.x = ev.clientX; drag.y = ev.clientY;
    applyPlanCam();
  } else if (selected) {
    const g = groundAt(ev);
    if (!g) return;
    selected.x = Math.max(-1, Math.min(W + 1, snap(g.x + drag.dx, ev)));
    selected.z = Math.max(-2, Math.min(D + 1, snap(g.z + drag.dz, ev)));
    place(selected);
    changed();
  }
});
const endDrag = () => { drag = null; if (mode === 'walk') canvas.style.cursor = 'grab'; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  if (mode !== 'plan') return;
  const before = groundAt(ev);
  view.h = Math.max(2.5, Math.min(22, view.h * Math.exp(ev.deltaY * 0.0012)));
  applyPlanCam();
  const after = groundAt(ev);
  view.cx += before.x - after.x; view.cz += before.z - after.z;
  applyPlanCam();
}, { passive: false });
canvas.addEventListener('dblclick', (ev) => {
  if (mode !== 'plan' || itemAt(ev)) return;
  const g = groundAt(ev);
  if (blocked(g.x, g.z)) return;
  walk.x = g.x; walk.z = g.z;
  setMode('walk');
  flash('Du står nu i lejligheden. Tryk Esc eller "Plan" for at komme tilbage.');
});

// --- actions -----------------------------------------------------------------------
function act(a) {
  if (!selected) return;
  const it = selected;
  if (a === 'rot90') it.rot = (it.rot + 90) % 360;
  else if (a === 'rot180') it.rot = (it.rot + 180) % 360;
  else if (a === 'rotL') it.rot = (it.rot - 15 + 360) % 360;
  else if (a === 'rotR') it.rot = (it.rot + 15) % 360;
  else if (a === 'mirror') it.mirror = !it.mirror;
  else if (a === 'dup') {
    const c = { ...it, custom: it.custom ? { ...it.custom } : undefined, id: 'i' + Date.now() + uid++, x: it.x + 0.3, z: it.z + 0.3 };
    items.push(c); build(c); select(c); save(); return;
  } else if (a === 'del') {
    furniture.remove(live.get(it.id).group); scene.remove(live.get(it.id).fp); live.delete(it.id);
    items = items.filter((o) => o !== it); select(null); save(); return;
  }
  place(it);
  changed();
}
document.querySelectorAll('#sel [data-act]').forEach((b) => { b.onclick = () => act(b.dataset.act); });

const keys = new Set();
addEventListener('keydown', (ev) => {
  if (ev.target.closest('input, textarea, select')) return;
  const k = ev.key.toLowerCase();
  const map = { r: 'rot90', f: 'rot180', q: 'rotL', e: 'rotR', m: 'mirror', delete: 'del', backspace: 'del' };
  if ((ev.ctrlKey || ev.metaKey) && k === 'd') { ev.preventDefault(); act('dup'); return; }
  if (selected && map[k]) { ev.preventDefault(); act(map[k]); return; }
  if (mode === 'plan') {
    if (selected && k.startsWith('arrow')) {
      ev.preventDefault();
      const s = ev.shiftKey ? 0.01 : 0.05;
      if (k === 'arrowleft') selected.x -= s; if (k === 'arrowright') selected.x += s;
      if (k === 'arrowup') selected.z -= s; if (k === 'arrowdown') selected.z += s;
      place(selected); changed();
    }
    if (k === 'escape') select(null);
  } else {
    if (k === 'escape') { if (selected) select(null); else setMode('plan'); return; }
    keys.add(k);
    if (k.startsWith('arrow') || k === ' ') ev.preventDefault();
  }
});
addEventListener('keyup', (ev) => keys.delete(ev.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

// --- catalogue and own furniture -----------------------------------------------------
function dropPoint() {
  if (mode === 'walk') { const y = walk.yaw * D2R; return { x: walk.x + Math.sin(y) * 1.5, z: walk.z - Math.cos(y) * 1.5 }; }
  return { x: Math.max(0.5, Math.min(W - 0.5, view.cx)), z: Math.max(0.5, Math.min(D - 0.5, view.cz)) };
}
function add(it) {
  const p = dropPoint();
  Object.assign(it, { id: 'i' + Date.now() + uid++, x: Math.round(p.x / 0.05) * 0.05, z: Math.round(p.z / 0.05) * 0.05, rot: 0, mirror: false });
  items.push(it); build(it); select(it); save();
}
{
  const box = $('#catalog');
  box.className = 'cat';
  let last = '';
  CATALOG.forEach((c) => {
    if (c.group !== last) { const h = document.createElement('h3'); h.textContent = c.group; box.appendChild(h); last = c.group; }
    const b = document.createElement('button');
    b.type = 'button';
    b.append(c.name);
    const s = document.createElement('span');
    s.textContent = `${cm(c.w)} × ${cm(c.d)}`;
    b.appendChild(s);
    b.onclick = () => add({ type: c.type });
    box.appendChild(b);
  });
}

const readImage = (file) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onerror = () => rej(new Error('read'));
  fr.onload = () => {
    const im = new Image();
    im.onerror = () => rej(new Error('decode'));
    im.onload = () => {
      const k = Math.min(1, 512 / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(im, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.85));
    };
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
});
$('#custom').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = ev.target, err = $('#custom-err');
  const w = +f.w.value, d = +f.d.value, h = +f.h.value, name = f.name.value.trim();
  const fail = (t) => { err.textContent = t; err.hidden = false; };
  if (!name) return fail('Skriv et navn.');
  if (!(w >= 5 && w <= 600) || !(d >= 2 && d <= 600) || !(h >= 1 && h <= 250)) return fail('Mål i cm: bredde 5-600, dybde 2-600, højde 1-250.');
  let img = null;
  if (f.img.files[0]) {
    try { img = await readImage(f.img.files[0]); } catch (e) { return fail('Billedet kunne ikke læses. Prøv en JPG eller PNG.'); }
  }
  err.hidden = true;
  add({ type: 'custom', custom: { name, w: w / 100, d: d / 100, h: h / 100, color: f.color.value, img } });
  f.reset();
});
$('#custom').addEventListener('input', () => { $('#custom-err').hidden = true; });
['w', 'd', 'h'].forEach((k) => {
  $('#sel-' + k).addEventListener('change', (ev) => {
    if (!selected?.custom) return;
    const lim = { w: [5, 600], d: [2, 600], h: [1, 250] }[k];
    const v = Math.max(lim[0], Math.min(lim[1], +ev.target.value || lim[0]));
    ev.target.value = v;
    selected.custom[k] = v / 100;
    build(selected); changed();
  });
});

// --- export, import, reset -----------------------------------------------------------
$('#export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ v: 1, items }, null, 1)], { type: 'application/json' }));
  a.download = 'ny-munkegade-indretning.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('#import').onclick = () => $('#import-file').click();
$('#import-file').addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!Array.isArray(d.items)) throw new Error('format');
    setItems(d.items.map((it) => ({ ...it, x: +it.x || 0, z: +it.z || 0, rot: +it.rot || 0, mirror: !!it.mirror })));
    save();
  } catch (e) {
    $('#save-state').textContent = 'Filen kunne ikke læses som en indretning.';
  }
});
let resetArmed = 0;
$('#reset').onclick = (ev) => {
  if (Date.now() - resetArmed > 4000) { resetArmed = Date.now(); ev.target.textContent = 'Klik igen for at nulstille'; setTimeout(() => { ev.target.textContent = 'Nulstil til forslag'; }, 4000); return; }
  resetArmed = 0; ev.target.textContent = 'Nulstil til forslag';
  setItems(freshDefault()); save();
};

// --- walking -----------------------------------------------------------------------
function blocked(x, z, r = 0.2) {
  if (x < -0.1 || x > W + 0.1 || z < -1.7 || z > D + 0.1) return true;
  return WALK_BLOCK.some((b) => {
    const dx = Math.max(b.x0 - x, 0, x - b.x1), dz = Math.max(b.z0 - z, 0, z - b.z1);
    return dx * dx + dz * dz < r * r;
  });
}
function stepWalk(dt) {
  const turn = (keys.has('arrowleft') ? -1 : 0) + (keys.has('arrowright') ? 1 : 0);
  walk.yaw += turn * 90 * dt;
  const fwd = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
  const str = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
  if (!fwd && !str) return;
  const y = walk.yaw * D2R, sp = (keys.has('shift') ? 3.2 : 1.6) * dt / Math.hypot(fwd, str);
  const dx = (Math.sin(y) * fwd + Math.cos(y) * str) * sp, dz = (-Math.cos(y) * fwd + Math.sin(y) * str) * sp;
  if (!blocked(walk.x + dx, walk.z)) walk.x += dx;
  if (!blocked(walk.x, walk.z + dz)) walk.z += dz;
}

// --- start ---------------------------------------------------------------------------
setItems(load() || freshDefault());
resize();
setMode('plan');
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (mode === 'walk') { stepWalk(dt); applyWalkCam(); }
  updateLabels();
  renderer.render(scene, mode === 'walk' ? walkCam : planCam);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
const ready = new Promise((res) => { THREE.DefaultLoadingManager.onLoad = res; setTimeout(res, 2500); });
window.__planner = {
  ready: ready.then(() => { $('#loading').classList.add('done'); return true; }),
  get items() { return items; }, get selected() { return selected; }, walk, view, setMode, project,
};
