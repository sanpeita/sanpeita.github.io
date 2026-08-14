import * as THREE from "three";
import { filterGalleryExhibits, loadExhibits, resolveAssetUrl } from "../../assets/exhibits/exhibit-data.mjs";

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
const startGuideButton = document.querySelector("#start-guide");
const guideCard = document.querySelector("#guide-card");
const guideProgress = document.querySelector("#guide-progress");
const guideTitle = document.querySelector("#guide-title");
const guideDescription = document.querySelector("#guide-description");
const guidePrev = document.querySelector("#guide-prev");
const guideNext = document.querySelector("#guide-next");
const guideOpen = document.querySelector("#guide-open");
const guideEnd = document.querySelector("#guide-end");
const supportMessage = document.querySelector("#support-message");
const managedExhibitList = document.querySelector("#managed-exhibit-list");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x091426);
scene.fog = new THREE.Fog(0x091426, 18, 145);

const camera = new THREE.PerspectiveCamera(67, window.innerWidth / window.innerHeight, 0.1, 160);
camera.rotation.order = "YXZ";
camera.position.set(0, 1.7, 8.2);

let renderer;
let webglAvailable = true;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  document.body.classList.add("webgl-ready");
} catch (error) {
  webglAvailable = false;
  canvas.hidden = true;
  supportMessage.textContent = "この環境では3D表示を開始できません。展示一覧と実リンクから作品をご覧ください。";
  renderer = {
    setPixelRatio() {},
    setSize() {},
    render() {},
    outputColorSpace: THREE.SRGBColorSpace
  };
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const clock = new THREE.Clock();
const keyState = new Set();
const interactionRange = 4.1;
const PLAYER_RADIUS = 1.2;
const WORLD_BOUNDS = { minX: -11.5, maxX: 11.5, minZ: -105, maxZ: 9.3 };
const colliders = [];

const DOOR_HALF = 2.5;
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x101e33, roughness: 0.78, metalness: 0.2 });
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x132943, roughness: 0.86, metalness: 0.08 });
const lintelMaterial = new THREE.MeshStandardMaterial({ color: 0x203c5c, roughness: 0.7, metalness: 0.15 });
const boardMaterial = new THREE.MeshStandardMaterial({ color: 0x1b3050, roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide });
const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x4ea6d8, roughness: 0.4, metalness: 0.35 });
let yaw = 0;
let pitch = -0.05;
let nearestExhibit = null;
let activeExhibit = null;
let guideIndex = 0;
const guideIds = ["profile-about", "works-movies", "works-latest", "games-experiments", "exit-souvenirs"];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const walkingSupported = webglAvailable && typeof canvas.requestPointerLock === "function" && !window.matchMedia("(pointer: coarse), (max-width: 700px)").matches;

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
  },
  games: {
    type: "MANAGED EXHIBITS",
    title: "登録作品カタログ",
    description: "作品情報を読み込んでいます。",
    links: [{ label: "文字ポートフォリオへ", href: "../../#projects" }]
  },
  "profile-about": {
    type: "02 / PROFILE ROOM",
    title: "自己紹介：教育 × 制作 × VTuber",
    description: "うのっちは、教育現場でデジタル教材開発・3D制作に関わる講師／クリエイターです。2020年、YouTubeの「うのっち」チャンネルを起点にVTuber活動を開始。最初の「無理そう」をひとつ減らすことを大切にしています。",
    links: [
      { label: "noteでV文化論を読む ↗", href: "https://note.com/sanpeita" },
      { label: "YouTubeを見る ↗", href: "https://www.youtube.com/@TheSANPEITA" }
    ]
  },
  "profile-bring": {
    type: "02 / PROFILE ROOM",
    title: "What I Bring：入口をつくる",
    description: "「観察する」初見が止まる場所を見つける。「小さく作る」伝わる形まで試して見せる。「続けて直す」反応を見て、次の一歩を軽くする。全部覚えなくて大丈夫、まずはひとつ見えれば十分です。",
    links: [
      { label: "ポートフォリオの自己紹介へ", href: "../../#about" },
      { label: "代表作を見る ↗", href: "../../#works" }
    ]
  },
  "works-movies": {
    type: "03 / WORKS ROOM",
    title: "まず見てほしい、代表作4本",
    description: "短い時間で、教育・ゲーム・デバイス・思想の4つの強みが分かる代表作です。toioで自作ツインスティック、Blenderの「複製1個」、RobloxでのBackrooms再現、そしてV文化論のフィールド設計。",
    links: [
      { label: "toio自作ツインスティック ↗", href: "https://www.youtube.com/watch?v=YogaOVAiXTU" },
      { label: "Blender「複製1個」↗", href: "https://www.youtube.com/watch?v=wpBQTzA3uyg" },
      { label: "爆発Backroomsをゲーム化 ↗", href: "https://www.youtube.com/watch?v=Hn6c8Ln2A0w" },
      { label: "近づく前にフィールドを合わせる ↗", href: "https://www.youtube.com/watch?v=Jg-ROUK7HN0" }
    ]
  },
  "works-projects": {
    type: "03 / WORKS ROOM",
    title: "公開作品から、次の試作へ",
    description: "動画として見せること、実機で試すこと、次の人が触れられる形にすること。Blenderできそうシリーズ、toioTacticalField、ゲームと空間の公開制作を中心に、今も小さく続けています。",
    links: [
      { label: "Blenderできそうシリーズ ↗", href: "https://www.youtube.com/@TheSANPEITA/shorts" },
      { label: "unityroomの作品 ↗", href: "https://unityroom.com/users/bapfjey9s3kr14itud7h" },
      { label: "ProtoPedia ↗", href: "https://protopedia.net/prototyper/sanpeita" }
    ]
  },
  "works-latest": {
    type: "03 / WORKS ROOM · RECENT BUILDS",
    title: "2026年7月〜8月の最近作",
    description: "Minecraft用Importer Mod、Unity版オルディアPhaseT2、AIエージェントへインシデントを委任するUnityゲーム、Blenderの透明っぽい素材の入口。最近の4本を新しい順で紹介します。",
    links: [
      { label: "MagicaVoxel Importer Mod ↗", href: "https://www.youtube.com/watch?v=VJ69-nhBhOU" },
      { label: "Unity版オルディアPhaseT2 ↗", href: "https://www.youtube.com/watch?v=oXVi8Rup6is" },
      { label: "AIエージェント委任Unityゲーム ↗", href: "https://www.youtube.com/watch?v=LZgxWzS0UVY" },
      { label: "透明っぽい素材の入口 ↗", href: "https://www.youtube.com/watch?v=A-OFtZaHR0o" }
    ]
  },
  "games-casual": {
    type: "04 / GAMES & EXPERIMENTS",
    title: "登録作品カタログ",
    description: "作品情報を読み込んでいます。",
    links: [{ label: "文字ポートフォリオへ", href: "../../#projects" }]
  },
  "games-experiments": {
    type: "04 / GAMES & EXPERIMENTS",
    title: "実験的プロジェクト",
    description: "この展示室そのものが、Web上で「遊んで分かる」を試す実験です。Phase 0から少しずつ会場を育てています。他にもゲームと空間の公開制作を、GitHubとunityroomで積み上げています。",
    links: [
      { label: "この展示室のコード ↗", href: "https://github.com/sanpeita/sanpeita.github.io/tree/master/lab/virtual-world" },
      { label: "GitHub ↗", href: "https://github.com/sanpeita" },
      { label: "unityroom ↗", href: "https://unityroom.com/users/bapfjey9s3kr14itud7h" }
    ]
  },
  "exit-souvenirs": {
    type: "05 / EXIT · OMIYAGE",
    title: "おみやげコーナー：活動を持ち帰る",
    description: "今日の展示はいかがでしたか。気になった活動は、それぞれの場所から持ち帰れます。動画、思想、制作ログ。見たい距離から、気になる入口を選んでください。",
    links: [
      { label: "YouTube ↗", href: "https://www.youtube.com/@TheSANPEITA" },
      { label: "note ↗", href: "https://note.com/sanpeita" },
      { label: "X ↗", href: "https://x.com/unoksanpt" },
      { label: "TikTok ↗", href: "https://www.tiktok.com/@unotchi" },
      { label: "GitHub ↗", href: "https://github.com/sanpeita" },
      { label: "Qiita ↗", href: "https://qiita.com/sanpeita" }
    ]
  },
  "exit-portfolios": {
    type: "05 / EXIT · OMIYAGE",
    title: "外部サービス上の公開実績",
    description: "あちこちに積み上がった作品と記録の棚です。ProtoPedia、3D Data Japan、cluster、Fortniteクリエイター島などからも遊べます。",
    links: [
      { label: "ProtoPedia ↗", href: "https://protopedia.net/prototyper/sanpeita" },
      { label: "3D Data Japan ↗", href: "https://3d-data.skhonpo.com/collections/unotchi_sanpeita" },
      { label: "cluster ↗", href: "https://cluster.mu/u/sanpeita" },
      { label: "Fortnite ↗", href: "https://www.fortnite.com/@unotchi/8265-0398-2062?lang=ja" }
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

function addMeshCollider(mesh) {
  const geometry = mesh.geometry;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  colliders.push({
    minX: mesh.position.x + box.min.x,
    maxX: mesh.position.x + box.max.x,
    minZ: mesh.position.z + box.min.z,
    maxZ: mesh.position.z + box.max.z
  });
}

function hWall(x1, x2, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1, 7, 0.35), wallMaterial);
  mesh.position.set((x1 + x2) / 2, 3.5, z);
  scene.add(mesh);
  addMeshCollider(mesh);
  return mesh;
}

