const { app, BrowserWindow, session } = require('electron');
const path = require('path');

const RealMode = process.defaultApp || /[\\/]electron[\\/]/.test(process.execPath);

const allowedDomains = [
  'samcraft3.pythonanywhere.com',
];

const blockedUrlPatterns = [
  'https://samcraft3.pythonanywhere.com/',
  // 'https://samcraft3.pythonanywhere.com/idk_stuff',
];

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 390,
    height: 844,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'favicon.png')
  });

  const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';
  mainWindow.webContents.setUserAgent(userAgent);

  console.log('opening index.html');
  if (RealMode) {
    mainWindow.loadFile(path.join(__dirname, 'index-dev.html'));
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  };

  console.log('opened index.html');

  mainWindow.webContents.on('will-navigate', (event, url) => {
    handleUrlNavigation(event, url);
  });

  mainWindow.webContents.on('will-redirect', (event, url) => {
    handleUrlNavigation(event, url);
  });
}

function handleUrlNavigation(event, url) {
  try {
    const urlObj = new URL(url);
    const fullUrl = urlObj.href;
    const domain = urlObj.host;

    // BLOCK: Only if full URL matches exactly
    const isBlocked = blockedUrlPatterns.some(pattern => fullUrl === pattern);
    if (isBlocked) {
      console.log(`Navigation to blocked URL ${url} prevented`);
      event.preventDefault();
      return;
    }

    // ALLOW: If any allowed domain is included in the current domain
    const isAllowed = allowedDomains.some(allowed => domain.includes(allowed));
    if (!isAllowed) {
      console.log(`Navigation to non-whitelisted domain ${domain} prevented`);
      event.preventDefault();
      return;
    }

    console.log(`Navigation to ${url} allowed`);
  } catch (error) {
    console.error('Error processing navigation URL:', error);
    event.preventDefault();
  }
}

app.whenReady().then(() => {
  const ses = session.defaultSession;

  ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
    const url = details.url;

    if (url.startsWith('file://')) {
      return callback({ cancel: false }); // Allow local files
    }

    try {
      const urlObj = new URL(url);
      const fullUrl = urlObj.href;
      const domain = urlObj.host;

      // BLOCK: Only if full URL matches exactly
      const isBlocked = blockedUrlPatterns.some(pattern => fullUrl === pattern);
      if (isBlocked) {
        console.log(`Request to blocked URL ${url} cancelled`);
        return callback({ cancel: true });
      }

      // ALLOW: If any allowed domain is included in the current domain
      const isAllowed = allowedDomains.some(allowed => domain.includes(allowed));
      if (!isAllowed) {
        console.log(`Request to non-whitelisted domain ${domain} cancelled`);
        return callback({ cancel: true });
      }

      return callback({ cancel: false });
    } catch (error) {
      console.error('Error processing request URL:', error);
      return callback({ cancel: true });
    }
  });

  ses.cookies.set({
    url: 'https://samcraft3.pythonanywhere.com',
    name: 'cookieEnabled',
    value: 'true',
    expirationDate: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
  });

  app.commandLine.appendSwitch('enable-features', 'PersistentCookies');

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
