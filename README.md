# うのっち ポートフォリオ

`https://sanpeita.github.io/` で公開する、うのっちの公式ポートフォリオです。

## 目的

- 初見の人に、`教育 × 制作 × VTuber` の活動軸を短時間で伝える
- オーディションや登壇応募で、代表動画・思想・制作実績を1つのURLから確認できるようにする
- YouTube、note、外部ポートフォリオへの入口を整理する

## 更新方針

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
- `lab/virtual-world/` — Three.jsで作る、独立した歩ける展示室のPhase 0実験

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
