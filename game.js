import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ecbd0);
scene.fog = new THREE.Fog(0x9ecbd0, 95, 360);
const camera = new THREE.PerspectiveCamera(61, window.innerWidth / window.innerHeight, 0.1, 650);
camera.position.set(0, 5.2, -10.5);
const hemi = new THREE.HemisphereLight(0xe5faff, 0x536d57, 2.0);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xffe6bf, 2.4);
sunLight.position.set(-35, 55, -10);
scene.add(sunLight);

const mat = (color, roughness = .8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const materials = {
  road: mat(0x323d40), shoulder: mat(0xb9a777), grass: mat(0x728a68), grassDark: mat(0x566f59),
  white: mat(0xf7f0d7), yellow: mat(0xf2cc72), rail: mat(0xe6ded0, .45, .2), post: mat(0x605e4e),
  trunk: mat(0x6d5943), leaf1: mat(0x315d4a), leaf2: mat(0x477556), leaf3: mat(0x769267),
  coin: new THREE.MeshStandardMaterial({ color: 0xffd96a, emissive: 0xc98b1c, emissiveIntensity: .65, metalness: .8, roughness: .23 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x7bb2b8, roughness: .28, metalness: .2 }),
};

const ground = new THREE.Mesh(new THREE.BoxGeometry(1600, .3, 10000), materials.grass);
ground.position.set(800, -.45, 4500); scene.add(ground);
const ocean = new THREE.Mesh(new THREE.BoxGeometry(950, .1, 10000), mat(0x4f9da8, .26, .12));
ocean.position.set(-1165, -1.05, 4500); scene.add(ocean);
const oceanGlint = new THREE.Mesh(new THREE.BoxGeometry(180, .1, 10000), mat(0x83bcb6, .35));
oceanGlint.position.set(-635, -1, 4500); scene.add(oceanGlint);
const sunBall = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd7a1 }));
sunBall.position.set(-5, 34, 235); scene.add(sunBall);
const sunHalo = new THREE.Mesh(new THREE.SphereGeometry(17, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffc997, transparent: true, opacity: .14 }));
sunHalo.position.copy(sunBall.position); scene.add(sunHalo);

const roadChunks = [];
let nextChunkZ = 0;
const chunkLength = 80;
let seed = 8724;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function addBox(parent, width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}
function addTree(parent, x, z, scale = 1) {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(scale); parent.add(group);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.13, .22, 1.9, 6), materials.trunk); trunk.position.y = .95; group.add(trunk);
  const crownMat = [materials.leaf1, materials.leaf2, materials.leaf3][Math.floor(random() * 3)];
  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.05, 2.4, 7), crownMat); crown.position.y = 2.65; crown.rotation.y = random() * 2; group.add(crown);
  const crown2 = new THREE.Mesh(new THREE.ConeGeometry(.72, 1.8, 7), crownMat); crown2.position.set(.1, 3.35, 0); group.add(crown2);
}
function makeRoadChunk(z) {
  const group = new THREE.Group(); group.position.z = z; scene.add(group);
  addBox(group, 11.5, .22, chunkLength + .2, materials.road, 0, -.08, 0);
  addBox(group, 1.1, .2, chunkLength, materials.shoulder, -6.25, -.1, 0);
  addBox(group, 1.1, .2, chunkLength, materials.shoulder, 6.25, -.1, 0);
  for (let z0 = -chunkLength / 2 + 5; z0 < chunkLength / 2; z0 += 10) {
    addBox(group, .11, .025, 4.2, materials.white, -1.92, .045, z0);
    addBox(group, .11, .025, 4.2, materials.white, 1.92, .045, z0);
    addBox(group, .12, .025, 5.2, materials.yellow, -5.58, .045, z0);
    addBox(group, .12, .025, 5.2, materials.yellow, 5.58, .045, z0);
  }
  for (let side of [-1, 1]) {
    for (let t = -chunkLength / 2 + 7; t < chunkLength / 2; t += 16) {
      addBox(group, .12, .75, .12, materials.post, side * 7.1, .25, t);
      addBox(group, .13, .1, .15, materials.white, side * 7.1, .53, t);
      if (random() < .72) addTree(group, side * (11 + random() * 8), t + random() * 8, .72 + random() * .6);
    }
  }
  if (random() < .8) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(19 + random() * 9, 16 + random() * 14, 7), materials.grassDark);
    hill.position.set(31 + random() * 22, 5, random() * 20 - 10); hill.rotation.y = random() * 2; group.add(hill);
  }
  roadChunks.push({ group, z });
}

