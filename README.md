# Atomic-Discord
An alternative Discord client made in Electron!

## Notes
 - Uses Discord.js
 - Works with Discord, Discord Staging, and it is the recommended [Litecord](https://git.memework.org/lnmds/litecord) client.
  - Login page should only be used when doing Atomic+Litecord, since authentication routes can get you banned in Discord.
  - If you are using an alternative gateway, add an entry in localStorage which says so. The properties you'll need are
    - url-cdn (default: https://cdn.discordapp.com)
    - url-api (default: https://discordapp.com)
    - url-invite (default: https://discord.gg)
   - You can set these by pasting the following in the inspector: `window.localStorage.setItem("property", "value")` (Replacing `property` and `value` with the correct value)

## Installation

Make sure you have `npm` and `node` installed.
```bash
git clone ssh://git@git.memework.org:2222/heatingdevice/atomic-discord.git
cd atomic-discord

# install dependencies
npm i -g electron
npm i

# run the client
electron app.js
```
