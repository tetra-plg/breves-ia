import { useEffect, useState } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { renderEditionHtml } from '@domain/edition';
import { dateLong } from '@domain/format';

export function Reader() {
  const readerEdition = useAppStore((s) => s.readerEdition);
  const readerText = useAppStore((s) => s.readerText);
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);

  // Chargement du texte au montage (garde `alive`, port de openReader). Recharge si l'édition change.
  useEffect(() => {
    const ed = useAppStore.getState().readerEdition;
    if (!ed) {
      useAppStore.getState().setView('history');
      return;
    }
    let alive = true;
    void window.api.readEdition(ed.file).then((t) => {
      if (!alive) return;
      useAppStore.getState().setReaderText(t ?? '');
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [readerEdition]);

  if (!readerEdition) return <div className="pad" />;

  const sub = `${dateLong(readerEdition.date)}${readerEdition.title ? ' · ' + readerEdition.title : ''} · ${readerEdition.count} brèves · archivée`;

  async function copy(): Promise<void> {
    await window.api.copy(useAppStore.getState().readerText);
    showToast('Brèves copiées');
  }

  return (
    <section>
      <div className="pad">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span className="faint" style={{ font: '500 10px var(--mono)' }}>{sub}</span>
          <button className="btn-ghost" style={{ marginLeft: 'auto', padding: '7px 13px' }} onClick={() => void copy()}>
            Copier
          </button>
        </div>
        {loading ? (
          <div className="faint">Chargement…</div>
        ) : readerText ? (
          <div dangerouslySetInnerHTML={{ __html: renderEditionHtml(readerText) }} />
        ) : (
          <div className="faint">Texte introuvable dans le wiki (raw/notes/{readerEdition.file}).</div>
        )}
      </div>
    </section>
  );
}
