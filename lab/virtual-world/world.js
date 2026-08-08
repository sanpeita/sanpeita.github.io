import * as THREE from "three";

const canvas = document.querySelector("#world");
const welcomeCard = document.querySelector("#welcome-card");
const enterWorldButton = document.querySelector("#enter-world");
const status = document.querySelector("#world-status");
const prompt = document.querySelector("#interaction-prompt");
const promptTitle = document.querySelector("#prompt-title");
const openNearestButton = document.querySelector("#open-nearest");
const panel = document.querySelector("#exhibit-panel");
const closePanelButton = document.querySelector("#close-exhibit");
const exhibitType = document.querySelector("#exhibit-type");
const exhibitTitle = document.querySelector("#exhibit-title");
const exhibitDescription = document.querySelector("#exhibit-description");
const exhibitLinks = document.querySelector("#exhibit-links");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x091426);
scene.fog = new THREE.Fog(0x091426, 12, 31);

const camera = new THREE.PerspectiveCamera(67, window.innerWidth / window.innerHeight, 0.1, 100);
camera.rotation.order = "YXZ";
camera.position.set(0, 1.7, 8.2);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const clock = new THREE.Clock();
const keyState = new Set();
const interactionRange = 4.1;
let yaw = 0;
let pitch = -0.05;
let nearestExhibit = null;
let activeExhibit = null;

const exhibits = {
  blender: {
    type: "CURRENT / 3D EDUCATION",
    title: "Blenderできそうシリーズ",
    description: "初見の「無理そう」をひとつ減らすための短尺シリーズです。全部を説明するのではなく、最初の一歩に必要な3点以内へ絞って、触る理由まで届けます。",
    links: [
      { label: "Blender Shortsを見る ↗", href: "https://www.youtube.com/@TheSANPEITA/shorts" },
      { label: "ポートフォリオへ戻る", href: "../../" }
    ]
  },
  toio: {
    type: "IN DEVELOPMENT / TOIO × UNITY",
    title: "toioTacticalField",
    description: "toio Core Cube と Unity で、机上にオルディアの戦域を立ち上げる自動タクティクス実験です。Transporterのゴール到達と3役の認識を通過し、Scoutの探索を小さく試作しています。",
    links: [
      { label: "toioの公開Shortsを見る ↗", href: "https://www.youtube.com/@TheSANPEITA/shorts" },
      { label: "GitHubの開発作品を見る ↗", href: "https://github.com/sanpeita" }
    ]
  },
  github: {
    type: "PUBLIC / CODE & PROTOTYPES",
    title: "GitHub作品と制作ログ",
    description: "ゲーム、デバイス、Web、ローカル制作支援などの試作は、完成だけでなく途中の仮説も含めて積み上げています。気になるものから、コードと記録を見に来てください。",
    links: [
      { label: "GitHubを見る ↗", href: "https://github.com/sanpeita" },
      { label: "代表動画を見る ↗", href: "https://www.youtube.com/@TheSANPEITA" }
    ]
  }
};

function addLights() {
  const hemi = new THREE.HemisphereLight(0x9fdaff, 0x12151d, 1.35);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xd7edff, 1.65);
  key.position.set(-5, 9, 6);
  scene.add(key);

  const ambient = new THREE.PointLight(0x74cbff, 11, 20, 2);
  ambient.position.set(0, 4.8, 3);
  scene.add(ambient);
}

function addRoom() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 22),
    new THREE.MeshStandardMaterial({ color: 0x101e33, roughness: 0.78, metalness: 0.2 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const grid = new THREE.GridHelper(22, 22, 0x2f668a, 0x1c3852);
  grid.position.y = 0.006;
  scene.add(grid);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x132943, roughness: 0.86, metalness: 0.08 });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(22, 7, 0.35), wallMaterial);
  backWall.position.set(0, 3.5, -10.8);
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7, 22), wallMaterial);
  leftWall.position.set(-10.8, 3.5, 0);
  scene.add(leftWall);

  const rightWall = leftWall.clone();
  rightWall.position.x = 10.8;
  scene.add(rightWall);

  const trimMaterial = new THREE.MeshBasicMaterial({ color: 0x4ea6d8 });
  const trim = new THREE.Mesh(new THREE.BoxGeometry(18, 0.05, 0.05), trimMaterial);
  trim.position.set(0, 3.2, -10.55);
  scene.add(trim);

  const titleLight = new THREE.PointLight(0xa4ebd4, 3.4, 9, 2);
  titleLight.position.set(0, 3.4, -8.7);
  scene.add(titleLight);
}