const car = new THREE.Group(); scene.add(car);
function buildPlayerCar() {
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff704f, roughness: .34, metalness: .25 });
  const dark = mat(0x19282b, .4, .15);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.75, .55, 3.25), bodyMat); body.position.y = .64; car.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.68, .25, 1.05), bodyMat); hood.position.set(0, .91, 1.0); car.add(hood);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.34, .68, 1.55), mat(0x23434a, .28, .25)); cabin.position.set(0, 1.17, -.23); car.add(cabin);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.18, .42, .07), materials.glass); windshield.position.set(0, 1.34, .57); windshield.rotation.x = -.18; car.add(windshield);
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.16, .4, .07), materials.glass); rearGlass.position.set(0, 1.34, -.99); rearGlass.rotation.x = .18; car.add(rearGlass);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.85, .17, .2), dark); bumper.position.set(0, .42, -1.61); car.add(bumper);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.55, .09, .2), dark); spoiler.position.set(0, 1.1, -1.5); car.add(spoiler);
  for (const x of [-.78, .78]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(.32, .15, .06), mat(0xff5348, .25, .1)); lamp.position.set(x, .76, -1.65); car.add(lamp);
    const headlamp = new THREE.Mesh(new THREE.BoxGeometry(.32, .13, .06), mat(0xfff0bc, .25, .1)); headlamp.position.set(x, .73, 1.64); car.add(headlamp);
    for (const z of [-1.03, 1.05]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .2, 12), dark); wheel.rotation.z = Math.PI / 2; wheel.position.set(x * 1.04, .38, z); car.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .21, 10), mat(0xb8c3bd, .28, .7)); hub.rotation.z = Math.PI / 2; hub.position.set(x * 1.04, .38, z); car.add(hub);
    }
  }
}
buildPlayerCar();
car.position.set(0, 0, 0);

const traffic = [];
const coins = [];
const carColors = [0x6ab8bd, 0xffca70, 0x8977c8, 0xe9e3ce, 0x68a478, 0xc75b4b];
function makeTrafficCar(lane, z) {
  const group = new THREE.Group();
  const paint = mat(carColors[Math.floor(random() * carColors.length)], .4, .18);
  const dark = mat(0x172b32, .3, .15);
  const main = new THREE.Mesh(new THREE.BoxGeometry(1.65, .6, 3.15), paint); main.position.y = .62; group.add(main);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.35, .62, 1.55), mat(0x31535a, .3, .18)); top.position.set(0, 1.15, -.15); group.add(top);
  for (const x of [-.76, .76]) {
    const lights = new THREE.Mesh(new THREE.BoxGeometry(.28, .13, .06), mat(0xff4b43, .3)); lights.position.set(x, .69, -1.6); group.add(lights);
    for (const zz of [-1, 1]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.31, .31, .18, 10), dark); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, .34, zz); group.add(wheel); }
  }
  group.position.set((lane - 1) * 3.82, 0, z); scene.add(group);
  traffic.push({ group, x: (lane - 1) * 3.82, z, passed: false });
}
function makeCoin(lane, z) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.48, .12, 8, 18), materials.coin); ring.rotation.y = Math.PI / 2; ring.position.y = 1.25; group.add(ring);
  const center = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), materials.coin); center.position.y = 1.25; group.add(center);
  group.position.set((lane - 1) * 3.82, .05, z); scene.add(group);
  coins.push({ group, x: group.position.x, z, taken: false, phase: random() * 6 });
}

