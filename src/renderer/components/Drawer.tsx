import { dateLong } from '@domain/format';
import { niveauColor, niveauSoft, niveauLabel } from '@renderer/components/niveau';
import type { VerifyOutput } from '@shared/schemas/outputs';

type Topic = VerifyOutput['topics'][number];

interface DrawerProps {
  topic: Topic;
}

export function Drawer({ topic }: DrawerProps) {
  const t = topic as Topic & { raw?: string };
  return (
    <div className="pad">
      <h2 style={{ font: '600 18px/1.3 var(--display)', margin: '0 0 7px' }}>{t.sujet || t.key}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18, flexWrap: 'wrap' }}>
        <span className="pill" style={{ color: 'var(--accent)', background: 'var(--accentSoft)' }}>
          {dateLong(t.date_reelle ?? '')}
        </span>
        {t.raw && <span className="faint" style={{ font: '400 11.5px var(--body)' }}>saisi : « {t.raw} »</span>}
      </div>
      {t.alerte && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            background: niveauSoft(t.alerte.niveau),
            border: `1px solid ${niveauColor(t.alerte.niveau)}`,
            borderRadius: 'var(--radiusSm)',
            padding: '12px 13px',
            marginBottom: 18,
          }}
        >
          <span style={{ fontSize: 15, flex: 'none' }}>⚠</span>
          <div>
            <div
              style={{
                font: '600 11px var(--body)',
                color: niveauColor(t.alerte.niveau),
                textTransform: 'uppercase',
                letterSpacing: '.04em',
              }}
            >
              {niveauLabel(t.alerte.niveau)}
            </div>
            <div style={{ font: '400 12.5px/1.5 var(--body)', color: 'var(--text)', marginTop: 2 }}>{t.alerte.texte}</div>
          </div>
        </div>
      )}
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Faits vérifiés
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {(t.faits ?? []).map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <span className="dot done">✓</span>
            <span style={{ font: '400 13px/1.5 var(--body)' }}>{f}</span>
          </div>
        ))}
      </div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Source retenue
      </div>
      <div className="card" style={{ borderRadius: 'var(--radiusSm)', marginBottom: 18 }}>
        <div style={{ font: '600 13px var(--body)' }}>{t.source ?? ''}</div>
        <div
          style={{ font: '400 11px var(--mono)', color: 'var(--accent)', wordBreak: 'break-all', marginTop: 5 }}
        >
          {t.url_citee ?? ''}
        </div>
      </div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Extrait (clipping)
      </div>
      <div
        style={{
          background: 'var(--panel2)',
          borderLeft: '3px solid var(--accent)',
          borderRadius: '0 var(--radiusSm) var(--radiusSm) 0',
          padding: '12px 14px',
          font: '400 12.5px/1.6 var(--body)',
          color: 'var(--muted)',
          fontStyle: 'italic',
        }}
      >
        {t.clipping_contenu ? t.clipping_contenu.slice(0, 600) : '(pas de clipping)'}
      </div>
    </div>
  );
}
