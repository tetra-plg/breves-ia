import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { APP_NAME, WINDOW_WIDTH, WINDOW_HEIGHT } from '@config/constants';

// La sortie du main est en CommonJS (build Forge/Vite) : __dirname est disponible nativement.
function createWindow(): void {
  const win = new BrowserWindow({
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
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
