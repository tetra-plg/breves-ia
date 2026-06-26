import { inlineMd } from '@domain/format';

interface BreveCardProps {
  texte: string;
  disabled: boolean;
  onAdd: () => void;
}

export function BreveCard({ texte, disabled, onAdd }: BreveCardProps) {
  return (
    <div className="card">
      <div style={{ font: '400 12px/1.55 var(--body)', marginBottom: 9 }} dangerouslySetInnerHTML={{ __html: inlineMd(texte) }} />
      <button className="btn-primary" style={{ padding: '8px 13px', fontSize: 12 }} disabled={disabled} onClick={onAdd}>
        {disabled ? '3 échantillons max atteint' : 'Ajouter cet échantillon'}
      </button>
    </div>
  );
}
