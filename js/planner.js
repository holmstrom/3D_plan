// Planner: move, turn, resize and add furniture, compare versions, colour the
// rooms, and look at the result on the plan, as a 3D overview or on foot.
import * as THREE from 'three';
import { RoomEnvironment } from '../lib/three-addons/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from '../lib/three-addons/RectAreaLightUniformsLib.js';
import { U, buildMaterials, PAPER_HEX } from './materials.js?v=6';
import { buildApartment, H, W, D } from './model.js?v=6';
import { CATALOG, byType, buildCustom, PRESETS } from './catalog.js?v=6';

const STORE = 'nm80-layout-v1';      // old single-layout key, migrated on first load
const STORE2 = 'nm80-planner-v2';
const PLAN_CUT = 2.0;                // below the door heads, so door openings show on the plan
const DOLL_CUT = 1.3;
const D2R = Math.PI / 180;
const $ = (s) => document.querySelector(s);
const cm = (m) => Math.round(m * 100);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ROOMS = [
  { id: 'kitchen', name: 'Køkken-alrum', box: [1.80, 0.00, 6.50, 3.95] },
  { id: 'child', name: 'Børneværelse', box: [6.60, 0.00, 9.35, 3.95] },
  { id: 'street', name: 'Værelse mod gaden', box: [3.20, 5.05, 6.80, 8.35] },
  { id: 'master', name: 'Soveværelse', box: [0.00, 4.05, 3.10, 8.35] },
  { id: 'hall', name: 'Entré', box: [3.20, 4.05, 9.35, 4.95] },
];
const FLOORS = {
  ask: ['Lys ask', [1, 1, 1]], hvid: ['Hvidolieret', [1.18, 1.18, 1.2]], eg: ['Eg', [0.92, 0.70, 0.46]],
  roeget: ['Røget eg', [0.40, 0.28, 0.20]], graa: ['Grå', [0.55, 0.55, 0.56]],
};
const WALL_DEFAULT = '#efece6';

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

const M = buildMaterials();

