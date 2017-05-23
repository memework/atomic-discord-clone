# Atomic-Discord
An alternative Discord client made in Atom!

## Notes
 - Uses Discord.js
 - Works with Discord, Discord Staging, and it is the recommended [Litecord](https://git.memework.org/lnmds/litecord) client.
  - Login page should only be used when doing Atomic+Litecord, since authentication routes can get you banned in Discord.

## Installation

Make sure you have `npm` installed.
```bash
git clone ssh://git@git.memework.org:2222/heatingdevice/atomic-discord.git
cd atomic-discord

# install dependencies
npm i --global electron
npm i

# In the web/discord-controller.js file:
# - If needed, change `cdn`, `endpoint` and `inviteBase` variables.
# - Edit line 73(at the time of this writing) with your auth token.

# run the client
electron app.js
```
