const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "data");
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");
const NOTES_FILE = path.join(DATA_DIR, "notes.json");
const HABITS_FILE = path.join(DATA_DIR, "habits.json");
const POMODORO_FILE = path.join(DATA_DIR, "pomodoro.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  const defaults = {
    [TASKS_FILE]: [],
    [NOTES_FILE]: [],
    [HABITS_FILE]: [],
    [POMODORO_FILE]: { sessions: [], totalMinutes: 0 },
    [SETTINGS_FILE]: { theme: "dark", pomodoroWork: 25, pomodoroBreak: 5 },
  };
  for (const [file, fallback] of Object.entries(defaults)) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback));
  }
  // Migrate old tasks.json from root if it exists
  const oldTasks = path.join(__dirname, "tasks.json");
  if (fs.existsSync(oldTasks)) {
    try {
      const old = JSON.parse(fs.readFileSync(oldTasks, "utf-8"));
      if (Array.isArray(old) && old.length > 0) {
        const cur = JSON.parse(fs.readFileSync(TASKS_FILE, "utf-8"));
        if (cur.length === 0) fs.writeFileSync(TASKS_FILE, JSON.stringify(old));
      }
    } catch (_) {}
  }
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile("index.html");
}

app.whenReady().then(() => {
  ensureDataFiles();
  createWindow();
});

// ── Tasks ──
ipcMain.handle("get-tasks", () => readJSON(TASKS_FILE));
ipcMain.handle("save-tasks", (_e, tasks) => writeJSON(TASKS_FILE, tasks));

// ── Notes ──
ipcMain.handle("get-notes", () => readJSON(NOTES_FILE));
ipcMain.handle("save-notes", (_e, notes) => writeJSON(NOTES_FILE, notes));

// ── Habits ──
ipcMain.handle("get-habits", () => readJSON(HABITS_FILE));
ipcMain.handle("save-habits", (_e, habits) => writeJSON(HABITS_FILE, habits));

// ── Pomodoro ──
ipcMain.handle("get-pomodoro", () => readJSON(POMODORO_FILE));
ipcMain.handle("save-pomodoro", (_e, data) => writeJSON(POMODORO_FILE, data));

// ── Settings ──
ipcMain.handle("get-settings", () => readJSON(SETTINGS_FILE));
ipcMain.handle("save-settings", (_e, s) => writeJSON(SETTINGS_FILE, s));
