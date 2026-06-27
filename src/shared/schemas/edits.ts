import { z } from 'zod';

// Validation des payloads d'écriture (save-agent / save-command) reçus côté main.
// Défense en profondeur : le moteur garde déjà l'invariant métier, mais le typage runtime
// n'était pas garanti (payload casté `as`). Les clés inconnues sont écartées (object non strict).

const agentEditsSchema = z.object({
  systemPrompt: z.string().min(1, 'systemPrompt requis'),
  model: z.string().optional(),
  tools: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  mode: z.string().optional(),
  description: z.string().optional(),
});

const commandEditsSchema = z.object({
  body: z.string().min(1, 'body requis'),
  description: z.string().optional(),
});

const agentSavePayloadSchema = z.object({ name: z.string().min(1), edits: agentEditsSchema });
const commandSavePayloadSchema = z.object({ name: z.string().min(1), edits: commandEditsSchema });

export type AgentSavePayload = z.infer<typeof agentSavePayloadSchema>;
export type CommandSavePayload = z.infer<typeof commandSavePayloadSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function format(r: z.ZodError): string {
  return r.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
}

export function parseAgentSave(payload: unknown): Parsed<AgentSavePayload> {
  const r = agentSavePayloadSchema.safeParse(payload ?? {});
  return r.success ? { ok: true, value: r.data } : { ok: false, error: format(r.error) };
}

export function parseCommandSave(payload: unknown): Parsed<CommandSavePayload> {
  const r = commandSavePayloadSchema.safeParse(payload ?? {});
  return r.success ? { ok: true, value: r.data } : { ok: false, error: format(r.error) };
}
