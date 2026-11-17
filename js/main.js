import * as THREE from 'three';
import { RoomEnvironment } from '../lib/three-addons/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from '../lib/three-addons/RectAreaLightUniformsLib.js';
import { U, buildMaterials, PAPER_HEX } from './materials.js?v=7';
import { buildApartment, buildAnnotations, ROOMS, H } from './model.js?v=7';

const RECORD = new URLSearchParams(location.search).has('record');
if (RECORD) document.body.classList.add('record');

// --- renderer ----------------------------------------------------------------
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: RECORD });
renderer.setPixelRatio(RECORD ? 1 : Math.min(devicePixelRatio, 1.75));
renderer.setClearColor(PAPER_HEX, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;
const fog = new THREE.Fog(0xdde3e4, 1e4, 1e5);
scene.fog = fog;

const camera = new THREE.PerspectiveCamera(2, 1, 1, 2000);

// --- model -------------------------------------------------------------------
const M = buildMaterials();
const apt = buildApartment(M);
scene.add(apt.root);
const notes = buildAnnotations(apt.doors);
scene.add(notes);

// reveal regions
const roomKeys = Object.keys(ROOMS);
roomKeys.forEach((k, i) => {
  const r = ROOMS[k];
  U.uRoomBox.value[i].set(r.box[0], r.box[1], r.box[2], r.box[3]);
  U.uRoomP.value[i].set(0, r.dir[0], r.dir[1], 0);
});
const setReveal = (k, v) => { U.uRoomP.value[roomKeys.indexOf(k)].x = v; };

// sky dome, seen only through the windows once the kitchen is revealed
const skyTex = new THREE.TextureLoader().load('assets/sky/qwantani_late_afternoon_puresky.jpg');
skyTex.colorSpace = THREE.SRGBColorSpace;
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(300, 48, 24),
  new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false })
);
sky.rotation.y = Math.PI * 0.15;
sky.renderOrder = -10;
scene.add(sky);

