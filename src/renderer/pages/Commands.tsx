import { useEffect, useState } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { CommandCard } from '@renderer/components/CommandCard';
import type { Command, CommandEdits } from '@domain/commands';
import { Text } from '@renderer/components/ui/Text';

export function Commands() {
  const showToast = useAppStore((s) => s.showToast);
  const [commands, setCommands] = useState<Command[] | null>(null);

  useEffect(() => {
    let alive = true;
    void window.api.getCommands().then((c) => {
      if (alive) setCommands(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function save(name: string, edits: CommandEdits): Promise<void> {
    const r = await window.api.saveCommand(name, edits);
    showToast(r.ok ? `Commande « ${name} » enregistrée` : 'Échec : ' + (r.error ?? 'inconnu'));
  }

  return (
    <section>
      <div className="pad">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {commands === null ? (
            <Text tone="faint" as="div">Chargement…</Text>
          ) : commands.length === 0 ? (
            <Text tone="faint" as="div">Aucune commande dans .claude/commands/.</Text>
          ) : (
            commands.map((c) => <CommandCard key={c.name} command={c} onSave={(edits) => void save(c.name, edits)} />)
          )}
        </div>
      </div>
    </section>
  );
}
