import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Accepte une édition par jour OU plusieurs (l'archiveur suffixe alors le nom
// par un slug : YYYY-MM-DD-breves-ia-merim[-<slug>].md).
const EDITION_RE = /^(\d{4}-\d{2}-\d{2})-breves-ia-merim(?:-([a-z0-9-]+))?\.md$/;

function titleFromSlug(slug) {
  if (!slug) return '';
  const t = slug.replace(/-/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

export function listEditions(bbDir) {
  const dir = join(bbDir, 'raw', 'notes');
  let files;
  try { files = readdirSync(dir); } catch { return []; }
  return files
    .map((file) => ({ file, m: file.match(EDITION_RE) }))
    .filter((x) => x.m)
    .map(({ file, m }) => {
      const date = m[1];
      const title = titleFromSlug(m[2]);
      const md = readFileSync(join(dir, file), 'utf8');
      const count = (md.match(/^—\s.+\s—$/gm) || []).length;
      return { file, date, range: date, count, corr: 0, title };
    })
    .sort((a, b) => (a.file < b.file ? 1 : a.file > b.file ? -1 : 0));
}
