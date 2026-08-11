# うのっち ポートフォリオ

`https://sanpeita.github.io/` で公開する、うのっちの公式ポートフォリオです。

## 目的

- 初見の人に、`教育 × 制作 × VTuber` の活動軸を短時間で伝える
- オーディションや登壇応募で、代表動画・思想・制作実績を1つのURLから確認できるようにする
- YouTube、note、外部ポートフォリオへの入口を整理する

## 更新方針

- 本人事実と活動状況の正本は、`vtuber-ted-project/START_HERE.html` とする
- この公開サイトは、正本から審査向けに情報を選び直した編集投影として更新する
- 正本と公開サイトに差がある場合は、公開側で事実を推測して補わず、正本を確認してから反映する
- 代表動画は4本程度に絞り、役割が重複しないようにする
- 再生数は変動するため、サイト本文には固定表示しない
- 受賞・所属・経歴は、公開一次情報または確認済み記録があるものだけ記載する
- `うのっちナビ` は登録済みの公開情報だけを検索し、質問文を外部へ送信しない

## 構成

- `index.html` — ページ本文
- `styles.css` — デザインとレスポンシブ表示
- `images/` — 画像資産とSNS共有画像
- `assets/chatbot/knowledge.json` — うのっちナビの事実・回答・関連リンク・おすすめ質問
- `assets/chatbot/chatbot.js` — 右下ウィジェットの表示と操作
- `assets/chatbot/search-core.js` — Fuse.js検索と回答選択
- `assets/chatbot/tour-core.js` — おすすめツアーの検証と前後遷移
- `assets/chatbot/fuse.min.js` — 同梱しているFuse.js 7.1.0（Apache-2.0。ライセンスは同ディレクトリ内）
- `exhibits/` — Web作品・ゲーム等の作品情報の正本、manifest、JSON Schema
- `assets/exhibits/` — 正本の共通ローダー、Webカード描画、共通サムネイル
- `scripts/add-exhibit.ps1` — URLから作品JSONとmanifestを更新するAI非依存CLI
- `.codex/skills/exhibit-add/` — CLIを呼び出すCodex Skill
- `lab/virtual-world/` — Three.jsで作る、独立した歩ける展示室のPhase 0実験

## 作品情報の正本

Webアプリ、ゲーム、ツール等の登録作品は、1作品1ファイルの `exhibits/*.json` を正本とします。`index.html` と `lab/virtual-world/world.js` に作品名・説明・URLを重複記述しません。

`exhibits/manifest.json` はGitHub Pagesで利用できないディレクトリ走査の代わりに、読み込むJSONファイルを列挙します。`assets/exhibits/exhibit-data.mjs` がmanifestと各JSONを検証し、次の2つのViewへ渡します。

```text
exhibits/*.json
       ├─ assets/exhibits/exhibit-catalog.js → 通常Web作品カード
       └─ lab/virtual-world/world.js          → 3D展示物・説明パネル
```

必須項目と型は `exhibits/schema.json` が正本です。最低限 `id`、`title`、`type`、`url`、`description`、`thumbnail`、`status`、`web.visible`、`gallery3d.visible`、`gallery3d.room` を持たせます。公開Viewへ出るのは `status: "published"` の作品だけです。

Webは `featured`、`order`、タイトルの順で整列します。3Dは `gallery3d.room` と `gallery3d.order` から各室の壁面スロットへ自動配置します。各室の自動枠は8件です。厳密な配置または9件目以降は、JSONへ `gallery3d.position` と必要に応じて `gallery3d.rotation` を指定します。

JSONや画像は先頭 `/` を使わず、リポジトリルート相対で記述します。View側は `import.meta.url` からURLを解決するため、ローカルHTTPサーバーとGitHub Pagesのリポジトリサブパスのどちらでも動作します。`file://` では `fetch()` を検証できません。

### 作品を追加する

URLだけで登録できます。ページの到達確認、title/description metadata取得、ID生成、重複確認、JSON生成、manifest更新、書き込み後検証をCLIが行います。

```powershell
.\scripts\add-exhibit.ps1 -Url "https://example.github.io/app/"
```

必要に応じて `-Title`、`-Description`、`-Repository`、`-Type`、`-Category`、`-Tags`、`-Thumbnail`、`-Room`、`-Order`、`-GalleryOrder`、`-Featured` を指定できます。追加後は必ず次を実行し、HTTPサーバー経由でトップと展示室を確認します。

```powershell
node --test tests/*.test.cjs
git diff --check
python -m http.server 8000
```

Codexでは `$exhibit-add` を使うか、「このPagesをポートフォリオと3D展示室に追加して」とURLを渡します。Skillも同じCLIを呼ぶため、登録ロジックは二重化しません。

## 実験ページ

`/lab/virtual-world/` は、トップページから控えめに案内する独立ページです。WASD移動、マウス視点、展示物への接近と説明パネル、公開作品・GitHubへのリンクまでを最小範囲とし、トップページの導線や既存のうのっちナビを置き換えません。

## トップ画像

- `images/unotchi-official-standing.png`
  - うのっちの公式立ち絵の原寸PNG。
  - 画像自体は切り取らず、トップページ側でバストアップ表示に調整する。
- ファンアート画像は削除せず、`images/davi.jpeg` をヘッダーとフッターのアイコンとして引き続き使用する。
- `images/デイヴィデフォルメイラスト.jpeg` も元のファンアート資産として保持する。

## 保存対象の旧資産

- `images/kabe_viper_white.png`
  - かつてShadeでモデリングしたバイパー2をもとに制作した壁紙。
  - うのっちの制作の原点にあたるため、明示的な許可なしに削除しない。
  - 現在のサイトでは、ページ下部の `ARCHIVE / CREATOR ORIGIN` 欄に使用する。

GitHub Pagesは `master` ブランチのルートを公開対象として運用します。

## うのっちナビ 1.1

右下のファンアートアイコンから開く、ブラウザ完結型のポートフォリオ案内です。外部AI APIやサーバーは使わず、`assets/chatbot/knowledge.json` の15カテゴリをFuse.jsで検索し、welcome画面から7stepのおすすめツアーも案内します。

### 知識を追加・更新する

1. `assets/chatbot/knowledge.json` の `intents` に、重複しない `id` を持つ項目を追加または編集する
2. `facts` は公開一次情報または確認済み記録だけに限定する
3. `answers` は `facts` の範囲を越えず、回答ごとに重複しない `id` を付ける
4. `keywords` と `questions` に自然な検索語を追加する
5. `links` は実在URLまたはページ内の実在アンカーだけを使う
6. `suggestions` は、次に案内したい既存intentへ自然につながる質問文にする
7. `welcome.intentIds` は初見向けの4カテゴリ、`tours[].steps` は既存intentへの参照として管理する
8. JSON構文、15カテゴリの検索、範囲外質問、ツアー境界を確認してから公開する

回答文はサイト閲覧時に生成しません。複数の登録済み回答がある場合だけ、直前と同じ回答を避けながら選びます。

ローカルの検索受け入れテストは、リポジトリ直下で次を実行します。

```powershell
node --test tests/*.test.cjs
```
