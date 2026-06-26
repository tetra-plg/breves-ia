import { useEffect } from 'react';
import type { ComponentType } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { Shell } from '@renderer/layouts/Shell';
import { Dashboard } from '@renderer/pages/Dashboard';
import { Compose } from '@renderer/pages/Compose';

// Registry des vues. Les vues non encore portées tombent sur Placeholder (Phases 3b-2/3/4).
const VIEWS: Record<string, ComponentType> = {
  dashboard: Dashboard,
  compose: Compose,
};

function Placeholder() {
  const view = useAppStore((s) => s.view);
  return (
    <div className="pad">
      <p className="muted">Vue « {view} » — à venir.</p>
    </div>
  );
}

export function App() {
  const view = useAppStore((s) => s.view);
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const Page = VIEWS[view] ?? Placeholder;
  return (
    <Shell>
      <Page />
    </Shell>
  );
}
