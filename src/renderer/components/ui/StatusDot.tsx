import s from './StatusDot.module.css';

type State = 'done' | 'active' | 'todo';
interface StatusDotProps { state: State; }

export function StatusDot({ state }: StatusDotProps) {
  return <span className={`${s.root} ${s[state]}`} data-state={state} aria-hidden="true">{state === 'done' ? '✓' : null}</span>;
}
