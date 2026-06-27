import type { ArchiveOutput } from '@shared/schemas/outputs';
import { StatusDot } from '@renderer/components/ui/StatusDot';

type Step = ArchiveOutput['archiveSteps'][number];

interface ArchiveStepProps {
  step: Step;
}

export function ArchiveStep({ step }: ArchiveStepProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
      <StatusDot state="done" />
      <span style={{ font: '500 13px var(--body)' }}>{step.t}</span>
      <span style={{ marginLeft: 'auto', font: '400 10.5px var(--mono)', color: 'var(--faint)' }}>{step.d}</span>
    </div>
  );
}