// Wall and floor colour per room: the shader looks up which room a surface faces.
const NR = 6;
const uRBox = { value: Array.from({ length: NR }, (_, i) => (ROOMS[i] ? new THREE.Vector4(...ROOMS[i].box) : new THREE.Vector4(1e5, 1e5, -1e5, -1e5))) };
const wallCols = Array.from({ length: NR }, () => new THREE.Color(WALL_DEFAULT));
const floorCols = Array.from({ length: NR }, () => new THREE.Color(1, 1, 1));
function roomTint(mat, cols, op) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh) => {
    prev(sh);
    sh.uniforms.uRBox = uRBox;
    sh.uniforms.uRCol = { value: cols };
    sh.fragmentShader = `uniform vec4 uRBox[${NR}];\nuniform vec3 uRCol[${NR}];\n` + sh.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      {
        vec3 q_ = vWPos + normalize(vWNrm) * 0.06;
        for (int i = 0; i < ${NR}; i++) {
          vec4 b_ = uRBox[i];
          if (q_.x > b_.x && q_.x < b_.z && q_.z > b_.y && q_.z < b_.w) { diffuseColor.rgb ${op} uRCol[i]; break; }
        }
      }`
    );
  };
  mat.customProgramCacheKey = () => 'room' + op;
}
roomTint(M.wall, wallCols, '=');
roomTint(M.floor, floorCols, '*=');

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
const planLight = new THREE.DirectionalLight(0xffffff, 2.4);   // flat top light for the plan view
planLight.position.set(-7, 18, -6); planLight.target.position.set(4.7, 0, 4.2);   // slanted, so the floor does not mirror it into the camera
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

// --- state ---------------------------------------------------------------------
const furniture = new THREE.Group();
scene.add(furniture);
let items = [];                 // { id, type, x, z, rot, mirror, size?, custom? }
let colors = {};                // roomId -> { wall: '#rrggbb', floor: key }
const live = new Map();         // id -> { group, def, fp }
let selected = null;
let uid = 1;
let mode = 'plan';
let statsDirty = true;

function defOf(it) {
  if (it.type === 'custom') return { name: it.custom.name, w: it.custom.w, d: it.custom.d, h: it.custom.h, custom: true };
  const c = byType[it.type];
  if (!it.size) return c;
  const w = it.size.w ?? c.w;
  return { ...c, w, d: c.round ? w : (it.size.d ?? c.d) };
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
const solid = (it) => { const d = defOf(it); return !d.flat && !d.wall; };
function collides(it) {
  const def = defOf(it);
  if (def.flat) return false;
  const P = corners(it, def.wall ? 0.03 : 0.012);
  if (!def.wall && [...WALLS, ...FIXED].some((r) => polysOverlap(P, rectPoly(r)))) return true;
  if (def.wall) return false;
  return items.some((o) => o !== it && solid(o) && polysOverlap(P, corners(o, 0.012)));
}
// free distance from each side of the item to the nearest wall or furniture
function clearances(it) {
  const b = aabb(it), e = 0.02;
  const obs = [...WALLS, ...FIXED, ...items.filter((o) => o !== it && solid(o)).map(aabb)];
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

// --- items -----------------------------------------------------------------------
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
  statsDirty = true;
}
function drop(it) {
  const o = live.get(it.id);
  if (!o) return;
  furniture.remove(o.group); scene.remove(o.fp); live.delete(it.id);
}
function build(it) {
  drop(it);
  const def = defOf(it);
  const g = new THREE.Group();
  if (def.custom) buildCustom(g, M, it.custom); else def.build(g, M, { w: def.w, d: def.d, h: def.h });
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
  [...items].forEach(drop);
  items = (list || []).filter((it) => (it.type === 'custom' ? it.custom && it.custom.w > 0 && it.custom.d > 0 && it.custom.h > 0 : byType[it.type]))
    .map((it) => ({ ...it, x: +it.x || 0, z: +it.z || 0, rot: +it.rot || 0, mirror: !!it.mirror }));
  items.forEach((it) => { it.id = 'i' + uid++; build(it); });
  select(null);
}

// --- selection outline and labels ------------------------------------------------
const outlineGeo = new THREE.BufferGeometry();
outlineGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(15), 3));
const outline = new THREE.Line(outlineGeo, new THREE.LineBasicMaterial({ color: 0x1f6feb, depthTest: false, transparent: true }));
outline.renderOrder = 50; outline.frustumCulled = false; outline.visible = false;
scene.add(outline);

const labelBox = $('#labels');
const labs = {};
['left', 'right', 'up', 'down', 'dims'].forEach((k) => {
  const el = document.createElement('div');
  el.className = 'lab' + (k === 'dims' ? '' : ' gap');
  el.hidden = true;
  labelBox.appendChild(el);
  labs[k] = el;
});
const LIMITS = { w: [0.05, 6], d: [0.02, 6], h: [0.01, 2.5] };

function refreshSelection() {
  const panel = $('#sel');
  if (!selected) { panel.hidden = true; outline.visible = false; return; }
  const def = defOf(selected);
  const bad = collides(selected);
  panel.hidden = false;
  $('#sel-name').textContent = def.name;
  $('#sel-dims').textContent = `${cm(def.w)} × ${cm(def.d)} × ${cm(def.h)} cm (B × D × H) · gulvareal ${(def.w * def.d).toFixed(2).replace('.', ',')} m²`;
  $('#sel-warn').hidden = !bad;
  const can = { w: def.custom || !!def.resize?.w, d: def.custom || (!!def.resize?.d && !def.round), h: !!def.custom };
  $('#sel-size').hidden = !(can.w || can.d || can.h);
  ['w', 'd', 'h'].forEach((k) => {
    $(`#sel-${k}-l`).hidden = !can[k];
    const inp = $('#sel-' + k);
    if (document.activeElement !== inp) inp.value = cm(def[k]);
  });
  const c = corners(selected), p = outlineGeo.attributes.position;
  const oy = mode === 'plan' ? PLAN_CUT + 0.02 : 0.03;
  for (let i = 0; i < 5; i++) p.setXYZ(i, c[i % 4][0], oy, c[i % 4][1]);
  p.needsUpdate = true;
  outline.material.color.set(bad ? 0xc0392b : 0x1f6feb);
  outline.visible = true;
}
function select(it) { selected = it; refreshSelection(); }

