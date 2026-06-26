import { useAppStore } from '@renderer/store/app.store';
import { summary } from '@domain/checking';
import { EnqCard } from '@renderer/components/EnqCard';
import { RunStatus } from '@renderer/components/RunStatus';

export function Checking() {
  const cards = useAppStore((s) => s.cards);
  const verifyValue = useAppStore((s) => s.verifyValue);
  const runStatus = useAppStore((s) => s.runStatus);
  const go = useAppStore((s) => s.go);
  const setView = useAppStore((s) => s.setView);
  const setDrawerKey = useAppStore((s) => s.setDrawerKey);
  const setReturnTo = useAppStore((s) => s.setReturnTo);

  const done = !runStatus.active && cards.length > 0 && !!verifyValue;
  const sum = done ? summary(cards) : null;
  const openDrawer = verifyValue
    ? (key: string): void => {
        setReturnTo('checking');
        setDrawerKey(key);
        setView('detail');
      }
    : undefined;

  return (
    <section>
      <div className="pad">
        <p className="muted" style={{ font: '400 12.5px/1.5 var(--body)', margin: '0 0 16px' }}>
          Chacun vérifie les faits, la date, la source et l'article. <b style={{ color: 'var(--text)' }}>Il n'invente jamais</b> :
          un fait non confirmé est signalé.
        </p>
        <RunStatus status={runStatus} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cards.map((c) => (
            <EnqCard key={c.key} card={c} onOpen={openDrawer} />
          ))}
        </div>
        {sum && (
          <div className="card" style={{ marginTop: 16, background: 'var(--accentSoft)', borderColor: 'var(--accent)' }}>
            <div style={{ font: '600 14px var(--display)' }}>
              {sum.verifies} vérifiés · {sum.corriges} corrigés · {sum.nuances} nuancés
            </div>
            <div className="muted" style={{ font: '400 12px var(--body)', margin: '2px 0 12px' }}>
              Tout est sourcé. On passe à la rédaction.
            </div>
            <button className="btn-primary" onClick={() => go('toEditor')}>
              Rédiger les brèves →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
