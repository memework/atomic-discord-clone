const startTime = new Date()
const IsNode = typeof process == "undefined" ? false : true
let notifier
let shell
let bot
let atomicRevision = "N/A"
let litecordRevision = "N/A"
let chalk
let conzole = console // Hack to fool ESLint
let loadingLines = []
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
const cdn = window.localStorage.getItem("url-cdn") || "https://cdn.discordapp.com"
const endpoint = window.localStorage.getItem("url-api") || "https://discordapp.com"
const inviteBase = window.localStorage.getItem("url-invite") || "https://discord.gg"
let shortcodes = {} // We just leave this empty before the request finishes so the page will still load
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

// Uncomment this for first run... I just don't like having to change this every time :^)
// window.localStorage.setItem("token", "CHANGE THIS PLES") // In production, this gets set by the login page

function sanitizeHTML(content) {
  return $("<pre>").text(content).html().replace(/\n/g, "<br>")
}

function createEmbed(embed) {
  logger.debug("Creating embed")
  if (embed.type == "image") {
    let link = embed.thumbnail.proxy_url
    logger.debug("Adding " + link + " as an image...")
    let imgnode = document.createElement("img")
    imgnode.src = embed.thumbnail.proxy_url
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
    let link = embed.thumbnail.proxy_url
    logger.debug("Adding " + link + " as an image...")
    let vidnode = document.createElement("video")
    let sourcenode = document.createElement("source")
    vidnode.autoplay = "autoplay"
    vidnode.muted = "muted"
    vidnode.loop = "loop"
    sourcenode.src = embed.video.url
    vidnode.appendChild(sourcenode)
    // <video class="post" poster="//i.imgur.com/zG4xS3kh.jpg" preload="auto" autoplay="autoplay" muted="muted" loop="loop" webkit-playsinline="" style="width: 524px; height: 931.556px;">
    //   <source src="//i.imgur.com/zG4xS3k.mp4" type="video/mp4">
    // </video>
    vidnode.setAttribute("original-url", embed.thumbnail.url)
    return { type: "image", image: vidnode }
  }
  if (embed.type == "video") {
    let iframenode = document.createElement("iframe")
    iframenode.width = "100%"
    iframenode.height = "50%"
    iframenode.src = embed.video.url
    iframenode.frameBorder = 0
    iframenode.allowFullscreen = true
    return { type: "image", image: iframenode }
  }
  let emb = document.createElement("div")
  let title = document.createElement("h4")
  let description = document.createElement("div")
  let stamp = document.createElement("time")
  let colorbar = document.createElement("div")
  let image = document.createElement("img")
  let thumb = document.createElement("img")
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
    logger.debug(link.match(new RegExp(inviteBase + "[A-Za-z0-9]*")))
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

function parseMarkdown(content, maskedLinks) {
  let txt = content.innerHTML
  let bold = txt.match(/\*\*.*\*\*/g)
  for (let i in bold) {
    logger.debug("Bold")
    let match = bold[i]
    txt = txt.replace(match, "<b>" + match.replace(/\*\*/g, "") + "</b>")
  }
  let underlined = txt.match(/__.*__/g)
  for (let i in underlined) {
    logger.debug("Underline")
    let match = underlined[i]
    txt = txt.replace(match, "<underline>" + match.replace(/\_\_/g, "") + "</underline>")
  }
  let italics = txt.match(/(\*.*\*|_.*_)/g)
  for (let i in italics) {
    logger.debug("Italics")
    let match = italics[i]
    txt = txt.replace(match, "<i>" + match.replace(/\*/g, "").replace(/\_/g, "") + "</i>")
  }
  let strikethrough = txt.match(/~~.*~~/g)
  for (let i in strikethrough) {
    logger.debug("Strikethru")
    let match = strikethrough[i]
    txt = txt.replace(match, "<strike>" + match.replace(/~~/g, "") + "</strike>")
  }
  let codeblock = txt.match(/```[\s\S]*```/g)
  for (let i in codeblock) {
    logger.debug("Codeblock")
    let match = codeblock[i]
    let finaltext = match.replace(/```/g, "")
    let lang = finaltext.split("<br>")[0].toLowerCase()
    logger.debug("CODEBLOCK LANG: " + lang)
    if (hljs.getLanguage(lang)) {
      finaltext = finaltext.replace(new RegExp(lang, "i"), "")
      lang = "lang-" + lang
    } else lang = "nohighlight"
    finaltext = `<code class="codeblock ${lang}">${finaltext.replace(/^<br>+|<br>+$/gm, "")}</code>`
    txt = txt.replace(match, finaltext)
  }
  let code = txt.match(/`.*`/g)
  for (let i in code) {
    logger.debug("Code")
    let match = code[i]
    txt = txt.replace(match, "<code>" + match.replace(/`/g, "") + "</code>")
  }
  if (maskedLinks) {
    logger.debug("Masked links on")
    let masked = txt.match(/\[.*\]\((http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?\)/gi)
    for (let i in masked) {
      logger.debug("Masked link")
      let match = masked[i]
      let anode = document.createElement("a")
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
const imgexp = /(http)?s?:?(\/\/[^"']*\.(?:png|jpg|jpeg|gif|png|svg))/gi
function addMessageToDOM(msg, complete) {
  let { embeds } = msg
  let message = msg.cleanContent // Just to make it a bit more readable while we have no mentions set up
  let channel = msg.channel.id
  if (window.channelID != msg.channel.id) return
  document.getElementById("message-input").setAttribute("placeholder", "Message #" + channel.name || "")
  window.channelID = msg.channel.id
  // We got a new message
  let container = document.createElement("div")
  let msgobj = document.createElement("div")
  let title = document.createElement("h2")
  title.textContent = msg.guild.members.get(msg.author.id).displayName + (msg.author && msg.author.bot ? " [BOT]" : "")
  title.classList = "username"
  title.style.color = msg.guild.members.get(msg.author.id).displayHexColor
  msgobj.appendChild(title)
  let avatar = document.createElement("img")
  avatar.src = msg.author.displayAvatarURL
  avatar.classList = "avatar"

  let content = document.createElement("div")
  content.classList = "content"

  let images = document.createElement("div")
  images.classList = "images"

  let time = document.createElement("time")
  time.classList = "message-timestamp"
  time.dateTime = msg.createdTimestamp
  time.textContent = $.timeago(msg.createdTimestamp)
  $(time).ready(function () {
    $(time).timeago()
  })
  msgobj.appendChild(time)

  for (let short in shortcodes) {
    let myemotes = ""
    shortcodes[short].split("-").forEach(function (code) {
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
  $(content).ready(function () {
    $(content).find(".codeblock").not(".nohighlight").each(function (i, block) {
      hljs.highlightBlock(block)
    })
  })

  let attachments = msg.attachments.array()

  for (let att in attachments) {
    let imgnode = document.createElement("img")
    imgnode.src = attachments[att].proxy_url
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
    let link = this.getAttribute("data-link")
    if (link.match(new RegExp(inviteBase + "[A-Za-z0-9]*")) == link) {
      logger.debug("Clicked gg link")
      bot.acceptInvite(link.replace(inviteBase, "")).then(function (guild) {
        ChannelChange(guild.id)
        loadServers()
      }).catch(logger.warn)
    } else {
      logger.debug("Clicked normal link")
      if (IsNode) shell.openExternal(link)
      else window.open(link, "_blank").focus()
    }
  })
  let embedsobj = document.createElement("div")
  for (let itm in embeds) {
    let embd = createEmbed(embeds[itm])
    if (embd.type == "embed") {
      let embedobj = document.createElement("div")
      embedobj.innerHTML = embd.embed
      embedobj.classList = "embed"
      embedsobj.appendChild(embedobj)
    } else if (embd.type == "image") {
      images.appendChild(embd.image)
    }
  }
  console.log(content)
  content.appendChild(embedsobj)

  complete({
    avatar,
    content,
    images,
    msgobj,
    container
  })
}

function BotListeners() {
  logger.debug("Bot Listeners intializing")
  bot.on("debug", function(message) {
    // if(message.split(" ")[0] == "READY") botReady()
    logger.debug(message)
  })
  bot.on("warn", logger.warn)
  bot.on("message", function (msg) {
    addMessageToDOM(msg, function (nodes) {
      let { avatar, content, images, msgobj, container } = nodes

      container.appendChild(avatar)
      msgobj.appendChild(content)
      msgobj.appendChild(images)
      container.id = "msg-" + msg.id
      container.classList = "message"
      if (msg.author.id == bot.user.id) container.classList += " my-message"
      msgobj.classList = "message-inner"
      container.appendChild(msgobj)
      document.getElementById("messages").appendChild(container)

      document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight + 10 // Scroll to bottom of page
    })
  })

  bot.on("guildCreate", function() {
    loadServers()
  })

  bot.on("messageUpdate", function (oldmsg, newmsg) {
    if (!oldmsg || oldmsg.channel.id != window.channelID) return
    let message = newmsg.content
    let container = document.getElementById("msg-" + oldmsg.id)

    addMessageToDOM(newmsg, function (items) {
      let { content, images } = items
      container.getElementsByTagName("div")[0].replaceChild(content, document.body.querySelectorAll(`div#msg-${oldmsg.id} > div > div.content`)[0])
      container.getElementsByTagName("div")[0].replaceChild(images, document.body.querySelectorAll(`div#msg-${oldmsg.id} > div > div.images`)[0])
    })
  })

  bot.on("messageDelete", function (msg) {
    if (msg.channel.id != window.channelID) return
    document.getElementById("msg-" + msg.id).remove()
  })

  bot.on("ready", botReady)

  function botReady() {
    logger.ok("BOT CONNECTED")
    window.channelID = window.localStorage.getItem("lastchannel") || bot.channels.first().id
    if(!bot.channels.get(window.channelID)) window.channelID = bot.channels.first().id

    window.currentMessages = {
      channelID: window.channelID,
      arr: []
    }
    ChannelChange(window.channelID, true)
    loadChannels()
    loadMembers()
    loadServers()
    loadMessages(true)
  }

  bot.on("disconnect", function (err) {
    logger.debug(err)
    if (err == "Authentication Failed") return window.location.href = "login.html"
    $("#loading-line").html(window.loading_lines[Math.floor(Math.random() * window.loading_lines.length)])
    $("#loading-landing").css("display", "block")
  })
  bot.on("error", function (err) {
    logger.error(err)
  })
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
    http: {
      host: endpoint,
      cdn
    }
  })
  bot.login(window.localStorage.getItem("token")).catch(function(err) {
    logger.error(err)
    window.location.href = "login.html"
  })
  BotListeners()
  $("#create-server").click(function () {
    bot.user.createGuild($("#new-server-name").val()).then(function (guild) {
      $.modal.close()
      ChannelChange(guild.id)
      loadServers()
    }).catch(logger.warn)
  })
  document.getElementById("file-upload").onchange = function (ev) {
    let fr = new FileReader()
    fr.onload = function () {
      bot.channels.get(window.channelID).send("", {
        files: [{
          attachment: new Buffer(this.result),
          name: ev.target.files[0].name
        }]
      }).then(function() {
        logger.debug("Uploaded file")
      }).catch(logger.warn)
    }
    fr.readAsArrayBuffer(ev.target.files[0])
  }
  document.getElementById("avatar-upload").onchange = function (ev) {
    let fr = new FileReader()
    fr.onload = function () {
      let base64 = this.result.replace(/data:.*,/, "")
      bot.user.setAvatar(base64).then(function() {
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
    let messageInput = document.getElementById("message-input")
    var keyCode = e.keyCode || e.which
    if (keyCode == "13" && !e.shiftKey) { // We ignore enter key if shift is held down, just like the real client
      e.preventDefault()
      if (messageInput.value.split(" ")[0] == "/join") {
        ChannelChange(messageInput.value.split(" ")[1])
        return
      }
      bot.channels.get(window.channelID).send(sanitizeHTML(messageInput.textContent))
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
    callback: function (key, options) {
      switch (key) {
        case "invite": {
          bot.channels.get(options.$trigger[0].id).createInvite({
            temporary: false,
            max_users: 0,
            max_age: 0
          }).then(function(invite) {
            $("#display-invite-modal > span#invite-text").text(`${inviteBase}/${invite.code}`)
            $("#display-invite-modal > h2 > span#server-name").text(invite.guild.name)
            $("#display-invite-modal").modal()
          }).catch(logger.warn)
          break
        }
      }
    },
    items: {
      invite: { name: "Create Instant Invite", icon: "add" }
    }
  })
  $.contextMenu({
    selector: ".member-list-member",
    callback: function(key, options) {
      switch(key) {
        case "ban": {
          bot.channels.get(window.channelID).guild.members.get(options.$trigger[0].id).ban().then(function() {
            logger.debug("User banned")
            loadMembers()
          }).catch(logger.warn)
          break
        }
        case "kick": {
          bot.channels.get(window.channelID).guild.members.get(options.$trigger[0].id).kick().then(function() {
            logger.debug("User kicked")
            loadMembers()
          }).catch(logger.warn)
          break
        }
        case "nickname": {
          $("#nickname-modal").modal()
          $("#change-nickname").click(function() {
            bot.channels.get(window.channelID).guild.members.get(options.$trigger[0].id).setNickname($("#nickname").val()).then(function() {
              logger.debug("Set nickname")
              $.modal.close()
            }).catch(logger.warn)
          })
          break
        }
      }
    },
    items: {
      ban: {name: "Ban", icon: "hammer"},
      kick: {name: "Kick", icon: "exit"},
      nickname: {name: "Set Nickname", icon: "edit"}
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
          bot.channels.get(window.channelID).messages.get(messageId).delete().then(function() {
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
              bot.channels.get(window.channelID).messages.get(messageId).edit(messageContent.textContent).then(function() {
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

function ChannelChange(channelID, silent) {
  if (window.channelID == channelID) return // We're already in the channel...
  window.localStorage.setItem("lastchannel", channelID)
  let channel = bot.channels.get(channelID)
  console.log(channel)
  let server = channel.guild
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
  document.getElementById("member-list").innerHTML = ""
  let mem = bot.channels.get(window.channelID).guild.members
  mem.forEach(function (user) {
    let container = document.createElement("div")
    let avatar = document.createElement("img")
    let username = document.createElement("h2")
    username.textContent = user.displayName
    avatar.src = user.user.displayAvatarURL
    avatar.classList = "member-list-avatar"
    container.classList = "member-list-member"
    username.classList = "member-list-username"
    username.style.color = user.displayHexColor
    username.id = user.user.id
    avatar.id = user.user.id
    container.appendChild(avatar)
    container.appendChild(username)
    container.id = user.user.id
    // if(!document.getElementById("member-list").getElementById("role-" + user.hoistRole.id)) {
    //   document.getElementById("member-list")
    // }
    document.getElementById("member-list").appendChild(container)
  })
}

function loadMessages(hideLoaderAfter) { // TODO: Move this to a web worker
  logger.debug("Grabbing messages")
  let options = {
    limit: 100
  }
  if (window.currentMessages.channelID == window.channelID && window.currentMessages.arr.length > 0) options.before = window.currentMessages.arr[0].id
  bot.channels.get(window.channelID).fetchMessages(options).then(function (messages) {
    logger.debug("Got messages " + typeof messages + " : " + messages.length)
    let oldScrollHeight = document.getElementById("messages").scrollHeight
    let scrolltobottom = window.currentMessages.channelID == window.channelID
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
      document.getElementById("messages").innerHTML = ""
    }

    let len = messages.size

    if (len <= 0) {
      if (hideLoaderAfter) $("#loading-landing").css("display", "none")
      if (scrolltobottom) document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight - oldScrollHeight
      else document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight
      return
    }

    messages.forEach(function (curmsg, i) {
      conzole.log(curmsg)
      if (!curmsg || !curmsg.author) return
      addMessageToDOM(curmsg, function (items) {
        let { avatar, content, images, msgobj, container } = items
        container.appendChild(avatar)
        msgobj.appendChild(content)
        msgobj.appendChild(images)
        container.id = "msg-" + curmsg.id
        container.classList = "message"
        if (curmsg.author.id == bot.user.id) container.classList += " my-message"
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
  }).catch(logger.warn)
}

function loadServers() {
  document.getElementById("server-list").innerHTML = "" // Empty it since we might have something left after we get kicked off because an error happened
  let srvlist = bot.user.settings && bot.user.settings.guildPositions && bot.user.settings.guildPositions.length > 0 ? bot.user.settings.guildPositions : Array.from(bot.guilds.keys())
  srvlist.forEach(function (srv, i) {
    let server = bot.guilds.get(srv)
    if (!server) return
    let servericon = server.iconURL("png", 128)
    if (!servericon) servericon = "https://dummyimage.com/256x256/ffffff/000000.png&text=" + encodeURI(((server.name || "E R R O R").match(/\b(\w)/g) || ["ERROR"]).join(""))
    if (server.unavailable) servericon = "unavailable.png"
    let servernode = document.createElement("a")
    servernode.href = "#"
    servernode.classList = "server-icon"
    let serverimg = document.createElement("img")
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
    document.getElementById("server-list").insertBefore(servernode, null)
    if (i + 1 >= srvlist.length) {
      let addnode = document.createElement("a")
      addnode.href = "#"
      addnode.classList = "server-icon"
      addnode.id = "new-server-btn"
      let addimg = document.createElement("img")
      addimg.src = "new-guild.png"
      addimg.classList = "server-image"
      addimg.onload = function () {
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
  if (!bot.channels.get(window.channelID)) return
  let channels = bot.channels.get(window.channelID).guild.channels.array()
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