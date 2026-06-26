import { useEffect } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import type { TopicEvent } from '@domain/events';

const TOPIC_TYPES: ReadonlyArray<TopicEvent['type']> = [
  'topic-detected',
  'topic-progress',
  'topic-done',
  'topic-error',
];

// Routage pur d'un évènement de flux vers le store (testable sans React).
export function handleStreamEvent(ev: unknown): void {
  const e = ev as { type?: string; label?: string };
  const store = useAppStore.getState();
  if (e?.type === 'activity') {
    if (e.label) store.setRunActivity(e.label);
    return;
  }
  if (e?.type && (TOPIC_TYPES as ReadonlyArray<string>).includes(e.type)) {
    store.applyCardEvent(ev as TopicEvent);
  }
}

// Abonne le flux de commande (à monter une fois, dans App). Cleanup au démontage.
export function useCommandStream(): void {
  useEffect(() => {
    const dispose = window.api.onCommandEvent(handleStreamEvent);
    return dispose;
  }, []);
}
