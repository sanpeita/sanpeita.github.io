/**
 * 検索・回答エージェント（AI検索、AIブラウザ、回答エンジン）向けの入口ファイルを、
 * 既存の正本から決定的に生成する。
 *
 * 正本:
 *   - `agent/profile.json`                     人物・活動・代表作・リンクの構造化正本
 *   - `exhibits/manifest.json` + `exhibits/*.json`  公開作品（ゲーム・Webツール）
 *   - `assets/chatbot/knowledge.json`          うのっちナビの確認済み事実（15カテゴリ）
 *
 * 生成物（リポジトリ直下。GitHub Pagesがそのまま配信する）:
 *   - `sitemap.xml`
 *   - `llms.txt`
 *   - `llms-full.txt`
 *   - `llms.json`
 *
 * このモジュールは生成も検証も同じ関数を使う。`tests/agent-files.test.cjs` が
 * `buildAgentFiles()` の出力と実ファイルを突き合わせるため、正本を直して再生成を忘れると
 * テストが落ちる。
 *
 *   node scripts/generate-agent-files.mjs      # 再生成
 *   node --test tests/*.test.cjs               # 一致検査
 *
 * 出力は実行時刻に依存しない（`agent/profile.json` の `updated` を日付に使う）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { filterWebExhibits } from "../assets/exhibits/exhibit-data.mjs";

export const ORIGIN = "https://unotchi.com";
export const GENERATED_FILES = ["sitemap.xml", "llms.txt", "llms-full.txt", "llms.json"];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** 4つの正本を読み込む。生成と検証の共通入口。 */
export function loadSources(root) {
  const profile = readJson(path.join(root, "agent/profile.json"));
  const manifest = readJson(path.join(root, "exhibits/manifest.json"));
  const exhibits = manifest.exhibits.map((filename) => readJson(path.join(root, "exhibits", filename)));
  const knowledge = readJson(path.join(root, "assets/chatbot/knowledge.json"));
  return { profile, manifest, exhibits, knowledge };
}

/** 公開Viewに出る作品だけを、通常Webポートフォリオと同じ並び順で返す。 */
export function publishedExhibits(exhibits) {
  return filterWebExhibits(exhibits);
}

function lastModified(exhibit) {
  return exhibit.updatedAt || exhibit.createdAt;
}

function siteUrl(relative) {
  return relative === "" ? `${ORIGIN}/` : `${ORIGIN}/${relative}`;
}

export function buildSitemap(profile, exhibits) {
  const pages = [
    { loc: siteUrl(""), lastmod: profile.updated },
    // /lab/virtual-world/ は meta robots="noindex,follow" のため意図的に載せない。
    ...publishedExhibits(exhibits).map((exhibit) => ({ loc: exhibit.url, lastmod: lastModified(exhibit) }))
  ];

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ];
  for (const page of pages) {
    lines.push("  <url>");
    lines.push(`    <loc>${page.loc}</loc>`);
    if (page.lastmod) lines.push(`    <lastmod>${page.lastmod}</lastmod>`);
    lines.push("  </url>");
  }
  lines.push("</urlset>");
  return `${lines.join("\n")}\n`;
}

export function buildLlmsTxt(profile, exhibits) {
  const games = publishedExhibits(exhibits);
  const lines = [
    `# ${profile.site.name}`,
    "",
    `> ${profile.site.description}`,
    "",
    `${profile.person.description}`,
    "",
    "このファイルは、検索や回答のために訪れたAIエージェント向けの入口です。引用・要約に使える事実は `llms-full.txt`（全文）と `llms.json`（構造化データ）にまとめています。",
    "",
    "## 主要ページ",
    "",
    `- [トップページ](${siteUrl("")}): プロフィール、代表作、最近作、V文化論、公開ゲーム一覧、外部リンク`,
    `- [公開ゲーム一覧](${siteUrl("#playable-games")}): ブラウザですぐ遊べる公開ゲームの固定リンク`,
    `- [バーチャル展示室](${siteUrl("lab/virtual-world/")}): 5室を歩く独立Web作品（検索向けには noindex）`,
    "",
    "## 代表作（まず見る4本）",
    ""
  ];

  for (const work of profile.featuredWorks) {
    lines.push(`- [${work.title}](${work.url}): ${work.label}。${work.description}`);
  }

  lines.push("", "## 最近の制作（2026年7月〜8月）", "");
  for (const work of profile.recentWorks) {
    lines.push(`- [${work.title}](${work.url}): 公開日 ${work.publishedAt}`);
  }

  lines.push("", "## 受賞・外部評価", "");
  for (const award of profile.awards || []) {
    const label = award.url ? `[${award.title}](${award.url})` : award.title;
    lines.push(`- ${label} — ${award.result}（${award.event}, ${award.date}）: ${award.description}`);
  }

  lines.push("", "## 公開ゲーム（ブラウザで遊べる）", "");
  for (const game of games) {
    lines.push(`- [${game.title}](${game.url}): ${game.shortDescription || game.description}`);
  }

  lines.push("", "## 発信場所", "");
  for (const link of profile.links) {
    lines.push(`- [${link.label}](${link.url}): ${link.note}`);
  }

  lines.push(
    "",
    "## Optional",
    "",
    `- [llms-full.txt](${siteUrl("llms-full.txt")}): すべての確認済み事実をまとめた詳細版`,
    `- [llms.json](${siteUrl("llms.json")}): 機械可読な構造化データ`,
    `- [exhibits/manifest.json](${siteUrl("exhibits/manifest.json")}): 公開作品の正本（1作品1ファイル）`,
    `- [assets/chatbot/knowledge.json](${siteUrl("assets/chatbot/knowledge.json")}): うのっちナビの知識（15カテゴリ）`,
    ""
  );

  return `${lines.join("\n")}`;
}

