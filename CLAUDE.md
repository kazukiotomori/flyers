# flyers

HTMLフライヤーを管理し、Playwright でPDFを自動生成するリポジトリ。詳細は [README.md](README.md)。

## 構成

- `flyers/<slug>/` — **1フライヤー＝1ディレクトリ**。`index.html` が本体で、
  そのフライヤー専用の `style.css` と `images/` を同居させる。
  ディレクトリ名がPDF名・公開URLになる。
- `css/common.css` — 全フライヤー共通の土台。`.sheet`（用紙1枚）の実寸と画面プレビュー。
- `css/print.css` — 印刷・PDF共通設定。`@page` の用紙サイズと改ページはここが既定値。
- `css/index.css` — 一覧ページ専用
- `images/` — ロゴなど複数フライヤーで使い回す画像のみ。特定のフライヤーでしか
  使わない画像はここではなく `flyers/<slug>/images/` に置く。
- `scripts/build-pdf.js` — `flyers/` を走査して `dist/*.pdf` を生成
- `scripts/build-index.js` — `index.html` を生成
- `scripts/build-site.js` — Pages公開用に `_site/` を組み立て
- `scripts/lib/` — フライヤー検出とビルド用静的サーバ

## 作業時の注意

- **`index.html` は生成物。直接編集しない。** `scripts/build-index.js` を直すこと。
- 一覧の表示内容は各フライヤーの `<title>` と `<meta name="flyer:*">` から読む。
  別のインデックスファイルを新設しないこと。
- 用紙サイズはスクリプトにハードコードしない。CSSの `@page` が正
  （`build-pdf.js` は `preferCSSPageSize: true`）。
- **各フライヤーのCSSはインラインの `<style>` ではなく `style.css` に置く。**
  HTMLは中身、CSSは見た目、という分担を保つ。
- 複数ページは `.sheet` を並べて表現し、`<meta name="flyer:pages">` で枚数を宣言する。
  改ページ指定を個別のフライヤーに書かない（`css/print.css` の担当）。
- 用紙内側の余白は共通CSSでは付けない。全面レイアウトのフライヤーがあるため、
  必要な側が `.sheet { padding: var(--sheet-padding); }` を書く。
- 寸法の単位は用途で使い分ける。用紙まわりは mm、用紙幅に対する相対配置は cqw
  （`.sheet` が `container-type: inline-size`）。px は使わない。
- `dist/` `_site/` `_archive/` はコミットしない。

## 確認

変更後は `npm run build` が通ることを確認する。

- CSSや画像が読み込めないとビルドが失敗する（黙って崩れたPDFが出るのを防ぐため）
- 出力ページ数が `flyer:pages` と違うと警告が出る。内容のはみ出しに気づくため。

レイアウトを触ったときは、PDFのページ数が合っているだけでは不十分。
実際の見た目が崩れていないかを目視で確認すること。
