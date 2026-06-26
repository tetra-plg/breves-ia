const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

export function escapeHtml(s: unknown): string {
  return String(s).replace(/[&<>]/g, (c) => ENTITIES[c]);
}

export function inlineMd(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

const FR = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function dateLong(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return iso;
  return FR.format(new Date(`${iso}T00:00:00Z`));
}

export function soulVersionLabel(version: string | null | undefined): string {
  return version || 'v1';
}
