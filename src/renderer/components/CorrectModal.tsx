import { useState } from 'react';
import { Text } from '@renderer/components/ui/Text';
import { Button } from '@renderer/components/ui/Button';
import { Textarea } from '@renderer/components/ui/Textarea';
import { Overlay, Modal } from '@renderer/components/ui/Modal';

interface CorrectModalProps {
  initialWantSoulLesson: boolean;
  onCancel: () => void;
  onSend: (feedback: string, wantSoulLesson: boolean) => void;
}

export function CorrectModal({ initialWantSoulLesson, onCancel, onSend }: CorrectModalProps) {
  const [text, setText] = useState('');
  const [want, setWant] = useState(initialWantSoulLesson);
  return (
    <Overlay style={{ zIndex: 50, padding: 16 }}>
      <Modal>
        <h2 style={{ font: '600 17px var(--display)', margin: '0 0 4px' }}>Demander une correction</h2>
        <Text tone="muted" as="p" style={{ font: '400 12.5px var(--body)', margin: '0 0 14px' }}>
          Dis ce qui ne va pas : la commande ajuste les brèves.
        </Text>
        <Textarea
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ minHeight: 90, font: '400 13px/1.55 var(--body)', background: 'var(--panel)', borderRadius: 'var(--radiusSm)' }}
          placeholder="Ex. : raccourcis la brève GLM, la parenthèse fait doublon…"
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 18px', cursor: 'pointer' }}>
          <input type="checkbox" checked={want} onChange={(e) => setWant(e.target.checked)} />
          <span style={{ font: '500 13px var(--body)' }}>Enrichir la SOUL avec cette leçon</span>
        </label>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
          <Button variant="primary" style={{ width: 'auto', padding: '10px 16px' }} onClick={() => onSend(text.trim(), want)}>
            Envoyer
          </Button>
        </div>
      </Modal>
    </Overlay>
  );
}
