---
name: exhibit-add
description: 公開中のWebアプリ、GitHub Pages、ゲーム、ツールなどを、URLからうのっちの通常Webポートフォリオと3Dバーチャル展示室へ同時登録する。ユーザーが「このPagesを展示して」「ポートフォリオへ追加して」「Webと3Dへ作品を追加して」などとURLを添えて依頼したときに使う。
---

# Exhibit Add

`scripts/add-exhibit.ps1` を唯一の登録処理として使い、`exhibits/*.json` へ1回登録してWeb一覧と3D展示室の両方へ反映する。

## 実行手順

1. `git status --short --branch` を確認し、既存の無関係な変更を記録する。
2. リポジトリ直下の `AGENTS.md` と `README.md` を読み、公開・Git運用ルールを守る。
3. 依頼文からURLと明示情報だけを取り出す。作品名・説明・公開状態を推測で補わない。
4. リポジトリ直下からCLIを実行する。URLだけの依頼では次を使う。

```powershell
& .\scripts\add-exhibit.ps1 -Url "https://example.github.io/app/"
```

明示された情報がある場合だけ、`-Title`、`-Description`、`-Repository`、`-Type`、`-Category`、`-Tags`、`-Thumbnail`、`-Room`、`-Order`、`-GalleryOrder`、`-Featured` を追加する。Webまたは3Dだけに出す場合は `-WebVisible:$false` または `-Gallery3dVisible:$false` を使う。

5. URL確認に失敗したら公開登録を止めて報告する。`-SkipUrlCheck` はテストまたはユーザーが明示したオフライン作業でだけ使う。
6. 生成された `exhibits/<id>.json` と `exhibits/manifest.json` を読み、ID・URL重複、`status: published`、`web.visible`、`gallery3d.visible`、`room`、順序を確認する。
7. 次を実行する。

```powershell
node --test tests/*.test.cjs
git diff --check
```

8. HTTPサーバー経由でトップページと `lab/virtual-world/` を開く。同じ作品がWebカードと3D展示一覧に現れ、説明パネルから作品URLを開けることを確認する。`file://` では検証しない。
9. 変更ファイルと検証結果を報告する。明示依頼がなければcommit・pushしない。

## 守る境界

- 作品基本情報をHTMLや `world.js` へ再記述しない。
- 登録ロジックをSkillへ複製しない。必ずCLIを呼ぶ。
- `draft` と `hidden` を公開Viewへ出さない。
- URL、画像、manifestは先頭 `/` を使わず、GitHub Pagesのサブパスでも解決できる相対URLとして扱う。
- 3D自動配置は `room + gallery3d.order` を使う。厳密な配置が必要な場合だけJSONの `position` / `rotation` を指定する。