let flashTimer = 0;
function flash(text) {
  const el = $('#toast');
  el.textContent = text; el.hidden = false;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { el.hidden = true; }, 5000);
}

// --- cameras -----------------------------------------------------------------------
const planCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
planCam.up.set(0, 0, -1);
const view = { cx: 4.7, cz: 3.9, h: 12.6 };   // centre and visible height in metres
const walkCam = new THREE.PerspectiveCamera(66, 1, 0.03, 400);
const walk = { x: 7.9, z: 4.5, yaw: -90, pitch: -4 };
const dollCam = new THREE.PerspectiveCamera(35, 1, 0.3, 300);
const doll = { az: 32, el: 50, dist: 19, tx: 4.7, tz: 3.9 };
const activeCam = () => (mode === 'walk' ? walkCam : mode === 'doll' ? dollCam : planCam);

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
  walkCam.updateMatrixWorld();
}
function applyDollCam() {
  const a = doll.az * D2R, e = doll.el * D2R;
  dollCam.position.set(doll.tx + doll.dist * Math.cos(e) * Math.sin(a), 0.6 + doll.dist * Math.sin(e), doll.tz + doll.dist * Math.cos(e) * Math.cos(a));
  dollCam.lookAt(doll.tx, 0.6, doll.tz);
  dollCam.updateMatrixWorld();
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
  wallT = clamp(+ev.target.value / 100, 0, 0.8);
  try { localStorage.setItem(STORE + '-walls', String(wallT)); } catch (e) { /* not saved */ }
  applyWalls();
});

const HINTS = {
  plan: 'Klik på et møbel og træk for at flytte det. R drejer 90°, F vender. Træk på gulvet for at flytte planen, rul for at zoome. Dobbeltklik på gulvet for at stå dér.',
  doll: 'Træk for at dreje lejligheden, rul for at zoome, højreklik-træk for at flytte den. Træk i et møbel for at flytte det.',
  walk: 'Gå med W A S D eller piletasterne. Træk i et møbel for at flytte det, træk på væg eller gulv for at se dig omkring. R drejer, F vender det valgte møbel.',
};
function setMode(m) {
  mode = m;
  const w = m === 'walk', p = m === 'plan', dl = m === 'doll';
  ['plan', 'doll', 'walk'].forEach((k) => $('#mode-' + k).classList.toggle('on', k === m));
  U.uCut.value = w ? H : p ? PLAN_CUT : DOLL_CUT;
  U.uCapInk.value = dl ? 0 : 1;
  apt.ceilings.visible = w; apt.hanging.visible = w; apt.outside.visible = w; sky.visible = w;
  scene.fog = w ? fog : null;
  planLight.visible = p; sun.visible = !p; skyFill.visible = !p;
  if (dl) sun.position.set(9.5, 14, 11); else sun.position.set(11.2, 6.0, 15.7);
  hemi.intensity = w ? 0.35 : p ? 1.0 : 0.5;
  sun.intensity = dl ? 1.8 : 3.2; skyFill.intensity = dl ? 1.2 : 2.2;
  scene.environmentIntensity = p ? 0.05 : 0.3;
  roomLights.forEach((l) => { l.visible = w; });
  rectLights.forEach((l) => { l.visible = !p; });
  narrowMesh.visible = p && $('#narrow').checked;
  $('#hint').textContent = HINTS[m];
  $('#walls-row').hidden = !w;
  canvas.style.cursor = p ? 'default' : 'grab';
  applyWalls();
  items.forEach(place);
  refreshSelection();
}
['plan', 'doll', 'walk'].forEach((k) => { $('#mode-' + k).onclick = () => setMode(k); });

function resize() {
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  [walkCam, dollCam].forEach((c) => { c.aspect = stage.clientWidth / stage.clientHeight; c.updateProjectionMatrix(); });
  applyPlanCam();
}
new ResizeObserver(resize).observe(stage);