function vWall(z1, z2, x) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7, z2 - z1), wallMaterial);
  mesh.position.set(x, 3.5, (z1 + z2) / 2);
  scene.add(mesh);
  addMeshCollider(mesh);
  return mesh;
}

function hWallWithDoor(x1, x2, z) {
  if (x1 < -DOOR_HALF) hWall(x1, -DOOR_HALF, z);
  if (DOOR_HALF < x2) hWall(DOOR_HALF, x2, z);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(DOOR_HALF * 2, 4.2, 0.35), lintelMaterial);
  lintel.position.set(0, 4.9, z);
  scene.add(lintel);
}

function addRoom() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 22),
    floorMaterial
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const grid = new THREE.GridHelper(22, 22, 0x2f668a, 0x1c3852);
  grid.position.y = 0.006;
  scene.add(grid);

  hWallWithDoor(-11, 11, -10.8);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7, 22), wallMaterial);
  leftWall.position.set(-10.8, 3.5, 0);
  scene.add(leftWall);
  addMeshCollider(leftWall);

  const rightWall = leftWall.clone();
  rightWall.position.x = 10.8;
  scene.add(rightWall);
  addMeshCollider(rightWall);

  const trimMaterial = new THREE.MeshBasicMaterial({ color: 0x4ea6d8 });
  const trim = new THREE.Mesh(new THREE.BoxGeometry(18, 0.05, 0.05), trimMaterial);
  trim.position.set(0, 3.2, -10.55);
  scene.add(trim);

  const titleLight = new THREE.PointLight(0xa4ebd4, 3.4, 9, 2);
  titleLight.position.set(0, 3.4, -8.7);
  scene.add(titleLight);
}

