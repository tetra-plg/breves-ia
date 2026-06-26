import { z } from 'zod';

const niveau = z.enum(['corrigé', 'nuance', 'date']);
const fiabilite = z.enum(['confirme', 'partiel', 'non_verifie']);

export const alerteSchema = z.object({
  niveau,
  texte: z.string().min(1),
});

// .passthrough() : on conserve les champs hors-contrat consommés par l'UI/le runner
// (ex. topic.raw, date_reelle déjà listée…), à l'image des validateurs manuels qui
// renvoyaient l'objet inchangé.
export const topicSchema = z
  .object({
    key: z.string().min(1),
    sujet: z.string().min(1),
    date_reelle: z.string().min(1),
    fiabilite,
    source: z.string().min(1),
    url_citee: z.string().min(1),
    url_clippee: z.string().min(1),
    slug: z.string().min(1),
    clipping_contenu: z.string().min(1),
    faits: z.array(z.string()),
    alerte: alerteSchema.nullish(),
  })
  .passthrough();

export const verifyOutputSchema = z.object({ topics: z.array(topicSchema) }).passthrough();
export type VerifyOutput = z.infer<typeof verifyOutputSchema>;

export const draftOutputSchema = z
  .object({
    teamsText: z.string().min(1),
    corrections: z.array(
      z.object({ niveau, titre: z.string().min(1), detail: z.string().min(1) }),
    ),
    sources: z.array(
      z.object({
        name: z.string().min(1),
        url_citee: z.string().min(1),
        url_clippee: z.string().min(1),
        repli: z.boolean(),
      }),
    ),
    soulLessonProposee: z.string().nullish(),
  })
  .passthrough();
export type DraftOutput = z.infer<typeof draftOutputSchema>;

export const archiveOutputSchema = z
  .object({
    archiveSteps: z.array(z.object({ t: z.string().min(1), d: z.string().min(1) })),
    newsletterText: z.string().min(1),
    soulVersion: z.string().min(1),
  })
  .passthrough();
export type ArchiveOutput = z.infer<typeof archiveOutputSchema>;

type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function check<T>(schema: z.ZodType<T>, obj: unknown): Result<T> {
  const r = schema.safeParse(obj);
  if (r.success) return { ok: true, value: r.data };
  return { ok: false, errors: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}

export const validateVerifyOutput = (obj: unknown): Result<VerifyOutput> => check(verifyOutputSchema, obj);
export const validateDraftOutput = (obj: unknown): Result<DraftOutput> => check(draftOutputSchema, obj);
export const validateArchiveOutput = (obj: unknown): Result<ArchiveOutput> => check(archiveOutputSchema, obj);