function project(x, z, y = PLAN_CUT) {
  const v = new THREE.Vector3(x, y, z).project(activeCam());
  if (v.z > 1 || v.z < -1) return null;
  return [(v.x * 0.5 + 0.5) * stage.clientWidth, (-v.y * 0.5 + 0.5) * stage.clientHeight];
}
function updateLabels() {
  Object.values(labs).forEach((l) => { l.hidden = true; });
  if (!selected) return;
  const flat = mode !== 'plan';
  const def = defOf(selected), cl = clearances(selected), b = cl.b;
  const put = (el, x, z, text, y) => { const q = project(x, z, y ?? (flat ? 0.05 : PLAN_CUT)); if (!q) return; el.style.left = q[0] + 'px'; el.style.top = q[1] + 'px'; el.textContent = text; el.hidden = false; };
  put(labs.dims, selected.x, selected.z, `${cm(def.w)} × ${cm(def.d)} cm`, flat ? Math.min(def.h, mode === 'doll' ? DOLL_CUT : 9) + 0.12 : PLAN_CUT);
  labs.dims.classList.toggle('bad', collides(selected));
  const mz = (b.z0 + b.z1) / 2, mx = (b.x0 + b.x1) / 2;
  const ok = (v) => v != null && v > 0.03 && v < 6;
  if (ok(cl.left)) put(labs.left, b.x0 - cl.left / 2, mz, `${cm(cl.left)} cm`);
  if (ok(cl.right)) put(labs.right, b.x1 + cl.right / 2, mz, `${cm(cl.right)} cm`);
  if (ok(cl.up)) put(labs.up, mx, b.z0 - cl.up / 2, `${cm(cl.up)} cm`);
  if (ok(cl.down)) put(labs.down, mx, b.z1 + cl.down / 2, `${cm(cl.down)} cm`);
}

// --- room overview: furnished share and narrow passages ----------------------------
const CELL = 0.05, NX = Math.round(W / CELL), NZ = Math.round(D / CELL);
const grid = new Uint8Array(NX * NZ);
const narrowCanvas = document.createElement('canvas');
narrowCanvas.width = NX; narrowCanvas.height = NZ;
const narrowCtx = narrowCanvas.getContext('2d');
const narrowTex = new THREE.CanvasTexture(narrowCanvas);
narrowTex.magFilter = THREE.NearestFilter; narrowTex.minFilter = THREE.NearestFilter; narrowTex.generateMipmaps = false;
const narrowGeo = new THREE.PlaneGeometry(W, D);
narrowGeo.rotateX(-Math.PI / 2);
const narrowMesh = new THREE.Mesh(narrowGeo, new THREE.MeshBasicMaterial({ map: narrowTex, transparent: true, depthWrite: false, toneMapped: false }));
narrowMesh.position.set(W / 2, 0.02, D / 2);
narrowMesh.renderOrder = 2;
scene.add(narrowMesh);
$('#narrow').addEventListener('change', () => { narrowMesh.visible = mode === 'plan' && $('#narrow').checked; });

