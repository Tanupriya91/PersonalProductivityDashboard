const { app, BrowserWindow ,ipcMain,Menu} = require("electron");
const path = require("path");
const fs   = require("fs");
const { stringify } = require("querystring");

const filepath= path.join(__dirname ,"tasks.json")

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile("index.html");
}

app.whenReady().then(createWindow);
if(!fs.existsSync(filepath)){
  fs.writeFileSync(filepath,JSON.stringify([]));
}
ipcMain.handle("get-tasks",()=>{
  const data=fs.readFileSync(filepath);
  return JSON.parse(data);
});
ipcMain.handle("save-tasks",(event,tasks)=>{
  fs.writeFileSync(filepath,JSON.stringify(tasks));
});
