import { inlineMd } from '@domain/format';
import { Button } from '@renderer/components/ui/Button';
import { Card } from '@renderer/components/ui/Card';

interface BreveCardProps {
  texte: string;
  disabled: boolean;
  onAdd: () => void;
}

export function BreveCard({ texte, disabled, onAdd }: BreveCardProps) {
  return (
    <Card>
      <div style={{ font: '400 12px/1.55 var(--body)', marginBottom: 9 }} dangerouslySetInnerHTML={{ __html: inlineMd(texte) }} />
      <Button variant="primary" style={{ padding: '8px 13px', fontSize: 12 }} disabled={disabled} onClick={onAdd}>
        {disabled ? '3 échantillons max atteint' : 'Ajouter cet échantillon'}
      </Button>
    </Card>
  );
}
