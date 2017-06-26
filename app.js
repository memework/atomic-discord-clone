const {app, BrowserWindow} = require("electron")

var mainWindow
require("electron-debug")({enabled: true})
app.on("ready", () => {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1300,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#2C2F33"
  })

  mainWindow.loadURL("file://" + __dirname + "/web/serverview.html")
})

app.on("browser-window-created", function(e, window) {
  window.setMenu(null)
  // window.webContents.openDevTools({detach:true}) // This will be gone in production
})