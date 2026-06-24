import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function section(md, n) {
  // découpe sur les titres `## ` ; chaque part commence par « N. Titre\n… » et s'arrête
  // au titre suivant (évite \Z, non supporté en JS).
  for (const part of md.split(/^##\s+/m)) {
    if (new RegExp(`^${n}\\.`).test(part)) return part;
  }
  return '';
}
const datedLessons = (txt) => [...txt.matchAll(/^-\s*\((\d{4}-\d{2}-\d{2})\)\s*(.+)$/gm)]
  .map((m) => ({ date: m[1], text: m[2].trim() }));

export function readSoul(baseDir) {
  const md = readFileSync(join(baseDir, '.claude', 'breves-ia', 'SOUL.md'), 'utf8');
  const rules = [...section(md, 4).matchAll(/^-\s+(.+)$/gm)].map((m) => m[1].trim());
  const examples = [...section(md, 5).matchAll(/^###\s*\[(\d{4}-\d{2}-\d{2})\][^\n]*\n([^\n]+)/gm)]
    .map((m) => ({ date: m[1], text: m[2].trim() }));
  const lessons = datedLessons(section(md, 6));
  return { version: `v${lessons.length + 1}`, rules, examples, lessons };
}
