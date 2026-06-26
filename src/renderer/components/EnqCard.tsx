import type { Card } from '@domain/checking';
import { niveauColor, niveauSoft, niveauLabel } from '@renderer/components/niveau';

interface EnqCardProps {
  card: Card;
  onOpen?: (key: string) => void;
}

export function EnqCard({ card, onOpen }: EnqCardProps) {
  const statusColor = card.error ? 'var(--warn)' : card.done ? 'var(--good)' : 'var(--accent)';
  return (
    <div className="enq" onClick={onOpen ? () => onOpen(card.key) : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: statusColor,
            animation: card.done ? undefined : 'pulse 1.1s ease-in-out infinite',
          }}
        />
        <span className="eyebrow">Enquêteur</span>
        <span style={{ marginLeft: 'auto', font: '500 10.5px var(--mono)', color: statusColor }}>
          {card.status}
        </span>
      </div>
      <div style={{ font: '600 13.5px/1.3 var(--display)', marginBottom: 12 }}>{card.title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {card.steps.map((s) => (
          <div key={s.name} className="enq-step">
            <span className={s.state === 'done' ? 'dot done' : s.state === 'active' ? 'dot active' : 'dot todo'}>
              {s.state === 'done' ? '✓' : ''}
            </span>
            <span style={{ color: s.state === 'todo' ? 'var(--faint)' : 'var(--text)' }}>
              {s.name.charAt(0).toUpperCase() + s.name.slice(1)}
            </span>
          </div>
        ))}
      </div>
      {card.done && !card.error && (
        <div style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="badge-good">Source</span>
            <span style={{ font: '500 11px var(--mono)', color: 'var(--muted)' }}>{card.source ?? ''}</span>
          </div>
          {card.alerte && (
            <div className="alert" style={{ background: niveauSoft(card.alerte.niveau) }}>
              <span
                style={{
                  font: '600 10px var(--body)',
                  color: niveauColor(card.alerte.niveau),
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                }}
              >
                {niveauLabel(card.alerte.niveau)}
              </span>
              <span style={{ font: '400 11.5px/1.4 var(--body)', color: 'var(--text)' }}>{card.alerte.texte}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