function fillRect(r, v) {
  const i0 = clamp(Math.floor(r.x0 / CELL + 0.5), 0, NX), i1 = clamp(Math.floor(r.x1 / CELL + 0.5), 0, NX);
  const j0 = clamp(Math.floor(r.z0 / CELL + 0.5), 0, NZ), j1 = clamp(Math.floor(r.z1 / CELL + 0.5), 0, NZ);
  for (let j = j0; j < j1; j++) grid.fill(v, j * NX + i0, j * NX + i1);
}
function computeStats() {
  statsDirty = false;
  grid.fill(0);
  WALLS.forEach((r) => fillRect(r, 1));
  FIXED.forEach((r) => fillRect(r, 2));
  items.filter(solid).forEach((it) => {
    const def = defOf(it), b = aabb(it), a = it.rot * D2R, co = Math.cos(a), si = Math.sin(a);
    const i0 = clamp(Math.floor(b.x0 / CELL), 0, NX), i1 = clamp(Math.ceil(b.x1 / CELL), 0, NX);
    const j0 = clamp(Math.floor(b.z0 / CELL), 0, NZ), j1 = clamp(Math.ceil(b.z1 / CELL), 0, NZ);
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
      const dx = (i + 0.5) * CELL - it.x, dz = (j + 0.5) * CELL - it.z;
      const lx = dx * co - dz * si, lz = dx * si + dz * co;
      const inside = def.round ? lx * lx + lz * lz <= (def.w / 2) ** 2 : Math.abs(lx) <= def.w / 2 && Math.abs(lz) <= def.d / 2;
      if (inside && grid[j * NX + i] === 0) grid[j * NX + i] = 2;
    }
  });
  // furnished share per room
  const rows = ROOMS.map((r) => {
    const i0 = Math.round(r.box[0] / CELL), i1 = Math.round(r.box[2] / CELL), j0 = Math.round(r.box[1] / CELL), j1 = Math.round(r.box[3] / CELL);
    let used = 0;
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) if (grid[j * NX + i] === 2) used++;
    const total = (i1 - i0) * (j1 - j0);
    return { name: r.name, area: total * CELL * CELL, share: used / total };
  });
  const t = $('#rooms');
  t.replaceChildren();
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    [r.name, r.area.toFixed(1).replace('.', ',') + ' m²', Math.round(r.share * 100) + ' % møbleret'].forEach((txt) => { const td = document.createElement('td'); td.textContent = txt; tr.appendChild(td); });
    t.appendChild(tr);
  });
  // narrow passages: free floor where the free width in x or z is 35-70 cm
  const skip = (i, j) => { const x = (i + 0.5) * CELL, z = (j + 0.5) * CELL; return (x < 1.8 && z < 3.95) || (x > 6.9 && z > 5.05); };
  const narrow = new Uint8Array(NX * NZ);
  const mark = (len, cells) => { const m = len * CELL; if (m >= 0.35 && m < 0.70) cells.forEach((c) => { narrow[c] = 1; }); };
  for (let j = 0; j < NZ; j++) {
    let run = [];
    for (let i = 0; i <= NX; i++) {
      if (i < NX && grid[j * NX + i] === 0 && !skip(i, j)) run.push(j * NX + i); else { if (run.length) mark(run.length, run); run = []; }
    }
  }
  for (let i = 0; i < NX; i++) {
    let run = [];
    for (let j = 0; j <= NZ; j++) {
      if (j < NZ && grid[j * NX + i] === 0 && !skip(i, j)) run.push(j * NX + i); else { if (run.length) mark(run.length, run); run = []; }
    }
  }
  const img = narrowCtx.createImageData(NX, NZ);
  for (let c = 0; c < NX * NZ; c++) if (narrow[c]) { img.data[c * 4] = 232; img.data[c * 4 + 1] = 120; img.data[c * 4 + 2] = 30; img.data[c * 4 + 3] = 120; }
  narrowCtx.putImageData(img, 0, 0);
  narrowTex.needsUpdate = true;
}

// --- colours -------------------------------------------------------------------------
function applyColors() {
  ROOMS.forEach((r, i) => {
    const c = colors[r.id] || {};
    wallCols[i].set(c.wall || WALL_DEFAULT);
    const f = (FLOORS[c.floor] || FLOORS.ask)[1];
    floorCols[i].setRGB(f[0], f[1], f[2]);
  });
  document.querySelectorAll('#colors [data-room]').forEach((el) => {
    const c = colors[el.dataset.room] || {};
    el.value = el.dataset.kind === 'wall' ? (c.wall || WALL_DEFAULT) : (c.floor || 'ask');
  });
}
{
  const box = $('#colors');
  ROOMS.forEach((r) => {
    const row = document.createElement('div');
    row.className = 'colrow';
    const name = document.createElement('span');
    name.textContent = r.name;
    const wall = document.createElement('input');
    wall.type = 'color'; wall.title = 'Vægfarve'; wall.setAttribute('aria-label', 'Vægfarve, ' + r.name);
    wall.dataset.room = r.id; wall.dataset.kind = 'wall';
    const floor = document.createElement('select');
    floor.title = 'Gulv'; floor.setAttribute('aria-label', 'Gulv, ' + r.name);
    floor.dataset.room = r.id; floor.dataset.kind = 'floor';
    Object.entries(FLOORS).forEach(([k, v]) => { const o = document.createElement('option'); o.value = k; o.textContent = v[0]; floor.appendChild(o); });
    const on = () => { colors[r.id] = { wall: wall.value, floor: floor.value }; applyColors(); save(); };
    wall.addEventListener('input', on); floor.addEventListener('change', on);
    row.append(name, wall, floor);
    box.appendChild(row);
  });
}

