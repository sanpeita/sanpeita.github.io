# AGENTS.md

うのっち（unveri）公式ポートフォリオを公開する静的GitHub Pages。フレームワーク・ビルド・package管理・Lint・CIは一切ない。公開ブランチは `master` ルート。Nodeはテスト実行専用に使う。

## 検証コマンド

- テスト（唯一の自動検証・Node 18+）:
  ```powershell
  node --test tests/*.test.cjs
  ```
- 差分の空白チェック: `git diff --check`
- 手動ブラウザ確認は `file://` では動かない。`chatbot.js` は `fetch()` で `knowledge.json` を読むため、先にローカルサーバーを立てる（例: `python -m http.server`）。

## 構成と結線（specから）

- `assets/chatbot/` の役割:
  - `knowledge.json` — 全コンテンツ（`bot`/`welcome`/`tours`/`intents`15件/`fallbacks`）。version 1.1.0。
  - `search-core.js` / `tour-core.js` — 検索とツアーの純粋ロジック。ブラウザとNodeテストの両方で使うため **UMD形式（`module.exports` と `window.UnotchiNavSearch`/`UnotchiNavTour`）を維持** すること。編集しても壊さない。
  - `chatbot.js` — DOM・state・イベントのみ（テストからはrequireしない）。
  - `fuse.min.js` — 同梱のFuse 7.1.0。テストが直接requireする。変更・アップグレードしない。
- `index.html` の script順は `search-core.js` → `tour-core.js` → `chatbot.js`（すべて `defer`）。壊さない。

## 設計資料（変更しない前提）

`UNOTCHI_NAV_V1_1_SOL_SPEC.md` と `UNOTCHI_NAV_V1_1_TERRA_DESIGN.md` が本仕様。認定的な仕様なので書き換えず、設計時に参照する。`README.md` の「うのっちナビ 1.1」章が編集手順を定義している。

## `knowledge.json` 編集時の注意（テストが固定値を検証）

- version `1.1.0`、intentはちょうど15件でid重複なし、`recommended` ツアーは **ちょうど7step・順序固定**、`welcome.intentIds` は4件。これらを変えるならテスト側の更新も必須。
- step 3の `note` は「Unity」、step 6の `note` は「TED世界共創計画」を含む（テストで検証）。step固有の補足は `knowledge.json` のtour stepに置き、intent本文へ複製しない。
- 本文は公開一次情報・確認済み記録だけ。禁止される本人性表現（「リアルのうのっち」「実写のうのっち」「中の人」「素顔」「顔出し」）はテストで失敗する。
- 内部 `#anchor` は `index.html` に実在する `id` だけ（テストが突き合わせる）。新しいアンカーは推測で追加しない。外部URLは構文検証される。
- イベント動画URLは `https://www.youtube.com/watch?v=ZgVxVa9wKUo&t=101s` 固定。
- 全intentの `suggestions` は検索で既存intentへ解決できる必要がある（ゲート）。文言変更で別intentへ誤解決しないか確認。

## Git・資産

- remote: `sanpeita/sanpeita.github.io`（master）。コミット・pushは明示依頼があるまで行わない。
- `.playwright-cli/` はgitignore済みのローカル検証アーティファクト。コミットしない。
- `images/kabe_viper_white.png`（原点の壁紙）、ファンアート画像（`davi.jpeg`、`デイヴィデフォルメイラスト.jpeg`）は明確な許可なしに削除しない。

## 運用メモ

日常的なMinor UpdateではOpenCode + DeepSeek V4 Flashを利用することがある。
大規模なレビューやMajor UpdateではCodexを利用することがある。

これは作業分担の目安であり、
現在作業しているエージェント自身の能力や権限を制限する指示ではない。