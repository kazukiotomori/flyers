import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const FLYERS_DIR = path.join(ROOT, 'flyers');
export const DIST_DIR = path.join(ROOT, 'dist');

/**
 * フライヤーHTMLから見出し情報を取り出す。
 * 一覧ページ用のメタ情報は各HTML内で完結させ、別途インデックスファイルを
 * 手で維持しなくて済むようにしている。
 *
 *   <title>夏祭り2026</title>
 *   <meta name="flyer:description" content="8/15開催">
 *   <meta name="flyer:date" content="2026-08-15">
 *   <meta name="flyer:status" content="draft">
 */
function parseMeta(html) {
  const meta = {};
  const metaTag = /<meta\s+[^>]*name=["']flyer:([\w-]+)["'][^>]*>/gi;
  for (const [tag, key] of html.matchAll(metaTag)) {
    const content = tag.match(/content=["']([^"']*)["']/i);
    if (content) meta[key] = content[1].trim();
  }
  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (title && !meta.title) meta.title = title[1].trim();
  return meta;
}

/**
 * flyers/ 配下のフライヤーを列挙する。
 * 1フライヤー＝1ディレクトリで、そのフライヤーでしか使わない
 * CSSや画像を同じディレクトリに同居させる。
 *
 *   flyers/sample-event/
 *     ├── index.html
 *     ├── style.css
 *     └── images/
 *
 * ディレクトリ名がそのまま slug（PDF名・公開URL）になる。
 */
export async function listFlyers() {
  let entries;
  try {
    entries = await readdir(FLYERS_DIR, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }

  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_'))
    .map((e) => e.name)
    .sort();

  const flyers = await Promise.all(
    dirs.map(async (slug) => {
      const file = path.join(FLYERS_DIR, slug, 'index.html');
      let html;
      try {
        html = await readFile(file, 'utf8');
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.warn(`skip: flyers/${slug}/ に index.html がありません`);
          return null;
        }
        throw err;
      }
      const meta = parseMeta(html);
      return {
        slug,
        file: `flyers/${slug}/index.html`,
        htmlPath: `flyers/${slug}/`,
        pdfPath: `dist/${slug}.pdf`,
        title: meta.title || slug,
        description: meta.description || '',
        date: meta.date || '',
        status: meta.status || 'published',
        // 想定ページ数。実際の出力とずれたらビルド時に警告する。
        expectedPages: Number.parseInt(meta.pages, 10) || 1,
      };
    })
  );

  return flyers.filter(Boolean);
}

export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}
