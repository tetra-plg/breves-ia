export interface Echantillon {
  date: string;
  source: string;
  texte: string;
}

export interface JournalEntry {
  date: string;
  texte: string;
}

export interface Soul {
  version: string;
  quiParle: string;
  audience: string;
  voix: string;
  lignesRouges: string;
  echantillons: Echantillon[];
  journal: JournalEntry[];
}

export interface SoulSectionEdits {
  quiParle: string;
  audience: string;
  voix: string;
  lignesRouges: string;
}

function sectionBody(raw: string, n: number): string {
  for (const part of String(raw).split(/^##\s+/m)) {
    if (new RegExp(`^${n}\\.`).test(part)) {
      const nl = part.indexOf('\n');
      return nl === -1 ? '' : part.slice(nl + 1).trim();
    }
  }
  return '';
}

function parseEchantillons(body5: string): Echantillon[] {
  return body5
    .split(/^###\s+/m)
    .slice(1)
    .map((chunk) => {
      const nl = chunk.indexOf('\n');
      const head = nl === -1 ? chunk : chunk.slice(0, nl);
      const dm = head.match(/^\[(\d{4}-\d{2}-\d{2})\]/);
      const sm = head.match(/·\s*(.+?)\s*$/);
      return {
        date: dm ? dm[1] : '',
        source: sm ? sm[1].trim() : '',
        texte: nl === -1 ? '' : chunk.slice(nl + 1).trim(),
      };
    });
}

function parseJournal(body6: string): JournalEntry[] {
  return [...body6.matchAll(/^-\s*\[(\d{4}-\d{2}-\d{2})\]\s*(.+)$/gm)].map((m) => ({
    date: m[1],
    texte: m[2].trim(),
  }));
}

export function parseSoul(raw: string): Soul {
  const s = String(raw);
  const journal = parseJournal(sectionBody(s, 6));
  return {
    version: `v${journal.length + 1}`,
    quiParle: sectionBody(s, 1),
    audience: sectionBody(s, 2),
    voix: sectionBody(s, 3),
    lignesRouges: sectionBody(s, 4),
    echantillons: parseEchantillons(sectionBody(s, 5)),
    journal,
  };
}

const ECH_PREAMBULE =
  '> Jusqu\'à 3 brèves validées, choisies à la main, verbatim. Elles donnent le ton de la plume : densité, rythme, structure. Curées depuis l\'éditeur SOUL.';

export function serializeEchantillons(entries: Echantillon[]): string {
  const items = (entries || []).slice(0, 3).map((e) => {
    const head = e.source ? `### [${e.date}] · ${e.source}` : `### [${e.date}]`;
    return `${head}\n${String(e.texte || '').trim()}`;
  });
  return [ECH_PREAMBULE, ...items].join('\n\n') + '\n';
}

export function replaceSoulEchantillons(raw: string, entries: Echantillon[]): string {
  const body = serializeEchantillons(entries);
  const parts = String(raw).split(/(^##\s+)/m);
  for (let i = 1; i < parts.length; i += 2) {
    const block = parts[i + 1] || '';
    if (/^5\./.test(block)) {
      const nl = block.indexOf('\n');
      const titleLine = nl === -1 ? block : block.slice(0, nl);
      parts[i + 1] = `${titleLine}\n${body}\n`;
    }
  }
  return parts.join('');
}

export function replaceSoulSections(raw: string, edits: SoulSectionEdits): string {
  const fields: Record<string, string> = {
    1: edits.quiParle,
    2: edits.audience,
    3: edits.voix,
    4: edits.lignesRouges,
  };
  const parts = String(raw).split(/(^##\s+)/m);
  for (let i = 1; i < parts.length; i += 2) {
    const block = parts[i + 1] || '';
    const m = block.match(/^(\d)\./);
    if (m && fields[m[1]] != null) {
      const nl = block.indexOf('\n');
      const titleLine = nl === -1 ? block : block.slice(0, nl);
      parts[i + 1] = `${titleLine}\n${fields[m[1]]}\n\n`;
    }
  }
  return parts.join('');
}
