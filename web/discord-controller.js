const Discord = require("discord.io");
const notifier = require('node-notifier');
const cdn = "https://cdn.discordapp.com";
const messages = document.getElementById("messages")
const { shell } = require('electron')
const shortcodes = require('./emojis.json')

// Uncomment this for first run... I just don't like having to change this every time :^)
// window.localStorage.setItem("token", "CHANGE THIS PLES") // In production, this gets set by the login page

let bot = global.bot = new window.Discord.Client({
    token: window.localStorage.getItem("token"),
    autorun: true
});

bot.on("message", function (user, userID, channelID, message, event) {
    addMessageToDOM({
        user,
        userID,
        channelID,
        serverID: bot.channels[channelID].guild_id,
        messageID: event.d.id,
        message,
        event
    }, function (nodes) {
        let { avatar, content, images, msgobj, container, deletebtn } = nodes

        container.appendChild(avatar);
        msgobj.appendChild(content);
        msgobj.appendChild(images);
        container.id = "msg-" + event.d.id;
        container.classList = "message";
        msgobj.classList = "message-inner";
        container.appendChild(msgobj)
        container.appendChild(deletebtn)
        document.getElementById("messages").appendChild(container);
        // messages.appendChild(document.createElement("br"));

        document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight + 10; // Scroll to bottom of page
    })
})