function makeLabel(text, options = {}) {
  const { fontSize = 30, width = 640, height = 128, color = "#e9f5ff", accent = 0x4ea6d8 } = options;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(7, 16, 31, 0.84)";
  ctx.fillRect(0, 0, width, height);
  const accentHex = "#" + accent.toString(16).padStart(6, "0");
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, width, 6);
  ctx.fillStyle = color;
  ctx.font = `700 ${fontSize}px "BIZ UDPGothic", "Hiragino Sans", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width / 256, height / 256, 1);
  return sprite;
}

function addFloorArrow(z, dir) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = "rgba(128, 209, 255, 0.9)";
  ctx.beginPath();
  const tipY = dir < 0 ? 14 : 114;
  const baseY = dir < 0 ? 114 : 14;
  ctx.moveTo(14, baseY);
  ctx.lineTo(64, tipY);
  ctx.lineTo(114, baseY);
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.014, z);
  scene.add(mesh);
}

function makePosterTexture({ title, category, summary }) {
  const poster = document.createElement("canvas");
  poster.width = 960;
  poster.height = 540;
  const ctx = poster.getContext("2d");
  ctx.fillStyle = "#10233c";
  ctx.fillRect(0, 0, poster.width, poster.height);
  ctx.fillStyle = "#80d1ff";
  ctx.fillRect(0, 0, 18, poster.height);
  ctx.fillStyle = "#a6ebcf";
  ctx.font = '800 30px "BIZ UDPGothic", sans-serif';
  ctx.fillText(category, 58, 72);
  ctx.fillStyle = "#e9f5ff";
  ctx.font = '800 48px "BIZ UDPGothic", sans-serif';
  ctx.fillText(title.slice(0, 28), 58, 170);
  ctx.fillStyle = "#a9c0d2";
  ctx.font = '600 26px "BIZ UDPGothic", sans-serif';
  const words = summary.match(/.{1,30}/g) || [];
  words.slice(0, 4).forEach((line, index) => ctx.fillText(line, 58, 265 + index * 48));
  const texture = new THREE.CanvasTexture(poster);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addWallPanel({ x, y = 2.6, z, facing = 0, rotation, width = 3.4, height = 2.1, label, imageUrl, category = "EXHIBIT", summary = "公開作品と活動の記録" }) {
  const group = new THREE.Group();
  const fallback = makePosterTexture({ title: label, category, summary });
  const material = new THREE.MeshStandardMaterial({ map: fallback, roughness: 0.45, metalness: 0.12, side: THREE.DoubleSide });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.16, height + 0.16, 0.08), frameMaterial);
  board.position.z = 0.06;
  group.add(frame, board);
  group.position.set(x, y, z);
  if (rotation) group.rotation.set(rotation.x, rotation.y, rotation.z);
  else group.rotation.y = facing;
  scene.add(group);
  if (imageUrl) {
    new THREE.TextureLoader().load(imageUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
      material.needsUpdate = true;
    }, undefined, () => {
      material.map = fallback;
      material.needsUpdate = true;
    });
  }
  if (label) {
    const tag = makeLabel(label, { width: 520, height: 100, fontSize: 24 });
    tag.position.set(x, y + 1.35, z);
    scene.add(tag);
  }
  return { position: group.position, group };
}

function buildCorridor(z1, z2, nextLabel) {
  const depth = z2 - z1;
  const center = (z1 + z2) / 2;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, depth), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = center;
  scene.add(floor);

  const grid = new THREE.GridHelper(6, 6, 0x2f668a, 0x1c3852);
  grid.scale.set(1, 1, depth / 6);
  grid.position.y = 0.006;
  grid.position.z = center;
  scene.add(grid);

  vWall(z1, z2, -3);
  vWall(z1, z2, 3);

  addFloorArrow(center, -1);

  const sign = makeLabel("→ " + nextLabel, { width: 560, height: 120, fontSize: 26 });
  sign.position.set(-2.4, 2.3, center);
  scene.add(sign);
}

function buildRoom({ z1, z2, title, accent, backDoor = true }) {
  const depth = z2 - z1;
  const center = (z1 + z2) / 2;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, depth), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = center;
  scene.add(floor);

  const grid = new THREE.GridHelper(22, 22, 0x2f668a, 0x1c3852);
  grid.scale.set(1, 1, depth / 22);
  grid.position.y = 0.006;
  grid.position.z = center;
  scene.add(grid);

  vWall(z1, z2, -10.8);
  vWall(z1, z2, 10.8);

  hWallWithDoor(-11, 11, z1);
  if (backDoor) hWallWithDoor(-11, 11, z2);
  else hWall(-11, 11, z2);

  const light = new THREE.PointLight(accent, 4.2, 18, 2);
  light.position.set(0, 3.8, center);
  scene.add(light);

  const sign = makeLabel(title, { width: 680, height: 126, fontSize: 32, accent });
  sign.position.set(0, 5.35, z1 - 0.25);
  scene.add(sign);
}

function buildPhase1() {
  buildCorridor(-11, -17, "02 PROFILE ROOM");
  buildRoom({ z1: -17, z2: -33, title: "02 PROFILE ROOM", accent: 0x8fd3b6 });
  exhibitObjects.push({ id: "profile-about", position: addWallPanel({ x: -10.2, z: -24, facing: Math.PI / 2, label: "自己紹介", category: "PROFILE", summary: "教育 × 制作 × VTuber", imageUrl: "../../images/og-portfolio.png" }).position });
  exhibitObjects.push({ id: "profile-bring", position: addWallPanel({ x: 10.2, z: -26, facing: -Math.PI / 2, label: "What I Bring", category: "PROFILE", summary: "入口をつくる3つの力" }).position });

  buildCorridor(-33, -39, "03 WORKS ROOM");
  buildRoom({ z1: -39, z2: -55, title: "03 WORKS ROOM", accent: 0x79c7f2 });
  exhibitObjects.push({ id: "works-movies", position: addWallPanel({ x: -7.6, z: -53.6, facing: 0, label: "代表作4本", category: "SELECTED WORKS", summary: "教育・ゲーム・デバイス・思想", imageUrl: "https://i.ytimg.com/vi/YogaOVAiXTU/hqdefault.jpg" }).position });
  exhibitObjects.push({ id: "works-latest", position: addWallPanel({ x: -4.6, z: -53.6, facing: 0, label: "最近作4本", category: "RECENT BUILDS", summary: "2026年7月〜8月の制作", imageUrl: "https://i.ytimg.com/vi/VJ69-nhBhOU/hqdefault.jpg" }).position });
  exhibitObjects.push({ id: "works-projects", position: addWallPanel({ x: 4.8, z: -53.6, facing: 0, label: "主要プロジェクト", category: "PROJECTS", summary: "公開作品から次の試作へ", imageUrl: "https://i.ytimg.com/vi/oXVi8Rup6is/hqdefault.jpg" }).position });

  buildCorridor(-55, -61, "04 GAMES & EXPERIMENTS");
  buildRoom({ z1: -61, z2: -77, title: "04 GAMES & EXPERIMENTS", accent: 0xffd166 });
  exhibitObjects.push({ id: "games-casual", position: addWallPanel({ x: -4.6, z: -75.6, facing: 0, label: "カジュアルゲーム", category: "GAMES", summary: "通信なしで遊べる公開制作", imageUrl: "../../images/HfPreddoor.png" }).position });
  exhibitObjects.push({ id: "games-experiments", position: addWallPanel({ x: 4.6, z: -75.6, facing: 0, label: "実験的プロジェクト", category: "EXPERIMENTS", summary: "ゲームと空間の公開制作", imageUrl: "https://i.ytimg.com/vi/LZgxWzS0UVY/hqdefault.jpg" }).position });

  buildCorridor(-77, -83, "05 EXIT · OMIYAGE");
  buildRoom({ z1: -83, z2: -99, title: "05 EXIT · OMIYAGE", accent: 0xc96a4a });
  exhibitObjects.push({ id: "exit-souvenirs", position: addWallPanel({ x: -3.2, z: -97.6, facing: 0, label: "おみやげコーナー", category: "OMIYAGE", summary: "活動の公開先を持ち帰る" }).position });
  exhibitObjects.push({ id: "exit-portfolios", position: addWallPanel({ x: 3.2, z: -97.6, facing: 0, label: "外部サービス実績", category: "PUBLIC LINKS", summary: "公開ポートフォリオの棚", imageUrl: "../../images/kabe_viper_white.png" }).position });

  hWall(-11, 11, -99);

  const farewell = makeLabel("FIN · ありがとうございました", { width: 760, height: 170, fontSize: 34, accent: 0xffd166 });
  farewell.position.set(0, 5.1, -98.6);
  scene.add(farewell);

  const entranceSign = makeLabel("01 ENTRANCE HALL", { width: 640, height: 120, fontSize: 30, accent: 0x79c7f2 });
  entranceSign.position.set(0, 5.4, -10.5);
  scene.add(entranceSign);
}

const ROOM_SLOTS = {
  profile: [
    { x: -10.2, z: -19.5, facing: Math.PI / 2 }, { x: 10.2, z: -19.5, facing: -Math.PI / 2 },
    { x: -10.2, z: -23.5, facing: Math.PI / 2 }, { x: 10.2, z: -23.5, facing: -Math.PI / 2 },
    { x: -10.2, z: -27.5, facing: Math.PI / 2 }, { x: 10.2, z: -27.5, facing: -Math.PI / 2 },
    { x: -10.2, z: -31.0, facing: Math.PI / 2 }, { x: 10.2, z: -31.0, facing: -Math.PI / 2 }
  ],
  works: [
    { x: -10.2, z: -41.5, facing: Math.PI / 2 }, { x: 10.2, z: -41.5, facing: -Math.PI / 2 },
    { x: -10.2, z: -45.5, facing: Math.PI / 2 }, { x: 10.2, z: -45.5, facing: -Math.PI / 2 },
    { x: -10.2, z: -49.5, facing: Math.PI / 2 }, { x: 10.2, z: -49.5, facing: -Math.PI / 2 },
    { x: -10.2, z: -53.0, facing: Math.PI / 2 }, { x: 10.2, z: -53.0, facing: -Math.PI / 2 }
  ],
  games: [
    { x: -10.2, z: -63.5, facing: Math.PI / 2 }, { x: 10.2, z: -63.5, facing: -Math.PI / 2 },
    { x: -10.2, z: -67.5, facing: Math.PI / 2 }, { x: 10.2, z: -67.5, facing: -Math.PI / 2 },
    { x: -10.2, z: -71.5, facing: Math.PI / 2 }, { x: 10.2, z: -71.5, facing: -Math.PI / 2 },
    { x: -10.2, z: -74.5, facing: Math.PI / 2 }, { x: 10.2, z: -74.5, facing: -Math.PI / 2 }
  ],
  exit: [
    { x: -10.2, z: -85.5, facing: Math.PI / 2 }, { x: 10.2, z: -85.5, facing: -Math.PI / 2 },
    { x: -10.2, z: -89.5, facing: Math.PI / 2 }, { x: 10.2, z: -89.5, facing: -Math.PI / 2 },
    { x: -10.2, z: -93.5, facing: Math.PI / 2 }, { x: 10.2, z: -93.5, facing: -Math.PI / 2 },
    { x: -10.2, z: -96.5, facing: Math.PI / 2 }, { x: 10.2, z: -96.5, facing: -Math.PI / 2 }
  ]
};

function toExhibitPanelData(item) {
  const links = [{ label: "作品を開く ↗", href: item.url }];
  if (item.repository && item.repository !== item.url) links.push({ label: "コードを見る ↗", href: item.repository });
  links.push({ label: "文字ポートフォリオで見る", href: `../../#exhibit-${item.id}` });
  return {
    type: `${item.gallery3d.room.toUpperCase()} / ${item.type.toUpperCase()}`,
    title: item.title,
    description: item.description,
    links
  };
}

