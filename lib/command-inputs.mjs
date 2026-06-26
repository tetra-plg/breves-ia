import { ALLOWED_SKILLS } from './skills.mjs';

// chaîne libre courte mono-ligne (anti-injection) : ≤280, sans caractère de contrôle
function isFreeString(v) {
  return typeof v === 'string' && v.length <= 280 && !/[\u0000-\u001f\u007f-\u009f]/.test(v);
}
// texte « sujets en vrac » : multi-lignes autorisé (\n), borné, sans autres contrôles
function isBulkText(v) {
  return typeof v === 'string'
    && v.trim().length > 0
    && v.length <= 8000
    && !/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(v);
}
function onlyKeys(obj, keys) {
  return Object.keys(obj).every((k) => keys.includes(k));
}

export function validateInputs(skill, inputs) {
  const inp = inputs == null ? {} : inputs;
  if (typeof inp !== 'object' || Array.isArray(inp)) return { ok: false, errors: ['inputs doit être un objet'] };
  const errors = [];

  if (skill === 'breves-verify') {
    if (!onlyKeys(inp, ['sujets', 'sceptique'])) errors.push('clé inattendue');
    if (!isBulkText(inp.sujets)) errors.push('sujets invalide (texte non vide ≤8000, sans caractère de contrôle hors saut de ligne)');
    if (inp.sceptique != null && !['off', 'ciblé', 'toujours'].includes(inp.sceptique)) errors.push('sceptique invalide');
  } else if (skill === 'breves-draft') {
    if (!onlyKeys(inp, ['topics', 'feedback', 'redacteur'])) errors.push('clé inattendue');
    if (!Array.isArray(inp.topics)) errors.push('topics doit être un tableau');
    if (inp.feedback != null && !isFreeString(inp.feedback)) errors.push('feedback invalide (≤280, mono-ligne)');
    if (inp.redacteur != null && !['on', 'off'].includes(inp.redacteur)) errors.push('redacteur invalide');
  } else if (skill === 'breves-archive') {
    if (!onlyKeys(inp, ['teamsText', 'topics', 'sources', 'leconSOUL'])) errors.push('clé inattendue');
    if (typeof inp.teamsText !== 'string' || inp.teamsText.trim() === '') errors.push('teamsText requis');
    if (!Array.isArray(inp.topics)) errors.push('topics doit être un tableau');
    if (!Array.isArray(inp.sources)) errors.push('sources doit être un tableau');
    if (inp.leconSOUL != null && !isFreeString(inp.leconSOUL)) errors.push('leconSOUL invalide (≤280, mono-ligne)');
  } else {
    errors.push('skill inconnu');
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function buildPrompt(skill, inputs) {
  if (!ALLOWED_SKILLS.includes(skill)) throw new Error(`skill non autorisé: ${skill}`);
  let prompt = `/${skill}`;
  if (inputs && typeof inputs === 'object' && Object.keys(inputs).length > 0) {
    prompt += `\n\nINPUTS (utilise-les, ne pose aucune question) :\n${JSON.stringify(inputs)}`;
  }
  return prompt;
}
