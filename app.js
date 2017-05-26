const {app, BrowserWindow} = require("electron")

let mainWindow

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 1000,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#2C2F33"
  })

  mainWindow.loadURL("file://" + __dirname + "/web/serverview.html")
})

app.on("browser-window-created", function(e, window) {
  window.setMenu(null)
  window.webContents.openDevTools({detach:true}) // This will be gone in production
})