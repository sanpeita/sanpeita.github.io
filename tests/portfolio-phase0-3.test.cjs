const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const tokens = fs.readFileSync(path.join(root, "tokens.css"), "utf8");
const worldHtml = fs.readFileSync(path.join(root, "lab/virtual-world/index.html"), "utf8");
const worldJs = fs.readFileSync(path.join(root, "lab/virtual-world/world.js"), "utf8");
const worldCss = fs.readFileSync(path.join(root, "lab/virtual-world/world.css"), "utf8");
const exhibitCatalogJs = fs.readFileSync(path.join(root, "assets/exhibits/exhibit-catalog.js"), "utf8");
const exhibitDataPath = path.join(root, "assets/exhibits/exhibit-data.mjs");
const exhibitDataJs = fs.readFileSync(exhibitDataPath, "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "exhibits/manifest.json"), "utf8"));
const schema = JSON.parse(fs.readFileSync(path.join(root, "exhibits/schema.json"), "utf8"));
const managedExhibits = manifest.exhibits.map((filename) => JSON.parse(fs.readFileSync(path.join(root, "exhibits", filename), "utf8")));
const migratedCasualIds = new Set(["hole-io", "island-survival-craft-defense", "dodge-and-gather", "offline-flap", "the-strongest-princess", "gomoku", "crowd-runner"]);
const migratedCasualExhibits = managedExhibits.filter((item) => migratedCasualIds.has(item.id));
const knowledgeText = fs.readFileSync(path.join(root, "assets/chatbot/knowledge.json"), "utf8");
const knowledge = JSON.parse(knowledgeText);

const originCopy = "2020年、YouTubeの「うのっち」チャンネルを起点にVTuber活動を開始";
const recentUrls = [
  "https://www.youtube.com/watch?v=VJ69-nhBhOU",
  "https://www.youtube.com/watch?v=oXVi8Rup6is",
  "https://www.youtube.com/watch?v=LZgxWzS0UVY",
  "https://www.youtube.com/watch?v=A-OFtZaHR0o"
];
const casualGameUrls = [
  "https://sanpeita.github.io/gomoku/",
  "https://sanpeita.github.io/Crowd-Runner/"
];
const requestedPlayableUrls = [
  "https://sanpeita.github.io/Hole-IO-Casual-Game/",
  "https://sanpeita.github.io/Island-Survival-Craft-Defense/",
  "https://sanpeita.github.io/dodge-and-gather/",
  "https://sanpeita.github.io/OfflineFlap/",
  "https://sanpeita.github.io/the_strongest_princess/",
  "https://sanpeita.github.io/CodexResetTimeConverter/",
  "https://sanpeita.github.io/NON-DATA_EXERION/",
  "https://sanpeita.github.io/Crowd-Runner/"
];

test("2020 YouTube origin copy is aligned across index, knowledge, and world", () => {
  for (const [name, source] of [["index", index], ["knowledge", knowledgeText], ["world", worldJs]]) {
    assert.ok(source.includes(originCopy), name);
  }
});

test("the four recent video URLs are aligned across index, knowledge, and world", () => {
  for (const url of recentUrls) {
    assert.ok(index.includes(url), `index: ${url}`);
    assert.ok(knowledgeText.includes(url), `knowledge: ${url}`);
    assert.ok(worldJs.includes(url), `world: ${url}`);
  }
});

test("exhibits manifest is the unique source for the migrated casual games", () => {
  assert.equal(manifest.version, 1);
  assert.equal(manifest.schema, "schema.json");
  assert.equal(new Set(managedExhibits.map((item) => item.id)).size, managedExhibits.length);
  assert.equal(new Set(managedExhibits.map((item) => item.url.toLowerCase().replace(/\/+$/, ""))).size, managedExhibits.length);
  assert.equal(migratedCasualExhibits.length, migratedCasualIds.size);
  for (const item of migratedCasualExhibits) {
    assert.equal(item.status, "published", item.id);
    assert.equal(item.web.visible, true, item.id);
    assert.equal(item.gallery3d.visible, true, item.id);
    assert.equal(item.gallery3d.room, "games", item.id);
  }
  for (const url of casualGameUrls) {
    assert.ok(managedExhibits.some((item) => item.url === url), `manifest exhibit: ${url}`);
    assert.equal(index.includes(url), false, `index duplicate: ${url}`);
    assert.equal(worldJs.includes(url), false, `world duplicate: ${url}`);
  }
});

test("one published exhibit feeds both the web and 3D view filters", async () => {
  const { filterGalleryExhibits, filterWebExhibits, validateExhibit } = await import(pathToFileURL(exhibitDataPath).href);
  const crowdRunner = managedExhibits.find((item) => item.id === "crowd-runner");
  assert.ok(crowdRunner);
  assert.deepEqual(validateExhibit(crowdRunner), { valid: true, errors: [] });
  assert.ok(filterWebExhibits(managedExhibits).some((item) => item.id === crowdRunner.id));
  assert.ok(filterGalleryExhibits(managedExhibits).some((item) => item.id === crowdRunner.id));
  const draft = { ...crowdRunner, id: "draft-copy", url: "https://example.com/draft", status: "draft" };
  const webOnly = { ...crowdRunner, id: "web-only", url: "https://example.com/web", gallery3d: { ...crowdRunner.gallery3d, visible: false } };
  const galleryOnly = { ...crowdRunner, id: "gallery-only", url: "https://example.com/gallery", web: { visible: false } };
  assert.deepEqual(filterWebExhibits([draft, webOnly, galleryOnly]).map((item) => item.id), ["web-only"]);
  assert.deepEqual(filterGalleryExhibits([draft, webOnly, galleryOnly]).map((item) => item.id), ["gallery-only"]);
  assert.ok(index.includes('id="exhibit-catalog"'));
  assert.ok(index.includes('src="assets/exhibits/exhibit-catalog.js"'));
  assert.ok(exhibitCatalogJs.includes("filterWebExhibits"));
  assert.ok(worldJs.includes("filterGalleryExhibits"));
  assert.ok(worldJs.includes("addManagedExhibits(managedExhibits, siteRootUrl)"));
});

test("application catalogue uses direct public pages and separates games from the web tool", () => {
  for (const url of requestedPlayableUrls) {
    const exhibit = managedExhibits.find((item) => item.url === url);
    assert.ok(exhibit, url);
    assert.equal(exhibit.status, "published", exhibit.id);
    assert.equal(exhibit.web.visible, true, exhibit.id);
    assert.equal(exhibit.gallery3d.visible, true, exhibit.id);
    assert.equal(exhibit.url.startsWith("https://github.com/"), false, exhibit.id);
  }
  const converter = managedExhibits.find((item) => item.id === "codex-reset-time-converter");
  assert.equal(converter.type, "web-app");
  assert.equal(converter.gallery3d.room, "works");
  for (const item of managedExhibits.filter((entry) => entry.type === "game")) {
    assert.equal(item.gallery3d.room, "games", item.id);
  }
  assert.ok(index.includes('id="playable-games"'));
  assert.ok(index.includes('href="#playable-games"'));
  assert.ok(index.includes("YouTubeゲームルームへの対応状況は別途検証中です。"));
  assert.ok(exhibitCatalogJs.includes('item.type === "game"'));
  assert.ok(exhibitCatalogJs.includes('"今すぐ遊ぶ ↗"'));
  assert.ok(exhibitCatalogJs.includes('"公開Webツール"'));
});

test("schema and loaders preserve static GitHub Pages paths", () => {
  for (const field of ["id", "title", "type", "url", "description", "thumbnail", "status", "web", "gallery3d"]) {
    assert.ok(schema.required.includes(field), field);
  }
  assert.deepEqual(schema.properties.status.enum, ["published", "draft", "hidden"]);
  assert.ok(exhibitCatalogJs.includes('new URL("../../", import.meta.url)'));
  assert.ok(worldJs.includes('new URL("../../", import.meta.url)'));
  assert.ok(exhibitDataJs.includes("new URL(filename, manifestUrl)"));
  assert.ok(exhibitDataJs.includes('{ cache: "no-cache" }'));
  assert.equal(exhibitCatalogJs.includes('fetch("/'), false);
  assert.equal(worldJs.includes('fetch("/'), false);
});

test("knowledge contract and world fallbacks remain explicit", () => {
  assert.equal(knowledge.version, "1.1.0");
  assert.equal(knowledge.intents.length, 15);
  assert.equal(knowledge.tours.find((tour) => tour.id === "recommended").steps.length, 7);
  assert.ok(worldHtml.includes('content="noindex,follow"'));
  assert.ok(worldHtml.includes('href="?exhibit=works-latest"'));
  assert.ok(worldHtml.includes("JavaScriptなしでも利用できます"));
  assert.ok(worldJs.includes('const guideIds = ["profile-about", "works-movies", "works-latest", "games-experiments", "exit-souvenirs"]'));
  assert.ok(worldJs.includes("prefers-reduced-motion: reduce"));
  assert.ok(worldCss.includes("right: clamp(18px, 3vw, 42px)"));
  assert.ok(worldCss.includes("body:not(.directory-first) .world-directory { right: auto;"));
});

test("top navigation and hero expose the virtual world without replacing existing CTAs", () => {
  assert.match(index, /<nav aria-label="メインナビゲーション">\s*<a href="lab\/virtual-world\/">展示室<\/a>/);
  assert.match(
    index,
    /<div class="hero-actions">\s*<a class="button button-primary" href="#works">代表作を見る<\/a>\s*<a class="button button-world" href="lab\/virtual-world\/">バーチャル展示室へ<\/a>\s*<a class="button button-secondary" href="https:\/\/www\.youtube\.com\/@TheSANPEITA"/
  );
  assert.ok(index.includes('<p class="hero-world-note">5室を歩く。90秒ガイドや展示一覧からも見られます。</p>'));
});

test("hero CTAs stay on one line and stack at 700px or below", () => {
  assert.match(styles, /\.button\s*\{[^}]*white-space:\s*nowrap;/s);
  assert.match(
    styles,
    /@media \(max-width: 700px\) \{[\s\S]*?\.hero-actions \{[^}]*flex-direction:\s*column;[^}]*align-items:\s*stretch;[^}]*\}[\s\S]*?\.hero-actions \.button \{[^}]*width:\s*100%;[^}]*\}/
  );
});

test("playable catalogue keeps token and mobile overflow contracts", () => {
  assert.ok(styles.includes('@import url("tokens.css")'));
  assert.match(styles, /html \{[^}]*overflow-x:\s*clip;/s);
  assert.match(styles, /body \{[^}]*overflow-x:\s*clip;/s);
  assert.ok(styles.includes(".exhibit-grid"));
  assert.match(styles, /@media \(max-width: 700px\) \{[\s\S]*?\.exhibit-grid \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/);
  for (const token of ["--color-game-paper", "--font-game-display", "--space-game-md", "--ease-game-out", "--radius-game-lg"]) {
    assert.ok(tokens.includes(token), token);
  }
});
