import { test } from 'vitest';
import assert from 'node:assert/strict';
import { AppError } from '@shared/errors';

test('AppError est une Error avec message et code', () => {
  const e = new AppError('boum', 'E_BOOM');
  assert.ok(e instanceof Error);
  assert.equal(e.message, 'boum');
  assert.equal(e.code, 'E_BOOM');
  assert.equal(e.name, 'AppError');
});
test('AppError sans code', () => {
  const e = new AppError('seul');
  assert.equal(e.code, undefined);
});
