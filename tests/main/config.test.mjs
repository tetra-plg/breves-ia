// tests/main/config.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readUserConfig, writeUserConfig, pathValid } from '@main/io/config';

test('readUserConfig: fichier absent → {}', () => {
  const d = mkdtempSync(join(tmpdir(), 'cfg-'));
  assert.deepEqual(readUserConfig(d), {});
});

test('writeUserConfig puis readUserConfig : round-trip', () => {
  const d = mkdtempSync(join(tmpdir(), 'cfg-'));
  writeUserConfig(d, { bbDir: '/a', repoDir: '/b', claudeBin: '/c' });
  assert.deepEqual(readUserConfig(d), { bbDir: '/a', repoDir: '/b', claudeBin: '/c' });
});

test('readUserConfig: JSON cassé → {}', () => {
  const d = mkdtempSync(join(tmpdir(), 'cfg-'));
  writeFileSync(join(d, 'config.json'), '{pas du json');
  assert.deepEqual(readUserConfig(d), {});
});

test('pathValid: dossier existant → true, absent → false', () => {
  const d = mkdtempSync(join(tmpdir(), 'cfg-'));
  assert.equal(pathValid(d, 'directory'), true);
  assert.equal(pathValid(join(d, 'nope'), 'directory'), false);
});

test('pathValid: fichier exécutable → true, non-exécutable → false', () => {
  const d = mkdtempSync(join(tmpdir(), 'cfg-'));
  const exe = join(d, 'bin'); writeFileSync(exe, '#!/bin/sh\n'); chmodSync(exe, 0o755);
  assert.equal(pathValid(exe, 'file'), true);
  const plain = join(d, 'plain'); writeFileSync(plain, 'x'); chmodSync(plain, 0o644);
  assert.equal(pathValid(plain, 'file'), false);
});
