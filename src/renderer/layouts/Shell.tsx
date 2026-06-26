import { Fragment, type ReactNode } from 'react';
import { viewTitle, stepper } from '@domain/navigation';
import { useAppStore } from '@renderer/store/app.store';
import { Toast } from '@renderer/components/Toast';

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const view = useAppStore((s) => s.view);
  const toast = useAppStore((s) => s.toast);
  const go = useAppStore((s) => s.go);
  const setView = useAppStore((s) => s.setView);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const returnTo = useAppStore((s) => s.returnTo);
  const setEchKeepLocal = useAppStore((s) => s.setEchKeepLocal);

  const isDash = view === 'dashboard';
  const st = stepper(view);
  // Retour : detail/reader → vue d'origine ; sous-flux échantillons → écran précédent ; sinon dashboard.
  const back = (): void => {
    if (view === 'detail' || view === 'reader') {
      setView(returnTo ?? 'dashboard');
    } else if (view === 'ech-breves') {
      setView('ech-editions');
    } else if (view === 'ech-editions') {
      setEchKeepLocal(true);
      setView('soul');
    } else {
      setView('dashboard');
    }
  };

  return (
    <div className="win">
      <div className="head">
        {!isDash && (
          <button className="iconbtn" title="Retour" onClick={back}>
            ←
          </button>
        )}
        {isDash && <span className="diamond" />}
        <div className="h-titles">
          <div className="h-title">{viewTitle(view)}</div>
          {isDash && <div className="h-sub">rédacteur en chef · /breves-ia</div>}
        </div>
        <button className="iconbtn" title="SOUL — le style" onClick={() => go('goSoul')}>
          ✦
        </button>
        <button className="iconbtn" title="Historique" onClick={() => go('goHist')}>
          ⏱
        </button>
        <button className="iconbtn" title="Agents" onClick={() => go('goAgents')}>
          ⚙
        </button>
        <button className="iconbtn" title="Thème" onClick={() => toggleTheme()}>
          ◑
        </button>
      </div>

      {st.steps.length > 0 && (
        <div className="stepper">
          <div className="steps">
            {st.steps.map((s, i) => (
              <Fragment key={i}>
                <span className={`step ${s.state}`}>{s.state === 'done' ? '✓' : s.n}</span>
                {i < st.steps.length - 1 && <span className="step-bar" />}
              </Fragment>
            ))}
          </div>
          <span className="step-line">{st.line}</span>
        </div>
      )}

      <div className="content">{children}</div>

      <Toast message={toast} />
    </div>
  );
}
