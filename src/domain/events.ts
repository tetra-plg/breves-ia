export type AlertLevel = 'corrigé' | 'nuance' | 'date';

export interface Alerte {
  niveau: AlertLevel;
  texte: string;
}

export type TopicEvent =
  | { type: 'topic-detected'; key: string; sujet: string }
  | { type: 'topic-progress'; key: string; step: string }
  | { type: 'topic-done'; key: string }
  | { type: 'topic-error'; key: string; error: string };

export interface ActivityEvent {
  type: 'activity';
  label: string;
}
