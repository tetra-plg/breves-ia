import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngineConfig } from '../lib/config.mjs';

test('bbDir par défaut', () => {
  assert.equal(loadEngineConfig({}).bbDir, '/Users/pleguern/Workspace/BoilingBrain');
});
test('bbDir surchargé par BREVES_BB_DIR', () => {
  assert.equal(loadEngineConfig({ BREVES_BB_DIR: '/tmp/bb' }).bbDir, '/tmp/bb');
});
