import { test } from 'vitest';
import assert from 'node:assert/strict';
import { APP_NAME, WINDOW_WIDTH, WINDOW_HEIGHT } from '@config/constants';

test('alias @config résout vers src/config et le module TS se charge', () => {
  assert.equal(APP_NAME, 'Brèves IA');
  assert.equal(WINDOW_WIDTH, 400);
  assert.equal(WINDOW_HEIGHT, 760);
});
