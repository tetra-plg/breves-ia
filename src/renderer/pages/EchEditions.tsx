import { useAppStore } from '@renderer/store/app.store';
import { dateLong } from '@domain/format';
import type { EditionSummary } from '@main/engine';

export function EchEditions() {
  const editions = useAppStore((s) => s.dashboard?.editions ?? []);
  const setEchEdition = useAppStore((s) => s.setEchEdition);
  const setView = useAppStore((s) => s.setView);

  function pick(ed: EditionSummary): void {
    setEchEdition(ed);
    setView('ech-breves');
  }

  return (
    <section>
      <div className="pad">
        <p className="muted" style={{ font: '400 12.5px/1.5 var(--body)', margin: '0 0 14px' }}>
          Choisis l'édition d'où provient la brève à promouvoir en échantillon de style (§5).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {editions.length === 0 ? (
            <div className="faint">Aucune édition archivée.</div>
          ) : (
            editions.map((ed) => (
              <button key={ed.file} className="card" style={{ display: 'block', width: '100%', textAlign: 'left' }} onClick={() => pick(ed)}>
                <div style={{ font: '600 13px var(--display)' }}>{dateLong(ed.date)}</div>
                {ed.title && (
                  <div style={{ font: '400 11.5px var(--body)', color: 'var(--muted)', marginTop: 2 }}>{ed.title}</div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
