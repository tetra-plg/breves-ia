import { test } from 'vitest';
import assert from 'node:assert/strict';
import { registerSystemHandlers } from '@main/ipc/system.handlers';

function fakeIpc() { const h = {}; return { handle: (ch, fn) => { h[ch] = fn; }, h }; }
const e = { sender: { send: () => {}, isDestroyed: () => false } };

test('copy / open-external (https only) / hide-window', async () => {
  const ipc = fakeIpc();
  const calls = { copied: null, opened: null, hidden: 0 };
  const sys = {
    writeClipboard: (t) => { calls.copied = t; },
    openExternal: (u) => { calls.opened = u; },
    hideWindow: () => { calls.hidden++; },
  };
  registerSystemHandlers(ipc, sys);
  assert.equal(await ipc.h['copy'](e, 'salut'), true);
  assert.equal(calls.copied, 'salut');
  await ipc.h['open-external'](e, 'https://ok.com');
  assert.equal(calls.opened, 'https://ok.com');
  await ipc.h['open-external'](e, 'javascript:alert(1)'); // non-http : ignoré
  assert.equal(calls.opened, 'https://ok.com');            // inchangé
  await ipc.h['hide-window'](e);
  assert.equal(calls.hidden, 1);
});
