import s from './Stepper.module.css';

interface Step { n: number | string; state: 'done' | 'active' | 'todo'; }
interface StepperProps { steps: Step[]; line: string; }

export function Stepper({ steps, line }: StepperProps) {
  return (
    <div className={s.stepper}>
      <div className={s.steps}>
        {steps.map((step, i) => (
          <span key={String(step.n)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className={`${s.step} ${step.state === 'done' ? s.done : step.state === 'active' ? s.active : ''}`}>
              {step.state === 'done' ? '✓' : step.n}
            </span>
            {i < steps.length - 1 && <span className={s.bar} />}
          </span>
        ))}
      </div>
      <span className={s.line}>{line}</span>
    </div>
  );
}
