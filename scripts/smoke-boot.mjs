// Smoke de boot : lance le main Forge avec BREVES_SMOKE=1, attend SMOKE_SDK_OK (ou échec), puis tue.
import { spawn } from 'node:child_process';

const child = spawn('npm', ['start'], {
  env: { ...process.env, BREVES_SMOKE: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let out = '';
let done = false;
function finish(code, msg) {
  if (done) return;
  done = true;
  console.log(msg);
  try { child.kill('SIGTERM'); } catch { /* ignore */ }
  // laisse Forge/electron se fermer
  setTimeout(() => process.exit(code), 1500);
}

const onData = (buf) => {
  out += buf.toString();
  if (/SMOKE_SDK_OK/.test(out)) finish(0, '✅ SMOKE: le SDK se charge dans le main Forge.');
  else if (/SMOKE_SDK_FAIL|require is not defined|Cannot find module|Unable to find/.test(out)) {
    finish(1, '🔴 SMOKE: échec de boot/chargement SDK.\n' + out.slice(-800));
  }
};
child.stdout.on('data', onData);
child.stderr.on('data', onData);

setTimeout(() => finish(1, '🔴 SMOKE: timeout (60s) sans SMOKE_SDK_OK.\n' + out.slice(-800)), 60000);
