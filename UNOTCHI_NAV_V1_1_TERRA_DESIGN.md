# うのっちナビ v1.1 Terra詳細設計

対象: `sanpeita.github.io` / 実装担当: Luna
前提: `UNOTCHI_NAV_V1_1_SOL_SPEC.md` の確定仕様を実装単位へ落としたもの。仕様上の判断を変更しない。

## 1. 採用する構造

`tour-core.js` を新設する。ツアーの検証・現在ステップ取得・前後遷移をDOMから独立させ、Nodeテストとブラウザで同じロジックを使うためである。状態管理ライブラリやclassは導入しない。

```text
knowledge.json ─┬─ search-core.js ── 個別質問 → intent
                └─ tour-core.js ─── ツアー定義 → step
                                     ↓
index.html ─── chatbot.js ─── state → renderCurrentView()
                                      ├─ welcome card
                                      ├─ answer card
                                      ├─ tour card
                                      ├─ tour-complete card
                                      └─ error card
styles.css ──────────────────────── 単一カード・進捗・操作・動き
```

`chatbot.js` が持つ責務は、DOM参照、ページ内state、イベント処理、カードの再描画だけに限定する。`search-core.js` は変更しない。

## 2. データスキーマ

`knowledge.json` は既存の `bot`、`intents`、`fallbacks` を維持し、先頭に以下を追加する。`intents` は既存15件を維持する。

```json
{
  "version": "1.1.0",
  "bot": {},
  "welcome": {
    "message": "こんにちは。うのっちの活動を、作品・教育・V文化論のつながりからご案内します。初めての方は、おすすめツアーからどうぞ。",
    "primaryAction": {
      "type": "tour",
      "tourId": "recommended",
      "label": "おすすめツアーをはじめる"
    },
    "intentIds": [
      "profile-overview",
      "representative-works",
      "v-culture",
      "digital-education"
    ]
  },
  "tours": [
    {
      "id": "recommended",
      "title": "うのっちを知るおすすめツアー",
      "steps": [
        { "intentId": "profile-overview", "heading": "まず、うのっちについて" },
        { "intentId": "vtuber-history", "heading": "VTuberを表現の器に" },
        { "intentId": "representative-works", "heading": "遊びと技術を作品に", "note": "Unity、Blender、Roblox、Minecraft、toioまで、遊びと技術を横断して作品にしています。" },
        { "intentId": "digital-education", "heading": "難しそうを、学べそうに" },
        { "intentId": "digital-fabrication", "heading": "画面の中から、手で触れるものへ" },
        { "intentId": "v-culture", "heading": "活動をつなぐV文化論", "note": "TED世界共創計画にもつながる、アバターと関係性についての考え方です。" },
        { "intentId": "events-awards", "heading": "教育・toio・実績が交わる場所" }
      ]
    }
  ],
  "intents": [],
  "fallbacks": {}
}
```

`note` は任意のツアー固有補足で、既存回答本文を複製しない。step 3と6だけに置く。表示時は本文の直後に `un-nav-tour-note` として出す。各intentの `links` は最大3件、`suggestions` は表示時に最大3件までに切る。`contact-socials` の既存5リンクは個別回答でも先頭3件だけを表示する。

## 3. 状態と遷移

```js
const state = {
  panel: "closed", // closed | open
  view: "loading", // loading | welcome | answer | tour | tour-complete | error
  currentIntentId: null,
  tourId: null,
  tourIndex: null,
  previousAnswerIds: new Map()
};
```

| 現在 | 操作 | 次 | 必須更新 |
|---|---|---|---|
| loading | JSON成功 | welcome | 初期カードを描画、フォーム有効化 |
| loading | JSON失敗/整合失敗 | error | フォーム無効化 |
| welcome | 主ボタン | tour | `recommended`, `0` |
| welcome | テーマ選択/送信 | answer | `currentIntentId`、`tourId/index=null` |
| answer | テーマ選択/送信 | answer | 同上 |
| tour | 次を見る（最終以外） | tour | index + 1 |
| tour | ひとつ前に戻る（先頭以外） | tour | index - 1 |
| tour | 最後の「次を見る」 | tour-complete | tourId/indexをnull |
| tour | 終了 | tour-complete | tourId/indexをnull |
| tour-complete | 最初から見る | tour | `recommended`, `0` |
| tour-complete | 別のテーマを見る | welcome | currentIntentId=null |
| 任意のopen | 閉じる/Escape | 同一view | panel=closedのみ |
| 任意のclosed | 開く | 同一view | panel=openのみ |

