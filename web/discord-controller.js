const IsNode = typeof process == "undefined" ? false : true
var shell
var bot
var fs
var path
var atomicRevision = "N/A"
var litecordRevision = "N/A"
var chalk
var Speaker
var Mic
var token = window.localStorage.getItem("token")
var conzole = console // Hack to fool ESLint
var logger = {
  /**
   * Logs a message as `info` to the browser console and (if running on electron) stdout
   *
   * @function
   * @param msg - Message to log
   */
  log: function (msg) {
    if (IsNode) process.stdout.write("[ " + chalk.blue("INFO") + " ] " + chalk.blue(msg) + "\n")
    conzole.log(`[ INFO ] ${msg}`)
  },
  /**
   * Logs a warning to the browser console and (if running on electron) stdout
   *
   * @function
   * @param msg - Warning to log
   */
  warn: function (msg) {
    if (IsNode) process.stdout.write("[ " + chalk.yellow("WARN") + " ] " + chalk.yellow(msg) + "\n")
    conzole.warn(`[ WARN ] ${msg}`)
  },
  /**
   * Logs an error to the browser console and (if running on electron) stdout.
   * Note: Only use this for critical errors wherein the app cannot continue. Otherwise, use <logger.warn>
   *
   * @function
   * @param msg - Error to log
   */
  error: function (msg) {
    if (IsNode) process.stdout.write("[ " + chalk.red("ERROR") + " ] " + chalk.red(msg) + "\n")
    conzole.error(`[ ERROR ] ${msg}`)
  },
  /**
   * Logs a debug information to the browser console and (if running on electron) stdout
   *
   * @function
   * @param msg - Message to log as debug
   */
  debug: function (msg) {
    if (IsNode) process.stdout.write("[ " + chalk.grey("DEBUG") + " ] " + chalk.bgWhite(chalk.grey(msg)) + "\n")
    conzole.log(`[ DEBUG ] ${msg}`)
  },
  /**
   * Logs a success in a request / operation. I.e. for changing avatars
   *
   * @function
   * @param msg - Success to log
   */
  ok: function (msg) {
    if (IsNode) process.stdout.write("[ " + chalk.green("SUCCESS") + " ] " + chalk.green(msg) + "\n")
    conzole.log(`[ SUCCESS ] ${msg}`)
  }
}
if (IsNode) {
  window.Discord = require("discord.js")
  Speaker = require("speaker")
  chalk = require("chalk")
  shell = require("electron").shell
  $(".git-revision").text("A:" + atomicRevision + " - L:N/A")
  fs = require("fs")
  path = require("path")
  Mic = require("node-microphone")
}

if (!window.localStorage.getItem("token")) window.location.href = "login.html"
const cdn = window.localStorage.getItem("url-cdn") || "https://cdn.discordapp.com"
const endpoint = window.localStorage.getItem("url-api") || "https://discordapp.com"
const inviteBase = window.localStorage.getItem("url-invite") || "https://discord.gg"
var shortcodes = {} // We just leave this empty before the request finishes so the page will still load
$.get("emojis2.json", function (result) {
  if (typeof result != "object") result = JSON.parse(result)
  shortcodes = result
})

$.get(endpoint + "/api/version", function (result) {
  if (typeof result != "object") result = JSON.parse(result)
  litecordRevision = result.version.substring(0, 7)
  $(".git-revision").text("A:" + atomicRevision + " - L:" + litecordRevision)
})

$.get("version.txt", function (result) {
  atomicRevision = result
  $(".git-revision").text("A:" + atomicRevision + " - L:" + litecordRevision)
})

/**
 * An optional callback used to handle the resulting plugins array
 *
 * @callback addMessageToDOMCallback
 * @param {String|Error} error - An error object
 * @param {Array} plugins - Array containing all the plugins
 */

/**
 * Loads any plugins in the given directory
 *
 * @function
 * @param {String} dir - Path to search for plugins in
 * @param {loadPluginsCallback} callback - Optional callback
 * @todo Add more hooks!
 * @todo Add support for disabling/reloading a plugin
 */
function loadPlugins(dir, callback) {
  if (!IsNode) {
    if (callback) return callback("Plugins are only supported on the desktop app")
    else throw new Error("Plugins are only supported on the desktop app")
  }
  dir = path.resolve(dir)
  fs.readdir(dir, function (err, files) {
    if (err) {
      if (callback) return callback(err)
      else throw new Error("Error loading plugins " + err)
    }
    var plugins = []
    var plugpaths = window.plugins.map(function (x) {
      return x.file
    })
    files.forEach(function (plugin, i) {
      if (plugpaths.includes(plugin)) return logger.debug("Skipping already-loaded plugin: " + plugin)
      var pl = require(path.join(dir, path.basename(plugin)))
      plugins.push({
        file: plugin,
        plugin: pl
      })
      for (var hk in pl.hooks) {
        var hook = pl.hooks[hk]
        switch (hook.trigger) {
        case "load": {
          hook.run(bot)
          break
        }
        case "documentload": {
          $(document).ready(function () {
            hook.run(document)
          })
          break
        }
        default: { // We'll add more hooks soon™ but for now, this seems useful
          bot.on(hook.trigger, hook.run)
        }
        }
      }
      if (i + 1 >= plugins.length) {
        if (callback) callback(null, plugins)
        window.plugins = window.plugins.concat(plugins)
      }
    })
  })
}

window.plugins = []

