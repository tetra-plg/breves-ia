import { test } from 'vitest';
import assert from 'node:assert/strict';
import { registerCommandHandlers } from '@main/ipc/command.handlers';

function fakeIpc() { const h = {}; return { handle: (ch, fn) => { h[ch] = fn; }, h }; }
function fakeEvent() { const sent = []; return { sent, sender: { send: (ch, p) => sent.push({ ch, p }), isDestroyed: () => false } }; }

test('send-command : route vers le moteur, stream les events, renvoie la valeur', async () => {
  const ipc = fakeIpc();
  // deps mockées : runSkill émet un event puis renvoie ok
  const deps = {
    repoDir: '/repo', bbDir: '/bb', readdir: () => [],
    runSkill: async (a) => { a.onEvent({ type: 'topic-detected', key: 'k', sujet: 's' }); return { ok: true, value: { topics: [] } }; },
  };
  registerCommandHandlers(ipc, deps);
  const e = fakeEvent();
  const r = await ipc.h['send-command'](e, { skill: 'breves-verify', inputs: { sujets: 'x' } });
  assert.equal(r.ok, true);
  assert.deepEqual(e.sent, [{ ch: 'command-event', p: { type: 'topic-detected', key: 'k', sujet: 's' } }]);
});

test('send-command : capture une exception du moteur en { ok:false }', async () => {
  const ipc = fakeIpc();
  const deps = { repoDir: '/r', bbDir: '/b', readdir: () => [], runSkill: async () => { throw new Error('boom'); } };
  registerCommandHandlers(ipc, deps);
  const r = await ipc.h['send-command'](fakeEvent(), { skill: 'breves-verify', inputs: { sujets: 'x' } });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'boom');
});

test('archive-ingest : route vers archiveAndIngest', async () => {
  const ipc = fakeIpc();
  let seen = null;
  const deps = {
    repoDir: '/r', bbDir: '/b', readdir: () => [],
    runSkill: async (a) => { seen = a.skill; return { ok: true, value: {} }; },
    runRaw: async () => ({ ok: true, text: 'ok' }),
  };
  registerCommandHandlers(ipc, deps);
  const r = await ipc.h['archive-ingest'](fakeEvent(), { teamsText: 't', topics: [], sources: [] });
  assert.equal(r.ok, true);
  assert.equal(seen, 'breves-archive');
});
