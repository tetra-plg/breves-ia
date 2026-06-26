import { z } from 'zod';
import { ALLOWED_SKILLS } from '@shared/skills';

// chaîne libre courte mono-ligne (anti-injection) : <=280, sans caractère de contrôle
// (échappements unicode IDENTIQUES à lib/command-inputs.mjs)
const freeString = z
  .string()
  .max(280)
  // détection volontaire de caractères de contrôle (anti-injection)
  // eslint-disable-next-line no-control-regex
  .refine((v) => !/[\u0000-\u001f\u007f-\u009f]/.test(v), 'caractère de contrôle interdit');

// texte « sujets en vrac » : multi-lignes (saut de ligne) autorisé, borné, sans autres contrôles
const bulkText = z
  .string()
  .min(1)
  .max(8000)
  .refine((v) => v.trim().length > 0, 'texte vide')
  .refine(
    // eslint-disable-next-line no-control-regex
    (v) => !/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(v),
    'caractère de contrôle interdit (hors saut de ligne)',
  );

const sceptique = z.enum(['off', 'ciblé', 'toujours']);
const redacteur = z.enum(['on', 'off']);

const verifySchema = z.object({ sujets: bulkText, sceptique: sceptique.optional() }).strict();
const draftSchema = z
  .object({ topics: z.array(z.unknown()), feedback: freeString.optional(), redacteur: redacteur.optional() })
  .strict();
const archiveSchema = z
  .object({
    teamsText: z.string().refine((v) => v.trim() !== '', 'teamsText requis'),
    topics: z.array(z.unknown()),
    sources: z.array(z.unknown()),
    leconSOUL: freeString.optional(),
  })
  .strict();

const SCHEMAS: Record<string, z.ZodType> = {
  'breves-verify': verifySchema,
  'breves-draft': draftSchema,
  'breves-archive': archiveSchema,
};

type InputsResult = { ok: true } | { ok: false; errors: string[] };

export function validateInputs(skill: string, inputs: unknown): InputsResult {
  if (!(ALLOWED_SKILLS as readonly string[]).includes(skill)) {
    return { ok: false, errors: ['skill inconnu'] };
  }
  const inp = inputs == null ? {} : inputs;
  const r = SCHEMAS[skill].safeParse(inp);
  if (r.success) return { ok: true };
  return { ok: false, errors: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}

export { buildPrompt } from '@shared/skills';
