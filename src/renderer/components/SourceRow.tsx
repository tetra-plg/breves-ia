import type { DraftOutput } from '@shared/schemas/outputs';
import { StatusDot } from '@renderer/components/ui/StatusDot';

type Source = DraftOutput['sources'][number];

interface SourceRowProps {
  source: Source;
}

export function SourceRow({ source }: SourceRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
      <StatusDot state="done" />
      <div style={{ minWidth: 0 }}>
        <div style={{ font: '600 12.5px var(--body)' }}>
          {source.name}
          {source.repli && <span style={{ color: 'var(--nuance)' }}> (repli)</span>}
        </div>
        <div
          style={{
            font: '400 10.5px var(--mono)',
            color: 'var(--accent)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {source.url_citee}
        </div>
      </div>
    </div>
  );
}
