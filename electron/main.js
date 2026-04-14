const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function resolveIndexPath() {
  const distIndex = path.join(__dirname, '..', 'dist', 'ng-vernova', 'index.html');
  if (fs.existsSync(distIndex)) {
    return distIndex;
  }
  throw new Error(
    'Angular build output not found. Run "npm run build" first.',
  );
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadFile(resolveIndexPath());
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