function addPedestal(position, color, feature) {
  const group = new THREE.Group();
  group.position.copy(position);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.35, 0.26, 48),
    new THREE.MeshStandardMaterial({ color: 0x14263d, roughness: 0.5, metalness: 0.48 })
  );
  base.position.y = 0.13;
  group.add(base);

  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.86, 1.45, 36),
    new THREE.MeshStandardMaterial({ color: 0x1a314d, roughness: 0.36, metalness: 0.56 })
  );
  column.position.y = 0.86;
  group.add(column);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.045, 12, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.94 })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 1.6;
  group.add(halo);

  const light = new THREE.PointLight(color, 4.4, 6.5, 2);
  light.position.y = 2.9;
  group.add(light);

  const visual = feature();
  visual.position.y = 2.45;
  group.add(visual);
  scene.add(group);

  return { group, halo, visual };
}

function makeBlenderObject() {
  const material = new THREE.MeshStandardMaterial({ color: 0x8acfff, metalness: 0.64, roughness: 0.24, emissive: 0x0e3150, emissiveIntensity: 0.55 });
  return new THREE.Mesh(new THREE.TorusKnotGeometry(0.66, 0.21, 120, 18), material);
}

function makeToioObject() {
  const group = new THREE.Group();
  const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x9de8ca, metalness: 0.4, roughness: 0.33, emissive: 0x0d3c30, emissiveIntensity: 0.65 });
  const cubeGeometry = new THREE.BoxGeometry(0.62, 0.62, 0.62);
  [[-0.42, 0.1, 0], [0.35, -0.03, 0.12], [0.04, 0.55, -0.08]].forEach(([x, y, z]) => {
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(x, y, z);
    cube.rotation.set(y * 0.45, x * -0.4, z * 0.6);
    group.add(cube);
  });
  return group;
}

function makeGithubObject() {
  const material = new THREE.MeshStandardMaterial({ color: 0xffdd87, metalness: 0.72, roughness: 0.26, emissive: 0x573d0d, emissiveIntensity: 0.52 });
  return new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 1), material);
}

const blenderObject = addPedestal(new THREE.Vector3(-5.0, 0, -3.1), 0x7dcaff, makeBlenderObject);
const toioObject = addPedestal(new THREE.Vector3(0, 0, -6.3), 0x9de8ca, makeToioObject);
const githubObject = addPedestal(new THREE.Vector3(5.0, 0, -3.1), 0xffdd87, makeGithubObject);

const exhibitObjects = [
  { id: "blender", position: blenderObject.group.position, animation: blenderObject },
  { id: "toio", position: toioObject.group.position, animation: toioObject },
  { id: "github", position: githubObject.group.position, animation: githubObject }
];

addLights();
addRoom();

function setStatus(message) {
  status.textContent = message;
}

function closePanel({ restoreFocus = true } = {}) {
  if (panel.hidden) return;
  const closedTitle = activeExhibit ? exhibits[activeExhibit].title : "展示";
  panel.hidden = true;
  activeExhibit = null;
  setStatus(`${closedTitle} の説明を閉じました。会場へ戻るには画面をクリックしてください。`);
  if (restoreFocus) enterWorldButton.focus({ preventScroll: true });
}