// --- light -------------------------------------------------------------------
// Late afternoon: the low sun comes from the street side (west), the garden side
// (balcony, east) gets soft sky light filtered by the trees.
const sun = new THREE.DirectionalLight(0xffcf9a, 3.2);
sun.position.set(4.7 + 6.5, 6.0, 4.2 + 11.5);
sun.target.position.set(4.7, 0, 4.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0xe3ecf3, 0xb59d84, 0.35));
// soft daylight from the garden side, so furniture sits on the floor
const skyFill = new THREE.DirectionalLight(0xe6eef5, 2.2);
skyFill.position.set(5.2, 7.5, -6.5);
skyFill.target.position.set(4.2, 0, 2.2);
skyFill.castShadow = true;
skyFill.shadow.mapSize.set(2048, 2048);
Object.assign(skyFill.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
skyFill.shadow.radius = 6;
skyFill.shadow.bias = -0.0005;
skyFill.shadow.normalBias = 0.02;
scene.add(skyFill, skyFill.target);

const windowLight = (x0, x1, y0, y1, z, inward, color, intensity) => {
  const l = new THREE.RectAreaLight(color, intensity, x1 - x0, y1 - y0);
  l.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
  l.lookAt((x0 + x1) / 2, (y0 + y1) / 2, z + inward);
  scene.add(l);
  return l;
};
// garden side: cool, soft
windowLight(1.97, 3.12, 0.85, 2.2, 0.02, 1, 0xdfe9f2, 7);
windowLight(4.70, 5.90, 0.0, 2.2, 0.02, 1, 0xdfe9f2, 8);
windowLight(7.55, 8.65, 0.85, 2.2, 0.02, 1, 0xdfe9f2, 6);
// street side: warm
[[0.85, 2.60], [3.70, 4.60], [5.70, 6.55], [7.75, 8.95]].forEach(([a, b]) => windowLight(a, b, 0.85, 2.2, 8.33, -1, 0xffd6a8, 6));
// LED strip under the kitchen wall cabinets
{
  const l = new THREE.RectAreaLight(0xffd2a0, 9, 0.06, 2.6);
  l.position.set(6.31, 1.54, 1.97);
  l.lookAt(6.31, 0, 1.97);
  scene.add(l);
}
apt.lights.forEach((d) => {
  const l = d.kind === 'pendant'
    ? new THREE.PointLight(0xffb468, 5.5, 0, 2)
    : new THREE.PointLight(0xffd4a8, 2.2, 0, 2);
  l.position.copy(d.pos);
  scene.add(l);
});

// --- camera path ---------------------------------------------------------------
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const seg = (p, a, b) => clamp01((p - a) / (b - a));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;

// Phase A: plan sheet through a very long lens, tilting as the walls rise
const A = {
  T0: v3(5.5, 0, 4.2), T1: v3(8.1, 0.5, 5.2),
  fov0: 1.5, fov1: 38,
  el0: 89.95, el1: 40,
  F1: 7.0,
};
function planFrame() {
  const aspect = camera.aspect;
  return Math.max(15.0, 13.8 / aspect);
}
function poseA(s, out) {
  const F0 = planFrame();
  const fov = Math.exp(lerp(Math.log(A.fov0), Math.log(A.fov1), s));
  const F = lerp(F0, A.F1, smooth(s));
  const el = lerp(A.el0, A.el1, smooth(s)) * D2R;
  const T = A.T0.clone().lerp(A.T1, smooth(s));
  const dist = F / 2 / Math.tan((fov * D2R) / 2);
  out.pos.set(T.x, T.y + dist * Math.sin(el), T.z + dist * Math.cos(el));
  out.look.copy(T);
  out.fov = fov;
  out.dist = dist;
  return out;
}

// Phase B: come down to the front door on the stair landing
const endA = poseA(1, { pos: v3(), look: v3() });
const landing = { pos: v3(8.35, 1.6, 5.95), look: v3(8.35, 1.45, 4.2), fov: 62 };
const pathB = new THREE.CatmullRomCurve3([endA.pos.clone(), v3(8.4, 4.4, 9.4), v3(8.36, 2.3, 7.0), landing.pos.clone()], false, 'centripetal');

// Phase C: walk at eye height
const walk = [
  { p: 0.48, pos: v3(8.35, 1.6, 5.95), look: v3(8.35, 1.45, 4.2), fov: 62 },
  { p: 0.58, pos: v3(8.33, 1.6, 4.62), look: v3(6.2, 1.45, 4.55), fov: 62 },
  { p: 0.70, pos: v3(6.70, 1.6, 4.52), look: v3(3.6, 1.40, 4.50), fov: 62 },
  { p: 0.80, pos: v3(4.70, 1.6, 4.50), look: v3(4.0, 1.30, 1.50), fov: 62 },
  { p: 0.91, pos: v3(3.75, 1.6, 3.55), look: v3(4.3, 1.10, 0.60), fov: 60 },
  { p: 1.00, pos: v3(3.05, 1.55, 3.62), look: v3(5.1, 1.0, 0.85), fov: 58 },
];
const walkPos = new THREE.CatmullRomCurve3(walk.map((k) => k.pos), false, 'centripetal', 0.5);
const walkLook = new THREE.CatmullRomCurve3(walk.map((k) => k.look), false, 'centripetal', 0.5);
function walkParam(p) {
  for (let i = 0; i < walk.length - 1; i++) {
    if (p <= walk[i + 1].p) {
      const t = (p - walk[i].p) / (walk[i + 1].p - walk[i].p);
      return { u: (i + t) / (walk.length - 1), fov: lerp(walk[i].fov, walk[i + 1].fov, smooth(t)) };
    }
  }
  return { u: 1, fov: walk[walk.length - 1].fov };
}

// --- the rest of the walk, in yaw/pitch keys --------------------------------------
// u is the timeline unit: 0-1 is plan to kitchen, 1-2.7 the other rooms, 2.7-3 the rise.
const UMAX = 3.0;
let INTRO = 0; // set to 0.25 when assets/img/street.jpg exists: street photo before the plan
const yawPitchOf = (pos, look) => {
  const d = look.clone().sub(pos);
  return { yaw: Math.atan2(d.x, -d.z) / D2R, pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) / D2R };
};
const k0 = walk[walk.length - 1];
const yp0 = yawPitchOf(k0.pos, k0.look);
// yaw 0 looks at the garden (-z), 90 looks along +x; values are unwrapped
const walk2 = [
  { u: 1.00, pos: k0.pos.clone(),        yaw: yp0.yaw, pitch: yp0.pitch, fov: 58 },
  { u: 1.10, pos: v3(4.60, 1.6, 2.60),   yaw: 20,   pitch: -4,  fov: 60 },
  { u: 1.20, pos: v3(5.30, 1.6, 1.20),   yaw: 0,    pitch: -3,  fov: 60 },   // balcony door
  { u: 1.32, pos: v3(5.25, 1.6, 1.50),   yaw: -118, pitch: -12, fov: 62 },   // look back at the room
  { u: 1.40, pos: v3(4.75, 1.6, 3.30),   yaw: -178, pitch: -4,  fov: 62 },
  { u: 1.48, pos: v3(5.20, 1.6, 4.50),   yaw: -268, pitch: -3,  fov: 62 },   // hall, heading east
  { u: 1.56, pos: v3(6.85, 1.6, 4.50),   yaw: -280, pitch: -3,  fov: 62 },
  { u: 1.63, pos: v3(7.25, 1.6, 4.15),   yaw: -350, pitch: -6,  fov: 62 },   // child's door
  { u: 1.72, pos: v3(7.40, 1.55, 3.30),  yaw: -335, pitch: -12, fov: 64 },
  { u: 1.81, pos: v3(7.45, 1.55, 3.15),  yaw: -318, pitch: -12, fov: 64 },
  { u: 1.88, pos: v3(7.25, 1.6, 3.85),   yaw: -200, pitch: -5,  fov: 62 },
  { u: 1.93, pos: v3(6.80, 1.6, 4.45),   yaw: -105, pitch: -3,  fov: 62 },   // hall, heading west
  { u: 2.05, pos: v3(4.95, 1.6, 4.50),   yaw: -100, pitch: -3,  fov: 62 },
  { u: 2.12, pos: v3(4.45, 1.6, 4.90),   yaw: -172, pitch: -6,  fov: 62 },   // living door
  { u: 2.21, pos: v3(4.60, 1.55, 5.80),  yaw: -225, pitch: -10, fov: 64 },   // TV and bike
  { u: 2.31, pos: v3(4.90, 1.55, 5.90),  yaw: -150, pitch: -14, fov: 64 },   // sofa
  { u: 2.39, pos: v3(4.45, 1.6, 5.00),   yaw: -55,  pitch: -5,  fov: 62 },
  { u: 2.46, pos: v3(3.90, 1.6, 4.50),   yaw: -90,  pitch: -3,  fov: 62 },
  { u: 2.53, pos: v3(3.15, 1.6, 4.50),   yaw: -100, pitch: -5,  fov: 62 },   // master door
  { u: 2.62, pos: v3(2.65, 1.55, 4.95),  yaw: -135, pitch: -15, fov: 64 },
  { u: 2.70, pos: v3(2.60, 1.55, 5.00),  yaw: -148, pitch: -13, fov: 64 },
];
const walk2Pos = new THREE.CatmullRomCurve3(walk2.map((k) => k.pos), false, 'centripetal', 0.5);
const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
function walk2At(u, out) {
  const n = walk2.length;
  let i = 0;
  while (i < n - 2 && u > walk2[i + 1].u) i++;
  const t = clamp01((u - walk2[i].u) / (walk2[i + 1].u - walk2[i].u));
  const K = (j) => walk2[Math.min(n - 1, Math.max(0, j))];
  const f = (key) => cr(K(i - 1)[key], K(i)[key], K(i + 1)[key], K(i + 2)[key], t);
  const yaw = f('yaw') * D2R, pitch = f('pitch') * D2R;
  out.pos.copy(walk2Pos.getPoint((i + t) / (n - 1)));
  out.look.set(
    out.pos.x + Math.sin(yaw) * Math.cos(pitch),
    out.pos.y + Math.sin(pitch),
    out.pos.z - Math.cos(yaw) * Math.cos(pitch));
  out.fov = f('fov');
  return out;
}

