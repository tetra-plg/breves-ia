import { dateLong } from '@domain/format';
import type { EditionSummary } from '@main/engine';

interface HistoryRowProps {
  edition: EditionSummary;
  onOpen: (edition: EditionSummary) => void;
}

export function HistoryRow({ edition, onOpen }: HistoryRowProps) {
  return (
    <button className="card" style={{ display: 'block', width: '100%', textAlign: 'left' }} onClick={() => onOpen(edition)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
        <span style={{ font: '600 14px var(--display)' }}>{dateLong(edition.date)}</span>
        {edition.title && (
          <span style={{ font: '500 11px var(--body)', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {edition.title}
          </span>
        )}
        <span style={{ marginLeft: 'auto', font: '500 10px var(--body)', color: 'var(--accent)' }}>Lire ›</span>
      </div>
      <div style={{ display: 'flex', gap: 16, font: '400 12px var(--body)', color: 'var(--muted)' }}>
        <span>
          <b style={{ color: 'var(--text)' }}>{edition.count}</b> brèves
        </span>
        <span>
          <b style={{ color: 'var(--warn)' }}>{edition.corr}</b> corrections
        </span>
      </div>
    </button>
  );
}
