const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const Fuse = require("../assets/chatbot/fuse.min.js");
const { chooseAnswer, createSearchEngine } = require("../assets/chatbot/search-core.js");

const root = path.resolve(__dirname, "..");
const knowledge = JSON.parse(
  fs.readFileSync(path.join(root, "assets/chatbot/knowledge.json"), "utf8")
);
const engine = createSearchEngine(Fuse, knowledge.intents);

const acceptedQuestions = new Map([
  ["うのっちは何をしている人？", "profile-overview"],
  ["活動歴は？", "vtuber-history"],
  ["VTuberとしての強みを教えて", "core-strengths"],
  ["チームに入ったら何ができる？", "team-contribution"],
  ["代表作品を見せて", "representative-works"],
  ["Unityでは何を作っていますか？", "unity-experience"],
  ["教材開発について知りたい", "digital-education"],
  ["Blenderは使えますか？", "blender-3dcg"],
  ["Robloxでは何を作っていますか？", "roblox-minecraft"],
  ["toioの実績を教えて", "toio-devices"],
  ["V文化論ってなに？", "v-culture"],
  ["ワンダーメイクフェス5の動画は？", "events-awards"],
  ["3Dプリントはできますか？", "digital-fabrication"],
  ["連絡先を教えて", "contact-socials"]
]);

test("knowledge contains 15 unique intents", () => {
  assert.equal(knowledge.version, "1.1.0");
  assert.equal(knowledge.intents.length, 15);
  assert.equal(new Set(knowledge.intents.map((intent) => intent.id)).size, 15);
});

test("acceptance questions resolve to the intended intent", () => {
  for (const [question, expectedIntent] of acceptedQuestions) {
    assert.equal(engine.search(question)?.intent.id, expectedIntent, question);
  }
});

test("out-of-scope questions fall back", () => {
  for (const question of ["今日の天気は？", "ラーメンについて教えて", "株価を教えて"]) {
    assert.equal(engine.search(question), null, question);
  }
});

test("every suggestion resolves to a registered intent", () => {
  for (const intent of knowledge.intents) {
    for (const suggestion of intent.suggestions || []) {
      assert.ok(engine.search(suggestion), `${intent.id}: ${suggestion}`);
    }
  }
});

test("answer selection avoids the immediately previous answer", () => {
  const intent = knowledge.intents.find((item) => item.answers.length > 1);
  const first = chooseAnswer(intent, null, () => 0);
  const second = chooseAnswer(intent, first.id, () => 0);
  assert.notEqual(first.id, second.id);
});

test("knowledge links are non-empty and internal anchors exist", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));

  for (const intent of knowledge.intents) {
    for (const link of intent.links || []) {
      assert.ok(link.url, `${intent.id}: empty link`);
      if (link.url.startsWith("#")) {
        assert.ok(ids.has(link.url.slice(1)), `${intent.id}: ${link.url}`);
      } else {
        assert.doesNotThrow(() => new URL(link.url), `${intent.id}: ${link.url}`);
      }
    }
  }
  for (const intentId of knowledge.welcome.intentIds) assert.ok(knowledge.intents.some((intent) => intent.id === intentId));
  for (const tour of knowledge.tours) for (const step of tour.steps) assert.ok(knowledge.intents.some((intent) => intent.id === step.intentId));
});

test("event copy avoids disallowed identity wording", () => {
  const serialized = JSON.stringify(knowledge);
  for (const phrase of ["リアルのうのっち", "実写のうのっち", "中の人", "素顔", "顔出し"]) {
    assert.equal(serialized.includes(phrase), false, phrase);
  }
});