const $ = (selector) => document.querySelector(selector);
const speedEl = $('#speed'), distanceEl = $('#distance'), scoreEl = $('#score'), routeFill = $('#routeFill');
const startOverlay = $('#startOverlay'), endOverlay = $('#endOverlay');
const finishDistance = 2500;
let state = 'ready';
let distance = 0;
let speed = 0;
let score = 0;
let collected = 0;
let hits = 0;
let playerX = 0;
let steerInput = 0;
let steerVelocity = 0;
let braking = false;
let nextTraffic = 35;
let nextCoin = 21;
let invulnerable = 0;
let toastTimer = 0;
let elapsed = 0;
const clock = new THREE.Clock();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function addUpcoming() {
  while (nextChunkZ < distance + 290) {
    makeRoadChunk(nextChunkZ);
    nextChunkZ += chunkLength;
  }
  while (roadChunks.length && roadChunks[0].z + chunkLength / 2 < distance - 95) {
    const old = roadChunks.shift();
    scene.remove(old.group);
    old.group.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); });
  }
  while (nextTraffic < distance + 260) {
    const lane = Math.floor(random() * 3);
    makeTrafficCar(lane, nextTraffic);
    nextTraffic += 45 + random() * 35;
  }
  while (nextCoin < distance + 240) {
    const lane = Math.floor(random() * 3);
    makeCoin(lane, nextCoin);
    if (random() > .55) makeCoin(lane, nextCoin + 5.3);
    nextCoin += 55 + random() * 52;
  }
}
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  toastTimer = 1.05;
}
function resetGame() {
  for (const item of [...traffic, ...coins]) scene.remove(item.group);
  traffic.length = 0; coins.length = 0;
  for (const item of roadChunks) {
    scene.remove(item.group);
    item.group.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); });
  }
  roadChunks.length = 0;
  distance = 0; speed = 0; score = 0; collected = 0; hits = 0; playerX = 0;
  steerInput = 0; steerVelocity = 0; braking = false; nextChunkZ = 0;
  nextTraffic = 35; nextCoin = 21; invulnerable = 0;
  car.position.set(0, 0, 0); car.rotation.set(0, 0, 0);
  seed = 8724; addUpcoming(); updateHud();
  startOverlay.classList.add('hidden'); endOverlay.classList.add('hidden'); state = 'running';
  clock.getDelta();
}
function updateHud() {
  speedEl.textContent = String(Math.round(speed * 3.6)).padStart(3, '0');
  distanceEl.textContent = (distance / 1000).toFixed(1);
  scoreEl.textContent = String(Math.max(0, Math.floor(score))).padStart(5, '0');
  routeFill.style.width = `${Math.min(100, distance / finishDistance * 100)}%`;
}
function endGame(won) {
  state = 'ended';
  $('#resultEyebrow').textContent = won ? 'RUN COMPLETE' : 'RUN OVER';
  $('#resultTitle').textContent = won ? 'Coast conquered.' : 'One more run?';
  $('#resultCopy').textContent = won ? 'The horizon looks good on you.' : 'The coast will still be here. Take another line.';
  $('#finalScore').textContent = Math.floor(score).toLocaleString();
  endOverlay.classList.remove('hidden');
}
function pauseGame() {
  if (state === 'running') {
    state = 'paused';
    $('#resultEyebrow').textContent = 'TAKE A BREATHER';
    $('#resultTitle').textContent = 'Pit stop.';
    $('#resultCopy').textContent = 'Your drive is paused. Ready when you are.';
    $('#finalScore').textContent = Math.floor(score).toLocaleString();
    $('#againBtn').textContent = 'BACK TO THE ROAD  →';
    endOverlay.classList.remove('hidden');
  } else if (state === 'paused') {
    state = 'running'; endOverlay.classList.add('hidden'); $('#againBtn').textContent = 'DRIVE AGAIN  ↻'; clock.getDelta();
  }
}
function updateGame(dt) {
  elapsed += dt;
  const targetSpeed = braking ? 19 : 43.5;
  speed += (targetSpeed - speed) * Math.min(1, dt * (braking ? 3.4 : 1.05));
  distance += speed * dt;
  if (distance >= finishDistance) { distance = finishDistance; score += speed * dt * 4; updateHud(); endGame(true); return; }
  const steerGoal = steerInput * 6.7;
  steerVelocity += (steerGoal - steerVelocity) * Math.min(1, dt * 7.5);
  playerX = clamp(playerX + steerVelocity * dt, -5.15, 5.15);
  car.position.set(playerX, .03 + Math.sin(elapsed * 12) * .018, distance);
  car.rotation.z = -steerVelocity * .027;
  car.rotation.y = clamp(-steerVelocity * .018, -.12, .12);
  invulnerable = Math.max(0, invulnerable - dt);
  car.visible = !(invulnerable > 0 && Math.floor(elapsed * 13) % 2 === 0);
  const camX = playerX * .38;
  camera.position.x += (camX - camera.position.x) * Math.min(1, dt * 2.8);
  camera.position.y = 3.9 + Math.min(.35, speed * .002);
  camera.position.z = distance - 8;
  camera.lookAt(playerX * .15, .9, distance + 11);
  if (Math.abs(playerX) > 4.65 && invulnerable <= 0) {
    speed = Math.max(14, speed - 16 * dt);
  }
  score += speed * dt * 2.8;
  addUpcoming();
  for (let i = traffic.length - 1; i >= 0; i--) {
    const item = traffic[i];
    const gap = item.z - distance;
    if (!item.passed && gap < -3.4) {
      item.passed = true;
      if (Math.abs(playerX - item.x) < 2.3) { score += 250; showToast('+250  CLEAN PASS'); }
    }
    if (invulnerable <= 0 && Math.abs(gap) < 2.45 && Math.abs(playerX - item.x) < 1.65) {
      hits++; invulnerable = 1.35; speed = Math.max(13, speed * .48); score = Math.max(0, score - 350);
      $('#flash').classList.remove('hit'); void $('#flash').offsetWidth; $('#flash').classList.add('hit');
      showToast(hits >= 3 ? 'DAMAGE CRITICAL' : 'TRAFFIC HIT  −350');
      if (hits >= 3) { endGame(false); return; }
    }
    if (gap < -18) { scene.remove(item.group); traffic.splice(i, 1); }
  }
  for (let i = coins.length - 1; i >= 0; i--) {
    const item = coins[i];
    item.group.rotation.y = Math.sin(elapsed * 2.8 + item.phase) * .3;
    item.group.position.y = .1 + Math.sin(elapsed * 3.4 + item.phase) * .12;
    const gap = item.z - distance;
    if (Math.abs(gap) < 2.3 && Math.abs(playerX - item.x) < 1.6) {
      item.taken = true; collected++; score += 500; showToast('✦  +500  COAST COIN');
      scene.remove(item.group); coins.splice(i, 1); continue;
    }
    if (gap < -15) { scene.remove(item.group); coins.splice(i, 1); }
  }
  if (toastTimer > 0 && (toastTimer -= dt) <= 0) $('#toast').classList.remove('show');
  updateHud();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .045);
  if (state === 'running') updateGame(dt);
  else if (state === 'ready') {
    const t = performance.now() * .0004;
    camera.position.set(Math.sin(t) * .25, 5.25, -10.8);
    camera.lookAt(0, 1, 13);
    car.position.y = .02 + Math.sin(performance.now() * .002) * .025;
  }
  renderer.render(scene, camera);
}