自由入力・初期テーマ・suggestionはすべて `showAnswer(intentId)` を通す。これがツアー状態を解除するため、ツアーへ戻る履歴は残らない。再読み込み時はstateを再生成して `loading → welcome` へ戻る。

## 4. `tour-core.js` API

UMD形式で `window.UnotchiNavTour` と CommonJSの両方を提供する。公開APIは次だけにする。

```js
validateTours(tours, intents) // { ok: true } または { ok: false, error: string }
getTourById(tours, tourId) // tour | null
getTourStep(tour, index) // step | null
getPreviousIndex(index) // number | null
getNextIndex(tour, index) // number | null; 最終ならnull
```

`validateTours` は、配列性、ID重複、空step、空heading、存在しないintentId、recommendedが7stepであることを検証する。UIはこの検証に失敗したらerrorカードへ進み、黙ってstepを飛ばさない。

## 5. カード仕様

共通のDOMは `article.un-nav-card`。カード領域には常時1カードだけを `replaceChildren()` で置く。

| view | eyebrow | title | body | actions |
|---|---|---|---|---|
| welcome | `PORTFOLIO GUIDE` | `うのっちナビへようこそ` | `welcome.message` | 主ボタン + 4つのintent直結ボタン |
| answer | `PORTFOLIO GUIDE` | `intent.title` | `chooseAnswer()` の本文 | links、最大3 suggestion |
| tour | `おすすめツアー n / 7` | step.heading | intentの回答本文 + 任意note | 戻る、次を見る、終了 |
| tour-complete | `おすすめツアー 完了` | `ここまでのご案内は以上です` | 「作品・教育・V文化論がつながる活動です。気になるテーマをもう少し見てみてください。」 | 最初から見る、別のテーマを見る |
| error | `PORTFOLIO GUIDE` | `読み込めませんでした` | 「うのっちナビを読み込めませんでした。ページを再読み込みしてください。」 | なし |
| fallback | `PORTFOLIO GUIDE` | `まだうまくご案内できないようです` | `fallbacks.unknown` | welcome.intentIdsの4ボタン |

ツアーでは回答をランダムにせず、各stepの `answers[0]` を使う。これにより同一ツアーの読後感と、指定された短い補足との整合を安定させる。個別回答だけは既存どおり直前回答を避ける。

ツアー固有の関連導線は既存intentの `links` を最大3件表示する。step 7の映像リンクは既存 `events-awards.links[0]` をそのまま使い、`noopener noreferrer` で別タブを開く。

## 6. 操作・キーボード

| 要素 | class / data hook | イベント | 挙動 |
|---|---|---|---|
| launcher | 既存 `data-un-nav-launcher` | click/Enter/Space | 開閉 |
| 閉じる | 既存 `data-un-nav-close` | click | 閉じる、launcherへfocus |
| ツアー開始 | `.un-nav-primary-action` | click | `startTour("recommended")` |
| 初期/関連テーマ | `.un-nav-question[data-intent-id]` | click | `showAnswer(intentId)` |
| 戻る | `.un-nav-tour-back` | click | `moveTour(-1)`。先頭では非表示 |
| 次を見る | `.un-nav-tour-next` | click | 次stepまたはcomplete |
| 終了 | `.un-nav-tour-exit` | click | complete |
| 最初から | `.un-nav-tour-restart` | click | step 1 |
| 別テーマ | `.un-nav-tour-browse` | click | welcome |
| 入力フォーム | 既存form | submit | `submitQuestion()`、ツアーなら解除 |
| Escape | document keydown | Escape | 開いていれば閉じる |

Tab順はヘッダーの閉じる → カード内のリンク/操作 → 入力 → 送信。カード更新でフォーカスは移動させない。`Enter`の二重送信を避けるため、入力欄のkeydown独自処理は削除し、form submitだけを利用する。

## 7. DOM・ARIA

`index.html` のカード領域を次に置換する。`role="log"` と `aria-relevant` は削除する。

```html
<div
  class="un-nav-content"
  data-un-nav-content
  aria-live="polite"
  aria-atomic="true"
>
  <p class="un-nav-loading">うのっちナビを読み込んでいます…</p>
</div>
```

headerのsmall要素には `data-un-nav-mode` を追加し、welcome/answerでは `PORTFOLIO GUIDE`、tourでは `おすすめツアー` と描画する。進捗は見た目の `p.un-nav-progress` に加え、同じ文字列を `span.un-nav-visually-hidden` に入れる。例: `おすすめツアー 3 / 7`。