// --- versions and saving -----------------------------------------------------------------
let store = { v: 2, current: '', layouts: {} };
const clone = (o) => JSON.parse(JSON.stringify(o));
let hadStore = false;
const restored = [];
function loadStore() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE2) || 'null');
    if (d && d.layouts && Object.keys(d.layouts).length) { store = d; hadStore = true; }
  } catch (e) { /* start fresh */ }
  if (!Object.keys(store.layouts).length) {
    Object.entries(PRESETS).forEach(([n, its]) => { store.layouts[n] = { items: clone(its), colors: {} }; });
    try {
      const old = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (old && Array.isArray(old.items) && old.items.length) { store.layouts['Min indretning'] = { items: old.items, colors: {} }; store.current = 'Min indretning'; }
    } catch (e) { /* nothing to migrate */ }
  }
  // the proposals are always there: a deleted one comes back in its original state
  const ordered = {};
  Object.entries(PRESETS).forEach(([n, its]) => {
    if (store.layouts[n]) ordered[n] = store.layouts[n];
    else { ordered[n] = { items: clone(its), colors: {} }; if (hadStore) restored.push(n); }
  });
  Object.entries(store.layouts).forEach(([n, l]) => { if (!ordered[n]) ordered[n] = l; });
  store.layouts = ordered;
  if (!store.layouts[store.current]) store.current = Object.keys(store.layouts)[0];
}
function fillLayouts() {
  const s = $('#layouts');
  s.replaceChildren();
  Object.keys(store.layouts).forEach((n) => { const o = document.createElement('option'); o.value = n; o.textContent = n; s.appendChild(o); });
  s.value = store.current;
  const preset = !!PRESETS[store.current];
  $('#layout-del').disabled = preset || Object.keys(store.layouts).length < 2;
  $('#layout-del').title = preset ? 'Forslagene kan ikke slettes. Brug Nulstil for at få det oprindelige forslag tilbage.' : '';
}
function openLayout(name) {
  store.current = name;
  const l = store.layouts[name];
  colors = clone(l.colors || {});
  setItems(clone(l.items));
  applyColors();
  fillLayouts();
}
let saveTimer = 0;
function save() {
  store.layouts[store.current] = { items, colors };
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORE2, JSON.stringify(store));
      $('#save-state').textContent = 'Gemmes automatisk i denne browser.';
    } catch (e) {
      $('#save-state').textContent = 'Kunne ikke gemme i browseren (for lidt plads). Brug Eksportér.';
    }
  }, 250);
}
function changed() { refreshSelection(); save(); }
$('#layouts').addEventListener('change', (ev) => { save(); openLayout(ev.target.value); save(); });
const layoutErr = (t) => { const e = $('#layout-err'); e.textContent = t || ''; e.hidden = !t; };
$('#layout-name').addEventListener('input', () => layoutErr(''));
$('#layout-save').onclick = () => {
  const name = $('#layout-name').value.trim();
  if (!name) return layoutErr('Skriv et navn til den nye version.');
  if (store.layouts[name]) return layoutErr('Der findes allerede en version med det navn.');
  save();
  store.layouts[name] = { items: clone(items), colors: clone(colors) };
  $('#layout-name').value = '';
  openLayout(name); save();
  flash(`"${name}" er gemt som en kopi. Ændringer herfra gemmes i den.`);
};
const armed = {};
function confirmClick(btn, key, label, fn) {
  if (Date.now() - (armed[key] || 0) > 4000) {
    armed[key] = Date.now(); btn.textContent = 'Klik igen for at bekræfte';
    setTimeout(() => { btn.textContent = label; }, 4000);
    return;
  }
  armed[key] = 0; btn.textContent = label; fn();
}
$('#layout-del').onclick = (ev) => confirmClick(ev.target, 'del', 'Slet version', () => {
  if (PRESETS[store.current] || Object.keys(store.layouts).length < 2) return;
  delete store.layouts[store.current];
  openLayout(Object.keys(store.layouts)[0]); save();
});
$('#reset').onclick = (ev) => confirmClick(ev.target, 'reset', 'Nulstil', () => {
  const preset = PRESETS[store.current] || Object.values(PRESETS)[0];
  colors = {}; setItems(clone(preset)); applyColors(); save();
});
$('#export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ v: 2, name: store.current, items, colors }, null, 1)], { type: 'application/json' }));
  a.download = 'ny-munkegade-' + store.current.toLowerCase().replace(/[^a-z0-9æøå]+/g, '-').replace(/^-|-$/g, '') + '.json';
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
    let name = (typeof d.name === 'string' && d.name.trim()) || 'Importeret', n = 2;
    const base = name;
    while (store.layouts[name]) name = `${base} (${n++})`;
    save();
    store.layouts[name] = { items: d.items, colors: d.colors && typeof d.colors === 'object' ? d.colors : {} };
    openLayout(name); save();
    flash(`"${name}" er importeret som en ny version.`);
  } catch (e) {
    $('#save-state').textContent = 'Filen kunne ikke læses som en indretning.';
  }
});

