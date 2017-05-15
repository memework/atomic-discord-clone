const IsNode = typeof process == "undefined" ? false : true
let notifier
let shell
let bot
let atomicRevision = "N/A"
let litecordRevision = "N/A"
if (IsNode) {
  notifier = require("node-notifier")
  shell = require("electron").shell
  $(".git-revision").text("A:" + atomicRevision + " - L:N/A")
}
if (!window.localStorage.getItem("token")) window.location.href = "login.html"
const cdn = "https://cdn.discordapp.com"
const endpoint = "http://litecord.memework.org/api"
let shortcodes = {} // require('./emojis.json') // We just leave this empty before the request finishes so the page will still load
$.get("emojis2.json", function (result) {
  if (typeof result != "object") result = JSON.parse(result)
  shortcodes = result
})

$.get(endpoint + "/version", function (result) {
  if (typeof result != "object") result = JSON.parse(result)
  litecordRevision = result.version.substring(0, 7)
  $(".git-revision").text("A:" + atomicRevision + " - L:" + litecordRevision)
})

$.get("version.txt", function (result) {
  atomicRevision = result
  $(".git-revision").text("A:" + atomicRevision + " - L:" + litecordRevision)
})

// Uncomment this for first run... I just don't like having to change this every time :^)
// window.localStorage.setItem("token", "CHANGE THIS PLES") // In production, this gets set by the login page

