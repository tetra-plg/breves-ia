export const VIEWS = ['dashboard', 'compose', 'checking', 'editor', 'archived', 'soul', 'history', 'agents'];
export const FLOW = ['compose', 'checking', 'editor', 'archived'];
const LABELS = ['Sujets', 'Vérification', 'Rédaction', 'Archivé'];
const ACTIONS = {
  goDash: 'dashboard', goCompose: 'compose', goSoul: 'soul', goHist: 'history', goAgents: 'agents',
  launch: 'checking', toEditor: 'editor', validate: 'archived',
};

export function nextView(current, action) {
  return ACTIONS[action] || current;
}

export function stepper(view) {
  const i = FLOW.indexOf(view);
  if (i === -1) return { steps: [], line: '' };
  const steps = LABELS.map((label, k) => ({
    n: String(k + 1), label,
    state: k < i ? 'done' : (k === i ? 'active' : 'todo'),
  }));
  return { steps, line: `${i + 1} / 4 · ${LABELS[i]}` };
}

export function viewTitle(view) {
  if (FLOW.includes(view)) return 'Nouvelle édition';
  if (view === 'soul') return 'SOUL — le style';
  if (view === 'history') return 'Historique';
  if (view === 'agents') return 'Agents';
  return 'Brèves IA';
}
