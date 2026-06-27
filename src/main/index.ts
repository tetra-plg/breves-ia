import { app, BrowserWindow, Menu, ipcMain, clipboard, shell } from 'electron';
import path from 'node:path';
import { APP_NAME, WINDOW_WIDTH, WINDOW_HEIGHT } from '@config/constants';
import { defaultDeps } from '@main/engine';
import { loadEnvFile } from '@main/io/env';
import { registerAllHandlers } from '@main/ipc';
import type { SystemBridge } from '@main/ipc/system.handlers';
import type { IpcLike } from '@shared/types/ipc';

let win: BrowserWindow | null = null;

function createWindow(): void {
  win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    title: APP_NAME,
    backgroundColor: '#e7e1d4',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
  win.once('ready-to-show', () => win?.show());

  // DevTools : Cmd/Ctrl+Alt+I ou F12
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type !== 'keyDown') return;
    const key = (input.key || '').toLowerCase();
    if (key === 'f12' || ((input.meta || input.control) && input.alt && key === 'i')) {
      win?.webContents.toggleDevTools();
    }
  });
}

app.whenReady().then(() => {
  // Hook smoke : prouve le chargement du SDK dans le main Forge réel, puis quitte.
  if (process.env.BREVES_SMOKE === '1') {
    import('@anthropic-ai/claude-agent-sdk')
      .then((m) => {
        console.log('SMOKE_SDK_OK exports=' + Object.keys(m).length);
        app.quit();
      })
      .catch((e: unknown) => {
        console.log('SMOKE_SDK_FAIL ' + (e as Error).message);
        app.exit(1);
      });
    return;
  }

  Menu.setApplicationMenu(null);
  loadEnvFile();
  const deps = defaultDeps();
  const sys: SystemBridge = {
    writeClipboard: (text) => clipboard.writeText(text),
    openExternal: (url) => {
      void shell.openExternal(url);
    },
    hideWindow: () => win?.hide(),
  };
  registerAllHandlers(ipcMain as unknown as IpcLike, deps, sys);
  createWindow();
});

app.on('window-all-closed', () => app.quit());