/**
 * Sanitizes any HTML input and returns html output
 *
 * @example sanitizeHTML("<h1>I am unclean content!</h1>\n Or just unmatched < signs") // Returns "&lt;h1&gt;I am unclean content!&lt;/h1&gt;<br> Or just unmatched &lt; signs"
 * @function
 * @param {String} content - Unclean text to santize
 * @returns {String} Sanitized HTML
 */
function sanitizeHTML(content) {
  return $("<pre>").text(content).html().replace(/\n/g, "<br>")
}

/**
 *  Renders a given embed object
 *
 * @function
 * @param {Object} embed - JSON for an embed
 * @returns {Object} Object containing type which can be either image or embed depending on whether it should have the embed wrapper around it
 * @todo Add `fields` support
 */
function createEmbed(embed) {
  logger.debug("Creating embed")
  if (embed.type == "image") {
    var link = embed.thumbnail.proxyURL
    logger.debug("Adding " + link + " as an image...")
    var imgnode = document.createElement("img")
    imgnode.src = embed.thumbnail.proxyURL
    imgnode.setAttribute("original-url", embed.thumbnail.url)
    imgnode.onload = function () {
      imgnode.style.background = "none"
    }
    imgnode.onerror = function () {
      imgnode.remove()
      logger.warn("Failed to load image " + imgnode.src)
    }
    return { type: "image", image: imgnode }
  }
  if (embed.type == "gifv") {
    var link = embed.thumbnail.proxyURL
    logger.debug("Adding " + link + " as an image...")
    var vidnode = document.createElement("video")
    var sourcenode = document.createElement("source")
    vidnode.autoplay = "autoplay"
    vidnode.muted = "muted"
    vidnode.loop = "loop"
    sourcenode.src = embed.video.url
    vidnode.appendChild(sourcenode)
    vidnode.setAttribute("original-url", embed.thumbnail.url)
    return { type: "image", image: vidnode }
  }
  if (embed.type == "video") {
    var iframenode = document.createElement("iframe")
    iframenode.width = "100%"
    iframenode.height = "50%"
    iframenode.src = embed.video.url
    iframenode.frameBorder = 0
    iframenode.allowFullscreen = true
    return { type: "image", image: iframenode }
  }
  var emb = document.createElement("div")
  var title = document.createElement("h4")
  var description = document.createElement("div")
  // var stamp = document.createElement("time")
  // var colorbar = document.createElement("div")
  var image = document.createElement("img")
  var thumb = document.createElement("img")
  if (embed.title) {
    if (embed.url) {
      title = document.createElement("a")
      title.href = "#"
      title.setAttribute("data-link", embed.url)
      title.classList = "masked-link title"
    } else title.classList = "title"
    $(title).text(embed.title)
    emb.appendChild(parseMarkdown(title))
  }
  if (embed.thumbnail && embed.thumbnail.url) {
    // if(embed.thumbnail.width) thumb.width = embed.thumbnail.width + "px"
    // if(embed.thumbnail.height) thumb.height = embed.thumbnail.height + "px" ||
    thumb.src = embed.thumbnail.url
    thumb.classList = "embed-thumbnail"
    emb.appendChild(thumb)
  }
  if (embed.description) {
    $(description).text(embed.description)
    description = parseDiscordEmotes(description)
    emb.appendChild(parseMarkdown(description, true))
  }
  if (embed.image && embed.image.url) {
    image.src = embed.image.url
    image.classList = "embed-image"
    emb.appendChild(image)
  }
  return { type: "embed", embed: emb.innerHTML }
}

/**
 * Replaces Discord emotes within the text with images of the emote
 *
 * @function
 * @param {DOMElement} content - A DOM object which whose content has been escaped
 * @returns {DOMElement} The same DOM object as before, but the Discord emotes have been replaced with their respective images
 */
