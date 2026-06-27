// Couleurs/libellés par niveau d'alerte — partagés (EnqCard, Drawer, CorrectionRow).
// Identiques aux helpers du renderer vanilla (parité look).
export const niveauColor = (n: string): string =>
  n === 'corrigé' ? 'var(--warn)' : n === 'nuance' ? 'var(--nuance)' : 'var(--accent)';
export const niveauSoft = (n: string): string =>
  n === 'corrigé' ? 'var(--warnSoft)' : n === 'nuance' ? 'var(--nuanceSoft)' : 'var(--accentSoft)';
export const niveauLabel = (n: string): string =>
  n === 'corrigé' ? 'Fait corrigé' : n === 'nuance' ? 'Nuance' : 'Date';
export const niveauTone = (n: string): 'accent' | 'warn' | 'nuance' =>
  n === 'corrigé' ? 'warn' : n === 'nuance' ? 'nuance' : 'accent';