function hydrateManagedExhibits(items) {
  for (const item of items) exhibits[item.id] = toExhibitPanelData(item);
  const catalogLinks = items.map((item) => ({ label: `${item.title} ↗`, href: item.url }));
  exhibits.games = {
    type: "MANAGED EXHIBITS",
    title: `登録作品カタログ ${items.length}件`,
    description: "同じ作品JSONから、文字ポートフォリオのカードと3D展示物を生成しています。",
    links: catalogLinks
  };
  const games = items.filter((item) => item.gallery3d.room === "games");
  exhibits["games-casual"] = {
    type: "04 / GAMES & EXPERIMENTS",
    title: `通信なしで遊べる、カジュアルゲーム${games.length}本`,
    description: "AI Studioで制作した、非データ通信に特化したカジュアルゲームです。各作品の基本情報とリンクはexhibits JSONから読み込んでいます。",
    links: games.map((item) => ({ label: `${item.title} ↗`, href: item.url }))
  };
}

function addManagedExhibits(items, siteRootUrl) {
  const roomCounts = new Map();
  for (const item of items) {
    const room = item.gallery3d.room;
    const slotIndex = roomCounts.get(room) || 0;
    roomCounts.set(room, slotIndex + 1);
    const explicit = item.gallery3d.position;
    const slot = ROOM_SLOTS[room]?.[slotIndex];
    if (!explicit && !slot) {
      console.warn(`${room} roomの自動配置枠が不足しているため、${item.id}の3Dパネルを省略しました。positionを指定してください。`);
      continue;
    }
    const placement = explicit
      ? { x: explicit.x, y: explicit.y, z: explicit.z, rotation: item.gallery3d.rotation || { x: 0, y: 0, z: 0 } }
      : slot;
    const panelObject = addWallPanel({
      ...placement,
      label: item.title,
      category: item.category || item.type,
      summary: item.shortDescription || item.description,
      imageUrl: item.thumbnail.endsWith("placeholder.svg") ? null : resolveAssetUrl(item.thumbnail, siteRootUrl)
    });
    exhibitObjects.push({ id: item.id, position: panelObject.position });
  }
}