function parseDiscordEmotes(content) {
  var arr = content.innerHTML.match(/&lt;:\S*:[0-9]{18}&gt;/gi)
  if (!arr) arr = []
  for (var itm in arr) {
    var emote = arr[itm]
    var colsplit = emote.split(":")
    var link = `${cdn}/emojis/${colsplit[colsplit.length - 1].substring(0, colsplit[colsplit.length - 1].length - 4)}.png`
    var imgnode = document.createElement("img")
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

/**
 * Converts occurances of textual links to a clickable link
 *
 * @function
 * @param {DOMElement} content - DOM Element whose innerHTML is to be modified to have links
 * @param {DOMElement} images - Ignored in newer versions. Used to add images to the DOM but no longer does so
 * @returns {Object} Object containing the keys `links` and `imghtml`. `links` is the `content` parameter from before but the textual links in it have been replaced with clickable links
 */
function createLinksAndImages(content, images) {
  var temphtml = content.innerHTML.replace(/```.*```/g, "").replace(/`.*`/g, "") // Big hack...
  var arr = temphtml.match(urlexp)
  for (var itm in arr) {
    var link = arr[itm]
    logger.debug("Adding " + link + " to DOM")
    var anode = document.createElement("a")
    anode.href = "#"
    anode.setAttribute("data-link", link)
    anode.innerHTML = link
    content.innerHTML = content.innerHTML.replace(link, anode.outerHTML)
  }
  return {
    links: content,
    imghtml: images
  }
}

/**
 * Renders markdown
 *
 * @function
 * @param {DOMElement} content - DOM element whose innerHTML's markdown is to be rendered.
 * @param {Boolean} maskedLinks - Boolean to enable or disable masked links such as [Link name](URL). Defaults to false
 * @returns {DOMElement} `content` parameter from before but the markdown has been rendered
 */
function parseMarkdown(content, maskedLinks) {
  var txt = content.innerHTML
  var bold = txt.match(/\*\*.*\*\*/g)
  for (var i in bold) {
    logger.debug("Bold")
    var match = bold[i]
    txt = txt.replace(match, "<b>" + match.replace(/\*\*/g, "") + "</b>")
  }
  var underlined = txt.match(/__.*__/g)
  for (var i in underlined) {
    logger.debug("Underline")
    var match = underlined[i]
    txt = txt.replace(match, "<underline>" + match.replace(/\_\_/g, "") + "</underline>")
  }
  var italics = txt.match(/(\*.*\*|_.*_)/g)
  for (var i in italics) {
    logger.debug("Italics")
    var match = italics[i]
    txt = txt.replace(match, "<i>" + match.replace(/\*/g, "").replace(/\_/g, "") + "</i>")
  }
  var strikethrough = txt.match(/~~.*~~/g)
  for (var i in strikethrough) {
    logger.debug("Strikethru")
    var match = strikethrough[i]
    txt = txt.replace(match, "<strike>" + match.replace(/~~/g, "") + "</strike>")
  }
  var codeblock = txt.match(/```[\s\S]*```/g)
  for (var i in codeblock) {
    logger.debug("Codeblock")
    var match = codeblock[i]
    var finaltext = match.replace(/```/g, "")
    var lang = finaltext.split("<br>")[0].toLowerCase()
    logger.debug("CODEBLOCK LANG: " + lang)
    if (hljs.getLanguage(lang)) {
      finaltext = finaltext.replace(new RegExp(lang, "i"), "")
      lang = "lang-" + lang
    } else lang = "nohighlight"
    finaltext = `<code class="codeblock ${lang}">${finaltext.replace(/^<br>+|<br>+$/gm, "")}</code>`
    txt = txt.replace(match, finaltext)
  }
  var code = txt.match(/`.*`/g)
  for (var i in code) {
    logger.debug("Code")
    var match = code[i]
    txt = txt.replace(match, "<code>" + match.replace(/`/g, "") + "</code>")
  }
  if (maskedLinks) {
    logger.debug("Masked links on")
    var masked = txt.match(/\[.*\]\((http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?\)/gi)
    for (var i in masked) {
      logger.debug("Masked link")
      var match = masked[i]
      var anode = document.createElement("a")
      anode.href = "#"
      anode.setAttribute("data-link", match.replace(/\[[\s\S]*\]\(/, "").replace(/\)/g, ""))
      $(anode).text(match.replace("[", "").replace(/\].*/, ""))
      anode.classList = "masked-link"
      txt = txt.replace(match, anode.outerHTML)
    }
  }
  content.innerHTML = txt
  return content
}

const urlexp = /(http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/gi

/**
 * A callback used to handle the rendered HTML from addMessageToDOM
 *
 * @callback addMessageToDOMCallback
 * @param {Object} elements - Object containing all the DOM elements which are appened to each other. The keys are: `avatar`, `content`, `images`, `msgobj`, and `container`
 */

/**
 * Renders a message to HTML
 *
 * @function
 * @param {Message} msg - Discord.js Message object to be rendered
 * @param {addMessageToDOMCallback} complete - Callback that handles the elements
 */
function addMessageToDOM(msg, complete) {
  if (!msg.guild.members.get(msg.author.id)) return
  var { embeds } = msg
  var message = msg.cleanContent // Just to make it a bit more readable while we have no mentions set up
  var channel = msg.channel.id
  if (window.channelID != msg.channel.id) return
  var messageInput = document.getElementById("message-input")
  messageInput.setAttribute("placeholder", "Message #" + channel.name || "")
  window.channelID = msg.channel.id
  // We got a new message
  var container = document.createElement("div")
  var msgobj = document.createElement("div")
  var title = document.createElement("h2")
  title.textContent = msg.guild.members.get(msg.author.id).displayName + (msg.author && msg.author.bot ? " [BOT]" : "")
  title.classList = "username"
  title.style.color = msg.guild.members.get(msg.author.id).displayHexColor
  msgobj.appendChild(title)
  var avatar = document.createElement("img")
  avatar.src = msg.author.displayAvatarURL()
  avatar.classList = "avatar"

  var content = document.createElement("div")
  content.classList = "content"

  var images = document.createElement("div")
  images.classList = "images"

  var time = document.createElement("time")
  time.classList = "message-timestamp"
  time.dateTime = msg.createdTimestamp
  time.textContent = $.timeago(msg.createdTimestamp)
  $(time).ready(function () {
    $(time).timeago()
  })
  msgobj.appendChild(time)

  for (var short in shortcodes) {
    var myemotes = ""
    shortcodes[short].split("-").forEach(function (code) {
      myemotes += twemoji.convert.fromCodePoint(code)
    })
    message = message.replace(new RegExp(":" + short + ":"), myemotes) // Here we replace the emotes with their HTML representations
  }

  content.innerHTML = sanitizeHTML(message)
  var { imghtml, links } = createLinksAndImages(content, images)
  content = links
  images = imghtml
  content = parseDiscordEmotes(content)
  content = parseMarkdown(content)
  content.innerHTML = twemoji.parse(content.innerHTML)
  $(content).ready(function () {
    $(content).find(".codeblock").not(".nohighlight").each(function (i, block) {
      hljs.highlightBlock(block)
    })
  })

  var attachments = msg.attachments.array()
  for (var att in attachments) {
    var imgnode = document.createElement("img")
    imgnode.src = attachments[att].proxyURL
    imgnode.onload = function () {
      imgnode.style.background = "none"
    }
    imgnode.onerror = function () {
      imgnode.remove()
      logger.warn("Failed to load image " + imgnode.src)
    }
    images.appendChild(imgnode)
  }

  $(content).children("a").click(function () {
    var link = this.getAttribute("data-link")
    if (link.match(new RegExp(inviteBase + "/" + "[A-Za-z0-9]*")) == link) {
      logger.debug("Clicked gg link")
      $.ajax({
        settings: {
          headers: {
            authorization: `Authorization:${bot.user.bot ? " Bot" : ""} ${token}`,
            accept: "*/*",
            "accept-language": "en-US;q=0.8"
          }
        },
        success: function(data) {
          console.log(data)
          logger.ok("Accepted invite")
          ChannelChange(data.channel.id)
          loadServers()
        }
      })
    } else {
      logger.debug("Clicked normal link")
      if (IsNode) shell.openExternal(link)
      else window.open(link, "_blank").focus()
    }
  })
  var embedsobj = document.createElement("div")
  for (var itm in embeds) {
    var embd = createEmbed(embeds[itm])
    if (embd.type == "embed") {
      var embedobj = document.createElement("div")
      embedobj.innerHTML = embd.embed
      embedobj.classList = "embed"
      embedsobj.appendChild(embedobj)
    } else if (embd.type == "image") {
      images.appendChild(embd.image)
    }
  }
  content.appendChild(embedsobj)

  complete({
    avatar,
    content,
    images,
    msgobj,
    container
  })
}

var typingUsers = {}

/**
 * Loads the users currently typing from the typingUsers array
 *
 * @function
*/
function loadTypingUsers() {
  // We would use Object.values(typingUsers)... but IE exists... Also, it's not defined exactly
  // How it's supposed to work so different JS engines implement it differently
  var typingArr = Object.keys(typingUsers).map(function(u) {
    return typingUsers[u]
  })
  var len = typingArr.length
  var text
  if(len == 0) text = ""
  else if(len == 1) text = typingArr[0]
  else if(len == 2) text = typingArr[0] + " and " + typingArr[1]
  else if(len == 3) text = typingArr[0] + ", " + typingArr[1] + ", and " + typingArr[2]
  else text = "Several users"
  var indicator = document.getElementById("typing-indicator")
  indicator.innerText = text
}

/**
 * Attaches the necessary listeners to the `bot` object
 *
 * @function
 */
function BotListeners() {
  logger.debug("Bot Listeners intializing")
  bot.on("debug", function (message) {
    logger.debug(message)
  })
  bot.on("warn", logger.warn)
  bot.on("message", function (msg) {
    addMessageToDOM(msg, function (nodes) {
      var { avatar, content, images, msgobj, container } = nodes

      container.appendChild(avatar)
      msgobj.appendChild(content)
      msgobj.appendChild(images)
      container.id = "msg-" + msg.id
      container.classList = "message"
      if (msg.author.id == bot.user.id) container.classList += " my-message"
      msgobj.classList = "message-inner"
      container.appendChild(msgobj)
      var messages = document.getElementById("messages")
      messages.appendChild(container)

      messages.scrollTop = messages.scrollHeight + 10 // Scroll to bottom of page
    })
  })

  bot.on("typingStart", function(channel, user) {
    if(channel.id != window.channelID) return
    var guildmember = bot.channels.get(channel.id).guild.members.get(user.id)
    typingUsers[guildmember.id] = guildmember.displayName
    loadTypingUsers()
  })

  bot.on("typingStop", function(channel, user) {
    if(channel.id != window.channelID) return
    var guildmember = bot.channels.get(channel.id).guild.members.get(user.id)
    delete typingUsers[guildmember.id]
    loadTypingUsers()
  })

  bot.on("voiceStateUpdate", function (oldmember, newmember) {
    if (newmember.guild.id != bot.channels.get(window.channelID).guild.id) return
    newmember.guild.channels.forEach(function (chan) {
      if (chan.type != "voice") return
      var voiceList = document.getElementById("voice-list-" + chan.id)
      loadVoiceMembers(chan.id, voiceList, function (newnode) {
        document.getElementById(chan.id).replaceChild(newnode, voiceList)
      })
    })
  })

  bot.on("guildCreate", function () {
    loadServers()
  })
  bot.on("guildDelete", function () {
    loadServers()
  })
  bot.on("guildUnavailable", function () {
    loadServers()
  })

  bot.on("channelDelete", loadChannels)
  bot.on("channelCreate", loadChannels)
  bot.on("channelUpdate", loadChannels)

  bot.on("guildMemberAdd", loadMembers)
  bot.on("guildMemberAvailable", loadMembers)
  bot.on("guildMemberRemove", loadMembers)
  bot.on("guildMemberUpdate", loadMembers)

  bot.on("messageUpdate", function (oldmsg, newmsg) {
    if (!oldmsg || oldmsg.channel.id != window.channelID) return
    var container = document.getElementById("msg-" + oldmsg.id)

    addMessageToDOM(newmsg, function (items) {
      var { content, images } = items
      container.getElementsByTagName("div")[0].replaceChild(content, document.body.querySelectorAll(`div#msg-${oldmsg.id} > div > div.content`)[0])
      container.getElementsByTagName("div")[0].replaceChild(images, document.body.querySelectorAll(`div#msg-${oldmsg.id} > div > div.images`)[0])
    })
  })

  bot.on("messageDelete", function (msg) {
    if (msg.channel.id != window.channelID) return
    document.getElementById("msg-" + msg.id).remove()
  })

  bot.on("ready", function () {
    logger.ok("BOT CONNECTED")
    window.channelID = window.localStorage.getItem("lastchannel") || bot.channels.filter(function(a) {
      return a.type == "text"
    }).first().id
    if (!bot.channels.get(window.channelID)) window.channelID = bot.channels.filter(function(a) {
      return a.type == "text"
    }).first().id

    window.currentMessages = {
      channelID: window.channelID,
      arr: []
    }
    ChannelChange(window.channelID, true)
    loadChannels()
    loadMembers()
    loadServers()
    loadMessages(true)
  })

  bot.on("disconnect", function (err) {
    logger.warn(err)
    if (err == "Authentication Failed") return window.location.href = "login.html"
    $("#loading-line").html(window.loading_lines[Math.floor(Math.random() * window.loading_lines.length)])
    $("#loading-landing").css("display", "block")
  })
  bot.on("error", function (err) {
    logger.error(err)
  })
}

/**
 * Joins a voice channel, sends microphone data and plays other people's data to speaker
 *
 * @function
 * @param {String} voiceChannelID - The ID number of the voice channel to join
 * @todo Possibly add browser support (Not likely since we need native modules for node-opus in Discord.js)
 */
function voice(voiceChannelID) {
  if (!IsNode) return logger.warn("This is only supported on the desktop version!")
  var chan = bot.channels.get(voiceChannelID)
  leaveVoice()
  chan.join().then(function (connection) {
    var receiver = connection.createReceiver()
    chan.members.forEach(function (user) {
      var speaking = user.speaking
      if(!speaking) return
      // We create a connection for every user in case they had been speaking before we joined
      receiver.createPCMStream(user).pipe(new Speaker(), { end: false })
      var usernode = document.getElementById(user.id)
      usernode.classList = usernode.classList + " voice-speaking"
    })
    connection.on("speaking", function (user, speaking) {
      var usernode = document.getElementById(user.id)
      if (!speaking) return usernode.classList = usernode.classList.value.replace(/( |)voice-speaking/g, "")
      receiver.createPCMStream(user).pipe(new Speaker(), { end: false })
      usernode.classList = usernode.classList + " voice-speaking"
    })
    var mic = new Mic({
      bitwidth: "16",
      encoding: "signed-integer",
      rate: "48000",
      channels: "2"
    })
    window.micInstance = mic
    var micstream = mic.startRecording()
    connection.playConvertedStream(micstream)
  }).catch(logger.warn)
}

/**
 * Leaves all connected voice channels (if applicable) and destroys their attached microphones
 *
 * @function
 */
function leaveVoice() {
  if (!IsNode) return logger.warn("This is only supported on the desktop version!")
  if (window.micInstance) {
    window.micInstance.stopRecording()
    window.micInstance = null
  }
  bot.voiceConnections.forEach(function (conn) {
    conn.disconnect()
  })
}

$(document).ready(function () {
  if (IsNode) {
    loadPlugins("atomic-plugins", function (err, plugins) {
      if (err) return logger.error(err)
      logger.debug(JSON.stringify(plugins))
    })
  }
  $(document).on("keypress", function (e) {
    var tag = e.target.tagName.toLowerCase()
    if (tag != "input" && tag != "textarea" && tag != "select" && !$(e.target).attr("contenteditable")) {
      $(".twemoji-textarea").focus()
    }
  })
  $(".git-revision").text("A:" + atomicRevision + " - L:" + litecordRevision)
  window.bot = bot = new window.Discord.Client({
    http: {
      host: endpoint,
      cdn
    }
  })
  bot.browser = IsNode
  bot.login(token).catch(function (err) {
    logger.error(err)
    window.location.href = "login.html"
  })
  BotListeners()
  $("#create-channel").click(function () {
    var newChannelName = document.getElementById("new-channel-name")
    bot.channels.get(window.channelID).guild.createChannel(newChannelName.value).then(function (channel) {
      ChannelChange(channel.id)
      newChannelName.value = ""
      $.modal.close()
    }).catch(function (err) {
      alert(err)
    })
  })
  $("#create-server").click(function () {
    bot.user.createGuild($("#new-server-name").val()).then(function (guild) {
      $.modal.close()
      ChannelChange(guild.id)
      loadServers()
    }).catch(logger.warn)
  })
  document.getElementById("file-upload").onchange = function (ev) {
    var fr = new FileReader()
    fr.onload = function () {
      bot.channels.get(window.channelID).send("", {
        files: [{
          attachment: new Buffer(this.result),
          name: ev.target.files[0].name
        }]
      }).then(function () {
        logger.debug("Uploaded file")
      }).catch(logger.warn)
    }
    fr.readAsArrayBuffer(ev.target.files[0])
  }
  document.getElementById("avatar-upload").onchange = function (ev) {
    var fr = new FileReader()
    fr.onload = function () {
      var base64 = this.result
      bot.user.setAvatar(base64).then(function () {
        logger.debug("Set avatar")
      }).catch(logger.warn)
    }
    fr.readAsDataURL(ev.target.files[0])
  }
  $("#loading-line").html(window.loading_lines[Math.floor(Math.random() * window.loading_lines.length)])
  $("#connection-problems > a").click(function () {
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
  document.querySelector("div[contenteditable=\"true\"]").addEventListener("paste", function (e) {
    e.preventDefault()
    var text = e.clipboardData.getData("text/plain")
    document.execCommand("insertHTML", false, text)
  })
  $(".twemoji-textarea").on("keydown", function (e) {
    if (!e) e = window.event
    var chan = bot.channels.get(window.channelID)
    chan.startTyping()
    setTimeout(function() {
      chan.stopTyping()
    }, 1000 * 5)
    var messageInput = document.getElementById("message-input")
    var keyCode = e.keyCode || e.which
    if (keyCode == "13" && !e.shiftKey) { // We ignore enter key if shift is held down, just like the real client
      e.preventDefault()
      if (messageInput.value.split(" ")[0] == "/join") {
        ChannelChange(messageInput.value.split(" ")[1])
        return
      }
      chan.send($("<pre>").html(messageInput.innerText.replace(/<br>/gi, "\n")).text())
      $("#message-input, .twemoji-textarea, .twemoji-textarea-duplicate").text("")
    }
  })
  $("#messages").scroll(function () {
    if ($(this).scrollTop() === 0) {
      loadMessages()
    }
  })
  $.contextMenu({
    selector: ".server-icon",
    callback: function (key, options) {
      switch (key) {
      case "delete": {
        bot.guilds.get(options.$trigger[0].id).delete()
        break
      }
      case "edit": {
        let guild = bot.guilds.get(options.$trigger[0].id)
        $("#edit-server-name").val(guild.name)
        $("#edit-server-modal").modal()
        $("#edit-server").one("click", function() {
          var iconUpload = document.getElementById("edit-server-icon")
          if(iconUpload.files[0]) {
            var fr = new FileReader()
            fr.onload = function () {
              var base64 = this.result
              guild.edit({
                name: $("#edit-server-name").val() || guild.name,
                icon: base64
              }).then(function() {
                ChannelChange(window.channelID)
                loadServers()
              }).catch(logger.warn)
            }
            fr.readAsDataURL(iconUpload.files[0])
          } else {
            guild.edit({
              name: $("#edit-textchannel-name").val() || guild.name
            }).then(function() {
              ChannelChange(window.channelID)
              loadServers()
            }).catch(logger.warn)
          }
          $.modal.close()
        })
      }
      }
    },
    items: {
      delete: { name: "Delete", icon: "delete" },
      edit: { name: "Edit", icon: "edit" },
    }
  })
  $.contextMenu({
    selector: ".channel-btn",
    callback: function (key, options) {
      switch (key) {
      case "invite": {
        bot.channels.get(options.$trigger[0].id).createInvite({
          temporary: false,
          max_users: 0,
          max_age: 0
        }).then(function (invite) {
          $("#display-invite-modal > span#invite-text").text(`${inviteBase}/${invite.code}`)
          $("#display-invite-modal > h2 > span#server-name").text(invite.guild.name)
          $("#display-invite-modal").modal()
        }).catch(logger.warn)
        break
      }
      case "delete": {
        bot.channels.get(options.$trigger[0].id).delete()
        break
      }
      case "edit": {
        let channel = bot.channels.get(options.$trigger[0].id)
        $("#edit-textchannel-name").val(channel.name)
        $("#edit-textchannel-topic").val(channel.topic || "")
        $("#edit-textchannel-modal").modal()
        $("#edit-textchannel").one("click", function() {
          channel.edit({
            name: $("#edit-textchannel-name").val(),
            topic: $("#edit-textchannel-topic").val() || ""
          }).then(function() {
            ChannelChange(channel.id)
          })
          $.modal.close()
        })
      }
      }
    },
    items: {
      invite: { name: "Create Instant Invite", icon: "add" },
      delete: { name: "Delete", icon: "delete" },
      edit: { name: "Edit", icon: "edit" },
    }
  })
  $.contextMenu({
    selector: ".member-list-member",
    callback: function (key, options) {
      switch (key) {
      case "ban": {
        bot.channels.get(window.channelID).guild.members.get(options.$trigger[0].id).ban().then(function () {
          logger.debug("User banned")
          loadMembers()
        }).catch(logger.warn)
        break
      }
      case "kick": {
        bot.channels.get(window.channelID).guild.members.get(options.$trigger[0].id).kick().then(function () {
          logger.debug("User kicked")
          loadMembers()
        }).catch(logger.warn)
        break
      }
      case "nickname": {
        $("#nickname-modal").modal()
        $("#change-nickname").one("click", function () {
          bot.channels.get(window.channelID).guild.members.get(options.$trigger[0].id).setNickname($("#nickname").val()).then(function () {
            logger.debug("Set nickname")
            $.modal.close()
          }).catch(logger.warn)
        })
        break
      }
      }
    },
    items: {
      ban: { name: "Ban", icon: "hammer" },
      kick: { name: "Kick", icon: "exit" },
      nickname: { name: "Set Nickname", icon: "edit" }
    }
  })
  var contextOptions = {
    selector: ".message:not(.my-message)",
    callback: function (key, options) {
      var messageId = options.$trigger[0].id.replace("msg-", "")
      var messageContent = document.querySelector(`#${options.$trigger[0].id} > .message-inner > .content`)
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
        bot.channels.get(window.channelID).messages.get(messageId).delete().then(function () {
          logger.debug("Deleted message " + messageId)
        }).catch(logger.warn)
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
            bot.channels.get(window.channelID).messages.get(messageId).edit(messageContent.textContent).then(function () {
              logger.debug("Edited message " + messageId)
            }).catch(logger.warn)
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

/**
 * Changes the channel to the given one
 *
 * @function
 * @param {String|Number} channelID - The ID of the channel to change to
 * @param {Boolean} silent - Whether or not to show the message that the channel has been changed. Defaults to false
 * @param {Boolean} force - Whether or not to force channel change even if we're already in the channel
 */
function ChannelChange(channelID, silent, force) {
  if (window.channelID == channelID && !force) return // We're already in the channel...
  window.localStorage.setItem("lastchannel", channelID)
  var channel = bot.channels.get(channelID)
  var server = channel.guild
  var title = `#${channel.name} in ${server.name} - ${channel.topic}`
  if (IsNode) document.getElementById("window-title").textContent = title
  else document.title = title
  if (!silent) {
    var changemsg = document.createElement("div")
    changemsg.classList = "info-message"
    changemsg.innerHTML = `Changed to #${channel.name} on ${server.name} - ${channel.topic ? channel.topic : "<no channel topic>"}`
    document.getElementById("messages").appendChild(changemsg)
  }
  window.channelID = channelID
  loadChannels()
  loadMessages()
  loadMembers()
}

/**
 * Populates the right pane with the member list
 *
 * @function
 * @param {GuildMember} memb - Optional. If given, it checks if the user is in the current guild before loading
 */
function loadMembers(memb) {
  if (memb && memb.guild && memb.guild.id != bot.channels.get(window.channelID).guild.id) return
  var memberList = document.getElementById("member-list")
  memberList.innerHTML = ""
  var guild = bot.channels.get(window.channelID).guild
  var mem = guild.members.array()
  var roles = {}
  mem.forEach(function (user, i) {
    var container = document.createElement("div")
    var avatar = document.createElement("div")
    var username = document.createElement("h2")
    var presence = document.createElement("div")
    if (!user) return
    username.textContent = user.displayName
    avatar.style.backgroundImage = "url('" + user.user.displayAvatarURL() + "')"
    avatar.classList = "member-list-avatar"
    presence.classList = "status status-" + (user.user.id == bot.user.id ? bot.user.settings.status : user.user.presence.status)
    container.classList = "member-list-member"
    username.classList = "member-list-username"
    username.style.color = user.displayHexColor
    username.id = user.user.id
    avatar.id = user.user.id
    avatar.appendChild(presence)
    container.appendChild(avatar)
    container.appendChild(username)
    container.id = user.user.id
    if (user.hoistRole) {
      if (!roles[user.hoistRole.id]) {
        roles[user.hoistRole.id] = [{
          name: user.displayName.toUpperCase(),
          container
        }]
      } else {
        roles[user.hoistRole.id].push({
          name: user.displayName.toUpperCase(),
          container
        })
      }
    } else {
      if (!roles[guild.id]) {
        roles[guild.id] = [{
          name: user.displayName.toUpperCase(),
          container
        }]
      } else {
        roles[guild.id].push({
          name: user.displayName.toUpperCase(),
          container
        })
      }
    }
    if (i + 1 >= mem.length) {
      Object.keys(roles).sort(function (a, b) {
        return guild.roles.get(a).position - guild.roles.get(b).position
      }).reverse().forEach(function (roleID) {
        var role = guild.roles.get(roleID)
        var rolehoist = document.createElement("div")
        rolehoist.classList = "role-section"
        var rolename = document.createElement("div")
        rolename.classList = "role-name"
        rolename.innerText = role ? role.name : "undefined"
        var rolemembers = document.createElement("div")
        rolemembers.id = "role-" + roleID
        rolehoist.appendChild(rolename)
        roles[roleID].sort(function (a, b) {
          return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0
        })
        roles[roleID].forEach(function (usr, x) {
          rolemembers.appendChild(usr.container)
          if (x + 1 == roles[roleID].length) {
            rolehoist.appendChild(rolemembers)
            memberList.appendChild(rolehoist)
          }
        })
      })
    }
  })
}

/**
 * Loads the messages in the current channel
 *
 * @function
 * @param {Boolean} hideLoaderAfter - If true, hides the loading screen after it completes. Defaults to false
 */
function loadMessages(hideLoaderAfter) { // TODO: Move this to a web worker
  logger.debug("Grabbing messages")
  var msgdom = document.getElementById("messages")
  var options = {
    limit: 100
  }
  if (window.currentMessages.channelID == window.channelID && window.currentMessages.arr.length > 0) options.before = window.currentMessages.arr[0].id
  bot.channels.get(window.channelID).fetchMessages(options).then(function (messages) {
    logger.debug("Got messages " + typeof messages + " : " + messages.length)
    var oldScrollHeight = msgdom.scrollHeight
    var scrolltobottom = window.currentMessages.channelID == window.channelID
    if (scrolltobottom) {
      messages.forEach(function (msg) {
        window.currentMessages.arr.unshift(msg)
      })
    } else {
      window.currentMessages = {
        channelID: window.channelID,
        arr: []
      }
      messages.forEach(function (msg) {
        window.currentMessages.arr.unshift(msg)
      })
      msgdom.innerHTML = ""
    }

    var len = messages.size

    if (len <= 0) {
      if (hideLoaderAfter) $("#loading-landing").css("display", "none")
      if (scrolltobottom) msgdom.scrollTop = msgdom.scrollHeight - oldScrollHeight
      else msgdom.scrollTop = msgdom.scrollHeight
      return
    }

    messages.forEach(function (curmsg, i) {
      if (!curmsg || !curmsg.author) return
      addMessageToDOM(curmsg, function (items) {
        var { avatar, content, images, msgobj, container } = items
        container.appendChild(avatar)
        msgobj.appendChild(content)
        msgobj.appendChild(images)
        container.id = "msg-" + curmsg.id
        container.classList = "message"
        if (curmsg.author.id == bot.user.id) container.classList += " my-message"
        msgobj.classList = "message-inner"
        container.appendChild(msgobj)
        msgdom.insertBefore(container, msgdom.childNodes[0])
      })
      if (i + 1 >= len) {
        if (hideLoaderAfter) $("#loading-landing").css("display", "none")
        if (scrolltobottom) msgdom.scrollTop = msgdom.scrollHeight - oldScrollHeight
        else msgdom.scrollTop = msgdom.scrollHeight
      }
    })
  }).catch(logger.warn)
}

/**
 * Renders the guild list
 *
 * @function
 */
function loadServers() {
  var serverList = document.getElementById("server-list")
  serverList.innerHTML = "" // Empty it since we might have something left after we get kicked off because an error happened
  var srvlist = bot.user.settings && bot.user.settings.guildPositions && bot.user.settings.guildPositions.length > 0 ? bot.user.settings.guildPositions : Array.from(bot.guilds.keys())
  srvlist.forEach(function (srv, i) {
    var server = bot.guilds.get(srv)
    if (!server) return
    var servericon = server.iconURL("png", 128)
    if (!servericon) servericon = "https://dummyimage.com/256x256/ffffff/000000.png&text=" + encodeURI(((server.name || "E R R O R").match(/\b(\w)/g) || ["ERROR"]).join(""))
    if (server.unavailable) servericon = "unavailable.png"
    var servernode = document.createElement("a")
    servernode.href = "#"
    servernode.classList = "server-icon"
    var serverimg = document.createElement("img")
    serverimg.src = servericon
    serverimg.classList = "server-image"
    serverimg.onload = function () {
      serverimg.style.background = "none"
    }
    servernode.appendChild(serverimg)
    servernode.id = server.id
    servernode.onclick = function () {
      ChannelChange(server.id, true)
    }
    serverList.insertBefore(servernode, null)
    if (i + 1 >= srvlist.length) {
      var addnode = document.createElement("a")
      addnode.href = "#"
      addnode.classList = "server-icon"
      addnode.id = "new-server-btn"
      var addimg = document.createElement("img")
      addimg.src = "new-guild.png"
      addimg.classList = "server-image"
      addimg.onload = function () {
        addimg.style.background = "none"
      }
      addnode.appendChild(addimg)
      addnode.onclick = function () {
        $("#new-server-modal").modal()
      }
      serverList.appendChild(addnode, null)
    }
  })
}

/**
 * Loads the channel list
 *
 * @function
 * @param {Channel} chan - Optional. If provided, checks if the channel is in the current guild before running.
 */
function loadChannels(chan) {
  if (chan && chan.guild.id != bot.channels.get(window.channelID).guild.id) return
  var textChannelContainer = document.getElementById("text-channels")
  var voiceChannelContainer = document.getElementById("voice-channels")
  textChannelContainer.innerHTML = ""
  voiceChannelContainer.innerHTML = ""
  if (!bot.channels.get(window.channelID)) return
  var channels = bot.channels.get(window.channelID).guild.channels
  channels = channels.sort(function (a, b) {
    return a.position - b.position
  })
  var link = document.createElement("a")
  link.innerText = "+"
  link.id = "new-channel"
  link.onclick = function () {
    $("#new-channel-modal").modal()
  }
  textChannelContainer.appendChild(link)
  channels.forEach(function (channel) {
    var channelnode = document.createElement("div")
    channelnode.href = "#"
    channelnode.id = channel.id
    if (channel.type == "text") {
      channelnode.classList = "channel-btn"
      channelnode.innerText = "#" + channel.name
      channelnode.onclick = function () {
        ChannelChange(channel.id, true)
      }
      textChannelContainer.appendChild(channelnode)
    } else {
      channelnode.classList = "channel-btn voice-channel-btn"
      channelnode.innerText = channel.name
      channelnode.onclick = function () {
        voice(channel.id)
      }
      var membersnode = document.createElement("div")
      membersnode.class = "voice-list"
      membersnode.id = "voice-list-" + channel.id
      loadVoiceMembers(channel.id, membersnode, function (newnode) {
        channelnode.appendChild(newnode)
      })
      voiceChannelContainer.appendChild(channelnode)
    }
  })
}

/**
 * An optional callback used to handle the resulting DOM node
 *
 * @callback loadVoiceMembersCallback
 * @param {DOMElement} container - The element from before, but populated with the members
 */

/**
 * Loads the users in a voice channel
 *
 * @function
 * @param {String} channelID - ID of voice channel the node is to be attached to
 * @param {DOMElement} container - A DOM element to be populated.
 * @param {loadVoiceMembersCallback} cb - A callback with the node provided populated with members
 */
function loadVoiceMembers(channelID, container, cb) {
  container.innerHTML = ""
  var chan = bot.channels.get(channelID)
  if (chan.members.size < 1) return cb(container)
  chan.members.forEach(function (member, indx) {
    var memnode = document.createElement("div")
    memnode.id = member.id
    memnode.classList = "voice-user" + (member.deaf ? " voice-deaf" : "") + (member.mute ? " voice-mute" : "") + (member.speaking ? " voice-speaking" : "")
    var avatar = document.createElement("div")
    avatar.classList = "voice-avatar"
    avatar.style.backgroundImage = `url('${member.user.displayAvatarURL()}')`
    memnode.appendChild(avatar)
    var username = document.createElement("h2")
    username.classList = "voice-username"
    $(username).text(member.displayName)
    memnode.appendChild(username)
    var statusicons = document.createElement("i")
    statusicons.classList = "status-icons"
    memnode.appendChild(statusicons)
    container.appendChild(memnode)
    if (indx + 1 >= chan.members.size) {
      cb(container)
    }
  })
}