`card` の切替後、`content.scrollTop = 0` のみ行う。見出しへfocusさせない。カードの内容全体がlive regionで重複しすぎないよう、`aria-live` は親の1箇所だけに置き、各カード自身にはlive属性を置かない。

内部リンクは既存どおりclickで `closePanel()` を実行する。close後のlauncher focusは `requestAnimationFrame()` で行い、アンカー標準移動を妨げない。外部リンクには必ず `target="_blank" rel="noopener noreferrer"` を付与する。

## 8. CSS・レスポンシブ・動き

既存 `.un-nav-log` を `.un-nav-content` へ改名する。同じflex、`min-height: 0`、縦scroll、paddingを維持する。追加クラスは以下。

```text
.un-nav-card-eyebrow
.un-nav-card-title
.un-nav-progress
.un-nav-tour-note
.un-nav-primary-action
.un-nav-actions
.un-nav-tour-controls
.un-nav-tour-back
.un-nav-tour-next
.un-nav-tour-exit
.un-nav-card.is-entering
```

- desktop: panelは既存の `width: min(390px, calc(100vw - 48px))` と最大680pxを維持。
- mobile: widget左右12px、panel幅100%、`height: min(78dvh, 680px)`、safe-areaを維持。
- closeは全幅で `min-width/min-height: 44px`。desktopの既存38pxも44pxへそろえる。
- 主要action、tour controls、question、related linkはすべて`min-height:44px`。操作群は `display:grid`（戻る/次へは2列、終了は全幅）とし、狭幅でも折返しによる横overflowを出さない。
- `.un-nav-card.is-entering` は `animation: un-nav-card-in 180ms ease-out both`。keyframesはopacity 0→1、translateY(6px)→0。
- `@media (prefers-reduced-motion: reduce)` ではこのanimationと既存transitionを`none`にする。

## 9. `chatbot.js` の関数構成

```text
initializeWidget()
  setReadyState(isReady)
  setModeLabel(label)
  resetViewScroll()
  renderCurrentView()
    createWelcomeCard()
    createAnswerCard(intent, answer, { eyebrow, note })
    createTourCard(tour, index)
    createTourCompleteCard()
    createFallbackCard()
    createErrorCard()
  createCardShell({ eyebrow, title })
  createRelatedLinks(links)
  createIntentButtons(intentIds, variant)
  createTourControls(tour, index)
  showWelcome()
  showAnswer(intentId)
  startTour(tourId)
  moveTour(direction)
  completeTour()
  submitQuestion(rawQuestion)
  openPanel()
  closePanel()
```

`renderCurrentView()` はstateを読むだけでstateを書き換えない。stateを変更するのは `showWelcome`、`showAnswer`、`startTour`、`moveTour`、`completeTour`、初期化・失敗ハンドラだけにする。

## 10. ファイル別変更計画

| ファイル | 変更 |
|---|---|
| `assets/chatbot/knowledge.json` | versionを1.1.0、welcome/toursを追加。既存15intentはIDを変更せず、step3/6のnoteのみtourへ配置。 |
| `assets/chatbot/tour-core.js` | 上記UMD APIを新設。 |
| `assets/chatbot/chatbot.js` | append型の`messageLog`、`createUserMessage`、`scrollToLatest`を削除。stateと単一カードrenderへ置換。 |
| `index.html` | `tour-core.js`を`chatbot.js`より前に追加。`data-un-nav-log role=log`を`data-un-nav-content` live regionへ置換。header smallにdata hook。 |
| `styles.css` | content名へ変更、単一カード・action/control・animationを追加、interactive要素を44pxへ。 |
| `tests/chatbot-search.test.cjs` | version期待を1.1.0へ。welcome参照、リンク検証対象をwelcome/toursも含める。既存検索と禁止表現ゲートを残す。 |
| `tests/chatbot-tour.test.cjs` | `tour-core.js`の7step、参照整合、境界、動画URLをテストする。 |
| `README.md` | 見出しを「うのっちナビ 1.1」へ更新し、welcome/toursの編集法と`node --test tests/*.test.cjs`を記載。1.1候補の旧文は削除。 |

## 11. 実装順序

