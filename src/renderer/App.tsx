import { useEffect } from 'react';
import type { ComponentType } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { Shell } from '@renderer/layouts/Shell';
import { Dashboard } from '@renderer/pages/Dashboard';
import { Compose } from '@renderer/pages/Compose';
import { Checking } from '@renderer/pages/Checking';
import { Detail } from '@renderer/pages/Detail';
import { Editor } from '@renderer/pages/Editor';
import { Archived } from '@renderer/pages/Archived';
import { Soul } from '@renderer/pages/Soul';
import { EchEditions } from '@renderer/pages/EchEditions';
import { EchBreves } from '@renderer/pages/EchBreves';
import { Agents } from '@renderer/pages/Agents';
import { History } from '@renderer/pages/History';
import { Reader } from '@renderer/pages/Reader';
import { useCommandStream } from '@renderer/hooks/useCommandStream';

// Registry des vues. Les vues non encore portées tombent sur Placeholder (Phases 3b-2/3/4).
const VIEWS: Record<string, ComponentType> = {
  dashboard: Dashboard,
  compose: Compose,
  checking: Checking,
  detail: Detail,
  editor: Editor,
  archived: Archived,
  soul: Soul,
  'ech-editions': EchEditions,
  'ech-breves': EchBreves,
  agents: Agents,
  history: History,
  reader: Reader,
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
  const runActive = useAppStore((s) => s.runStatus.active);
  const tickClock = useAppStore((s) => s.tickClock);

  useCommandStream();

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (!runActive) return;
    const id = setInterval(() => tickClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, [runActive, tickClock]);

  const Page = VIEWS[view] ?? Placeholder;
  return (
    <Shell>
      <Page />
    </Shell>
  );
}
