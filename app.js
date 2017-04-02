const {app, BrowserWindow} = require('electron');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
      height: 600,
      width: 1000
  });

  mainWindow.loadURL('file://' + __dirname + '/web/serverview.html');
});
