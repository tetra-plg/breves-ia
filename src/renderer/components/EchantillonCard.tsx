import { inlineMd, dateLong } from '@domain/format';
import type { Echantillon } from '@domain/soul';
import { Button } from '@renderer/components/ui/Button';
import { Card } from '@renderer/components/ui/Card';

interface EchantillonCardProps {
  echantillon: Echantillon;
  onRemove: () => void;
}

export function EchantillonCard({ echantillon, onRemove }: EchantillonCardProps) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{ font: '500 10.5px var(--mono)', color: 'var(--accent)' }}>
          {dateLong(echantillon.date)}
          {echantillon.source ? ' · ' + echantillon.source : ''}
        </span>
        <Button variant="ghost" style={{ marginLeft: 'auto', padding: '5px 10px', fontSize: 11 }} onClick={onRemove}>
          Retirer
        </Button>
      </div>
      <div style={{ font: '400 12.5px/1.5 var(--body)' }} dangerouslySetInnerHTML={{ __html: inlineMd(echantillon.texte) }} />
    </Card>
  );
}
