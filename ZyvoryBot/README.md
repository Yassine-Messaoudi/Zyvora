# ZyvoryBot

Discord ticket panel bot for Zyvory using Discord.js Components V2.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in:

```bash
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
TICKET_CATEGORY_ID=
STAFF_ROLE_ID=
LOG_CHANNEL_ID=
```

3. Start the bot:

```bash
npm start
```

4. In Discord, run:

```text
/ticket-panel
```

The bot posts the Zyvory ticket panel with the `zyvory_gif.gif` banner and support buttons.

## Ticket workflow

- Customer presses a ticket button and gets a private ticket channel.
- Staff can press `Send Replacement`, fill the replacement modal, and the bot DMs the customer.
- Customer presses `Order Received` after the replacement/order works.
- Closing a ticket creates an HTML transcript and sends it to the log channel/customer before deleting the channel.

For transcripts to include message text, enable the `Message Content Intent` for the bot in the Discord Developer Portal, then set:

```env
ENABLE_MESSAGE_CONTENT_INTENT=true
```

Leave it as `false` if Discord shows `Used disallowed intents`.