// --- pointer: drag furniture, pan, zoom, orbit, look around ---------------------------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function groundAt(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, activeCam());
  if (mode === 'plan') return { x: ray.ray.origin.x, z: ray.ray.origin.z };
  const o = ray.ray.origin, d = ray.ray.direction;
  if (d.y > -0.02) return null;                 // not pointing at the floor
  const t = -o.y / d.y;
  return t > (mode === 'walk' ? 14 : 90) ? null : { x: o.x + d.x * t, z: o.z + d.z * t };
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
canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
canvas.addEventListener('pointerdown', (ev) => {
  canvas.setPointerCapture(ev.pointerId);
  const it = ev.button === 0 ? itemAt(ev) : null;
  const g = groundAt(ev);
  if (it) select(it); else if (mode === 'plan') select(null);
  if (it && g) drag = { kind: 'item', dx: it.x - g.x, dz: it.z - g.z };
  else drag = { kind: mode === 'plan' ? 'pan' : mode === 'walk' ? 'look' : (ev.button === 2 || ev.shiftKey ? 'dpan' : 'orbit'), x: ev.clientX, y: ev.clientY };
  if (mode !== 'plan') canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const mx = ev.clientX - (drag.x ?? 0), my = ev.clientY - (drag.y ?? 0);
  if (drag.kind === 'item') {
    const g = groundAt(ev);
    if (!g || !selected) return;
    selected.x = clamp(snap(g.x + drag.dx, ev), -1, W + 1);
    selected.z = clamp(snap(g.z + drag.dz, ev), -2, D + 1);
    place(selected);
    changed();
    return;
  }
  if (drag.kind === 'look') { walk.yaw -= mx * 0.22; walk.pitch = clamp(walk.pitch + my * 0.18, -60, 60); }
  else if (drag.kind === 'orbit') { doll.az -= mx * 0.35; doll.el = clamp(doll.el + my * 0.3, 12, 89); }
  else if (drag.kind === 'dpan') {
    const k = doll.dist * 0.0012, a = doll.az * D2R;
    doll.tx = clamp(doll.tx - (mx * Math.cos(a) + my * Math.sin(a)) * k, -2, W + 2);
    doll.tz = clamp(doll.tz - (-mx * Math.sin(a) + my * Math.cos(a)) * k, -3, D + 2);
  } else if (drag.kind === 'pan') {
    const k = view.h / stage.clientHeight;
    view.cx -= mx * k; view.cz -= my * k;
    applyPlanCam();
  }
  drag.x = ev.clientX; drag.y = ev.clientY;
});
const endDrag = () => { drag = null; if (mode !== 'plan') canvas.style.cursor = 'grab'; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  if (mode === 'doll') { doll.dist = clamp(doll.dist * Math.exp(ev.deltaY * 0.0012), 5, 45); return; }
  if (mode !== 'plan') return;
  const before = groundAt(ev);
  view.h = clamp(view.h * Math.exp(ev.deltaY * 0.0012), 2.5, 22);
  applyPlanCam();
  const after = groundAt(ev);
  view.cx += before.x - after.x; view.cz += before.z - after.z;
  applyPlanCam();
}, { passive: false });
canvas.addEventListener('dblclick', (ev) => {
  if (mode === 'walk' || itemAt(ev)) return;
  const g = groundAt(ev);
  if (!g || blocked(g.x, g.z)) return;
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
    const c = { ...clone(it), id: 'i' + uid++, x: it.x + 0.3, z: it.z + 0.3 };
    items.push(c); build(c); select(c); save(); return;
  } else if (a === 'del') {
    drop(it);
    items = items.filter((o) => o !== it); select(null); statsDirty = true; save(); return;
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
  if (mode !== 'walk') {
    if (selected && k.startsWith('arrow')) {
      ev.preventDefault();
      const s = ev.shiftKey ? 0.01 : 0.05;
      if (k === 'arrowleft') selected.x -= s; if (k === 'arrowright') selected.x += s;
      if (k === 'arrowup') selected.z -= s; if (k === 'arrowdown') selected.z += s;
      place(selected); changed();
    }
    if (k === 'escape') { if (selected) select(null); else if (mode === 'doll') setMode('plan'); }
  } else {
    if (k === 'escape') { if (selected) select(null); else setMode('plan'); return; }
    keys.add(k);
    if (k.startsWith('arrow') || k === ' ') ev.preventDefault();
  }
});
addEventListener('keyup', (ev) => keys.delete(ev.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

// --- catalogue, own furniture, sizes --------------------------------------------------
function dropPoint() {
  if (mode === 'walk') { const y = walk.yaw * D2R; return { x: walk.x + Math.sin(y) * 1.5, z: walk.z - Math.cos(y) * 1.5 }; }
  if (mode === 'doll') return { x: clamp(doll.tx, 0.5, W - 0.5), z: clamp(doll.tz, 0.5, D - 0.5) };
  return { x: clamp(view.cx, 0.5, W - 0.5), z: clamp(view.cz, 0.5, D - 0.5) };
}
function add(it) {
  const p = dropPoint();
  Object.assign(it, { id: 'i' + uid++, x: Math.round(p.x / 0.05) * 0.05, z: Math.round(p.z / 0.05) * 0.05, rot: 0, mirror: false });
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
    if (!selected) return;
    const def = defOf(selected);
    const lim = def.custom ? LIMITS[k] : def.resize?.[k];
    if (!lim) return;
    const raw = (+ev.target.value || 0) / 100, v = clamp(raw, lim[0], lim[1]);
    ev.target.value = cm(v);
    if (def.custom) selected.custom[k] = v; else selected.size = { ...(selected.size || {}), [k]: v };
    build(selected); changed();
    if (Math.abs(v - raw) > 0.004) flash(`Målet kan være mellem ${cm(lim[0])} og ${cm(lim[1])} cm.`);
  });
});

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
loadStore();
resize();
setMode('plan');
openLayout(store.current);
if (restored.length) { save(); flash(`Gendannet: ${restored.join(', ')}`); }
let last = performance.now(), lastStats = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (mode === 'walk') { stepWalk(dt); applyWalkCam(); } else if (mode === 'doll') applyDollCam();
  if (statsDirty && now - lastStats > 200) { lastStats = now; computeStats(); }
  updateLabels();
  renderer.render(scene, activeCam());
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
const ready = new Promise((res) => { THREE.DefaultLoadingManager.onLoad = res; setTimeout(res, 2500); });
window.__planner = {
  ready: ready.then(() => { $('#loading').classList.add('done'); return true; }),
  get items() { return items; }, get selected() { return selected; }, get store() { return store; },
  walk, view, doll, setMode, project, computeStats,
};
