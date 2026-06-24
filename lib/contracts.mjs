const FIABILITE = ['confirme', 'partiel', 'non_verifie'];
const NIVEAUX = ['corrigé', 'nuance', 'date'];
const isStr = (v) => typeof v === 'string' && v.length > 0;
const isArr = (v) => Array.isArray(v);

function fail(errors) { return { ok: false, errors }; }
function ok(value) { return { ok: true, value }; }

function checkTopic(t, i, errors) {
  const req = ['key', 'sujet', 'date_reelle', 'fiabilite', 'source', 'url_citee', 'url_clippee', 'slug', 'clipping_contenu'];
  for (const k of req) if (!isStr(t?.[k])) errors.push(`topics[${i}].${k} requis`);
  if (!isArr(t?.faits)) errors.push(`topics[${i}].faits doit être un tableau`);
  if (t && !FIABILITE.includes(t.fiabilite)) errors.push(`topics[${i}].fiabilite invalide`);
  if (t?.alerte != null) {
    if (typeof t.alerte !== 'object' || !NIVEAUX.includes(t.alerte.niveau) || !isStr(t.alerte.texte)) {
      errors.push(`topics[${i}].alerte invalide`);
    }
  }
}

export function validateVerifyOutput(obj) {
  const errors = [];
  if (!obj || !isArr(obj.topics)) return fail(['topics doit être un tableau']);
  obj.topics.forEach((t, i) => checkTopic(t, i, errors));
  return errors.length ? fail(errors) : ok(obj);
}

export function validateDraftOutput(obj) {
  const errors = [];
  if (!isStr(obj?.teamsText)) errors.push('teamsText requis (non vide)');
  if (!isArr(obj?.corrections)) errors.push('corrections doit être un tableau');
  else obj.corrections.forEach((c, i) => {
    if (!NIVEAUX.includes(c?.niveau) || !isStr(c?.titre) || !isStr(c?.detail)) errors.push(`corrections[${i}] invalide`);
  });
  if (!isArr(obj?.sources)) errors.push('sources doit être un tableau');
  else obj.sources.forEach((s, i) => {
    if (!isStr(s?.name) || !isStr(s?.url_citee) || !isStr(s?.url_clippee) || typeof s?.repli !== 'boolean') {
      errors.push(`sources[${i}] invalide`);
    }
  });
  if (obj?.soulLessonProposee != null && typeof obj.soulLessonProposee !== 'string') errors.push('soulLessonProposee invalide');
  return errors.length ? fail(errors) : ok(obj);
}

export function validateArchiveOutput(obj) {
  const errors = [];
  if (!isArr(obj?.archiveSteps)) errors.push('archiveSteps doit être un tableau');
  else obj.archiveSteps.forEach((a, i) => {
    if (!isStr(a?.t) || !isStr(a?.d)) errors.push(`archiveSteps[${i}] invalide`);
  });
  if (!isStr(obj?.newsletterText)) errors.push('newsletterText requis');
  if (!isStr(obj?.soulVersion)) errors.push('soulVersion requis');
  return errors.length ? fail(errors) : ok(obj);
}
