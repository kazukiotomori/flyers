import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, escapeHtml, listFlyers } from './lib/flyers.js';

function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return escapeHtml(value);
  const [y, m, d] = value.split('-');
  return `${Number(y)}年${Number(m)}月${Number(d)}日`;
}

function renderCard(flyer) {
  const draft = flyer.status === 'draft' ? '<span class="badge">下書き</span>' : '';
  const lines = [
    '      <li class="card">',
    `        <h2 class="card__title">${escapeHtml(flyer.title)}${draft}</h2>`,
  ];
  if (flyer.date) {
    lines.push(`        <p class="card__date">${formatDate(flyer.date)}</p>`);
  }
  if (flyer.description) {
    lines.push(`        <p class="card__description">${escapeHtml(flyer.description)}</p>`);
  }
  lines.push(
    '        <p class="card__links">',
    `          <a href="${flyer.htmlPath}">Webで見る</a>`,
    `          <a href="${flyer.pdfPath}" download>PDFをダウンロード</a>`,
    '        </p>',
    '      </li>'
  );
  return lines.join('\n');
}

function renderPage(flyers) {
  const cards = flyers.map(renderCard).join('\n');
  const list = flyers.length
    ? `    <ul class="cards">\n${cards}\n    </ul>`
    : '    <p class="empty">まだフライヤーがありません。flyers/ にHTMLを追加してください。</p>';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>フライヤー一覧</title>
<link rel="stylesheet" href="css/index.css">
</head>
<body>
  <!-- このファイルは scripts/build-index.js が生成します。直接編集しないでください。 -->
  <header class="header">
    <h1>フライヤー一覧</h1>
    <p>各フライヤーのWeb表示とPDFをここからたどれます。</p>
  </header>
  <main>
${list}
  </main>
</body>
</html>
`;
}

const flyers = await listFlyers();
await writeFile(path.join(ROOT, 'index.html'), renderPage(flyers), 'utf8');
console.log(`generated index.html (${flyers.length}件)`);
