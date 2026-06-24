import { app, BrowserWindow, Menu, ipcMain, clipboard } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultDeps, dispatch, getDashboard } from './engine.mjs';
import { loadEnvFile } from '../lib/load-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let win = null;

function makeWindow() {
  win = new BrowserWindow({
    width: 400, height: 760, show: false, title: 'Brèves IA', backgroundColor: '#e7e1d4',
    frame: false, // en-tête custom draggable (cf. companion.html)
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true },
  });
  win.loadFile(path.join(__dirname, 'companion.html'));
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  loadEnvFile();
  const deps = defaultDeps();

  ipcMain.handle('send-command', async (e, { skill, inputs }) => {
    const onEvent = (ev) => { if (!e.sender.isDestroyed()) e.sender.send('command-event', ev); };
    try { return await dispatch({ skill, inputs, onEvent }, deps); }
    catch (err) { return { ok: false, error: err.message }; }
  });
  ipcMain.handle('get-dashboard', () => getDashboard(deps));
  ipcMain.handle('copy', (_e, text) => { clipboard.writeText(String(text)); return true; });
  ipcMain.handle('hide-window', () => { if (win) win.hide(); });

  makeWindow();
});
app.on('window-all-closed', () => app.quit());
