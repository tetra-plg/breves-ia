export const VIEWS = [
  'dashboard', 'compose', 'checking', 'editor', 'archived',
  'soul', 'history', 'agents', 'ech-editions', 'ech-breves', 'settings',
] as const;

export const FLOW = ['compose', 'checking', 'editor', 'archived'] as const;

const LABELS = ['Sujets', 'Vérification', 'Rédaction', 'Archivé'];

const ACTIONS: Record<string, string> = {
  goDash: 'dashboard', goCompose: 'compose', goSoul: 'soul', goHist: 'history', goAgents: 'agents',
  launch: 'checking', toEditor: 'editor', validate: 'archived', goSettings: 'settings',
};

export function nextView(current: string, action: string): string {
  return ACTIONS[action] || current;
}

export type StepperStepState = 'todo' | 'active' | 'done';
export interface StepperStep {
  n: string;
  label: string;
  state: StepperStepState;
}
export interface Stepper {
  steps: StepperStep[];
  line: string;
}

export function stepper(view: string): Stepper {
  const i = (FLOW as readonly string[]).indexOf(view);
  if (i === -1) return { steps: [], line: '' };
  const steps: StepperStep[] = LABELS.map((label, k) => ({
    n: String(k + 1),
    label,
    state: k < i ? 'done' : k === i ? 'active' : 'todo',
  }));
  return { steps, line: `${i + 1} / 4 · ${LABELS[i]}` };
}

export function viewTitle(view: string): string {
  if ((FLOW as readonly string[]).includes(view)) return 'Nouvelle édition';
  if (view === 'soul') return 'SOUL — le style';
  if (view === 'history') return 'Historique';
  if (view === 'agents') return 'Agents';
  if (view === 'ech-editions') return 'Choisir une édition';
  if (view === 'ech-breves') return 'Choisir une brève';
  if (view === 'settings') return 'Réglages';
  return 'Brèves IA';
}
