import { useState } from 'react';
import type { Command, CommandEdits } from '@domain/commands';
import { Eyebrow } from '@renderer/components/ui/Eyebrow';
import { Button } from '@renderer/components/ui/Button';
import { Card } from '@renderer/components/ui/Card';
import { Input } from '@renderer/components/ui/Input';
import { Textarea } from '@renderer/components/ui/Textarea';
import s from './CommandCard.module.css';

interface CommandCardProps {
  command: Command;
  onSave: (edits: CommandEdits) => void;
}

export function CommandCard({ command, onSave }: CommandCardProps) {
  const [description, setDescription] = useState(command.description ?? '');
  const [body, setBody] = useState(command.body ?? '');

  return (
    <Card>
      <div className={s.name}>/{command.name}</div>
      <Eyebrow style={{ marginBottom: 4 }}>Description</Eyebrow>
      <Input className={s.field} value={description} onChange={(e) => setDescription(e.target.value)} />
      <Eyebrow style={{ marginBottom: 4 }}>Corps (prompt)</Eyebrow>
      <Textarea spellCheck={false} className={s.body} value={body} onChange={(e) => setBody(e.target.value)} />
      <Button variant="primary" className={s.save} onClick={() => onSave({ description, body })}>
        Enregistrer
      </Button>
    </Card>
  );
}