function renderManagedDirectory(items, loadError) {
  if (!managedExhibitList) return;
  if (loadError) {
    const row = document.createElement("li");
    const message = document.createElement("span");
    message.textContent = "登録作品を読み込めませんでした。";
    row.append(message);
    managedExhibitList.replaceChildren(row);
    return;
  }
  managedExhibitList.replaceChildren(...items.map((item) => {
    const row = document.createElement("li");
    const details = document.createElement("a");
    details.href = `?exhibit=${encodeURIComponent(item.id)}`;
    details.dataset.exhibitOpen = item.id;
    details.textContent = item.title;
    const direct = document.createElement("a");
    direct.href = item.url;
    direct.target = "_blank";
    direct.rel = "noopener noreferrer";
    direct.textContent = "作品を開く ↗";
    row.append(details, direct);
    return row;
  }));
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

function addStandee({ x, z, imageUrl, facing = 0 }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = facing;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.72, 0.14, 40),
    new THREE.MeshStandardMaterial({ color: 0x1a314d, roughness: 0.35, metalness: 0.6 })
  );
  base.position.y = 0.07;
  group.add(base);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.56, 0.04, 10, 40),
    new THREE.MeshBasicMaterial({ color: 0x9de8ca, transparent: true, opacity: 0.92 })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.16;
  group.add(halo);

  const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x0d1c30, roughness: 0.4, metalness: 0.3, transparent: true, opacity: 0.85, depthWrite: false });
  const faceMaterial = new THREE.MeshBasicMaterial({ map: null, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 2.2, 0.05),
    [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, faceMaterial, faceMaterial]
  );
  stand.position.y = 0.14 + 1.1;
  group.add(stand);

  new THREE.TextureLoader().load(imageUrl, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    faceMaterial.map = texture;
    faceMaterial.needsUpdate = true;
  });

  scene.add(group);
  return group;
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

