// Corps (trim) de la section "## N. …", sans la ligne de titre. '' si absente.
function sectionBody(raw, n) {
  for (const part of String(raw).split(/^##\s+/m)) {
    if (new RegExp(`^${n}\\.`).test(part)) {
      const nl = part.indexOf('\n');
      return nl === -1 ? '' : part.slice(nl + 1).trim();
    }
  }
  return '';
}

function parseEchantillons(body5) {
  return body5.split(/^###\s+/m).slice(1).map((chunk) => {
    const head = chunk.slice(0, chunk.indexOf('\n') === -1 ? undefined : chunk.indexOf('\n'));
    const m = head.match(/^\[(\d{4}-\d{2}-\d{2})\][^\n]*seed:\s*(\w+)[^\n]*épinglé:\s*(\S+)/);
    const nl = chunk.indexOf('\n');
    return {
      date: m ? m[1] : '',
      seed: m ? m[2] === 'true' : false,
      epingle: m ? /^oui/i.test(m[3]) : false,
      texte: nl === -1 ? '' : chunk.slice(nl + 1).trim(),
    };
  });
}

function parseJournal(body6) {
  return [...body6.matchAll(/^-\s*\[(\d{4}-\d{2}-\d{2})\]\s*(.+)$/gm)]
    .map((m) => ({ date: m[1], texte: m[2].trim() }));
}

export function parseSoul(raw) {
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

export function replaceSoulSections(raw, { quiParle, audience, voix, lignesRouges }) {
  const fields = { 1: quiParle, 2: audience, 3: voix, 4: lignesRouges };
  // Split en gardant les délimiteurs '## ' : [préambule, '## ', 'N. Titre\ncorps…', '## ', …]
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