// Finale: the walls sink back to the cut and the camera rises to the plan view
const F0 = 2.70;
const finStart = walk2At(F0, { pos: v3(), look: v3() });
const finS = (() => {
  const look = finStart.pos.clone().add(finStart.look.clone().sub(finStart.pos).multiplyScalar(2.6));
  const d = finStart.pos.clone().sub(look);
  return { look, dist: d.length(), el: Math.asin(d.y / d.length()), az: Math.atan2(d.x, d.z), fov: finStart.fov };
})();
function poseFinale(f, out) {
  const g = ease(seg(f, 0.14, 1));
  const sg = smooth(g);
  const fov = Math.exp(lerp(Math.log(finS.fov), Math.log(A.fov0), g));
  const Fs = 2 * finS.dist * Math.tan((finS.fov * D2R) / 2);
  const F = lerp(Fs, planFrame(), sg);
  const el = lerp(finS.el, A.el0 * D2R, sg);
  const az = lerp(finS.az, 0, sg);
  const T = finS.look.clone().lerp(A.T0, sg);
  const dist = F / 2 / Math.tan((fov * D2R) / 2);
  out.pos.set(T.x + dist * Math.cos(el) * Math.sin(az), T.y + dist * Math.sin(el), T.z + dist * Math.cos(el) * Math.cos(az));
  out.look.copy(T);
  out.fov = fov;
  return out;
}

