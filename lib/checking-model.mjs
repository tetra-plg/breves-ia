export const STEPS = ['recherche', 'faits', 'date', 'source', 'article'];

export function initCard(key, title) {
  return {
    key, title, status: 'en cours', done: false, error: null, source: null, alerte: null,
    steps: STEPS.map((name, i) => ({ name, state: i === 0 ? 'active' : 'todo' })),
  };
}

function mapCard(cards, key, fn) {
  return cards.map((c) => (c.key === key ? fn({ ...c, steps: c.steps.map((s) => ({ ...s })) }) : c));
}

function allDone(card) {
  card.steps.forEach((s) => { s.state = 'done'; });
  card.done = true;
  return card;
}

export function applyEvent(cards, ev) {
  if (ev.type === 'topic-detected') {
    if (cards.some((c) => c.key === ev.key)) return cards;
    return [...cards, initCard(ev.key, ev.sujet)];
  }
  if (ev.type === 'topic-progress') {
    return mapCard(cards, ev.key, (c) => {
      const i = STEPS.indexOf(ev.step);
      if (i >= 0) {
        c.steps[i].state = 'done';
        if (i + 1 < c.steps.length && c.steps[i + 1].state === 'todo') c.steps[i + 1].state = 'active';
      }
      return c;
    });
  }
  if (ev.type === 'topic-done') {
    return mapCard(cards, ev.key, (c) => { allDone(c); c.status = 'Terminé'; return c; });
  }
  if (ev.type === 'topic-error') {
    return mapCard(cards, ev.key, (c) => { c.done = true; c.status = 'Erreur'; c.error = ev.error; return c; });
  }
  return cards;
}

export function applyResult(cards, value) {
  let out = cards;
  for (const t of (value?.topics || [])) {
    if (!out.some((c) => c.key === t.key)) out = [...out, initCard(t.key, t.sujet || t.key)];
    out = mapCard(out, t.key, (c) => {
      if (!c.error) allDone(c);
      c.status = c.error ? c.status : 'Terminé';
      c.source = t.source ?? c.source;
      c.alerte = t.alerte ?? c.alerte;
      return c;
    });
  }
  return out;
}

export function summary(cards) {
  let verifies = 0, corriges = 0, nuances = 0;
  for (const c of cards) {
    if (c.done && !c.error) verifies++;
    if (c.alerte?.niveau === 'corrigé') corriges++;
    if (c.alerte?.niveau === 'nuance') nuances++;
  }
  return { verifies, corriges, nuances };
}
