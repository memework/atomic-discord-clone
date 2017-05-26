const {app, BrowserWindow} = require("electron")

let mainWindow

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 1000,
    darkTheme: true // Make it look nice on some GTK desktops until we get rid of that ugly taskbar ;)
  })

  mainWindow.loadURL("file://" + __dirname + "/web/serverview.html")
})

app.on("browser-window-created", function(e, window) {
  window.setMenu(null)
  window.webContents.openDevTools({detach:true}) // This will be gone in production
})