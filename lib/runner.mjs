import { query as sdkQuery } from '@anthropic-ai/claude-agent-sdk';
import { validateInputs, buildPrompt } from './command-inputs.mjs';
import { extractJsonBlock, parseSentinels } from './parse-result.mjs';
import { validateVerifyOutput, validateDraftOutput, validateArchiveOutput } from './contracts.mjs';

const VALIDATORS = {
  'breves-verify': validateVerifyOutput,
  'breves-draft': validateDraftOutput,
  'breves-archive': validateArchiveOutput,
};

function textOf(message) {
  const content = message?.message?.content;
  if (Array.isArray(content)) return content.filter((b) => b?.type === 'text').map((b) => b.text).join('\n');
  return typeof content === 'string' ? content : '';
}

export async function runSkill({ skill, inputs, bbDir, onEvent = () => {}, query = sdkQuery }) {
  const v = validateInputs(skill, inputs);
  if (!v.ok) return { ok: false, error: `inputs invalides: ${v.errors.join('; ')}` };

  let prompt;
  try { prompt = buildPrompt(skill, inputs); } catch (e) { return { ok: false, error: e.message }; }

  let finalText = '';
  let sdkOk = false;
  try {
    for await (const m of query({ prompt, options: { cwd: bbDir, permissionMode: 'bypassPermissions', allowDangerouslySkipPermissions: true } })) {
      if (m.type === 'assistant') {
        for (const ev of parseSentinels(textOf(m))) onEvent(ev);
      } else if (m.type === 'result') {
        finalText = m.result ?? '';
        sdkOk = m.subtype === 'success' && !m.is_error;
      }
    }
  } catch (e) {
    return { ok: false, error: e.message };
  }
  if (!sdkOk) return { ok: false, error: finalText || 'échec du skill' };

  let parsed;
  try { parsed = extractJsonBlock(finalText); }
  catch (e) { onEvent({ type: 'result-error', error: e.message }); return { ok: false, error: e.message }; }

  const validate = VALIDATORS[skill];
  const out = validate(parsed);
  if (!out.ok) { onEvent({ type: 'result-error', error: out.errors.join('; ') }); return { ok: false, error: out.errors.join('; ') }; }
  return { ok: true, value: out.value };
}