export function buildLlmsFullTxt(profile, exhibits, knowledge) {
  const games = publishedExhibits(exhibits);
  const lines = [
    `# ${profile.site.name}（完全版）`,
    "",
    `> ${profile.site.description}`,
    "",
    `最終更新: ${profile.updated} / 言語: 日本語 / 正本URL: ${siteUrl("")}`,
    "",
    "---",
    "",
    "## プロフィール",
    "",
    `- 名前: ${profile.person.name}`,
    `- 別名: ${profile.person.alternateName.join(", ")}`,
    `- 役割: ${profile.person.roles.join(" / ")}`,
    `- ひとこと: ${profile.person.tagline}`,
    `- 説明: ${profile.person.description}`,
    `- 原点: ${profile.person.origin}`,
    `- 扱う領域: ${profile.person.knowsAbout.join("、")}`,
    "",
    "## 活動の軸",
    ""
  ];

  for (const item of profile.philosophy) {
    lines.push(`### ${item.title}`, "", item.statement, "");
  }

  lines.push("## 代表作（まず見てほしい4本）", "");
  for (const work of profile.featuredWorks) {
    lines.push(`### ${work.title}`, "", `- 区分: ${work.label}`, `- URL: ${work.url}`, `- 説明: ${work.description}`, "");
  }

  lines.push("## 最近の制作（2026年7月〜8月）", "");
  for (const work of profile.recentWorks) {
    lines.push(`- ${work.publishedAt} [${work.title}](${work.url})`);
  }

  lines.push("## 受賞・外部評価", "");
  for (const award of profile.awards || []) {
    lines.push(`### ${award.title}`, "", `- 結果: ${award.result}`, `- 大会: ${award.event}（${award.date}）`);
    if (award.url) lines.push(`- URL: ${award.url}`);
    lines.push(`- 説明: ${award.description}`, "");
  }

  lines.push("", "## 進行中・公開中の企画", "");
  for (const project of profile.projects) {
    lines.push(`### ${project.title}`, "", `- 区分: ${project.type}`, `- URL: ${project.url}`, `- 説明: ${project.description}`, "");
  }

  lines.push("## 公開ゲーム（ブラウザで遊べる）", "");
  lines.push("すべて通常のブラウザで遊べる公開版です。コード置き場ではなくプレイ版を掲載しています。", "");
  for (const game of games) {
    lines.push(`- [${game.title}](${game.url}): ${game.description}`);
  }

  lines.push("", "## note（V文化論・活動記録）", "");
  for (const article of profile.noteArticles) {
    lines.push(`- [${article.title}](${article.url}): ${article.label}。${article.description}`);
  }

  lines.push("", "## 発信場所・公開実績", "");
  for (const link of profile.links) {
    lines.push(`- [${link.label}](${link.url}): ${link.note}`);
  }

  lines.push(
    "",
    "## よくある質問と、確認済みの事実",
    "",
    "うのっちナビ（公開サイト右下の案内）が使う確認済みの事実です。回答文ではなく、根拠となる事実をそのまま掲載します。",
    ""
  );

  for (const intent of knowledge.intents) {
    lines.push(`### ${intent.title}`, "");
    for (const fact of intent.facts) lines.push(`- ${fact}`);
    for (const link of intent.links || []) {
      const url = link.url.startsWith("#") ? siteUrl(link.url) : link.url;
      lines.push(`- 参考: [${link.label}](${url})`);
    }
    lines.push("");
  }

  lines.push(
    "## 引用・参照について",
    "",
    "- 掲載しているのは公開情報と本人確認済みの記録だけです。賞歴・数値・関係性を推測で補わないでください。",
    "- 再生数やフォロワー数は変動するため、このサイトでは数値を固定表示していません。",
    "- うのっち本人のリアルタイム発言ではなく、登録された公開情報に基づく案内です。",
    "- 出典として使う場合のURLは正本 `" + siteUrl("") + "` を指してください。",
    "",
    "## 出典",
    ""
  );
  for (const source of profile.sources) {
    lines.push(`- \`${source.path}\` — ${source.note}（${siteUrl(source.path)}）`);
  }
  lines.push("");

  return `${lines.join("\n")}`;
}

