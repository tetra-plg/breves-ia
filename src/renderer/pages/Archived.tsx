import { useEffect, useRef } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { renderEditionHtml } from '@domain/edition';
import { RunStatus } from '@renderer/components/RunStatus';
import { ArchiveStep } from '@renderer/components/ArchiveStep';
import type { ArchiveOutput } from '@shared/schemas/outputs';
import { Text } from '@renderer/components/ui/Text';
import { Button } from '@renderer/components/ui/Button';

export function Archived() {
  const archiveValue = useAppStore((s) => s.archiveValue);
  const runStatus = useAppStore((s) => s.runStatus);
  const go = useAppStore((s) => s.go);

  // Archivage + ingestion (port de runArchive). Lit le contexte à chaud (getState).
  async function runArchive(): Promise<void> {
    const st = useAppStore.getState();
    const { draftValue, verifyValue } = st;
    if (!draftValue || !verifyValue) return;
    const teamsText = (st.teamsText || '').trim() || draftValue.teamsText;
    const leconSOUL = (st.wantSoulLesson && draftValue.soulLessonProposee) || undefined;
    const inputs: { teamsText: string; topics: unknown[]; sources: unknown[]; leconSOUL?: string } = {
      teamsText,
      topics: verifyValue.topics,
      sources: draftValue.sources,
    };
    if (leconSOUL) inputs.leconSOUL = leconSOUL;
    st.beginRun('Archivage + ingestion en cours');
    const r = await window.api.archive(inputs);
    st.endRun();
    if (!r.ok) {
      st.showToast("Échec de l'archivage : " + r.error);
      st.setView('editor');
      return;
    }
    st.setArchiveValue(r.value as ArchiveOutput);
    if (r.ingest && !r.ingest.ok) {
      st.showToast("Déposé dans raw/, mais l'ingestion a échoué : relance /ingest côté wiki");
    }
    // Rafraîchit le dashboard : la nouvelle édition apparaît dans l'historique sans redémarrage.
    st.setDashboard(await window.api.getDashboard());
  }

  // Au montage : archive si pas encore fait (port du `show('archived')` déclenché par runArchive). Une seule fois.
  const archivedOnce = useRef(false);
  useEffect(() => {
    if (archivedOnce.current) return;
    const st = useAppStore.getState();
    if (st.archiveValue) return;
    if (!st.draftValue || !st.verifyValue) return;
    archivedOnce.current = true;
    void runArchive();
  }, []);

  async function copyNewsletter(): Promise<void> {
    await window.api.copy(archiveValue?.newsletterText || '');
    useAppStore.getState().showToast('Brèves copiées : prêtes à coller dans Teams');
  }

  return (
    <section>
      <div className="pad" style={{ textAlign: 'center' }}>
        <div style={{ textAlign: 'left' }}>
          <RunStatus status={runStatus} />
        </div>
        {archiveValue && !runStatus.active && (
          <>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--goodSoft)',
                color: 'var(--good)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                margin: '6px auto 16px',
              }}
            >
              ✓
            </div>
            <h1 style={{ font: '600 21px/1.2 var(--display)', margin: '0 0 5px' }}>Validée et archivée</h1>
            <Text tone="muted" as="p" style={{ font: '400 13px var(--body)', margin: '0 0 20px' }}>
              Tout est rangé et relié dans ton wiki personnel.
            </Text>
            <div className="card" style={{ padding: 0, textAlign: 'left', overflow: 'hidden' }}>
              <div>
                {(archiveValue.archiveSteps ?? []).map((s, i) => (
                  <ArchiveStep key={i} step={s} />
                ))}
              </div>
            </div>
            <Button variant="primary" style={{ marginTop: 18 }} onClick={() => void copyNewsletter()}>
              Copier les brèves (prêt à coller)
            </Button>
            <div style={{ marginTop: 16, textAlign: 'left' }}>
              <div style={{ font: '500 11px var(--mono)', color: 'var(--muted)', marginBottom: 9 }}>prêt-à-coller · Teams</div>
              <div
                style={{ maxHeight: 300, overflow: 'auto' }}
                dangerouslySetInnerHTML={{ __html: renderEditionHtml(archiveValue.newsletterText || '') }}
              />
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => go('goHist')}>
                Historique
              </Button>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => go('goCompose')}>
                Nouvelle édition
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
