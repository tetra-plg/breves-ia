// src/renderer/components/PathField.tsx
import { Eyebrow } from '@renderer/components/ui/Eyebrow';
import { Input } from '@renderer/components/ui/Input';
import { Button } from '@renderer/components/ui/Button';
import { StatusDot } from '@renderer/components/ui/StatusDot';
import { Text } from '@renderer/components/ui/Text';
import s from './PathField.module.css';

export interface PathFieldProps {
  label: string;
  value: string;
  valid: boolean;
  locked?: boolean;
  onChange: (value: string) => void;
  onBrowse: () => void;
}

export function PathField({ label, value, valid, locked = false, onChange, onBrowse }: PathFieldProps) {
  return (
    <div className={s.root}>
      <Eyebrow style={{ margin: 0 }}>{label}</Eyebrow>
      <div className={s.row}>
        <StatusDot state={valid ? 'done' : 'error'} />
        <Input value={value} disabled={locked} onChange={(e) => onChange(e.target.value)} />
        <Button variant="ghost" disabled={locked} onClick={onBrowse}>
          Parcourir…
        </Button>
      </div>
      {locked && (
        <Text tone="faint" as="div" style={{ fontSize: 11 }}>
          Verrouillé par une variable d'environnement.
        </Text>
      )}
    </div>
  );
}