function makeGamesObject() {
  const group = new THREE.Group();
  const colors = [0x7dcaff, 0x9de8ca, 0xffdd87, 0xc96a4a];
  const cubeGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const positions = [
    [-0.31, -0.31, 0],
    [0.31, -0.31, 0.05],
    [-0.31, 0.31, -0.05],
    [0.31, 0.31, 0.02]
  ];
  positions.forEach(([x, y, z], index) => {
    const material = new THREE.MeshStandardMaterial({ color: colors[index], metalness: 0.5, roughness: 0.3, emissive: colors[index], emissiveIntensity: 0.18 });
    const cube = new THREE.Mesh(cubeGeometry, material);
    cube.position.set(x, y, z);
    cube.rotation.set(y * 0.6, x * -0.5, index * 0.24);
    group.add(cube);
  });
  return group;
}

const blenderObject = addPedestal(new THREE.Vector3(-5.0, 0, -3.1), 0x7dcaff, makeBlenderObject);
const toioObject = addPedestal(new THREE.Vector3(4.0, 0, -6.8), 0x9de8ca, makeToioObject);
const githubObject = addPedestal(new THREE.Vector3(5.0, 0, -3.1), 0xffdd87, makeGithubObject);
const gamesObject = addPedestal(new THREE.Vector3(-4.0, 0, -6.8), 0xc96a4a, makeGamesObject);
const standee = addStandee({ x: 4.8, z: 2.2, imageUrl: "../../images/unotchi-official-standing.png", facing: 0 });

