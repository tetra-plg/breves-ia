import { test } from 'vitest';
import assert from 'node:assert/strict';
import { extractJsonBlock, parseSentinels } from '@domain/edition';

test('extrait le dernier bloc json fencé', () => {
  const t = 'blabla\n```json\n{"a":1}\n```\ntexte\n```json\n{"topics":[]}\n```\n';
  assert.deepEqual(extractJsonBlock(t), { topics: [] });
});
test('fallback parse du texte entier', () => {
  assert.deepEqual(extractJsonBlock('{"ok":true}'), { ok: true });
});
test('lève si aucun json', () => {
  assert.throws(() => extractJsonBlock('pas de json ici'), /aucun bloc JSON/);
});
test('parse les sentinelles dans l\'ordre', () => {
  const t = [
    '«BREVES» topic glm | GLM-5.2 sort',
    'bruit intermédiaire',
    '«BREVES» step glm source',
    '«BREVES» done glm',
    '«BREVES» error mj | source inaccessible',
  ].join('\n');
  assert.deepEqual(parseSentinels(t), [
    { type: 'topic-detected', key: 'glm', sujet: 'GLM-5.2 sort' },
    { type: 'topic-progress', key: 'glm', step: 'source' },
    { type: 'topic-done', key: 'glm' },
    { type: 'topic-error', key: 'mj', error: 'source inaccessible' },
  ]);
});
test('ignore un step inconnu', () => {
  assert.deepEqual(parseSentinels('«BREVES» step glm bidon'), []);
});
test('extrait le JSON malgré des fences imbriquées dans la valeur', () => {
  const nested = '{"clipping_contenu":"voici du code:\\n```py\\nprint(1)\\n```\\nfin"}';
  const t = `texte\n\`\`\`json\n${nested}\n\`\`\`\n`;
  assert.deepEqual(extractJsonBlock(t), {
    clipping_contenu: 'voici du code:\n```py\nprint(1)\n```\nfin',
  });
});