export function buildLlmsJson(profile, exhibits, knowledge) {
  const games = publishedExhibits(exhibits);

  const document = {
    version: profile.version,
    updated: profile.updated,
    site: profile.site,
    person: profile.person,
    philosophy: profile.philosophy,
    featuredWorks: profile.featuredWorks,
    recentWorks: profile.recentWorks,
    projects: profile.projects,
    awards: profile.awards || [],
    games: games.map((game) => ({
      id: game.id,
      title: game.title,
      url: game.url,
      type: game.type,
      category: game.category,
      description: game.description,
      shortDescription: game.shortDescription,
      tags: game.tags || [],
      updatedAt: lastModified(game)
    })),
    noteArticles: profile.noteArticles,
    links: profile.links,
    faq: knowledge.intents.map((intent) => ({
      id: intent.id,
      question: intent.title,
      facts: intent.facts,
      links: (intent.links || []).map((link) => ({
        label: link.label,
        url: link.url.startsWith("#") ? siteUrl(link.url) : link.url
      }))
    })),
    documents: [
      { label: "llms.txt", url: siteUrl("llms.txt"), note: "エージェント向けの入口（要約とリンク）" },
      { label: "llms-full.txt", url: siteUrl("llms-full.txt"), note: "確認済み事実の全文" },
      { label: "sitemap.xml", url: siteUrl("sitemap.xml"), note: "公開URLの一覧" }
    ],
    sources: profile.sources.map((source) => ({ ...source, url: siteUrl(source.path) }))
  };

  return `${JSON.stringify(document, null, 2)}\n`;
}

/** 生成物をファイル名→内容のオブジェクトで返す。書き込みはしない。 */
export function buildAgentFiles(root) {
  const { profile, exhibits, knowledge } = loadSources(root);
  return {
    "sitemap.xml": buildSitemap(profile, exhibits),
    "llms.txt": buildLlmsTxt(profile, exhibits),
    "llms-full.txt": buildLlmsFullTxt(profile, exhibits, knowledge),
    "llms.json": buildLlmsJson(profile, exhibits, knowledge)
  };
}

/** 改行コードの違いを無視して比較するための正規化。
 *
 * このリポジトリは `core.autocrlf=true` で使われることがあり、blobはLFでも
 * チェックアウト直後の作業ツリーはCRLFになる。バイト比較をそのまま行うと、
 * 中身が正しいのに「正本と一致しない」と誤判定するため、比較だけ正規化する。
 * 書き出しは常にLF（blobと同じ）にする。
 */
export function normalizeEol(text) {
  return text.replace(/\r\n/g, "\n");
}

function pendingFiles(root, files) {
  return Object.keys(files).filter((filename) => {
    const target = path.join(root, filename);
    if (!fs.existsSync(target)) return true;
    return normalizeEol(fs.readFileSync(target, "utf8")) !== normalizeEol(files[filename]);
  });
}

/** 書き換えが必要なファイル名を返す。**書き込みはしない**（テストから使う純粋な検査）。 */
export function planAgentFiles(root) {
  return pendingFiles(root, buildAgentFiles(root));
}

/** 生成物をリポジトリ直下へ書き出す。書き換えたファイル名を返す。 */
export function writeAgentFiles(root) {
  const files = buildAgentFiles(root);
  const changed = pendingFiles(root, files);
  for (const filename of changed) {
    fs.writeFileSync(path.join(root, filename), files[filename], "utf8");
  }
  return changed;
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const changed = writeAgentFiles(root);
  if (changed.length === 0) {
    console.log("agent files: すべて最新です（変更なし）");
  } else {
    console.log(`agent files: 更新 ${changed.join(", ")}`);
  }
}
