import { type ReactNode } from 'react';
import { viewTitle, stepper } from '@domain/navigation';
import { useAppStore } from '@renderer/store/app.store';
import { Toast } from '@renderer/components/Toast';
import { Button } from '@renderer/components/ui/Button';
import { Stepper } from '@renderer/components/ui/Stepper';

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
          <Button variant="icon" title="Retour" onClick={back}>
            ←
          </Button>
        )}
        {isDash && <span className="diamond" />}
        <div className="h-titles">
          <div className="h-title">{viewTitle(view)}</div>
          {isDash && <div className="h-sub">rédacteur en chef · /breves-ia</div>}
        </div>
        <Button variant="icon" title="SOUL — le style" onClick={() => go('goSoul')}>
          ✦
        </Button>
        <Button variant="icon" title="Historique" onClick={() => go('goHist')}>
          ⏱
        </Button>
        <Button variant="icon" title="Agents" onClick={() => go('goAgents')}>
          ⚙
        </Button>
        <Button variant="icon" title="Thème" onClick={() => toggleTheme()}>
          ◑
        </Button>
      </div>

      {st.steps.length > 0 && <Stepper steps={st.steps} line={st.line} />}

      <div className="content">{children}</div>

      <Toast message={toast} />
    </div>
  );
}