1. `tour-core.js` と `chatbot-tour.test.cjs` を作り、境界テストを通す。
2. `knowledge.json` を1.1スキーマへ更新し、既存検索テストを1.1期待値へ直す。
3. `index.html` のscript順とARIA hookを変更する。
4. `chatbot.js` をstate駆動の単一カードへ置換する。
5. CSSを追加し、desktop/390px/320pxで目視する。
6. READMEを完成仕様へ更新する。
7. 自動テスト、ローカルブラウザ、YouTubeリンクの1回再生を確認する。

## 12. 完了判定

自動:

```powershell
node --test tests/*.test.cjs
git diff --check
```

手動:

- desktop、390×844、320px幅でwelcome → 7step完走 → restart → browseを確認。
- step 2以降で戻る、任意stepで終了、ツアー中の入力で個別回答へ遷移を確認。
- 閉じて再度開いたときのstate保持と、リロードでwelcomeへ戻ることを確認。
- Tab操作、Escape、close後launcher focus、`prefers-reduced-motion`、横overflowなしを確認。
- 内部アンカー、外部別タブ、ワンダーメイクフェス5動画の再生を1回確認。

## 13. Luna向け完成実装プロンプト

```text
あなたはLunaです。静的GitHub Pagesリポジトリ
C:\Users\unocy\OneDrive\Documents\TEDxProjects\sanpeita.github.io
で、うのっちナビを1.0から1.1へ実装してください。

最初にREADME.md、UNOTCHI_NAV_V1_1_SOL_SPEC.md、UNOTCHI_NAV_V1_1_TERRA_DESIGN.mdを読み、git remote -v、user.name、user.email、git status --short --branchを確認してください。個人リポ設定がsanpeita以外なら止まって報告してください。既存の未追跡Sol/Terra仕様書は削除・改変せず、実装対象だけを変更してください。

確定要件:
- `knowledge.json`をversion `1.1.0`にし、welcomeとrecommended 7step tourを追加する。既存15intent IDは維持する。
- tour順は profile-overview, vtuber-history, representative-works, digital-education, digital-fabrication, v-culture, events-awards。
- welcomeの主操作は「おすすめツアーをはじめる」。通常テーマはprofile-overview、representative-works、v-culture、digital-educationをintent ID直結で表示する。
- 画面はログ追加でなく、welcome/answer/tour/tour-complete/errorの常時1カードをstateからreplaceChildrenで描画する。
- ツアーには戻る、次を見る、終了を置く。最後の次と終了はcomplete cardへ。completeには最初から見る、別のテーマを見るを置く。
- 個別質問は既存検索を保ち、ツアー中なら確認なしでtourを解除する。同ページ内で閉じて再開してもカード・tour位置を維持し、reloadでは初期化する。localStorage等は使わない。
- `tour-core.js`をUMD/CommonJS互換で新設し、validateTours/getTourById/getTourStep/getPreviousIndex/getNextIndexを実装する。search-core.jsは変更しない。
- `role=log`は廃止し、`data-un-nav-content`にaria-live=polite、aria-atomic=trueを置く。カード更新でfocusを奪わず、content.scrollTop=0のみ。Escape、launcher aria-expanded/controls、close後launcher focusを維持する。
- 外部リンクはnoopener noreferrerの別タブ、内部anchorはcloseし標準移動を妨げない。不正URLは描画しない。
- 既存の色、右下配置、mobile左右12px、safe-area、panel最大78dvhを維持する。closeと全主要操作は44px以上。card切替は180ms以内、reduced-motionでは無効。
- step3だけにUnity/Blender/Roblox/Minecraft/toioの広がりを短いnoteで追加。step6だけにTED世界共創計画との関連noteを置く。step7は既存URL `https://www.youtube.com/watch?v=ZgVxVa9wKUo&t=101s` を使い、実写・顔出し・中の人などの表現を入れない。

変更対象はknowledge.json、chatbot.js、index.html、styles.css、tests/chatbot-search.test.cjs、README.md、新規tour-core.jsとchatbot-tour.test.cjs。Fuse関連は変更しない。

テストではversion、15intent一意性、welcome参照、recommendedが7stepかつ全参照が存在、先頭で戻れない・末尾で次がnull、V文化論とワンダーメイクフェス5検索、動画IDとt=101s、禁止表現、内部anchor/外部URL、suggestion解決を確認してください。

実装後、`node --test tests/*.test.cjs` と `git diff --check` を実行し、desktop、390×844、320px、keyboard、Escape、focus、reduced-motion、tour完走/終了/再開、動画リンクを確認してください。変更ファイルだけを要約して報告し、コミットやpushは明示依頼があるまで行わないでください。
```
