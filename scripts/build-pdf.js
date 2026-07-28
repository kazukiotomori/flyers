import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { DIST_DIR, ROOT, listFlyers } from './lib/flyers.js';
import { startServer } from './lib/server.js';

const CONCURRENCY = 4;

/** ページ内のフォントと画像の読み込みが終わるまで待つ。 */
async function waitForAssets(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) => img.decode().catch(() => {}))
    );
  });
}

/** PDF内のページ数。1枚もののフライヤーが意図せず2ページになる事故を検知する。 */
function countPages(buffer) {
  const matches = buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 1;
}

async function renderFlyer(browser, origin, flyer) {
  const page = await browser.newPage();

  // CSSや画像のパスを間違えても描画自体は成功してしまい、
  // 崩れたPDFが黙って出来上がる。読み込み失敗はビルドを止める。
  // 同じURLが response(4xx) と requestfailed の両方で拾われるため Map で束ねる
  const broken = new Map();
  page.on('response', (res) => {
    if (res.status() >= 400) broken.set(res.url(), `HTTP ${res.status()}`);
  });
  page.on('requestfailed', (req) => {
    if (!broken.has(req.url())) broken.set(req.url(), '読み込み失敗');
  });

  try {
    const response = await page.goto(`${origin}/${flyer.htmlPath}`, {
      waitUntil: 'networkidle',
    });
    if (!response?.ok()) {
      throw new Error(`${flyer.htmlPath} の読み込みに失敗しました (HTTP ${response?.status()})`);
    }
    await page.emulateMedia({ media: 'print' });
    await waitForAssets(page);

    if (broken.size > 0) {
      const list = [...broken]
        .map(([url, reason]) => `    - ${url.split(origin).join('')} (${reason})`)
        .join('\n');
      throw new Error(`${flyer.file} が読み込めないファイルを参照しています:\n${list}`);
    }

    const pdf = await page.pdf({
      // 用紙サイズは各フライヤーのCSS @page を優先する。
      // A3や横向きが必要になったときスクリプトを触らずに済む。
      preferCSSPageSize: true,
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });

    const out = path.join(DIST_DIR, `${flyer.slug}.pdf`);
    await writeFile(out, pdf);
    return { flyer, pages: countPages(pdf), bytes: pdf.length };
  } finally {
    await page.close();
  }
}

/** タスクを最大 limit 本の並列で流す簡易プール。 */
async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const flyers = await listFlyers();
  if (flyers.length === 0) {
    console.log('flyers/ にフライヤーがありません。何も生成しませんでした。');
    return;
  }

  await mkdir(DIST_DIR, { recursive: true });
  const server = await startServer(ROOT);
  const browser = await chromium.launch();

  let results;
  try {
    // 1枚失敗しても残りは生成し、エラーはまとめて最後に出す。
    // 直したいものが複数あるとき、1回のビルドで全部わかるほうが早い。
    results = await pool(flyers, CONCURRENCY, (flyer) =>
      renderFlyer(browser, server.origin, flyer).catch((error) => ({ flyer, error }))
    );
  } finally {
    await browser.close();
    await server.close();
  }

  const failed = results.filter((r) => r.error);
  for (const { flyer, pages, bytes } of results.filter((r) => !r.error)) {
    console.log(`generated dist/${flyer.slug}.pdf (${pages}ページ, ${(bytes / 1024).toFixed(0)}KB)`);
    if (pages !== flyer.expectedPages) {
      console.warn(
        `  警告: ${flyer.file} は${flyer.expectedPages}ページの想定ですが${pages}ページ出力されました。\n` +
          `        内容がはみ出しているか、想定が古い可能性があります` +
          `（想定は <meta name="flyer:pages" content="${pages}"> で変えられます）。`
      );
    }
  }

  console.log(`\n${results.length - failed.length}/${results.length}件のPDFを生成しました。`);

  if (failed.length > 0) {
    console.error('');
    for (const { error } of failed) console.error(`エラー: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
