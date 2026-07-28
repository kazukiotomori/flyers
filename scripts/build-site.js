import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './lib/flyers.js';

/**
 * GitHub Pages へ渡す公開ディレクトリを組み立てる。
 * リポジトリと同じ構成のまま置くことで、index.html 内の
 * flyers/... や dist/....pdf といった相対リンクがそのまま通る。
 */
const SITE_DIR = path.join(ROOT, '_site');
const ENTRIES = ['index.html', 'flyers', 'css', 'images', 'dist'];

await rm(SITE_DIR, { recursive: true, force: true });
await mkdir(SITE_DIR, { recursive: true });

for (const entry of ENTRIES) {
  await cp(path.join(ROOT, entry), path.join(SITE_DIR, entry), {
    recursive: true,
    force: true,
    // dist/ には確認用のプレビュー画像も入るので、公開するのはPDFだけにする
    filter: (src) => !src.split(path.sep).includes('preview'),
  }).catch((err) => {
    if (err.code !== 'ENOENT') throw err;
    console.warn(`skip: ${entry} が存在しません`);
  });
}

console.log(`generated _site/ (${ENTRIES.join(', ')})`);
