# flyers

イベント・キャンペーン用のHTMLフライヤーを管理し、PDFを自動生成するリポジトリです。
`main` にプッシュすると GitHub Actions がPDFを生成し、GitHub Pages に公開します。

## セットアップ

```bash
npm install
npx playwright install chromium
```

## ディレクトリ構成

**1フライヤー＝1ディレクトリ**です。そのフライヤーでしか使わないCSSと画像は、
HTMLと同じディレクトリに置きます。フライヤーを削除するときはディレクトリごと消せば済み、
使われていない画像がどれか分からなくなることもありません。

```text
flyers/
  sample-event/          ← ディレクトリ名が slug（PDF名・公開URL）になる
    index.html           ← フライヤー本体（この名前で固定）
    style.css            ← このフライヤー専用のスタイル
    images/              ← このフライヤー専用の画像
  summer-festival/
    index.html
    style.css
    images/
css/                     ← 全フライヤー共通のスタイル
images/                  ← ロゴなど、複数のフライヤーで使い回す画像
dist/                    ← 生成されたPDF（コミットしない）
```

`_` で始まるディレクトリと `index.html` が無いディレクトリはビルド対象外です。
作りかけを一時的に外したいときは `_` を頭に付けてください。

## 新しいフライヤーを追加する

1. `flyers/sample-event/` をディレクトリごとコピーして `flyers/<好きな名前>/` にする
2. `index.html` の `<title>` と `flyer:` メタタグを書き換える
3. `npm run dev` で <http://127.0.0.1:4173/> を開き、画面で確認する
4. `npm run build` でPDFを含めて生成し、`dist/<好きな名前>.pdf` を確認する
5. コミットしてPRを出す

一覧ページ（`index.html`）は自動生成されるので、手で編集する必要はありません。

### メタタグ

一覧ページの表示内容は各フライヤーのHTML内で完結します。

```html
<title>夏祭り2026</title>
<meta name="flyer:description" content="今年も花火が上がります">
<meta name="flyer:date" content="2026-08-15">
<meta name="flyer:pages" content="4">
<meta name="flyer:status" content="draft">
```

`flyer:status` に `draft` を指定すると一覧に「下書き」バッジが付きます（PDFは生成されます）。

## 複数ページのフライヤー

`.sheet` を必要な数だけ並べれば複数ページになります。改ページは共通CSSが面倒を見ます。

```html
<section class="sheet">1ページ目</section>
<section class="sheet">2ページ目</section>
```

あわせて `<meta name="flyer:pages" content="2">` を書いてください。
出力されたPDFのページ数がこれと違うとビルド時に警告が出るので、
内容がはみ出して意図せずページが増えたことに気づけます。

実例は `flyers/school/`（全4ページ）を参照してください。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | ローカルサーバを起動して画面確認する |
| `npm run build:index` | `index.html` を再生成する |
| `npm run build:pdf` | `flyers/*.html` から `dist/*.pdf` を生成する |
| `npm run build` | 上記すべて＋公開用の `_site/` を組み立てる |

## 用紙サイズを変える

用紙サイズはCSSの `@page` が正で、スクリプトはそれに従います（`preferCSSPageSize`）。
既定は `css/print.css` のA4縦です。個別に変えたいフライヤーは自身のHTML内で上書きします。

```html
<style>
  @page { size: A3 landscape; }
  :root { --sheet-width: 420mm; --sheet-height: 297mm; }
</style>
```

`.sheet` はmm指定なので、画面上のプレビューがそのまま実寸になります。

## つまずきやすい点

- **ページ数が想定と違うと警告が出る** — 内容が用紙からはみ出しているか、
  `flyer:pages` の値が古くなっています。
- **CSSや画像のパスを間違えた** — ビルドが失敗し、参照できなかったURLが表示されます。
  同じディレクトリ内は `style.css` や `images/logo.png`、共通ファイルは `../../css/common.css`
  のように書きます。
- **背景が出ない** — `printBackground: true` で出力していますが、要素側で
  `print-color-adjust: exact` が効いているか確認してください（`css/print.css` で全体に指定済み）。
- **CIのPDFだけ文字が違う** — ランナーには日本語フォントが無いため、ワークフローで
  `fonts-noto-cjk` を入れています。特定のフォントを使いたい場合は `images/` ではなく
  Webフォントとして読み込むか、フォントファイルをリポジトリに含めてください。

## GitHub Pages の設定

リポジトリの Settings → Pages → Source を **GitHub Actions** にしてください。
`dist/` と `_site/` はコミットせず、CIで毎回生成します。