const exhibitObjects = [
  { id: "blender", position: blenderObject.group.position, animation: blenderObject },
  { id: "toio", position: toioObject.group.position, animation: toioObject },
  { id: "github", position: githubObject.group.position, animation: githubObject },
  { id: "games", position: gamesObject.group.position, animation: gamesObject }
];

const siteRootUrl = new URL("../../", import.meta.url);
let managedExhibits = [];
let managedExhibitLoadError = null;
try {
  managedExhibits = filterGalleryExhibits(await loadExhibits(new URL("exhibits/manifest.json", siteRootUrl)));
  hydrateManagedExhibits(managedExhibits);
} catch (error) {
  managedExhibitLoadError = error;
  console.error("登録作品を読み込めませんでした。既存展示だけで続行します。", error);
}

addLights();
addRoom();
buildPhase1();
addManagedExhibits(managedExhibits, siteRootUrl);
renderManagedDirectory(managedExhibits, managedExhibitLoadError);

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
  if (!walkingSupported) {
    setStatus("この環境では歩行を強制しません。展示一覧または90秒ガイドをご利用ください。");
    document.querySelector("#world-directory").focus({ preventScroll: false });
    return;
  }
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

function isBlocked(x, z) {
  for (const collider of colliders) {
    if (
      x > collider.minX - PLAYER_RADIUS && x < collider.maxX + PLAYER_RADIUS &&
      z > collider.minZ - PLAYER_RADIUS && z < collider.maxZ + PLAYER_RADIUS
    ) {
      return true;
    }
  }
  return false;
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

  const inputX = (keyState.has("KeyD") ? 1 : 0) - (keyState.has("KeyA") ? 1 : 0);
  const inputZ = (keyState.has("KeyW") ? 1 : 0) - (keyState.has("KeyS") ? 1 : 0);
  const targetX = camera.position.x + right.x * inputX * distance + forward.x * inputZ * distance;
  const targetZ = camera.position.z + right.z * inputX * distance + forward.z * inputZ * distance;

  if (!isBlocked(targetX, targetZ)) {
    camera.position.x = targetX;
    camera.position.z = targetZ;
  } else {
    let resultX = camera.position.x;
    let resultZ = camera.position.z;
    if (!isBlocked(targetX, camera.position.z)) resultX = targetX;
    if (!isBlocked(camera.position.x, targetZ)) resultZ = targetZ;
    camera.position.x = resultX;
    camera.position.z = resultZ;
  }

  camera.position.x = THREE.MathUtils.clamp(camera.position.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ);
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
  if (reducedMotion) return;
  let floatingIndex = 0;
  exhibitObjects.forEach(({ id, animation }) => {
    if (!animation) return;
    animation.halo.rotation.z = elapsed * (0.28 + floatingIndex * 0.05);
    animation.visual.rotation.y = elapsed * (0.45 + floatingIndex * 0.08);
    animation.visual.position.y = 2.45 + Math.sin(elapsed * 1.1 + floatingIndex) * 0.13;
    if (id === "toio") animation.visual.rotation.x = Math.sin(elapsed * 0.8) * 0.15;
    floatingIndex += 1;
  });
}

