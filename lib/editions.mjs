import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function listEditions(bbDir) {
  const dir = join(bbDir, 'raw', 'notes');
  let files;
  try { files = readdirSync(dir); } catch { return []; }
  return files
    .filter((f) => /^\d{4}-\d{2}-\d{2}-breves-ia-merim\.md$/.test(f))
    .map((file) => {
      const date = file.slice(0, 10);
      const md = readFileSync(join(dir, file), 'utf8');
      const count = (md.match(/^—\s.+\s—$/gm) || []).length;
      return { file, date, range: date, count, corr: 0 };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
