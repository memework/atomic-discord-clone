const IsNode = typeof process == "undefined" ? false : true
let notifier
let shell
let bot
let atomicRevision = "N/A"
let litecordRevision = "N/A"
let chalk
let conzole = console // Hack to fool ESLint
let logger = {
  log: function (msg) {
    let txt = `[ INFO ] ${msg}`
    if (IsNode) process.stdout.write("[ " + chalk.blue("INFO") + " ] " + chalk.blue(msg) + "\n")
    conzole.log(txt)
  },
  warn: function (msg) {
    let txt = `[ WARN ] ${msg}`
    if (IsNode) process.stdout.write("[ " + chalk.yellow("WARN") + " ] " + chalk.yellow(msg) + "\n")
    conzole.warn(txt)
  },
  error: function (msg) {
    let txt = `[ ERROR ] ${msg}`
    if (IsNode) process.stdout.write("[ " + chalk.red("ERROR") + " ] " + chalk.red(msg) + "\n")
    conzole.error(txt)
  },
  debug: function (msg) {
    let txt = `[ DEBUG ] ${msg}`
    if (IsNode) process.stdout.write("[ " + chalk.grey("DEBUG") + " ] " + chalk.bgWhite(chalk.grey(msg)) + "\n")
    conzole.log(txt)
  },
  ok: function (msg) {
    let txt = `[ SUCCESS ] ${msg}`
    if (IsNode) process.stdout.write("[ " + chalk.green("SUCCESS") + " ] " + chalk.green(msg) + "\n")
    conzole.log(txt)
  }
}
if (IsNode) {
  chalk = require("chalk")
  notifier = require("node-notifier")
  shell = require("electron").shell
  $(".git-revision").text("A:" + atomicRevision + " - L:N/A")
}
if (!window.localStorage.getItem("token")) window.location.href = "login.html"
const cdn = "https://cdn.discordapp.com"
const endpoint = "http://litecord.memework.org/api"
const inviteBase = "https://discord.gg"
let shortcodes = {} // We just leave this empty before the request finishes so the page will still load
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

function sanitizeHTML(content) {
  return $("<pre>").text(content).html().replace(/\n/g, "<br>")
}

function parseDiscordEmotes(content) {
  let arr = content.innerHTML.match(/&lt;:\S*:[0-9]{18}&gt;/gi)
  if (!arr) arr = []
  for (let itm in arr) {
    let emote = arr[itm]
    let colsplit = emote.split(":")
    let link = `${cdn}/emojis/${colsplit[colsplit.length - 1].substring(0, colsplit[colsplit.length - 1].length - 4)}.png`
    let imgnode = document.createElement("img")
    imgnode.classList = "emoji"
    imgnode.style.background = "none"
    // imgnode.height = "22px"
    // imgnode.width = "22px"
    imgnode.style.maxWidth = "22px"
    imgnode.style.whiteSpace = "nowrap"
    imgnode.style.display = "inline"
    imgnode.style.verticalAlign = "top"

    imgnode.src = link
    imgnode.alt = emote
    content.innerHTML = content.innerHTML.replace(emote, imgnode.outerHTML)
  }
  return content
}

