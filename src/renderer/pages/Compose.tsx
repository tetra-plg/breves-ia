import { useState } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import type { VerifyOutput } from '@shared/schemas/outputs';
import { Text } from '@renderer/components/ui/Text';
import { Pill } from '@renderer/components/ui/Pill';
import { Button } from '@renderer/components/ui/Button';
import { Textarea } from '@renderer/components/ui/Textarea';

export function Compose() {
  const [raw, setRaw] = useState('');
  const showToast = useAppStore((s) => s.showToast);
  const resetCards = useAppStore((s) => s.resetCards);
  const setVerifyValue = useAppStore((s) => s.setVerifyValue);
  const setDraftValue = useAppStore((s) => s.setDraftValue);
  const setArchiveValue = useAppStore((s) => s.setArchiveValue);
  const setView = useAppStore((s) => s.setView);
  const beginRun = useAppStore((s) => s.beginRun);
  const endRun = useAppStore((s) => s.endRun);
  const applyResultCards = useAppStore((s) => s.applyResultCards);
  const runActive = useAppStore((s) => s.runStatus.active);

  const chips = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((l) => (l.length > 22 ? l.slice(0, 20) + '…' : l));

  async function launch(): Promise<void> {
    const sujets = raw.trim();
    if (!sujets) {
      showToast('Donne au moins un sujet.');
      return;
    }
    resetCards();
    setVerifyValue(null);
    setDraftValue(null);
    setArchiveValue(null);
    setView('checking');
    beginRun('Vérification en cours');
    const r = await window.api.sendCommand('breves-verify', { sujets });
    endRun();
    if (!r.ok) {
      showToast('Échec de la vérification : ' + r.error);
      return;
    }
    const value = r.value as VerifyOutput;
    setVerifyValue(value);
    applyResultCards(value);
  }

  return (
    <section>
      <div className="pad">
        <h1 style={{ font: '600 20px/1.15 var(--display)', margin: '0 0 4px' }}>Sujets en vrac</h1>
        <Text tone="muted" as="p" style={{ font: '400 13px/1.5 var(--body)', margin: '0 0 16px' }}>
          Un sujet par ligne. Pas besoin de dates ni de liens : chaque enquêteur les trouve seul.
        </Text>
        <Textarea
          spellCheck={false}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={'GLM 5.2, un modèle chinois open source de 753 milliards de paramètres\nMidjourney lance un scanner corporel'}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
          <span style={{ font: '500 11px var(--mono)', color: 'var(--faint)' }}>DÉTECTÉS</span>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {chips.map((c, i) => (
              <Pill key={i}>
                {c}
              </Pill>
            ))}
          </span>
        </div>
        <Button
          variant="primary"
          style={{ marginTop: 18, fontSize: 15 }}
          disabled={runActive}
          onClick={() => void launch()}
        >
          Lancer l'enquête <span style={{ fontSize: 16 }}>→</span>
        </Button>
        <Text tone="faint" as="p" style={{ font: '400 12px var(--body)', textAlign: 'center', margin: '10px 0 0' }}>
          Les enquêteurs partiront en parallèle sur le web.
        </Text>
      </div>
    </section>
  );
}