function addMessageToDOM(messageInfo, complete) {
    let { user, userID, channelID, messageID, serverID, message, event } = messageInfo
    message = bot.fixMessage(message) // Just to make it a bit more readable while we have no mentions set up
    let channel = bot.channels[channelID];
    let serverName = bot.servers[serverID].name;
    if (window.channelID != channelID) return;
    document.getElementById("message-input").setAttribute("placeholder", "Message #" + channel.name);
    // ChannelChange(channelID);
    window.channelID = channelID;
    // We got a new message
    let container = document.createElement("div");
    let msgobj = document.createElement("div");
    let title = document.createElement("h2");
    title.appendChild(document.createTextNode(user));
    title.classList = "username";
    msgobj.appendChild(title);

    let avatarurl = `${cdn}/avatars/${userID}/${event.d.author.avatar}.webp?size=64`;
    let avatar = document.createElement("img");
    avatar.src = avatarurl;
    avatar.classList = "avatar";

    let content = document.createElement("div");
    content.classList = "content";

    let images = document.createElement("div");
    images.classList = "images";

    for(let short in shortcodes) {
        let myemotes = ""
        shortcodes[short].split("-").forEach(code => {
            myemotes += twemoji.convert.fromCodePoint(code)
        })
        message = message.replace(new RegExp(":" + short + ":"), myemotes) // Here we replace the emotes with their HTML representations
    }

    args = message.split(/\s/g);
    for (let itm in args) {
        if (urlexp.test(args[itm])) {
            console.log(args[itm])
            let link = args[itm];
            let anode = document.createElement("a");
            anode.onclick = () => {
                shell.openExternal(link)
            }
            anode.href = "#";
            anode.innerHTML = link;
            content.innerHTML += " ";
            content.appendChild(anode);
            if (link.match(imgexp)) {
                let imgnode = document.createElement("img");
                imgnode.onload = () => {
                    imgnode.style.background = "none"
                }
                imgnode.src = "https://images.weserv.nl/?url=" + encodeURI(link.replace(/http(s|):\/\//i, ""));
                images.appendChild(imgnode);
            }
        } else if (emojiexp.test(args[itm])) {
            let colsplit = args[itm].split(":");
            let link = `${cdn}/emojis/${colsplit[colsplit.length - 1].substring(0, colsplit[colsplit.length - 1].length - 1)}.png`;
            // console.log(link);
            let imgnode = document.createElement("img");
            imgnode.classList = "emoji"
            imgnode.src = "https://images.weserv.nl/?url=" + encodeURI(link.replace(/http(s|):\/\//i, ""));;
            content.innerHTML += " " + imgnode.outerHTML
        } else {
            content.innerHTML += " " + twemoji.parse(args[itm]);
        }
    }

    let deletebtn = document.createElement("div")
    deletebtn.onclick = function () {
        console.log(channelID, messageID, typeof channelID, typeof messageID)
        bot.deleteMessage({
            channelID: channelID,
            messageID: messageID
        }, (err) => {
            if (err && err != "ResponseError: Error: SyntaxError: Unexpected end of JSON input") return alert("Error while deleting message: " + err)
            // We don't remove it from the DOM because the messageDelete event is fired
        })
    }
    deletebtn.innerHTML = '<i class="fa fa-trash-o jumbotxt" aria-hidden="true"></i>'

    // content.innerHTML = args.join(" ");
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
        // });
    }
}


bot.on("messageUpdate", (oldmsg, newmsg) => {
    if (oldmsg.channel_id != window.channelID) return console.log("Skipping nonexistant message update...")
    let message = newmsg.content
    let container = document.getElementById("msg-" + oldmsg.id)
    if (!newmsg.content) return document.getElementById(`msg-${oldmsg.id}`).remove()

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
        }
    }, function (items) {
        let { content, images } = items
        console.log(document.body.querySelectorAll(`div#msg-${oldmsg.id} > div > div.images`))
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
    notifier.notify({
        title: "Connected to Discord!",
        message: "Successfully connected to Discord!"
    });
    console.log("Ready");
    loadServers();
    loadMessages();
    loadChannels();
});

bot.on("disconnect", (err) => {
    notifier.notify({
        title: "Disconnected to Discord!",
        message: "Oh snap! I lost connection to Discord! Attempting to reconnect..."
    });
    bot.connect()
    console.log("Error: " + err)
})

const urlexp = /(http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/gi;
const imgexp = /(http)?s?:?(\/\/[^"']*\.(?:png|jpg|jpeg|gif|png|svg))/gi;

// Old message code before we had new message handler
/*
bot.on("message", function (user, userID, channelID, message, event) {
    let channel = bot.channels[channelID];
    let serverID = channel.guild_id;
    let serverName = bot.servers[serverID].name;
    if (window.channelID != channelID) return;
    document.getElementById("message-input").setAttribute("placeholder", "Message #" + channel.name);
    // ChannelChange(channelID);
    window.channelID = channelID;
    // We got a new message
    let container = document.createElement("div");
    let msgobj = document.createElement("div");
    let title = document.createElement("h2");
    title.appendChild(document.createTextNode(user));
    title.classList = "username";
    msgobj.appendChild(title);

    let avatarurl = `${cdn}/avatars/${userID}/${event.d.author.avatar}.webp?size=64`;
    let avatar = document.createElement("img");
    avatar.src = avatarurl;
    avatar.classList = "avatar";

    let content = document.createElement("div");
    content.classList = "content";
    let msg = twemoji.parse(message).replace(/(?:\r\n|\r|\n)/g, '<br />');

    let images = document.createElement("div");
    images.classList = "images";

    args = message.split(" ");
    for (let itm in args) {
        if (urlexp.test(args[itm])) {
            let link = args[itm];
            let anode = document.createElement("a");
            anode.onclick = () => {
                shell.openExternal(link)
            }
            anode.href = "#";
            anode.innerHTML = link;
            content.innerHTML += " ";
            content.appendChild(anode);
            if (link.match(imgexp)) {
                let imgnode = document.createElement("img");
                imgnode.onload = () => {
                    imgnode.style.background = "none"
                }
                imgnode.src = "https://images.weserv.nl/?url=" + encodeURI(link.replace(/http(s|):\/\//i, ""));
                images.appendChild(imgnode);
            }
        } else {
            if (emojiexp.test(args[itm])) {
                let colsplit = args[itm].split(":");
                let link = `${cdn}/emojis/${colsplit[colsplit.length - 1].substring(0, colsplit[colsplit.length - 1].length - 1)}.png`;
                // console.log(link);
                let imgnode = document.createElement("img");
                imgnode.onload = () => {
                    imgnode.style.background = "none"
                }
                imgnode.src = "https://images.weserv.nl/?url=" + encodeURI(link.replace(/http(s|):\/\//i, ""));;
                images.appendChild(imgnode);
            } else {
                content.innerHTML += " " + twemoji.parse(args[itm]);
            }
        }
    }

    // content.innerHTML = args.join(" ");
    container.appendChild(avatar);
    msgobj.appendChild(content);
    msgobj.appendChild(images);
    container.id = "msg-" + event.d.id;
    container.classList = "message";
    msgobj.classList = "message-inner";
    container.appendChild(msgobj)
    messages.appendChild(container);
    // messages.appendChild(document.createElement("br"));

    messages.scrollTop = messages.scrollHeight + 10; // Scroll to bottom of page

    if (userID != bot.id) {
        // notifier.notify({
        //     title: "Message from " + user + ":",
        //     message
        // });
    }
});
*/

window.channelID = "303292261263867904"; // "297499424534298624";

window.currentMessages = {
    channelID: window.channelID,
    arr: []
}

$(document).ready(function () {
    let messageInput = document.getElementById('message-input');

    ChannelChange(window.channelID, true);
    // $("#message-input").emojioneArea();
    $("#message-input").keypress(function (e) {
        if (!e) e = window.event;
        var keyCode = e.keyCode || e.which;
        if (keyCode == '13') {
            if (messageInput.value.split(" ")[0] == "/join") {
                ChannelChange(messageInput.value.split(" ")[1]);
                return;
            }
            bot.sendMessage({
                to: window.channelID,
                message: messageInput.value
            });
            messageInput.value = "";
        }
    });
    $("#messages").scroll(function () {
        if ($(this).scrollTop() === 0) {
            console.log("TOP!");
            loadMessages();
        }
    });
});

function ChannelChange(channelID, silent) {
    if (window.channelID == channelID) return; // We're already in the channel...
    let channel = bot.channels[channelID];
    if (!channel) return console.log("Skipping channel that doesn't exist");
    let server = bot.servers[channel.guild_id];
    document.title = `#${channel.name} in ${server.name} - ${channel.topic}`;
    if (!silent) {
        let changemsg = document.createElement("div");
        changemsg.classList = "info-message";
        changemsg.innerHTML = `Changed to #${channel.name} on ${server.name} - ${channel.topic ? channel.topic : "<no channel topic>"}`;
        document.getElementById("messages").appendChild(changemsg);
    }
    window.channelID = channelID;
    loadChannels();
    loadMessages();
    loadMembers(0);
}

function loadMembers(i) {
    let members = bot.servers[bot.channels[window.channelID].guild_id].members
    if (i >= Object.keys(members).length) {
        console.log("Loaded members")
    }
    // data.bot.createDMChannel(members[Object.keys(members)[i]], function (err, res) {
    //     if(err || !res) {
    //         console.log(err ? err : "User no exist")
    //         return loadMembers(++i);
    //     }
    //     if (!res.recipient.avatar) {
    //         res = "https://discordapp.com/assets/dd4dbc0016779df1378e7812eabaa04d.png";
    //     } else {
    //         res = `${cdn}/avatars/${id}/${res.recipient.avatar}.webp?size=1024`;
    //     }
    //     setTimeout(()=>{
    //         loadMembers(++i)
    //     }, 500)
    // })
}

let emojiexp = /<:\S*:[0-9]{18}>/gi;

function loadMessages() {
    bot.getMessages({
        channelID: window.channelID,
        limit: 100,
        // before: (window.currentMessages.channelID == channelID ? (window.currentMessages.arr.length > 0 ? window.currentMessages.arr[0].id : undefined) : undefined)
    }, (err, messages) => {
        // messages.reverse();
        let scrolltobottom = window.currentMessages.channelID == channelID;
        if (scrolltobottom) {
            // messages.reverse();
            for (let itm in messages) {
                window.currentMessages.arr.push(messages[itm]);
            }
        } else {
            window.currentMessages = {
                channelID: window.channelID,
                arr: messages
            }
        }
        document.getElementById("messages").innerHTML = "";

        let thearr = window.currentMessages.arr;
        thearr.reverse();

        for (let itm in thearr) {
            let curmsg = thearr[itm];

            if (!curmsg || !curmsg.author) continue;
            let message = curmsg.content;
            let user = curmsg.author.username;
            let userID = curmsg.author.id;
            let channelID = curmsg.channel_id;
            let event = {
                d: curmsg
            };

            addMessageToDOM({
                user,
                userID,
                channelID,
                serverID: bot.channels[channelID].guild_id,
                messageID: event.d.id,
                message,
                event
            }, function (items) {
                let { avatar, content, images, msgobj, container, deletebtn } = items
                container.appendChild(avatar);
                msgobj.appendChild(content);
                msgobj.appendChild(images);
                container.id = "msg-" + event.d.id;
                container.classList = "message";
                msgobj.classList = "message-inner";
                container.appendChild(msgobj);
                container.appendChild(deletebtn);
                document.getElementById("messages").insertBefore(container, null);
            })
        }
        if (scrolltobottom) document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
    });
}

function loadServers() {
    let servers = bot.servers
    for (let srv in servers) {
        let server = servers[srv];
        let servericon = `${cdn}/icons/${server.id}/${server.icon}.webp?size=256`;
        if (!server.icon) servericon = "https://dummyimage.com/256x256/ffffff/000000.png&text=" + encodeURI(((server.name || "E R R O R").match(/\b(\w)/g) || ["ERROR"]).join(""))
        let servernode = document.createElement("a");
        servernode.href = "#";
        servernode.classList = "server-icon";
        let serverimg = document.createElement("img");
        serverimg.src = servericon;
        serverimg.classList = "server-image";
        serverimg.onload = () => {
            serverimg.style.background = "none"
        }
        servernode.appendChild(serverimg);
        servernode.id = server.id;
        servernode.onclick = function () {
            ChannelChange(server.id, true);
        }
        document.getElementById("server-list").insertBefore(servernode, null);
    }
}

function loadChannels() {
    document.getElementById("channel-container").innerHTML = "";
    let channels = bot.servers[bot.channels[channelID].guild_id].channels;
    for (let srv in channels) {
        let channel = channels[srv];
        if (channel.type != "text") continue; // We don't do voice channels atm... OR VIDEO CHANNELS DISCORD VIDEO SUPPORT COMING SOON™ CONFIRMED!!!1!!!!!
        let channelnode = document.createElement("div");
        channelnode.href = "#";
        channelnode.classList = "channel-btn";
        channelnode.appendChild(document.createTextNode("#" + channel.name));
        channelnode.id = channel.id;
        channelnode.onclick = function () {
            ChannelChange(channel.id, true);
        }
        document.getElementById("channel-container").appendChild(channelnode);
    }
}
