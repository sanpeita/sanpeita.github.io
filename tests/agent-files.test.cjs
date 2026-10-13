const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const index = read("index.html");
const knowledgeText = read("assets/chatbot/knowledge.json");
const knowledge = JSON.parse(knowledgeText);
const profile = JSON.parse(read("agent/profile.json"));
const manifest = JSON.parse(read("exhibits/manifest.json"));
const exhibits = manifest.exhibits.map((filename) => JSON.parse(read(path.join("exhibits", filename))));
const robots = read("robots.txt");
const llmsTxt = read("llms.txt");
const llmsFull = read("llms-full.txt");
const llmsJsonText = read("llms.json");
const sitemap = read("sitemap.xml");
const llmsJson = JSON.parse(llmsJsonText);

const ORIGIN = "https://sanpeita.github.io";
const originCopy = "2020年、YouTubeの「うのっち」チャンネルを起点にVTuber活動を開始";
const indexAnchors = new Set([...index.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
const forbiddenPhrases = ["リアルのうのっち", "実写のうのっち", "中の人", "素顔", "顔出し"];
const generatedFiles = ["sitemap.xml", "llms.txt", "llms-full.txt", "llms.json"];

let agentModule;
async function agent() {
  agentModule ??= await import(pathToFileURL(path.join(root, "scripts/generate-agent-files.mjs")).href);
  return agentModule;
}

function jsonLdGraph() {
  const match = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, "index.html に JSON-LD が必要です");
  return JSON.parse(match[1])["@graph"];
}

test("生成物は正本から再現できる（再生成し忘れると落ちる）", async () => {
  const { buildAgentFiles } = await agent();
  const built = buildAgentFiles(root);
  assert.deepEqual(Object.keys(built).sort(), [...generatedFiles].sort());
  for (const filename of generatedFiles) {
    assert.equal(read(filename), built[filename], `${filename} が正本と一致しません。scripts/generate-agent-files.mjs を実行してください`);
  }
});

test("再生成は冪等（2回目は書き込みが発生しない）", async () => {
  const { writeAgentFiles } = await agent();
  assert.deepEqual(writeAgentFiles(root), []);
});

test("agent/profile.json は origin 文と既存の正本に揃っている", () => {
  assert.equal(profile.person.origin, originCopy);
  assert.ok(index.includes(originCopy), "index.html");
  assert.ok(knowledgeText.includes(originCopy), "knowledge.json");

  const featuredUrls = profile.featuredWorks.map((work) => work.url);
  const recentUrls = profile.recentWorks.map((work) => work.url);
  assert.equal(new Set([...featuredUrls, ...recentUrls]).size, featuredUrls.length + recentUrls.length);

  // 代表作は index.html にだけ載る（knowledge.json は活動の説明と最近作を持つ）
  for (const url of featuredUrls) {
    assert.ok(index.includes(url), `index.html に無い: ${url}`);
  }
  // 最近作は index.html と knowledge.json の両方に URL がある（既存の整合テストと同じ関係）
  for (const url of recentUrls) {
    assert.ok(index.includes(url), `index.html に無い: ${url}`);
    assert.ok(knowledgeText.includes(url), `knowledge.json に無い: ${url}`);
  }
  for (const work of [...profile.featuredWorks, ...profile.recentWorks]) {
    assert.ok(index.includes(work.title), `index.html にタイトルが無い: ${work.title}`);
  }
  for (const article of profile.noteArticles) {
    assert.ok(index.includes(article.url), `index.html に無い: ${article.url}`);
    assert.ok(profile.noteArticles.length === 3);
  }
});

test("profile のリンクは実在URLか、index.htmlに実在するアンカーだけ", () => {
  const urls = new Set();
  for (const link of profile.links) {
    assert.doesNotThrow(() => new URL(link.url), link.url);
    assert.ok(link.url.startsWith("https://"), link.url);
    urls.add(link.url);
  }
  assert.equal(profile.site.url, `${ORIGIN}/`);
  for (const url of ["https://www.youtube.com/@TheSANPEITA", "https://note.com/sanpeita", "https://x.com/unoksanpt", "https://github.com/sanpeita", "https://qiita.com/sanpeita"]) {
    assert.ok(urls.has(url), url);
  }
  for (const anchor of ["#playable-games"]) {
    assert.ok(indexAnchors.has(anchor.slice(1)), anchor);
  }
  for (const source of profile.sources) {
    assert.ok(fs.existsSync(path.join(root, source.path)), source.path);
  }
});

test("index.html の JSON-LD は agent/profile.json と一致する", () => {
  const graph = jsonLdGraph();
  const person = graph.find((node) => node["@type"] === "Person");
  const website = graph.find((node) => node["@type"] === "WebSite");
  const page = graph.find((node) => node["@type"] === "ProfilePage");

  assert.ok(person && website && page, "Person / WebSite / ProfilePage が必要です");
  assert.equal(person.name, profile.person.name);
  assert.equal(person.url, profile.site.url);
  assert.equal(person.description, profile.person.description);
  assert.deepEqual(person.jobTitle, profile.person.roles);
  assert.deepEqual(person.knowsAbout, profile.person.knowsAbout);
  assert.deepEqual(person.alternateName, profile.person.alternateName);
  assert.equal(website.name, profile.site.name);
  assert.equal(website.description, profile.site.description);
  assert.equal(page.isPartOf["@id"], website["@id"]);
  assert.equal(page.mainEntity["@id"], person["@id"]);

  const linkUrls = new Set(profile.links.map((link) => link.url));
  for (const sameAs of person.sameAs) {
    assert.ok(linkUrls.has(sameAs), `profile.links に無い sameAs: ${sameAs}`);
  }
  assert.ok(person.sameAs.length >= 8);
});

test("公開作品は exhibits が正本で、llms.json / llms.txt が同じ並び順で一致する", async () => {
  const { filterWebExhibits } = await import(pathToFileURL(path.join(root, "assets/exhibits/exhibit-data.mjs")).href);
  const published = filterWebExhibits(exhibits);
  assert.ok(published.length > 0);

  const expectedIds = published.map((item) => item.id);
  const expectedUrls = published.map((item) => item.url);
  assert.deepEqual(llmsJson.games.map((game) => game.id), expectedIds);
  assert.deepEqual(llmsJson.games.map((game) => game.url), expectedUrls);
  assert.equal(new Set(expectedUrls).size, expectedUrls.length);

  for (const game of llmsJson.games) {
    const source = exhibits.find((item) => item.id === game.id);
    assert.equal(game.description, source.description, game.id);
    assert.equal(game.updatedAt, source.updatedAt || source.createdAt, game.id);
    assert.ok(llmsTxt.includes(game.url), `llms.txt に無い: ${game.url}`);
    assert.ok(llmsFull.includes(game.url), `llms-full.txt に無い: ${game.url}`);
  }
  for (const item of exhibits.filter((entry) => entry.status !== "published" || entry.web?.visible !== true)) {
    assert.equal(llmsTxt.includes(item.url), false, `未公開なのに llms.txt にある: ${item.id}`);
  }
});

test("sitemap.xml は公開URLだけを載せ、noindex ページを含めない", () => {
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.ok(sitemap.trimEnd().endsWith("</urlset>"));
  assert.equal(sitemap.includes("<loc>https://sanpeita.github.io/</loc>"), true);

  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(new Set(locs).size, locs.length, "loc が重複しています");
  assert.equal(locs.includes(`${ORIGIN}/lab/virtual-world/`), false, "noindex ページを載せない");
  for (const loc of locs) assert.ok(loc.startsWith(`${ORIGIN}/`), loc);
  for (const game of llmsJson.games) assert.ok(locs.includes(game.url), game.url);
  assert.ok((sitemap.match(/<lastmod>/g) || []).length >= 2, "lastmod を付ける");
});

test("robots.txt は全部を許可し、sitemap と主なAIエージェントを明示する", () => {
  assert.ok(robots.includes("User-agent: *"));
  assert.ok(robots.includes("Allow: /"));
  assert.equal(/Disallow: \S/.test(robots), false, "Disallow を書かない（ブロックしない）");
  assert.ok(robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`));
  for (const agent of ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "PerplexityBot", "Googlebot", "Google-Extended", "Applebot-Extended"]) {
    assert.ok(new RegExp(`User-agent: ${agent}`).test(robots), agent);
  }
  assert.ok(robots.includes(`${ORIGIN}/llms.txt`));
  assert.ok(robots.includes(`${ORIGIN}/llms-full.txt`));
  assert.ok(robots.includes(`${ORIGIN}/llms.json`));
});

test("llms.txt は仕様どおりの形で、詳細版と構造化データへ誘導する", () => {
  const lines = llmsTxt.split("\n");
  assert.ok(lines[0].startsWith("# "), "H1から始める");
  assert.ok(lines.some((line) => line.startsWith("> ")), "blockquote要約が必要");
  assert.ok(llmsTxt.includes("## 主要ページ"));
  assert.ok(llmsTxt.includes(`${ORIGIN}/llms-full.txt`));
  assert.ok(llmsTxt.includes(`${ORIGIN}/llms.json`));
  assert.ok(llmsTxt.includes(`${ORIGIN}/exhibits/manifest.json`));
  assert.ok(llmsTxt.endsWith("\n"), "末尾改行");
  for (const work of [...profile.featuredWorks, ...profile.recentWorks]) {
    assert.ok(llmsTxt.includes(work.url), work.url);
  }
  for (const link of profile.links) assert.ok(llmsTxt.includes(link.url), link.url);
});

test("llms-full.txt は knowledge.json の確認済み事実を落とさない", () => {
  assert.ok(llmsFull.includes(`最終更新: ${profile.updated}`));
  for (const intent of knowledge.intents) {
    assert.ok(llmsFull.includes(`### ${intent.title}`), intent.title);
    for (const fact of intent.facts) assert.ok(llmsFull.includes(fact), `${intent.id}: ${fact}`);
  }
  assert.ok(llmsFull.includes("引用・参照について"));
  assert.ok(llmsFull.includes("再生数やフォロワー数は変動するため"));
});

test("llms.json は FAQ を全カテゴリ持ち、数値を約束しない", () => {
  assert.equal(llmsJson.version, profile.version);
  assert.equal(llmsJson.updated, profile.updated);
  assert.equal(llmsJson.faq.length, knowledge.intents.length);
  assert.equal(new Set(llmsJson.faq.map((entry) => entry.id)).size, knowledge.intents.length);
  for (const entry of llmsJson.faq) {
    assert.ok(entry.facts.length > 0, entry.id);
    for (const link of entry.links) assert.doesNotThrow(() => new URL(link.url), link.url);
  }
  for (const document of llmsJson.documents) assert.ok(document.url.startsWith(`${ORIGIN}/`), document.url);
  assert.equal(/\d{3,}(?:万|人|回|再生)/.test(llmsJsonText), false, "固定の数値を載せない");
});

test("エージェント向け成果物に禁止の本人性表現が混ざらない", () => {
  for (const [name, text] of [["llms.txt", llmsTxt], ["llms-full.txt", llmsFull], ["llms.json", llmsJsonText], ["agent/profile.json", read("agent/profile.json")], ["sitemap.xml", sitemap], ["robots.txt", robots]]) {
    for (const phrase of forbiddenPhrases) {
      assert.equal(text.includes(phrase), false, `${name}: ${phrase}`);
    }
  }
});
