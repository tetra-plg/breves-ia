import { splitFrontmatter } from '@domain/frontmatter';

export interface Command {
  name: string;
  description: string;
  body: string;
}

export interface CommandEdits {
  description: string;
  body: string;
}

export function parseCommand(raw: string): { description: string; body: string } {
  const { fm, body } = splitFrontmatter(raw);
  return { description: fm.description || '', body };
}

export function serializeCommand(edits: { description: string; body: string }): string {
  return `---\ndescription: ${edits.description || ''}\n---\n\n${(edits.body || '').trim()}\n`;
}