const pose = { pos: v3(), look: v3(), fov: 2, dist: 500 };
function cameraAt(u) {
  let longLens = false;
  if (u <= 0.34) {
    poseA(ease(seg(u, 0.07, 0.34)), pose);
    longLens = true;
  } else if (u <= 0.48) {
    const t = ease(seg(u, 0.34, 0.48));
    pose.pos.copy(pathB.getPoint(t));
    pose.look.copy(endA.look).lerp(landing.look, smooth(t));
    pose.fov = lerp(endA.fov, landing.fov, smooth(t));
  } else if (u <= 1) {
    // gentle start and settle, steady pace in between
    const w = seg(u, 0.48, 1.0);
    const pe = 0.48 + 0.52 * (0.55 * w + 0.45 * smooth(w));
    const { u: cu, fov } = walkParam(pe);
    pose.pos.copy(walkPos.getPoint(cu));
    pose.look.copy(walkLook.getPoint(cu));
    pose.fov = fov;
  } else if (u <= F0) {
    walk2At(u, pose);
  } else {
    poseFinale(seg(u, F0, UMAX), pose);
    longLens = true;
  }
  camera.position.copy(pose.pos);
  camera.lookAt(pose.look);
  camera.fov = pose.fov;
  const d = pose.pos.distanceTo(pose.look);
  camera.near = longLens && d > 45 ? d - 40 : 0.03;
  camera.far = longLens ? d + 120 : 400;
  camera.updateProjectionMatrix();
}

// --- scene state from scroll progress ------------------------------------------
const caps = [...document.querySelectorAll('.cap')].map((el) => ({ el, a: +el.dataset.in, b: +el.dataset.out }));
const bar = document.querySelector('.progress i');
const street = document.querySelector('.street');
const streetImg = street.querySelector('i');

