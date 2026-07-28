import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { DIST_DIR, ROOT } from './lib/flyers.js';
import { startServer } from './lib/server.js';

/*
 * フライヤーを1ページずつPNGに書き出す。
 *
 *   npm run shot -- catalogue
 *   npm run shot -- catalogue .page      # 要素のセレクタを変えたいとき
 *
 * レイアウトを触ったとき、PDFのページ数が合っているだけでは崩れに気づけない。
 * 画像にしておくと変更の前後を並べて見比べられる。
 */
const [target, selector = '.sheet'] = process.argv.slice(2);

if (!target) {
  console.error('使い方: npm run shot -- <slug または HTMLのパス> [セレクタ]');
  process.exit(1);
}

const isPath = target.includes('/') || target.endsWith('.html');
const urlPath = isPath ? target : `flyers/${target}/`;
const name = isPath ? path.basename(target, '.html') : target;

const outDir = path.join(DIST_DIR, 'preview');
await mkdir(outDir, { recursive: true });

const server = await startServer(ROOT);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 1300 } });

try {
  const response = await page.goto(`${server.origin}/${urlPath}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) {
    throw new Error(`${urlPath} を開けませんでした (HTTP ${response?.status()})`);
  }
  // PDFと同じ見た目を撮る
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.fonts.ready);

  const sheets = await page.locator(selector).all();
  if (sheets.length === 0) throw new Error(`${selector} に一致する要素がありません`);

  for (const [i, sheet] of sheets.entries()) {
    const file = path.join(outDir, `${name}-p${i + 1}.png`);
    await sheet.screenshot({ path: file, scale: 'css' });
    console.log(`saved ${path.relative(ROOT, file).split(path.sep).join('/')}`);
  }
} finally {
  await browser.close();
  await server.close();
}
