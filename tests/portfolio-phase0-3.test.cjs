const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const worldHtml = fs.readFileSync(path.join(root, "lab/virtual-world/index.html"), "utf8");
const worldJs = fs.readFileSync(path.join(root, "lab/virtual-world/world.js"), "utf8");
const knowledgeText = fs.readFileSync(path.join(root, "assets/chatbot/knowledge.json"), "utf8");
const knowledge = JSON.parse(knowledgeText);

const originCopy = "2020年、YouTubeの「うのっち」チャンネルを起点にVTuber活動を開始";
const recentUrls = [
  "https://www.youtube.com/watch?v=VJ69-nhBhOU",
  "https://www.youtube.com/watch?v=oXVi8Rup6is",
  "https://www.youtube.com/watch?v=LZgxWzS0UVY",
  "https://www.youtube.com/watch?v=A-OFtZaHR0o"
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

test("knowledge contract and world fallbacks remain explicit", () => {
  assert.equal(knowledge.version, "1.1.0");
  assert.equal(knowledge.intents.length, 15);
  assert.equal(knowledge.tours.find((tour) => tour.id === "recommended").steps.length, 7);
  assert.ok(worldHtml.includes('content="noindex,follow"'));
  assert.ok(worldHtml.includes('href="?exhibit=works-latest"'));
  assert.ok(worldHtml.includes("JavaScriptなしでも利用できます"));
  assert.ok(worldJs.includes('const guideIds = ["profile-about", "works-movies", "works-latest", "games-experiments", "exit-souvenirs"]'));
  assert.ok(worldJs.includes("prefers-reduced-motion: reduce"));
});
