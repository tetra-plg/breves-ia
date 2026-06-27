import { useEffect, useState } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { dateLong } from '@domain/format';
import { extractBreves } from '@domain/edition';
import type { Breve } from '@domain/edition';
import { BreveCard } from '@renderer/components/BreveCard';
import { Text } from '@renderer/components/ui/Text';

export function EchBreves() {
  const echEdition = useAppStore((s) => s.echEdition);
  const echantillons = useAppStore((s) => s.echantillons);
  const setView = useAppStore((s) => s.setView);

  const [breves, setBreves] = useState<Breve[] | null>(null);

  useEffect(() => {
    if (!echEdition) {
      setView('ech-editions');
      return;
    }
    let alive = true;
    const file = echEdition.file;
    void (async () => {
      const text = file ? await window.api.readEdition(file) : '';
      if (alive) setBreves(extractBreves(text ?? ''));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [echEdition]);

  if (!echEdition) return <div className="pad" />;

  const full = echantillons.length >= 3;

  function add(b: Breve): void {
    const st = useAppStore.getState();
    if (st.echantillons.length >= 3) {
      st.showToast('3 échantillons maximum.');
      return;
    }
    const ed = st.echEdition;
    if (!ed) return;
    st.addEchantillon({ date: ed.date, source: b.source, texte: b.texte });
    st.setEchKeepLocal(true);
    st.setView('soul');
    st.showToast('Échantillon ajouté — pense à « Enregistrer §5 ».');
  }

  return (
    <section>
      <div className="pad">
        <Text tone="faint" as="div" style={{ font: '500 11px var(--mono)', margin: '0 0 12px' }}>
          {dateLong(echEdition.date)}
          {echEdition.title ? ' · ' + echEdition.title : ''}
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {breves === null ? (
            <Text tone="faint" as="div">Chargement…</Text>
          ) : breves.length === 0 ? (
            <Text tone="faint" as="div">Aucune brève détectée dans cette édition.</Text>
          ) : (
            breves.map((b, i) => <BreveCard key={i} texte={b.texte} disabled={full} onAdd={() => add(b)} />)
          )}
        </div>
      </div>
    </section>
  );
}