function setSteer(value) { steerInput = value; }
const bindHold = (id, onDown, onUp) => {
  const button = document.getElementById(id);
  const down = event => { event.preventDefault(); button.classList.add('pressed'); onDown(); };
  const up = event => { event.preventDefault(); button.classList.remove('pressed'); onUp(); };
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', up);
  button.addEventListener('lostpointercapture', up);
};
bindHold('left', () => setSteer(-1), () => setSteer(steerInput === -1 ? 0 : steerInput));
bindHold('right', () => setSteer(1), () => setSteer(steerInput === 1 ? 0 : steerInput));
bindHold('brake', () => { braking = true; }, () => { braking = false; });
const keys = new Set();
window.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) event.preventDefault();
  keys.add(event.key.toLowerCase());
  if ((event.key === 'Escape' || event.key.toLowerCase() === 'p') && state !== 'ready' && state !== 'ended') pauseGame();
  if (event.key === 'Enter' && state === 'ready') resetGame();
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); steerInput = 0; braking = false; });
function syncKeys() {
  if (!document.querySelector('.control-btn:active')) {
    if (keys.has('arrowleft') || keys.has('a')) steerInput = -1;
    else if (keys.has('arrowright') || keys.has('d')) steerInput = 1;
    else if (!document.activeElement?.classList.contains('control-btn')) steerInput = 0;
  }
  braking = keys.has(' ') || keys.has('arrowdown') || braking;
  if (!keys.has(' ') && !keys.has('arrowdown') && !document.querySelector('#brake.pressed')) braking = false;
  requestAnimationFrame(syncKeys);
}
requestAnimationFrame(syncKeys);
$('#startBtn').addEventListener('click', resetGame);
$('#againBtn').addEventListener('click', () => { if (state === 'paused') pauseGame(); else resetGame(); });
$('#pause').addEventListener('click', pauseGame);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
});
addUpcoming();
animate();
