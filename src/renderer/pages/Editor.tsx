import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { renderEditionHtml } from '@domain/edition';
import { RunStatus } from '@renderer/components/RunStatus';
import { CorrectionRow } from '@renderer/components/CorrectionRow';
import { SourceRow } from '@renderer/components/SourceRow';
import { CorrectModal } from '@renderer/components/CorrectModal';
import type { DraftOutput } from '@shared/schemas/outputs';
import { Eyebrow } from '@renderer/components/ui/Eyebrow';

export function Editor() {
  const draftValue = useAppStore((s) => s.draftValue);
  const teamsText = useAppStore((s) => s.teamsText);
  const editorMode = useAppStore((s) => s.editorMode);
  const wantSoulLesson = useAppStore((s) => s.wantSoulLesson);
  const runStatus = useAppStore((s) => s.runStatus);
  const setDraftValue = useAppStore((s) => s.setDraftValue);
  const setTeamsText = useAppStore((s) => s.setTeamsText);
  const setEditorMode = useAppStore((s) => s.setEditorMode);
  const setWantSoulLesson = useAppStore((s) => s.setWantSoulLesson);
  const setView = useAppStore((s) => s.setView);
  const showToast = useAppStore((s) => s.showToast);
  const beginRun = useAppStore((s) => s.beginRun);
  const endRun = useAppStore((s) => s.endRun);

  const [correctOpen, setCorrectOpen] = useState(false);

  // Rédaction (port de runDraft). Lit verifyValue à chaud (getState) pour éviter les closures périmées.
  async function runDraft(feedback?: string): Promise<void> {
    const verifyValue = useAppStore.getState().verifyValue;
    if (!verifyValue) return;
    const inputs: { topics: unknown[]; feedback?: string } = { topics: verifyValue.topics };
    if (feedback) inputs.feedback = feedback;
    beginRun('Rédaction en cours');
    const r = await window.api.sendCommand('breves-draft', inputs);
    endRun();
    if (!r.ok) {
      showToast('Échec de la rédaction : ' + r.error);
      return;
    }
    const value = r.value as DraftOutput;
    setDraftValue(value);
    setTeamsText(value.teamsText || '');
    setEditorMode('preview');
  }

  // Au montage : rédige si pas encore de brouillon (port de `go('toEditor'); runDraft()`). Une seule fois.
  const drafted = useRef(false);
  useEffect(() => {
    if (drafted.current) return;
    if (useAppStore.getState().draftValue) return;
    drafted.current = true;
    void runDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleEditor(): void {
    setEditorMode(editorMode === 'preview' ? 'edit' : 'preview');
  }

  return (
    <section>
      <div className="pad">
        <p className="muted" style={{ font: '400 12.5px/1.5 var(--body)', margin: '0 0 14px' }}>
          Version prête à coller dans Teams. Édite le texte directement, puis valide ou corrige.
        </p>
        <RunStatus status={runStatus} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ font: '500 11px var(--mono)', color: 'var(--muted)' }}>prêt-à-coller · Teams</span>
          <button className="pill" style={{ marginLeft: 'auto', cursor: 'pointer', border: 'none' }} onClick={toggleEditor}>
            {editorMode === 'preview' ? 'Éditer' : 'Aperçu'}
          </button>
        </div>
        {editorMode === 'preview' ? (
          <div dangerouslySetInnerHTML={{ __html: renderEditionHtml(teamsText) }} />
        ) : (
          <textarea
            spellCheck={false}
            className="card"
            style={{ width: '100%', minHeight: 300, padding: '14px 15px', font: '400 13px/1.6 var(--mono)', color: 'var(--text)', background: 'var(--panel)', resize: 'vertical' }}
            value={teamsText}
            onChange={(e) => setTeamsText(e.target.value)}
          />
        )}
        <div className="row" style={{ marginTop: 13 }}>
          <button className="btn-ghost" style={{ flex: 'none' }} onClick={() => setCorrectOpen(true)}>
            Corriger
          </button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => setView('archived')}>
            Valider &amp; archiver →
          </button>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <Eyebrow style={{ marginBottom: 11 }}>
            Corrections apportées
          </Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {draftValue?.corrections?.length ? (
              draftValue.corrections.map((c, i) => <CorrectionRow key={i} correction={c} />)
            ) : (
              <div className="faint">Aucune correction.</div>
            )}
          </div>
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <Eyebrow style={{ marginBottom: 11 }}>
            Sources &amp; clippings
          </Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {(draftValue?.sources ?? []).map((s, i) => (
              <SourceRow key={i} source={s} />
            ))}
          </div>
        </div>
      </div>
      {correctOpen && (
        <CorrectModal
          initialWantSoulLesson={wantSoulLesson}
          onCancel={() => setCorrectOpen(false)}
          onSend={(feedback, want) => {
            setWantSoulLesson(want);
            setCorrectOpen(false);
            if (feedback) void runDraft(feedback);
          }}
        />
      )}
    </section>
  );
}