const inviteexp = / /
const urlexp = /(http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/gi
const imgexp = /(http)?s?:?(\/\/[^"']*\.(?:png|jpg|jpeg|gif|png|svg))/gi
function addMessageToDOM(messageInfo, complete) {
  let { user, userID, channelID, messageID, serverID, message, event, timestamp, attachments } = messageInfo
  message = bot.fixMessage(message).replace(/\n/g, "<br>") // Just to make it a bit more readable while we have no mentions set up
  let channel = bot.channels[channelID]
  let serverName = bot.servers[serverID] ? bot.servers[serverID].name : ""
  if (window.channelID != channelID) return
  document.getElementById("message-input").setAttribute("placeholder", "Message #" + channel.name || "")
  // ChannelChange(channelID)
  window.channelID = channelID
  // We got a new message
  let container = document.createElement("div")
  let msgobj = document.createElement("div")
  let title = document.createElement("h2")
  title.innerText = user + (bot.users[userID].bot ? " [BOT]" : "")
  title.classList = "username"
  msgobj.appendChild(title)
  let avatarurl = "https://discordapp.com/assets/dd4dbc0016779df1378e7812eabaa04d.png"
  if(event.d.author.avatar) avatarurl = `${cdn}/avatars/${userID}/${event.d.author.avatar}.webp?size=64`
  let avatar = document.createElement("img")
  avatar.src = avatarurl
  avatar.classList = "avatar"

  let content = document.createElement("div")
  content.classList = "content"

  let images = document.createElement("div")
  images.classList = "images"

  let time = document.createElement("time")
  time.classList = "message-timestamp"
  time.dateTime = timestamp
  time.innerText = $.timeago(timestamp)
  $(time).ready(() => {
    $(time).timeago()
  })
  msgobj.appendChild(time)

  for (let short in shortcodes) {
    let myemotes = ""
    shortcodes[short].split("-").forEach(code => {
      myemotes += twemoji.convert.fromCodePoint(code)
    })
    message = message.replace(new RegExp(":" + short + ":"), myemotes) // Here we replace the emotes with their HTML representations
  }

  args = message.split(/\s/g)
  for (let itm in args) {
    if (urlexp.test(args[itm])) {
      let link = args[itm]
      let anode = document.createElement("a")
      anode.onclick = () => {
        if (IsNode) shell.openExternal(link)
        else window.open(link, "_blank").focus()
      }
      anode.href = "#"
      anode.innerHTML = link
      content.innerHTML += " "
      if (link.match(imgexp)) {
        let imgnode = document.createElement("img")
        imgnode.onload = () => {
          imgnode.style.background = "none"
        }
        imgnode.src = "https://images.weserv.nl/?url=" + encodeURI(link.replace(/http(s|):\/\//i, ""))
        images.appendChild(imgnode)
      } else if (link.match(inviteexp)) {
        let inv = link.replace(invitebase, "")
        bot.queryInvite(inv, function (err, resp) {
          if (err) return console.log(err)
          anode.innerHTML = resp.name + " "
          anode.onclick = () => {
            bot.acceptInvite(inv, function (err, resp) {
              loadServers()
              ChannelChange(resp.id)
            })
          }
        })
      }
      content.appendChild(anode)
    } else if (emojiexp.test(args[itm])) {
      let colsplit = args[itm].split(":")
      let link = `${cdn}/emojis/${colsplit[colsplit.length - 1].substring(0, colsplit[colsplit.length - 1].length - 1)}.png`
      // console.log(link)
      let imgnode = document.createElement("img")
      imgnode.classList = "emoji"
      imgnode.src = "https://images.weserv.nl/?url=" + encodeURI(link.replace(/http(s|):\/\//i, ""))
      content.innerHTML += " " + imgnode.outerHTML
    } else {
      content.innerHTML += " " + twemoji.parse(args[itm])
    }
  }

  for (let att in event.d.attachments) {
    let imgnode = document.createElement("img")
    imgnode.onload = () => {
      imgnode.style.background = "none"
    }
    imgnode.src = event.d.attachments[att].proxy_url
    images.appendChild(imgnode)
  }

  let deletebtn = document.createElement("div")
  deletebtn.onclick = function () {
    bot.deleteMessage({
      channelID: channelID,
      messageID: messageID
    }, (err) => {
      if (err && err != "ResponseError: Error: SyntaxError: Unexpected end of JSON input") return alert("Error while deleting message: " + err)
      // We don't remove it from the DOM because the messageDelete event is fired
    })
  }
  deletebtn.innerHTML = "<i class=\"fa fa-trash-o jumbotxt\" aria-hidden=\"true\"></i>"

  // content.innerHTML = args.join(" ")
  complete({
    avatar,
    content,
    images,
    msgobj,
    container,
    deletebtn
  })

  if (userID != bot.id) {
    // notifier.notify({
    //     title: "Message from " + user + ":",
    //     message
    // })
  }
}

function BotListeners() { // This is not indented on purpose as it's most of the code...

  bot.on("message", function (user, userID, channelID, message, event) {
    addMessageToDOM({
      user,
      userID,
      channelID,
      serverID: bot.channels[channelID] ? bot.channels[channelID].guild_id : channelID,
      messageID: event.d.id,
      message,
      event,
      timestamp: event.d.timestamp
    }, function (nodes) {
      let { avatar, content, images, msgobj, container, deletebtn } = nodes

      container.appendChild(avatar)
      msgobj.appendChild(content)
      msgobj.appendChild(images)
      container.id = "msg-" + event.d.id
      container.classList = "message"
      msgobj.classList = "message-inner"
      container.appendChild(msgobj)
      container.appendChild(deletebtn)
      document.getElementById("messages").appendChild(container)
      // messages.appendChild(document.createElement("br"))

      document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight + 10 // Scroll to bottom of page
    })
  })

  bot.on("messageUpdate", (oldmsg, newmsg) => {
    if (!oldmsg || oldmsg.channel_id != window.channelID) return console.log("Skipping nonexistant message update...")
    let message = newmsg.content
    let container = document.getElementById("msg-" + oldmsg.id)
    // if (!newmsg.content) return document.getElementById(`msg-${oldmsg.id}`).remove()

    addMessageToDOM({
      user: oldmsg.author.username,
      userID: oldmsg.author.id,
      channelID,
      serverID: bot.channels[channelID].guild_id,
      messageID: oldmsg.id,
      message,
      event: {
        d: {
          author: oldmsg.author
        }
      },
      timestamp: oldmsg.timestamp
    }, function (items) {
      let { content, images } = items
      container.getElementsByTagName("div")[0].replaceChild(content, document.body.querySelectorAll(`div#msg-${oldmsg.id} > div > div.content`)[0])
      container.getElementsByTagName("div")[0].replaceChild(images, document.body.querySelectorAll(`div#msg-${oldmsg.id} > div > div.images`)[0])
    })
  })

  bot.on("messageDelete", evnt => {
    let { channel_id, id } = evnt.d
    if (channel_id != window.channelID) return console.log("Skipping nonexistent message deletion...")
    document.getElementById("msg-" + id).remove()
  })

  bot.on("ready", function () {
    if (IsNode) {
      notifier.notify({
        title: "Connected to Discord!",
        message: "Successfully connected to Discord!"
      })
    }
    window.channelID = window.localStorage.getItem("lastchannel") || Object.keys(bot.channels)[0]

    window.currentMessages = {
      channelID: window.channelID,
      arr: []
    }
    ChannelChange(window.channelID, true)
    console.log("Ready")
    loadChannels()
    loadMembers()
    setTimeout(function () {
      loadServers()
      loadMessages(true)
    }, 1000)
  })

  let disconnectsInTimeout = 0

  bot.on("disconnect", (err) => {
    if (err == "Authentication Failed") return window.location.href = "login.html"
    let verb = loadingLines.verbs[Math.floor(Math.random() * loadingLines.verbs.length)]
    let adjective = loadingLines.adjectives[Math.floor(Math.random() * loadingLines.adjectives.length)]
    let noun = loadingLines.nouns[Math.floor(Math.random() * loadingLines.nouns.length)]
    $("#loading-line").html(`${verb} ${adjective} ${noun}`)
    $("#loading-landing").css("display", "block")
    let theTime = new Date().getTime()
    if (IsNode) {
      notifier.notify({
        title: "Disconnected to Discord!",
        message: "Oh snap! I lost connection to Discord! Attempting to reconnect..."
      })
    }
    disconnectsInTimeout += 1
    setInterval(() => {
      disconnectsInTimeout -= 1
    }, 60 * 1000)
    if (disconnectsInTimeout > 3) {
      if (IsNode) notifier.notify({
        title: "Unable to connect to Discord!",
        message: "Sorry! Looks like I can't connect to Discord :( I've lost connection more than 3 times in the last minute!"
      })
      // return
    }
    bot.connect()
    console.log("Error: " + err)
  })
}

let loadingLines = {
  verbs: [
    "Loading",
    "Enabling",
    "Downloading",
    "Uploading",
    "Generating",
    "Disabling",
    "Deleting",
    "Nuking",
    "Initializing",
    "Leaving",
    "Verbing",
    "Reticulating",
    "Banning",
    "Exploiting",
    "Resurrecting",
    "Reviving",
    "Amputating",
    "Bleaching",
    "Aging",
    "Discarding",
    "Inserting",
    "Searching",
    "Warming",
    "Calibrating",
    "Paging",
    "Excavating",
    "Evacuating",
    "Counting",
    "Testing",
    "Launching",
    "Burning",
    "Hunting",
    "Negotiating For The",
    ""
  ],
  adjectives: [
    "New",
    "Old",
    "Gray",
    "Yellow",
    "Fancy",
    "Sentient",
    "Intelligent",
    "Weird",
    "Unsaved",
    "Dumb",
    "Dead",
    "Useless",
    "Unconscious",
    "Underused",
    "Freaky",
    "Robot",
    "Buggy",
    "Bannable",
    "Spoopy",
    "Annoying",
    "Atomic",
    "Little",
    "Large",
    "Tiny",
    "Small",
    "Cheesy",
    "Backwards",
    "Inifnite",
    "The",
    "1337",
    "B1nzy's",
    "Jake's",
    "Heating's",
    "Luna's",
    "Generic's",
    "Null's",
    ""
  ],
  nouns: [
    "Hammers",
    "Buttons",
    "Chisels",
    "Nouns",
    "Syringes",
    "Splines",
    "Ozones",
    "Memes",
    "Users",
    "Guilds",
    "Pixels",
    "Pineapples",
    "Cannons",
    "Sweatshirts",
    "Files",
    "Chrome Installations",
    "Adobe Flash Players",
    "Java Versions",
    "Loading Lines",
    "Bananna Peels",
    "Changes",
    "Admins",
    "B1nzy",
    "Missiles",
    "Generics",
    "Heatingdevices",
    "Cheese wedges",
    "Jokes",
    "Puns",
    "Eggs",
    "Soon&trade; Replies",
    "Trains",
    "Noots",
    "Flux Capacitors",
    "Quarters",
    "Evidences",
    "B1nzy Pings",
    "Maps",
    "Databases",
    "Datacenters",
    "Servers",
    "Tokens",
    "Dinosaurs",
    "CLAAAAAAAAAAASs",
    "Litecords",
    "H4xx0rs",
    "•w•s",
    "Temperatures",
    "Doctors",
    "Sysadmins",
    "Jake",
    "Nelly",
    "Hamsters",
    "🤔",
    "Thonk Hours",
    "Cups",
    "Pens",
    "Cars",
    "Emojis",
    "Roads",
    "Trees",
    "Grass",
    "Fences",
    "Signs",
    "Sciences",
    "Terrorists",
    "Goblins",
    "Vikings",
    "Raptors",
    "Dinosaurs",
    "ADDITIONAL PYLONS",
    "Count Chocula",
    "Horses",
    "Darth Vader",
    "Hot Pockets",
    "Bill Nye the Science Guy&trade; <strike>Dolls</strike> <strong>Action Figures</strong>",
    "Bieber",
    "Batman",
    "Superman",
    "NotDiscord&trade;",
    "Reddit",
    "Wolfiri",
    "Credit Cards",
    "Accounts",
    "Passowrds",
    "JAVASCRIPTZZZ",
    "PC Masterrace",
    "Console Masterrace",
    "Mobile Gamers *Giggle*",
    "/v/",
    "4chan",
    "Deep Web",
    "WABBIT SEASON",
    "Wi-Fi Password",
    ""
  ],
}

$(document).ready(function () {
  $(document).on("keypress", function (e) {
    var tag = e.target.tagName.toLowerCase()
    if (tag != "input" && tag != "textarea" && tag != "select") {
      $(".twemoji-textarea").focus()
    }
  })
  $(".git-revision").text("A:" + atomicRevision + " - L:" + litecordRevision)
  bot = new Discord.Client({
    token: window.localStorage.getItem("token"),
    autorun: true
  })

  BotListeners()
  document.getElementById("file-upload").onchange = function (ev) {
    let fr = new FileReader()
    fr.onload = function (result) {
      bot.uploadFile({
        to: window.channelID,
        file: new Buffer(this.result),
        filename: ev.target.files[0].name
      }, function (err, resp) {
        if (err) console.log(err, resp)
        console.log(resp)
      })
    }
    fr.readAsArrayBuffer(ev.target.files[0])
  }
  document.getElementById("avatar-upload").onchange = function (ev) {
    let fr = new FileReader()
    fr.onload = function (result) {
      let base64 = this.result.replace(/data:.*,/, "")
      bot.editUserInfo({
        avatar: base64
      }, function (err, resp) {
        if (err) console.log(err, resp)
        console.log(resp)
      })
    }
    fr.readAsDataURL(ev.target.files[0])
  }
  let verb = loadingLines.verbs[Math.floor(Math.random() * loadingLines.verbs.length)]
  let adjective = loadingLines.adjectives[Math.floor(Math.random() * loadingLines.adjectives.length)]
  let noun = loadingLines.nouns[Math.floor(Math.random() * loadingLines.nouns.length)]
  $("#loading-line").html(`${verb} ${adjective} ${noun}`)
  $("#connection-problems > a").click(() => {
    console.log(this.href)
    shell.openExternal(this.href)
  })
  $("#message-input").twemojiPicker({
    height: "2.5rem",
    width: "100%",
    pickerPosition: "top",
    pickerHeight: "400px",
    pickerWidth: "45%",
    categorySize: "30px",
    size: "35px",
  })
  let messageInput = document.getElementById("message-input")
  // $("#message-input").emojioneArea()
  document.querySelector("div[contenteditable=\"true\"]").addEventListener("paste", function (e) {
    e.preventDefault()
    var text = e.clipboardData.getData("text/plain")
    document.execCommand("insertHTML", false, text)
  })
  $(".twemoji-textarea").on("keydown", function (e) {
    if (!e) e = window.event
    var keyCode = e.keyCode || e.which
    if (keyCode == "13" && !e.shiftKey) { // We ignore enter key if shift is held down, just like the real client
      e.preventDefault()
      if (messageInput.value.split(" ")[0] == "/join") {
        ChannelChange(messageInput.value.split(" ")[1])
        return
      }
      let temp = document.createElement("div")
      temp.innerHTML = $("#message-input").text()
      // $("#message-input").text().replace(/<br>/gi, "\n").replace(/<div>/gi, "").replace(/<\/div>/gi, "").replace(/&lt/gi, "<").replace(/&gt/gi, ">")
      bot.sendMessage({
        to: window.channelID,
        message: temp.innerText
      })
      $("#message-input, .twemoji-textarea, .twemoji-textarea-duplicate").text("")
    }
  })
  $("#messages").scroll(function () {
    if ($(this).scrollTop() === 0) {
      console.log("TOP!")
      loadMessages()
    }
  })
})

function ChannelChange(channelID, silent) {
  if (window.channelID == channelID) return // We're already in the channel...
  window.localStorage.setItem("lastchannel", channelID)
  let channel = bot.channels[channelID]
  // if (!channel) return console.log("Skipping channel that doesn't exist")
  let server = bot.servers[channel.guild_id]
  document.title = `#${channel.name} in ${server.name} - ${channel.topic}`
  if (!silent) {
    let changemsg = document.createElement("div")
    changemsg.classList = "info-message"
    changemsg.innerHTML = `Changed to #${channel.name} on ${server.name} - ${channel.topic ? channel.topic : "<no channel topic>"}`
    document.getElementById("messages").appendChild(changemsg)
  }
  window.channelID = channelID
  document.getElementById("member-list").innerHTML = ""
  loadChannels()
  loadMessages()
  loadMembers(0)
}

function loadMembers() {
  let mem = bot.servers[bot.channels[window.channelID].guild_id].members
  let members = []
  for (let m in mem) {
    members.push(mem[m])
  }
  members.forEach(function (user) {
    let avatarurl = "https://discordapp.com/assets/dd4dbc0016779df1378e7812eabaa04d.png"
    if (user.avatar) avatarurl = `${cdn}/avatars/${user.id}/${user.avatar}.webp?size=256`
    let container = document.createElement("div")
    let avatar = document.createElement("img")
    let username = document.createElement("h2")
    username.innerText = user.username
    avatar.src = avatarurl
    avatar.classList = "member-list-avatar"
    container.classList = "member-list-member"
    username.classList = "member-list-username"
    container.appendChild(avatar)
    container.appendChild(username)
    document.getElementById("member-list").appendChild(container)
  })
}

let emojiexp = /<:\S*:[0-9]{18}>/gi

function loadMessages(hideLoaderAfter) { // TODO: Move this to a web worker
  let options = {
    channelID: window.channelID,
    limit: 100,
    before: 0
  }
  if (window.currentMessages.channelID == channelID && window.currentMessages.arr.length > 0) options.before = window.currentMessages.arr[0].id
  bot.getMessages(options, (err, messages) => {
    let oldScrollHeight = document.getElementById("messages").scrollHeight
    // if (window.currentMessages.channelID == channelID && window.currentMessages.arr.length > 0) messages.reverse()
    let scrolltobottom = window.currentMessages.channelID == window.channelID
    if (scrolltobottom) {
      for (let itm in messages) {
        window.currentMessages.arr.unshift(messages[itm])
      }
    } else {
      window.currentMessages = {
        channelID: window.channelID,
        arr: messages.reverse()
      }
      document.getElementById("messages").innerHTML = ""
      messages.reverse()
    }

    let len = messages.length

    if(len <= 0) {
      if (hideLoaderAfter) $("#loading-landing").css("display", "none")
      if (scrolltobottom) document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight - oldScrollHeight
      else document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight
      return
    }
    
    messages.forEach(function (curmsg, i) {
      // let curmsg = messages[itm]

      if (!curmsg || !curmsg.author) return
      let message = curmsg.content
      let user = curmsg.author.username
      let userID = curmsg.author.id
      let channelID = curmsg.channel_id
      let event = {
        d: curmsg
      }
      let timestamp = curmsg.timestamp

      addMessageToDOM({
        user,
        userID,
        channelID,
        serverID: bot.channels[channelID].guild_id,
        messageID: event.d.id,
        message,
        event,
        timestamp
      }, function (items) {
        let { avatar, content, images, msgobj, container, deletebtn } = items
        container.appendChild(avatar)
        msgobj.appendChild(content)
        msgobj.appendChild(images)
        container.id = "msg-" + event.d.id
        container.classList = "message"
        msgobj.classList = "message-inner"
        container.appendChild(msgobj)
        container.appendChild(deletebtn)
        document.getElementById("messages").insertBefore(container, document.getElementById("messages").childNodes[0])
      })
      console.log("Adding message")
      if (i + 1 >= len) {
        if (hideLoaderAfter) $("#loading-landing").css("display", "none")
        if (scrolltobottom) document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight - oldScrollHeight
        else document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight
      }
    })
  })
}

function loadServers() {
  document.getElementById("server-list").innerHTML = "" // Empty it since we might have something left after we get kicked off because an error happened
  let srvlist = bot.internals.settings.guild_positions || Object.keys(bot.servers)
  srvlist.forEach(function (srv) {
    let server = bot.servers[srv]
    if (!server) {
      console.log("Skipping " + server)
      return
    }
    let servericon = `${cdn}/icons/${server.id}/${server.icon}.webp?size=256`
    if (!server.icon) servericon = "https://dummyimage.com/256x256/ffffff/000000.png&text=" + encodeURI(((server.name || "E R R O R").match(/\b(\w)/g) || ["ERROR"]).join(""))
    if (server.unavailable) servericon = "unavailable.png"
    let servernode = document.createElement("a")
    servernode.href = "#"
    servernode.classList = "server-icon"
    let serverimg = document.createElement("img")
    serverimg.src = servericon
    serverimg.classList = "server-image"
    serverimg.onload = () => {
      serverimg.style.background = "none"
    }
    servernode.appendChild(serverimg)
    servernode.id = server.id
    servernode.onclick = function () {
      ChannelChange(server.id, true)
    }
    document.getElementById("server-list").insertBefore(servernode, null)
  })
}

function loadChannels() {
  document.getElementById("channel-container").innerHTML = ""
  if (!bot.channels[channelID]) return
  let channelsob = bot.servers[bot.channels[channelID].guild_id].channels
  let channels = []
  for (let i in channelsob) {
    channels.push(channelsob[i])
  }
  channels = channels.sort(function (a, b) {
    return a.position - b.position
  })
  for (let srv in channels) {
    let channel = channels[srv]
    if (channel.type != "text") continue // We don't do voice channels atm... OR VIDEO CHANNELS DISCORD VIDEO SUPPORT COMING SOON™ CONFIRMED!!!1!!!!!
    let channelnode = document.createElement("div")
    channelnode.href = "#"
    channelnode.classList = "channel-btn"
    channelnode.appendChild(document.createTextNode("#" + channel.name))
    channelnode.id = channel.id
    channelnode.onclick = function () {
      ChannelChange(channel.id, true)
    }
    document.getElementById("channel-container").appendChild(channelnode)
  }
}
