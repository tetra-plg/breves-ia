export const ALLOWED_SKILLS = ['breves-verify', 'breves-draft', 'breves-archive'] as const;

export type Skill = (typeof ALLOWED_SKILLS)[number];

export function buildPrompt(skill: string, inputs: unknown): string {
  if (!(ALLOWED_SKILLS as readonly string[]).includes(skill)) {
    throw new Error(`skill non autorisé: ${skill}`);
  }
  let prompt = `/${skill}`;
  if (inputs && typeof inputs === 'object' && Object.keys(inputs as object).length > 0) {
    prompt += `\n\nINPUTS (utilise-les, ne pose aucune question) :\n${JSON.stringify(inputs)}`;
  }
  return prompt;
}
