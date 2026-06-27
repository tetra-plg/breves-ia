import { useAppStore } from '@renderer/store/app.store';
import { HistoryRow } from '@renderer/components/HistoryRow';
import { Text } from '@renderer/components/ui/Text';

export function History() {
  const editions = useAppStore((s) => s.dashboard?.editions ?? []);
  const openReader = useAppStore((s) => s.openReader);

  return (
    <section>
      <div className="pad">
        <Text tone="muted" as="p" style={{ font: '400 12.5px/1.5 var(--body)', margin: '0 0 16px' }}>
          Chaque édition validée est archivée et intégrée au wiki personnel (llm-wiki).
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {editions.length === 0 ? (
            <Text tone="faint" as="div">Aucune édition archivée.</Text>
          ) : (
            editions.map((e) => <HistoryRow key={e.file} edition={e} onOpen={(ed) => openReader(ed, 'history')} />)
          )}
        </div>
      </div>
    </section>
  );
}
