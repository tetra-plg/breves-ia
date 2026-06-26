import { useEffect, useState } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { AgentCard } from '@renderer/components/AgentCard';
import type { Agent } from '@domain/agents';
import type { AgentEdits } from '@main/engine';

export function Agents() {
  const showToast = useAppStore((s) => s.showToast);
  const [agents, setAgents] = useState<Agent[] | null>(null);

  useEffect(() => {
    let alive = true;
    void window.api.getAgents().then((a) => {
      if (alive) setAgents(a);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function save(name: string, edits: AgentEdits): Promise<void> {
    const r = await window.api.saveAgent(name, edits);
    showToast(r.ok ? `Agent « ${name} » enregistré` : 'Échec : ' + (r.error ?? 'inconnu'));
  }

  return (
    <section>
      <div className="pad">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {agents === null ? (
            <div className="faint">Chargement…</div>
          ) : agents.length === 0 ? (
            <div className="faint">Aucun agent dans .claude/agents/.</div>
          ) : (
            agents.map((a) => <AgentCard key={a.name} agent={a} onSave={(edits) => void save(a.name, edits)} />)
          )}
        </div>
      </div>
    </section>
  );
}
