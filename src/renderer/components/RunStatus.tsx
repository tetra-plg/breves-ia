import type { RunStatus as RunStatusModel } from '@renderer/store/app.store';

interface RunStatusProps {
  status: RunStatusModel;
}

export function RunStatus({ status }: RunStatusProps) {
  if (!status.active) return null;
  return (
    <div
      className="card"
      style={{
        margin: '0 0 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        background: 'var(--accentSoft)',
        borderColor: 'var(--accent)',
      }}
    >
      <span className="spinner" aria-hidden="true" />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ font: '600 12.5px var(--display)' }}>
          {status.title} · {status.clock}
        </div>
        <div
          style={{
            font: '400 11.5px var(--body)',
            color: 'var(--muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {status.activity}
        </div>
      </div>
    </div>
  );
}
