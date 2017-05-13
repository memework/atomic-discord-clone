const { app, BrowserWindow, ipcMain } = require('electron');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 1000
  });

  mainWindow.loadURL('file://' + __dirname + '/web/serverview.html');
});

app.on('browser-window-created', function (e, window) {
  window.setMenu(null);
  window.webContents.openDevTools({ detach: true }); // This will be gone in production
});

let Discord = require("./web/discord.io.js")
// let mic = require('mic');
// let micInstance = mic({ 'rate': '16000', 'channels': '1', 'debug': true, 'exitOnSilence': 6 });
// microphone = micInstance.getAudioStream();
let Speaker = require("speaker")

ipcMain.on("token", (event, arg) => {
  let bot = new Discord.Client({
    token: arg,
    autorun: true
  });
  bot.on("ready", () => {
    console.log("ready")
    voiceChannel("303387577346555905")
    event.sender.send("voice-ready")
  })
  function voiceChannel(channelID) {
    bot.joinVoiceChannel(channelID, function (err) {
      micInstance.start(0)
      if (err) return alert("Error joining voice channel: " + err)
      bot.getAudioContext({ channelID, maxStreamSize: 50 * 1024 }, function (error, stream) {
        if (error) return alert("Error getting audio context for channel: " + error)
        stream.pipe(new Speaker())
        // microphone.pipe(stream, { end: false })
      })
    })
  }
  ipcMain.on("voice-channel", function (event, args) {
    console.log("VC")
    voiceChannel(args)
  })
})