function render() {
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  move(delta);
  updateNearestExhibit();
  animateExhibits(elapsed);
  if (!reducedMotion && standee) standee.rotation.y += delta * 0.35;
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function renderGuide() {
  const exhibit = exhibits[guideIds[guideIndex]];
  guideProgress.textContent = `${guideIndex + 1} / ${guideIds.length}`;
  guideTitle.textContent = exhibit.title;
  guideDescription.textContent = exhibit.description;
  guidePrev.disabled = guideIndex === 0;
  guideNext.disabled = guideIndex === guideIds.length - 1;
}

function startGuide() {
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  guideIndex = 0;
  guideCard.hidden = false;
  welcomeCard.classList.add("is-minimized");
  renderGuide();
  guideNext.focus({ preventScroll: true });
}

function endGuide() {
  guideCard.hidden = true;
  welcomeCard.classList.remove("is-minimized");
  startGuideButton.focus({ preventScroll: true });
}

enterWorldButton.addEventListener("click", enterWorld);
startGuideButton.addEventListener("click", startGuide);
guidePrev.addEventListener("click", () => { if (guideIndex > 0) { guideIndex -= 1; renderGuide(); } });
guideNext.addEventListener("click", () => { if (guideIndex < guideIds.length - 1) { guideIndex += 1; renderGuide(); } });
guideOpen.addEventListener("click", () => openExhibit(guideIds[guideIndex]));
guideEnd.addEventListener("click", endGuide);
canvas.addEventListener("click", () => {
  if (walkingSupported && panel.hidden && document.pointerLockElement !== canvas) canvas.requestPointerLock();
});
document.addEventListener("pointerlockchange", updatePointerLockState);

document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== canvas) return;
  yaw -= event.movementX * 0.0022;
  pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.002, -1.15, 1.15);
  camera.rotation.set(pitch, yaw, 0);
});

document.addEventListener("keydown", (event) => {
  if (event.code === "KeyB" && !event.ctrlKey && !event.metaKey) {
    window.location.href = "../../";
    return;
  }
  if (event.code === "KeyG" && panel.hidden) {
    event.preventDefault();
    startGuide();
    return;
  }
  if (!guideCard.hidden && event.code === "ArrowLeft") { guidePrev.click(); return; }
  if (!guideCard.hidden && event.code === "ArrowRight") { guideNext.click(); return; }
  if (event.code === "Escape" && !panel.hidden) {
    closePanel();
    return;
  }
  if (event.code === "Escape" && !guideCard.hidden) { endGuide(); return; }
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
  button.addEventListener("click", (event) => { event.preventDefault(); openExhibit(button.dataset.exhibitOpen); });
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
});

resetView();
render();

if (!walkingSupported) {
  document.body.classList.add("directory-first");
  enterWorldButton.textContent = "展示一覧を見る";
  supportMessage.textContent = "モバイルまたはPointer Lock非対応環境では、歩行を強制せず展示一覧と90秒ガイドを優先します。";
}

const requestedExhibit = new URLSearchParams(window.location.search).get("exhibit");
if (requestedExhibit && exhibits[requestedExhibit]) openExhibit(requestedExhibit);
