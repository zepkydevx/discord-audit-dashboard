# discord-audit-dashboard

![Tests](https://github.com/zepkydevx/discord-audit-dashboard/actions/workflows/tests.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)

A Discord bot that streams moderation audit events to a live web dashboard
over WebSocket — channels and roles being deleted, members banned or
kicked — the moment they happen, no page refresh needed.

This is a **demonstration project**. It is not running publicly, and it
is not meant to be a finished product for any server to install. The bot
stays private, and it exists to show how I approach real-time,
event-driven systems: a typed event pipeline, a token-gated WebSocket
server, a resilient frontend client, and automated tests — the same
engineering standard as my other portfolio projects, applied to
TypeScript this time instead of Python.

## The problem

A moderation log channel inside Discord works, but it scrolls, it can be
deleted along with everything else in a raid, and checking it means
opening Discord. A dashboard that a moderator can leave open on another
screen — updating itself, with no polling — is a different kind of tool:
built for watching, not for digging through history after the fact.

## How it works

```
Discord audit log → bot (normalizes events) → WebSocket → dashboard (renders live)
```

1. **`bot/src/auditListener.ts`** listens to discord.js's unified audit-log
   event and turns Discord's shape into the project's own `AuditEvent`
   type. That translation is a pure function
   (`normalizeAuditEntry`), kept deliberately separate from anything
   Discord-specific — the same pattern as the scorer in
   [discord-anti-nuke](https://github.com/zepkydevx/discord-anti-nuke):
   it is unit tested with plain objects, no live bot connection needed.
2. **`bot/src/broadcaster.ts`** runs a WebSocket server and only
   broadcasts to clients that send the correct token as their first
   message. Anyone else is disconnected before seeing a single event.
3. **`dashboard/main.js`** connects, authenticates, and renders each
   event as it arrives. If the connection drops, it reconnects on its
   own with a growing delay between attempts, instead of just going
   silent.

## Built to be extended, not to be used as-is

The bot only watches four action types right now (`WATCHED_ACTIONS` in
`auditListener.ts`): channel deletions, role deletions, bans, and kicks.
That list is intentionally short for a demo — discord.js exposes dozens
of audit-log action types (webhook changes, invite creation, emoji
updates, and more), and adding one is a single line in that map, not a
change to the architecture. The dashboard's event styling
(`EVENT_INFO` in `main.js`) follows the same idea: new event types just
need a label and a severity color.

In other words, this isn't a fixed product — it's a base meant to be
shaped around whatever a specific server or moderator actually wants to
watch, and how they want it to look.

## Live test

Run against a real Discord server, with the bot and the dashboard both
running locally (Termux, in this case — no dedicated server needed to
verify the flow end to end):

```
2026-09-23T20:40:21.396Z | INFO     | WebSocket server listening on port 8080
2026-09-23T20:40:24.357Z | INFO     | Logged in as Auditolox#7360 (ID: 1552415612419051560)
```

With both sides connected, a real channel was deleted in the test
server. The event reached the dashboard instantly — no refresh, no
delay — confirming the full path works: Discord → audit-log listener →
WebSocket broadcast → live render in the browser.

## Project structure

```
discord-audit-dashboard/
├── bot/
│   ├── src/
│   │   ├── auditListener.ts  # Discord's audit log → AuditEvent (pure + tested)
│   │   ├── broadcaster.ts    # token-gated WebSocket server
│   │   ├── client.ts         # Discord client, minimal intents
│   │   ├── config.ts         # environment-based settings, no hardcoded secrets
│   │   ├── index.ts          # entry point
│   │   └── types.ts          # shared event types
│   └── test/
│       └── auditListener.test.ts
└── dashboard/
    ├── index.html
    ├── main.js                # JSDoc-typed, zero build step
    └── jsconfig.json
```

## Running it

**Bot:**
```bash
cd bot
npm install
cp .env.example .env   # then add your bot token and a dashboard token
npm run dev
```

**Dashboard** (any static file server works; this one needs no build step):
```bash
cd dashboard
python -m http.server 8081
```
Open `http://localhost:8081`, paste the same dashboard token from `.env`,
and connect.

Run the tests with:
```bash
cd bot
npm test
npm run typecheck
```

## Stack

TypeScript, [discord.js](https://discord.js.org/), `ws`, Vitest, GitHub
Actions. The dashboard is plain HTML/CSS/JS, type-checked via JSDoc
instead of a bundler, so it runs in a browser with zero build tooling.

## License

MIT — see [LICENSE](LICENSE).



https://github.com/user-attachments/assets/e9a601ea-39b7-4f92-8f50-d10e9502ac15