function createLinksAndImages(content, images) {
  let temphtml = content.innerHTML.replace(/```.*```/g, "").replace(/`.*`/g, "") // Big hack...
  let arr = temphtml.match(urlexp)
  for (let itm in arr) {
    let link = arr[itm]
    logger.debug("Adding " + link + " to DOM")
    let anode = document.createElement("a")
    anode.onclick = function() {
      if (IsNode) shell.openExternal(link)
      else window.open(link, "_blank").focus()
    }
    anode.href = "#"
    anode.innerHTML = link
    content.innerHTML = content.innerHTML.replace(link, anode.outerHTML)
    if (link.match(imgexp)) {
      logger.debug("Adding " + link + " as an image...")
      let imgnode = document.createElement("img")
      imgnode.src = "https://images.weserv.nl/?url=" + encodeURI(link.replace(/http(s|):\/\//i, ""))
      imgnode.onload = function() {
        imgnode.style.background = "none"
      }
      imgnode.onerror = function () {
        imgnode.remove()
        logger.warn("Failed to load image " + imgnode.src)
      }
      images.appendChild(imgnode)
    }
  }
  return {
    links: content,
    imghtml: images
  }
}

function parseMarkdown(content) {
  let txt = content.innerHTML
  let bold = txt.match(/\*\*.*\*\*/g)
  for(let i in bold) {
    logger.debug("Bold")
    let match = bold[i]
    txt = txt.replace(match, "<b>" + match.replace(/\*\*/g, "") + "</b>")
  }
  let underlined = txt.match(/__.*__/g)
  for(let i in underlined) {
    logger.debug("Underline")
    let match = underlined[i]
    txt = txt.replace(match, "<underline>" + match.replace(/\_\_/g, "") + "</underline>")
  }
  let italics =  txt.match(/(\*.*\*|_.*_)/g)
  for(let i in italics) {
    logger.debug("Italics")
    let match = italics[i]
    txt = txt.replace(match, "<i>" + match.replace(/\*/g, "").replace(/\_/g, "") + "</i>")
  }
  let strikethrough = txt.match(/~~.*~~/g)
  for(let i in strikethrough) {
    logger.debug("Strikethru")
    let match = strikethrough[i]
    txt = txt.replace(match, "<strike>" + match.replace(/~~/g, "") + "</strike>")
  }
  let codeblock = txt.match(/```[\s\S]*```/g)
  for(let i in codeblock) {
    logger.debug("Codeblock")
    let match = codeblock[i]
    let finaltext = match.replace(/```/g, "")
    let lang = finaltext.split("<br>")[0].toLowerCase()
    logger.debug("CODEBLOCK LANG: " + lang)
    if(hljs.getLanguage(lang)) {
      finaltext = finaltext.replace(new RegExp(lang, "i"), "")
      lang = "lang-" + lang
    } else lang = "nohighlight"
    finaltext = `<code class="codeblock ${lang}">${finaltext.replace(/^<br>+|<br>+$/gm, "")}</code>`
    txt = txt.replace(match, finaltext)
  }
  let code = txt.match(/`.*`/g)
  for(let i in code) {
    logger.debug("Code")
    let match = code[i]
    txt = txt.replace(match, "<code>" + match.replace(/`/g, "") + "</code>")
  }
  content.innerHTML = txt
  return content
}

const urlexp = /(http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/gi
const imgexp = /(http)?s?:?(\/\/[^"']*\.(?:png|jpg|jpeg|gif|png|svg))/gi
function addMessageToDOM(messageInfo, complete) {
  let { user, userID, channelID, message, event, timestamp } = messageInfo
  message = bot.fixMessage(message) // Just to make it a bit more readable while we have no mentions set up
  let channel = bot.channels[channelID]
  if (window.channelID != channelID) return
  document.getElementById("message-input").setAttribute("placeholder", "Message #" + channel.name || "")
  window.channelID = channelID
  // We got a new message
  let container = document.createElement("div")
  let msgobj = document.createElement("div")
  let title = document.createElement("h2")
  title.textContent = user + (bot.users[userID] && bot.users[userID].bot ? " [BOT]" : "")
  title.classList = "username"
  msgobj.appendChild(title)
  let avatarurl = "https://discordapp.com/assets/dd4dbc0016779df1378e7812eabaa04d.png"
  if (event.d.author.avatar) avatarurl = `${cdn}/avatars/${userID}/${event.d.author.avatar}.webp?size=64`
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
  time.textContent = $.timeago(timestamp)
  $(time).ready(function() {
    $(time).timeago()
  })
  msgobj.appendChild(time)

  for (let short in shortcodes) {
    let myemotes = ""
    shortcodes[short].split("-").forEach(function(code) {
      myemotes += twemoji.convert.fromCodePoint(code)
    })
    message = message.replace(new RegExp(":" + short + ":"), myemotes) // Here we replace the emotes with their HTML representations
  }

  content.innerHTML = sanitizeHTML(message)
  let { imghtml, links } = createLinksAndImages(content, images)
  content = links
  images = imghtml
  content = parseDiscordEmotes(content)
  content = parseMarkdown(content)
  content.innerHTML = twemoji.parse(content.innerHTML)
  $(content).ready(function() {
    $(content).find(".codeblock").not(".nohighlight").each(function(i, block) {
      hljs.highlightBlock(block)
    })
  })

  for (let att in event.d.attachments) {
    let imgnode = document.createElement("img")
    imgnode.src = event.d.attachments[att].proxy_url
    imgnode.onload = function () {
      imgnode.style.background = "none"
    }
    imgnode.onerror = function () {
      imgnode.destroy()
      logger.warn("Failed to load image " + imgnode.src)
    }
    images.appendChild(imgnode)
  }

  complete({
    avatar,
    content,
    images,
    msgobj,
    container
  })

  if (userID != bot.id) {
    // notifier.notify({
    //     title: "Message from " + user + ":",
    //     message
    // })
  }
}

function BotListeners() {

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
      let { avatar, content, images, msgobj, container } = nodes

      container.appendChild(avatar)
      msgobj.appendChild(content)
      msgobj.appendChild(images)
      container.id = "msg-" + event.d.id
      container.classList = "message"
      if (userID == bot.id) container.classList += " my-message"
      msgobj.classList = "message-inner"
      container.appendChild(msgobj)
      document.getElementById("messages").appendChild(container)

      document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight + 10 // Scroll to bottom of page
    })
  })

  bot.on("messageUpdate", function(oldmsg, newmsg) {
    if (!oldmsg || oldmsg.channel_id != window.channelID) return
    let message = newmsg.content
    let container = document.getElementById("msg-" + oldmsg.id)

    addMessageToDOM({
      user: oldmsg.author.username,
      userID: oldmsg.author.id,
      channelID: window.channelID,
      serverID: bot.channels[window.channelID].guild_id,
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

  bot.on("messageDelete", function(evnt) {
    let { channel_id, id } = evnt.d
    if (channel_id != window.channelID) return
    document.getElementById("msg-" + id).remove()
  })

  bot.on("ready", function () {
    window.channelID = window.localStorage.getItem("lastchannel") || Object.keys(bot.channels)[0]

    window.currentMessages = {
      channelID: window.channelID,
      arr: []
    }
    ChannelChange(window.channelID, true)
    loadChannels()
    loadMembers()
    setTimeout(function () {
      loadServers()
      loadMessages(true)
    }, 1000)
  })

  let disconnectsInTimeout = 0

  bot.on("disconnect", function(err) {
    if (err == "Authentication Failed") return window.location.href = "login.html"
    let verb = loadingLines.verbs[Math.floor(Math.random() * loadingLines.verbs.length)]
    let adjective = loadingLines.adjectives[Math.floor(Math.random() * loadingLines.adjectives.length)]
    let noun = loadingLines.nouns[Math.floor(Math.random() * loadingLines.nouns.length)]
    $("#loading-line").html(`${verb} ${adjective} ${noun}`)
    $("#loading-landing").css("display", "block")
    // This is wayyyy to annoying
    // if (IsNode) {
    //   notifier.notify({
    //     title: "Disconnected to Discord!",
    //     message: "Oh snap! I lost connection to Discord! Attempting to reconnect..."
    //   })
    // }
    disconnectsInTimeout += 1
    setInterval(function() {
      disconnectsInTimeout -= 1
    }, 5 * 60 * 1000)
    if (disconnectsInTimeout > 3) {
      if (IsNode) notifier.notify({
        title: "Unable to connect to Discord!",
        message: "Sorry! Looks like I can't connect to Discord :( I've lost connection more than 3 times in the last 5 minutes!"
      })
      return
    }
    bot.connect()
    logger.log("Error: " + err)
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
    "Smol",
    "Tol",
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
    "logger Masterrace",
    "Mobile Gamers *Giggle*",
    "/v/",
    "4chan",
    "Deep Web",
    "WABBIT SEASON",
    "Wi-Fi Password"
  ],
}

$(document).ready(function () {
  $(document).on("keypress", function (e) {
    var tag = e.target.tagName.toLowerCase()
    if (tag != "input" && tag != "textarea" && tag != "select" && !$(e.target).attr("contenteditable")) {
      $(".twemoji-textarea").focus()
    }
  })
  $(".git-revision").text("A:" + atomicRevision + " - L:" + litecordRevision)
  bot = new Discord.Client({
    token: window.localStorage.getItem("token"),
    autorun: true
  })
  BotListeners()
  $("#create-server").click(function () {
    bot.createServer({
      icon: null,
      name: $("#new-server-name").val(),
      region: "brazil"
    }, function (err, resp) {
      if (err) return alert("Error creating guild: " + err)
      $.modal.close()
      setTimeout(function () {
        ChannelChange(resp.id)
        loadServers()
      }, 1000) // We wait to change to it since bot.channels doesn't update immediatly
    })
  })
  document.getElementById("file-upload").onchange = function (ev) {
    let fr = new FileReader()
    fr.onload = function () {
      bot.uploadFile({
        to: window.channelID,
        file: new Buffer(this.result),
        filename: ev.target.files[0].name
      }, function (err) {
        if (err) logger.warn(err)
      })
    }
    fr.readAsArrayBuffer(ev.target.files[0])
  }
  document.getElementById("avatar-upload").onchange = function (ev) {
    let fr = new FileReader()
    fr.onload = function () {
      let base64 = this.result.replace(/data:.*,/, "")
      bot.editUserInfo({
        avatar: base64
      }, function (err) {
        if (err) logger.warn(err)
      })
    }
    fr.readAsDataURL(ev.target.files[0])
  }
  let verb = loadingLines.verbs[Math.floor(Math.random() * loadingLines.verbs.length)]
  let adjective = loadingLines.adjectives[Math.floor(Math.random() * loadingLines.adjectives.length)]
  let noun = loadingLines.nouns[Math.floor(Math.random() * loadingLines.nouns.length)]
  $("#loading-line").html(`${verb} ${adjective} ${noun}`)
  $("#connection-problems > a").click(function() {
    if (IsNode) shell.openExternal(this.href)
    else window.open(this.href, "_blank")
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
      bot.sendMessage({
        to: window.channelID,
        message: temp.textContent
      })
      $("#message-input, .twemoji-textarea, .twemoji-textarea-duplicate").text("")
    }
  })
  $("#messages").scroll(function () {
    if ($(this).scrollTop() === 0) {
      loadMessages()
    }
  })
  $.contextMenu({
    selector: ".channel-btn",
    callback: function(key, options) {
      switch(key) {
      case "invite": {
        bot.createInvite({
          channelID: options.$trigger[0].id,
          max_users: 0,
          max_age: 0
        }, function(err, resp) {
          if(err) return logger.warn(err)
          $("#display-invite-modal > span#invite-text").text(`${inviteBase}/${resp.code}`)
          $("#display-invite-modal > h2 > span#server-name").text(resp.guild.name)
          $("#display-invite-modal").modal()
        })
        break
      }
      }
    },
    items: {
      invite: {name: "Create Instant Invite", icon: "add"}
    }
  })
  let contextOptions = {
    selector: ".message:not(.my-message)",
    callback: function (key, options) {
      let messageId = options.$trigger[0].id.replace("msg-", "")
      let messageContent = document.querySelector(`#${options.$trigger[0].id} > .message-inner > .content`)
      // TODO: Actually make these do stuff
      switch (key) {
      case "copy": {
        var range = document.createRange()
        range.selectNode(messageContent)
        window.getSelection().addRange(range)

        try {
          document.execCommand("copy")
        } catch (err) {
          logger.warn(err)
        }
        window.getSelection().removeAllRanges()
        logger.log("Copy")
        break
      }
      case "delete": {
        bot.deleteMessage({
          channelID: window.channelID,
          messageID: messageId
        }, function (err) {
          if (err) logger.warn(err)
        })
        break
      }
      case "edit": {
        $(messageContent).attr("contenteditable", "true")
        $(messageContent).focus()
        $(messageContent).on("keydown", function (e) {
          if (!e) e = window.event
          var keyCode = e.keyCode || e.which
          if (keyCode == "13" && !e.shiftKey) { // We ignore enter key if shift is held down, just like the real client
            e.preventDefault()
            bot.editMessage({
              channelID: window.channelID,
              messageID: messageId,
              message: messageContent.textContent
            }, function(err) {
              if(err) logger.warn(err)
            })
            $(messageContent).attr("contenteditable", "false")
          }
        })
        logger.log("Editing")
        break
      }
      }
    },
    items: {
      "copy": { name: "Copy", icon: "copy" },
      "delete": { name: "Delete Message", icon: "delete" }
    }
  }
  $.contextMenu(contextOptions)
  contextOptions.selector = ".message.my-message"
  contextOptions.items.edit = { name: "Edit Message", icon: "edit" }
  $.contextMenu(contextOptions)
})

function ChannelChange(channelID, silent) {
  if (window.channelID == channelID) return // We're already in the channel...
  window.localStorage.setItem("lastchannel", channelID)
  let channel = bot.channels[channelID]
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
    username.textContent = user.username
    avatar.src = avatarurl
    avatar.classList = "member-list-avatar"
    container.classList = "member-list-member"
    username.classList = "member-list-username"
    container.appendChild(avatar)
    container.appendChild(username)
    document.getElementById("member-list").appendChild(container)
  })
}

function loadMessages(hideLoaderAfter) { // TODO: Move this to a web worker
  let options = {
    channelID: window.channelID,
    limit: 100,
    before: 0
  }
  if (window.currentMessages.channelID == window.channelID && window.currentMessages.arr.length > 0) options.before = window.currentMessages.arr[0].id
  bot.getMessages(options, function(err, messages) {
    let oldScrollHeight = document.getElementById("messages").scrollHeight
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

    if (len <= 0) {
      if (hideLoaderAfter) $("#loading-landing").css("display", "none")
      if (scrolltobottom) document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight - oldScrollHeight
      else document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight
      return
    }

    messages.forEach(function (curmsg, i) {
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
        let { avatar, content, images, msgobj, container } = items
        container.appendChild(avatar)
        msgobj.appendChild(content)
        msgobj.appendChild(images)
        container.id = "msg-" + event.d.id
        container.classList = "message"
        if (userID == bot.id) container.classList += " my-message"
        msgobj.classList = "message-inner"
        container.appendChild(msgobj)
        document.getElementById("messages").insertBefore(container, document.getElementById("messages").childNodes[0])
      })
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
  srvlist.forEach(function (srv, i) {
    let server = bot.servers[srv]
    if (!server) return
    let servericon = `${cdn}/icons/${server.id}/${server.icon}.webp?size=256`
    if (!server.icon) servericon = "https://dummyimage.com/256x256/ffffff/000000.png&text=" + encodeURI(((server.name || "E R R O R").match(/\b(\w)/g) || ["ERROR"]).join(""))
    if (server.unavailable) servericon = "unavailable.png"
    let servernode = document.createElement("a")
    servernode.href = "#"
    servernode.classList = "server-icon"
    let serverimg = document.createElement("img")
    serverimg.src = servericon
    serverimg.classList = "server-image"
    serverimg.onload = function() {
      serverimg.style.background = "none"
    }
    servernode.appendChild(serverimg)
    servernode.id = server.id
    servernode.onclick = function () {
      ChannelChange(server.id, true)
    }
    document.getElementById("server-list").insertBefore(servernode, null)
    if (i + 1 >= srvlist.length) {
      let addnode = document.createElement("a")
      addnode.href = "#"
      addnode.classList = "server-icon"
      addnode.id = "new-server-btn"
      let addimg = document.createElement("img")
      addimg.src = "new-guild.png"
      addimg.classList = "server-image"
      addimg.onload = function() {
        addimg.style.background = "none"
      }
      addnode.appendChild(addimg)
      addnode.onclick = function () {
        $("#new-server-modal").modal()
      }
      document.getElementById("server-list").appendChild(addnode, null)
    }
  })
}

function loadChannels() {
  document.getElementById("channel-container").innerHTML = ""
  if (!bot.channels[window.channelID]) return
  let channelsob = bot.servers[bot.channels[window.channelID].guild_id].channels
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
