const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getTasks: () => ipcRenderer.invoke("get-tasks"),
  saveTasks: (tasks) => ipcRenderer.invoke("save-tasks", tasks),
});