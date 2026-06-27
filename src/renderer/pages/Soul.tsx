import { useEffect, useRef } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import type { SoulForm } from '@renderer/store/app.store';
import { EchantillonCard } from '@renderer/components/EchantillonCard';
import { Eyebrow } from '@renderer/components/ui/Eyebrow';
import { Text } from '@renderer/components/ui/Text';
import { Button } from '@renderer/components/ui/Button';
import { Card } from '@renderer/components/ui/Card';

const SOUL_FIELDS: { key: keyof SoulForm; label: string; mono: boolean; minHeight: number }[] = [
  { key: 'quiParle', label: '1 · Qui parle', mono: false, minHeight: 70 },
  { key: 'audience', label: '2 · Audience', mono: false, minHeight: 70 },
  { key: 'voix', label: '3 · Voix & tics', mono: true, minHeight: 110 },
  { key: 'lignesRouges', label: '4 · Lignes rouges', mono: true, minHeight: 90 },
];

export function Soul() {
  const soulForm = useAppStore((s) => s.soulForm);
  const soulVersion = useAppStore((s) => s.soulVersion);
  const soulJournal = useAppStore((s) => s.soulJournal);
  const echantillons = useAppStore((s) => s.echantillons);
  const setSoulField = useAppStore((s) => s.setSoulField);
  const removeEchantillon = useAppStore((s) => s.removeEchantillon);
  const setView = useAppStore((s) => s.setView);
  const showToast = useAppStore((s) => s.showToast);
  const setDashboard = useAppStore((s) => s.setDashboard);

  const loaded = useRef(false);

  // Chargement de la SOUL au montage — sauf retour du sous-flux échantillons (port de echKeepLocal).
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const st = useAppStore.getState();
    if (st.echKeepLocal) {
      st.setEchKeepLocal(false);
      return;
    }
    void window.api.getSoulStructured().then((s) => {
      if (s) useAppStore.getState().loadSoul(s);
      else useAppStore.getState().showToast('SOUL introuvable.');
    });
  }, []);

  async function saveSections(): Promise<void> {
    const f = useAppStore.getState().soulForm;
    const edits = {
      quiParle: f.quiParle.trim(),
      audience: f.audience.trim(),
      voix: f.voix.trim(),
      lignesRouges: f.lignesRouges.trim(),
    };
    if (!edits.quiParle || !edits.audience || !edits.voix || !edits.lignesRouges) {
      showToast('Les 4 sections doivent être remplies.');
      return;
    }
    const r = await window.api.saveSoulSections(edits);
    if (!r.ok) {
      showToast("Échec de l'enregistrement : " + (r.error ?? 'inconnu'));
      return;
    }
    showToast('SOUL enregistrée');
    const d = await window.api.getDashboard();
    setDashboard(d);
  }

  async function saveEchantillons(): Promise<void> {
    const r = await window.api.saveSoulEchantillons(useAppStore.getState().echantillons);
    showToast(r.ok ? 'Échantillons §5 enregistrés' : 'Échec : ' + (r.error ?? 'inconnu'));
  }

  return (
    <section>
      <div className="pad">
        <Text tone="muted" as="p" style={{ font: '400 12.5px/1.5 var(--body)', margin: '0 0 6px' }}>
          La voix de Pierre. Édite les 4 premières sections, puis enregistre.{' '}
          <span style={{ color: 'var(--accent)' }}>{soulVersion}</span>
        </Text>
        {SOUL_FIELDS.map((field) => (
          <div key={field.key}>
            <Eyebrow style={{ margin: '14px 0 5px' }}>
              {field.label}
            </Eyebrow>
            <textarea
              spellCheck={false}
              value={soulForm[field.key]}
              onChange={(e) => setSoulField(field.key, e.target.value)}
              style={{ minHeight: field.minHeight, font: `400 12.5px/1.55 var(--${field.mono ? 'mono' : 'body'})` }}
            />
          </div>
        ))}
        <Button variant="primary" style={{ marginTop: 12 }} onClick={() => void saveSections()}>
          Enregistrer
        </Button>

        <Eyebrow style={{ margin: '22px 0 9px' }}>
          5 · Échantillons vivants{' '}
          <Text tone="faint" style={{ font: '400 10px var(--mono)' }}>
            ({echantillons.length}/3, choisis à la main)
          </Text>
        </Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {echantillons.length === 0 ? (
            <Text tone="faint" as="div">Aucun échantillon. Ajoute jusqu’à 3 brèves depuis tes éditions.</Text>
          ) : (
            echantillons.map((e, i) => <EchantillonCard key={i} echantillon={e} onRemove={() => removeEchantillon(i)} />)
          )}
        </div>
        <div className="row" style={{ marginTop: 9 }}>
          <Button variant="ghost" style={{ flex: 1 }} disabled={echantillons.length >= 3} onClick={() => setView('ech-editions')}>
            + Ajouter depuis une édition
          </Button>
          <Button variant="primary" style={{ flex: 1 }} onClick={() => void saveEchantillons()}>
            Enregistrer §5
          </Button>
        </div>

        <Eyebrow style={{ margin: '22px 0 9px' }}>
          6 · Journal d'évolution
        </Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {soulJournal.length === 0 ? (
            <Text tone="faint" as="div">Aucune leçon enregistrée.</Text>
          ) : (
            soulJournal.map((l, i) => (
              <Card key={i}>
                <div style={{ font: '500 10.5px var(--mono)', color: 'var(--accent)', marginBottom: 5 }}>{l.date}</div>
                <div style={{ font: '400 12.5px/1.5 var(--body)' }}>{l.texte}</div>
              </Card>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
