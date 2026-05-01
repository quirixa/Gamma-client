const { app, BrowserWindow, ipcMain } = require("electron");
// const { autoUpdater } = require("electron-updater"); // Auto-updater disabled
const { initGame } = require("./game");
const path = require("path");

// Auto-updater configuration disabled
// autoUpdater.autoDownload = true;
// autoUpdater.setFeedURL({
//   provider: "github",
//   owner: "quirixa",
//   repo: "Gamma-client",
// });

let splashWindow;

const createWindow = () => {
  splashWindow = new BrowserWindow({
    icon: path.join(__dirname, "../assets/img/icon.png"),
    width: 600,
    height: 300,
    show: false,
    frame: false,
    transparent: true,
    fullscreenable: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/splash.js"),
    },
  });

  splashWindow.loadFile(path.join(__dirname, "../assets/html/splash.html"));
  splashWindow.once("ready-to-show", () => {
    splashWindow.show();
    // Directly launch game without checking for updates
    handleClose();
  });

  splashWindow.on("closed", () => {
    ipcMain.removeAllListeners("quit-and-install");
    splashWindow = null;
  });
};

// IPC listener disabled
// ipcMain.on("quit-and-install", () =>
//   setTimeout(() => autoUpdater.quitAndInstall(), 5000)
// );

// Update checker - now just launches the game immediately
const checkForUpdates = () => {
  handleClose();
};

const handleClose = () =>
  setTimeout(() => {
    if (splashWindow) {
      initGame();
      splashWindow.close();
    }
  }, 2000);

const initSplash = createWindow;

module.exports = { initSplash };