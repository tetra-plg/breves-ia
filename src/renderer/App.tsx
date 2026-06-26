import { useEffect } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { Shell } from '@renderer/layouts/Shell';
import { Dashboard } from '@renderer/pages/Dashboard';

export function App() {
  const view = useAppStore((s) => s.view);
  const theme = useAppStore((s) => s.theme);

  // Applique le thème sur <body> (parité avec body.dark du CSS).
  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return <Shell>{view === 'dashboard' ? <Dashboard /> : <Placeholder view={view} />}</Shell>;
}

// Les autres vues arrivent en Phase 3b.
function Placeholder({ view }: { view: string }) {
  return (
    <div className="pad">
      <p className="muted">Vue « {view} » — à venir en Phase 3b.</p>
    </div>
  );
}
