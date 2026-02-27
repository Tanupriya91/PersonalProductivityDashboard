const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Tasks
  getTasks: () => ipcRenderer.invoke("get-tasks"),
  saveTasks: (tasks) => ipcRenderer.invoke("save-tasks", tasks),
  // Notes
  getNotes: () => ipcRenderer.invoke("get-notes"),
  saveNotes: (notes) => ipcRenderer.invoke("save-notes", notes),
  // Habits
  getHabits: () => ipcRenderer.invoke("get-habits"),
  saveHabits: (habits) => ipcRenderer.invoke("save-habits", habits),
  // Pomodoro
  getPomodoro: () => ipcRenderer.invoke("get-pomodoro"),
  savePomodoro: (data) => ipcRenderer.invoke("save-pomodoro", data),
  // Settings
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (s) => ipcRenderer.invoke("save-settings", s),
});