import { useState } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import type { VerifyOutput } from '@shared/schemas/outputs';

export function Compose() {
  const [raw, setRaw] = useState('');
  const store = useAppStore();

  const chips = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((l) => (l.length > 22 ? l.slice(0, 20) + '…' : l));

  async function launch(): Promise<void> {
    const sujets = raw.trim();
    if (!sujets) {
      store.showToast('Donne au moins un sujet.');
      return;
    }
    store.resetCards();
    store.setVerifyValue(null);
    store.setView('checking');
    store.beginRun('Vérification en cours');
    const r = await window.api.sendCommand('breves-verify', { sujets });
    store.endRun();
    if (!r.ok) {
      store.showToast('Échec de la vérification : ' + r.error);
      return;
    }
    const value = r.value as VerifyOutput;
    store.setVerifyValue(value);
    store.applyResultCards(value);
  }

  return (
    <section>
      <div className="pad">
        <h1 style={{ font: '600 20px/1.15 var(--display)', margin: '0 0 4px' }}>Sujets en vrac</h1>
        <p className="muted" style={{ font: '400 13px/1.5 var(--body)', margin: '0 0 16px' }}>
          Un sujet par ligne. Pas besoin de dates ni de liens : chaque enquêteur les trouve seul.
        </p>
        <textarea
          spellCheck={false}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={'GLM 5.2, un modèle chinois open source de 753 milliards de paramètres\nMidjourney lance un scanner corporel'}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
          <span style={{ font: '500 11px var(--mono)', color: 'var(--faint)' }}>DÉTECTÉS</span>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {chips.map((c, i) => (
              <span key={i} className="pill">
                {c}
              </span>
            ))}
          </span>
        </div>
        <button
          className="btn-primary"
          style={{ marginTop: 18, fontSize: 15 }}
          disabled={store.runStatus.active}
          onClick={() => void launch()}
        >
          Lancer l'enquête <span style={{ fontSize: 16 }}>→</span>
        </button>
        <p className="faint" style={{ font: '400 12px var(--body)', textAlign: 'center', margin: '10px 0 0' }}>
          Les enquêteurs partiront en parallèle sur le web.
        </p>
      </div>
    </section>
  );
}