function openExhibit(id) {
  const exhibit = exhibits[id];
  if (!exhibit) return;

  if (document.pointerLockElement === canvas) document.exitPointerLock();
  activeExhibit = id;
  exhibitType.textContent = exhibit.type;
  exhibitTitle.textContent = exhibit.title;
  exhibitDescription.textContent = exhibit.description;
  exhibitLinks.replaceChildren(...exhibit.links.map(({ label, href }) => {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    if (/^https?:\/\//.test(href)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    return link;
  }));
  panel.hidden = false;
  prompt.hidden = true;
  setStatus(`${exhibit.title} の説明を開いています。`);
  closePanelButton.focus({ preventScroll: true });
}

function resetView() {
  camera.position.set(0, 1.7, 8.2);
  yaw = 0;
  pitch = -0.05;
  camera.rotation.set(pitch, yaw, 0);
}

function enterWorld() {
  closePanel({ restoreFocus: false });
  welcomeCard.classList.add("is-minimized");
  canvas.requestPointerLock();
}

function updatePointerLockState() {
  const exploring = document.pointerLockElement === canvas;
  document.body.classList.toggle("is-exploring", exploring);
  if (exploring) {
    welcomeCard.classList.add("is-minimized");
    setStatus("会場を歩いています。展示に近づいたら E キー、または表示されたボタンで開けます。");
  } else if (panel.hidden) {
    setStatus("マウス視点を停止しました。会場に戻るには、画面をクリックするか「会場に入る」を押してください。");
  }
}

function move(delta) {
  if (document.pointerLockElement !== canvas || !panel.hidden) return;

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const speed = keyState.has("ShiftLeft") || keyState.has("ShiftRight") ? 5.4 : 3.2;
  const distance = speed * delta;

  if (keyState.has("KeyW")) camera.position.addScaledVector(forward, distance);
  if (keyState.has("KeyS")) camera.position.addScaledVector(forward, -distance);
  if (keyState.has("KeyD")) camera.position.addScaledVector(right, distance);
  if (keyState.has("KeyA")) camera.position.addScaledVector(right, -distance);

  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -9.3, 9.3);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -9.2, 9.3);
}

function updateNearestExhibit() {
  if (!panel.hidden || document.pointerLockElement !== canvas) {
    prompt.hidden = true;
    nearestExhibit = null;
    return;
  }

  let candidate = null;
  for (const item of exhibitObjects) {
    const distance = camera.position.distanceTo(item.position);
    if (distance < interactionRange && (!candidate || distance < candidate.distance)) candidate = { ...item, distance };
  }

  nearestExhibit = candidate;
  if (candidate) {
    promptTitle.textContent = `${exhibits[candidate.id].title} に近づきました`;
    prompt.hidden = false;
  } else {
    prompt.hidden = true;
  }
}

function animateExhibits(elapsed) {
  exhibitObjects.forEach(({ id, animation }, index) => {
    animation.halo.rotation.z = elapsed * (0.28 + index * 0.05);
    animation.visual.rotation.y = elapsed * (0.45 + index * 0.08);
    animation.visual.position.y = 2.45 + Math.sin(elapsed * 1.1 + index) * 0.13;
    if (id === "toio") animation.visual.rotation.x = Math.sin(elapsed * 0.8) * 0.15;
  });
}

function render() {
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  move(delta);
  updateNearestExhibit();
  animateExhibits(elapsed);
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

enterWorldButton.addEventListener("click", enterWorld);
canvas.addEventListener("click", () => {
  if (panel.hidden && document.pointerLockElement !== canvas) canvas.requestPointerLock();
});
document.addEventListener("pointerlockchange", updatePointerLockState);

document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== canvas) return;
  yaw -= event.movementX * 0.0022;
  pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.002, -1.15, 1.15);
  camera.rotation.set(pitch, yaw, 0);
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && !panel.hidden) {
    closePanel();
    return;
  }
  if (event.code === "KeyE" && nearestExhibit) {
    event.preventDefault();
    openExhibit(nearestExhibit.id);
    return;
  }
  if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"].includes(event.code)) {
    keyState.add(event.code);
    event.preventDefault();
  }
});

document.addEventListener("keyup", (event) => keyState.delete(event.code));
window.addEventListener("blur", () => keyState.clear());

openNearestButton.addEventListener("click", () => {
  if (nearestExhibit) openExhibit(nearestExhibit.id);
});
closePanelButton.addEventListener("click", () => closePanel());
document.querySelector("[data-close-exhibit]").addEventListener("click", () => closePanel());
document.querySelectorAll("[data-exhibit-open]").forEach((button) => {
  button.addEventListener("click", () => openExhibit(button.dataset.exhibitOpen));
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
});

resetView();
render();