function stateAt(p) {
  const u = p * (UMAX + INTRO) - INTRO;
  const sv = 1 - smooth(seg(u, -0.13, -0.02));
  street.style.display = sv > 0 ? 'block' : 'none';
  street.style.opacity = sv.toFixed(3);
  streetImg.style.transform = `scale(${(1 + 1.1 * ease(seg(u, -INTRO, -0.02))).toFixed(4)})`;
  document.body.classList.toggle('on-street', sv > 0.5);
  const f = seg(u, F0, UMAX);
  U.uCut.value = f > 0
    ? lerp(H, 1.2, ease(seg(f, 0.05, 0.32)))
    : 1.2 + (H - 1.2) * ease(seg(u, 0.06, 0.30));
  const full = U.uCut.value >= H - 0.005;
  apt.hanging.visible = full || (f > 0 && U.uCut.value > 2.3);
  M.ceiling.transparent = f > 0;
  M.ceiling.opacity = 1 - seg(f, 0, 0.05);
  apt.ceilings.visible = full && f < 0.05;
  notes.userData.setOpacity(Math.max(1 - smooth(seg(u, 0.09, 0.2)), smooth(seg(f, 0.62, 0.9))));

  apt.doors.front.set(ease(seg(u, 0.43, 0.52)));

  setReveal('hall', seg(u, 0.50, 0.68));
  const k = seg(u, 0.79, 0.95);
  setReveal('kitchen', k);
  setReveal('balcony', seg(u, 0.84, 0.97));
  setReveal('garden', seg(u, 0.84, 0.97));
  setReveal('street', seg(u, 0.84, 0.97));
  setReveal('child', seg(u, 1.60, 1.76));
  setReveal('living', seg(u, 2.10, 2.26));
  setReveal('master', seg(u, 2.50, 2.66));
  setReveal('bath', seg(f, 0.2, 0.5));
  apt.outside.visible = k > 0 && f === 0;
  const inside = u > 0.47 && f === 0;
  fog.near = inside ? 14 : 1e4; fog.far = inside ? 75 : 1e5;
  sky.material.opacity = smooth(seg(u, 0.84, 0.97)) * (1 - smooth(seg(f, 0.03, 0.2)));
  sky.visible = sky.material.opacity > 0;

  cameraAt(u);

  caps.forEach(({ el, a, b }) => {
    const v = Math.min(seg(u, a, a + 0.03), 1 - seg(u, b - 0.03, b));
    el.style.opacity = v.toFixed(3);
    el.style.transform = `translateY(${(1 - v) * 8}px)`;
  });
  bar.style.height = `${(p * 100).toFixed(2)}%`;
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const e = poseA(1, { pos: v3(), look: v3() });
  endA.pos.copy(e.pos); endA.fov = e.fov;
  pathB.points[0].copy(e.pos);
  dirty = true;
}

// --- loop ----------------------------------------------------------------------
let progress = 0, dirty = true;
function frame() {
  if (!dirty) return;
  dirty = false;
  stateAt(progress);
  renderer.render(scene, camera);
}

addEventListener('resize', resize);
resize();

const ready = new Promise((res) => {
  THREE.DefaultLoadingManager.onLoad = res;
  setTimeout(res, 15000);
});

const streetReady = new Promise((res) => {
  const im = new Image();
  im.onload = () => { INTRO = 0.25; res(); };
  im.onerror = () => res();
  im.src = 'assets/img/street.jpg';
});

window.__ready = Promise.all([ready, streetReady]).then(async () => {
  stateAt(0.8);
  await renderer.compileAsync(scene, camera);
  stateAt(0);
  renderer.render(scene, camera);
  document.querySelector('.loading').classList.add('done');
  return true;
});

if (RECORD) {
  // deterministic frames for the recording script
  window.__render = (p) => { progress = p; dirty = true; frame(); return true; };
  window.__dbg = { scene, camera, THREE };
} else {
  const lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 0.9 });
  gsap.registerPlugin(ScrollTrigger);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => { lenis.raf(t * 1000); frame(); });
  gsap.ticker.lagSmoothing(0);
  const st = { p: 0 };
  gsap.to(st, {
    p: 1, ease: 'none',
    scrollTrigger: { trigger: '#scroll', start: 'top top', end: 'bottom bottom', scrub: 1.2 },
    onUpdate: () => { progress = st.p; dirty = true; },
  });
}
