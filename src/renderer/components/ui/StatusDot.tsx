import s from './StatusDot.module.css';

type State = 'done' | 'active' | 'todo' | 'error';
interface StatusDotProps { state: State; }

export function StatusDot({ state }: StatusDotProps) {
  const glyph = state === 'done' ? '✓' : state === 'error' ? '✕' : null;
  return <span className={`${s.root} ${s[state]}`} data-state={state} aria-hidden="true">{glyph}</span>;
}
