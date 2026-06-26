import { niveauColor } from '@renderer/components/niveau';
import type { DraftOutput } from '@shared/schemas/outputs';

type Correction = DraftOutput['corrections'][number];

interface CorrectionRowProps {
  correction: Correction;
}

export function CorrectionRow({ correction }: CorrectionRowProps) {
  return (
    <div className="corr-item">
      <span className="corr-dot" style={{ background: niveauColor(correction.niveau) }} />
      <div>
        <div style={{ font: '600 12.5px var(--body)' }}>{correction.titre}</div>
        <div style={{ font: '400 11.5px/1.45 var(--body)', color: 'var(--muted)', marginTop: 1 }}>
          {correction.detail}
        </div>
      </div>
    </div>
  );
}
