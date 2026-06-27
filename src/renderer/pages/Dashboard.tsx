import { useEffect } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { EditionRow } from '@renderer/components/EditionRow';
import { dateLong } from '@domain/format';
import type { EditionSummary } from '@main/engine';

export function Dashboard() {
  const dashboard = useAppStore((s) => s.dashboard);
  const setDashboard = useAppStore((s) => s.setDashboard);
  const go = useAppStore((s) => s.go);
  const openReader = useAppStore((s) => s.openReader);

  useEffect(() => {
    void window.api.getDashboard().then(setDashboard);
  }, [setDashboard]);

  const editions = dashboard?.editions ?? [];
  const last = editions[0];
  const today = dateLong(new Date().toISOString().slice(0, 10));
  const onOpen: (edition: EditionSummary) => void = (edition) => openReader(edition, 'dashboard');

  return (
    <section>
      <div className="pad">
        <div className="eyebrow">{today}</div>
        <h1 className="hello">Bonjour Pierre.</h1>
        <p className="muted" style={{ margin: '0 0 18px' }}>
          Prêt à compiler les prochaines brèves IA ?
        </p>

        <button className="cta" style={{ marginBottom: 18 }} onClick={() => go('goCompose')}>
          <span className="plus">+</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', font: '600 16px var(--display)' }}>Nouvelle édition</span>
            <span
              style={{
                display: 'block',
                font: '400 12.5px var(--body)',
                color: 'var(--muted)',
                marginTop: 1,
              }}
            >
              Jette tes sujets en vrac.
            </span>
          </span>
          <span style={{ fontSize: 18, color: 'var(--accent)' }}>→</span>
        </button>

        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div className="eyebrow" style={{ fontSize: 10 }}>
              Dernière édition
            </div>
            <span style={{ marginLeft: 'auto', font: '500 11px var(--mono)', color: 'var(--text)' }}>
              {last ? dateLong(last.date) : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, font: '400 12.5px var(--body)', color: 'var(--muted)' }}>
            <span>
              <b style={{ color: 'var(--text)' }}>{last ? last.count : 0}</b> brèves
            </span>
            <span>
              <b style={{ color: 'var(--warn)' }}>{last ? last.corr : 0}</b> corrigé
            </span>
            <span>
              <b style={{ color: 'var(--text)' }}>{last ? last.count : 0}</b> sources
            </span>
          </div>
        </div>

        <div className="eyebrow" style={{ margin: '0 0 9px' }}>
          Éditions récentes
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {editions.length === 0 && <div className="faint">Aucune édition archivée pour l'instant.</div>}
          {editions.slice(0, 4).map((e) => (
            <EditionRow key={e.file} edition={e} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </section>
  );
}
