# richup-monopoly

A real-time, browser-based Monopoly-style board game you can play with friends over a private invite link. No accounts, no downloads — just open the page, create a room and share the code.

## What it is

Two to eight players take turns rolling dice, buying city properties, building houses and hotels, collecting rent and trying to bankrupt everyone else. The full classic rule set is in:

- Buying and auctioning unowned properties
- Building houses evenly across a colour group, then upgrading to hotels
- Rent scaling with development and with the number of airports or companies owned
- Mortgage / unmortgage (mortgage value back plus 10% interest to lift)
- Surprise and Treasure card draws (move, collect, pay, get-out-of-jail, repairs)
- Jail: roll doubles to escape, pay the fine, or play a get-out-of-jail card
- Live trading: propose any combination of cash, properties and jail cards; the other player accepts, declines or ignores
- Bankruptcy: assets transfer to the creditor; last person standing wins

AI bots fill empty seats and play automatically using simple buy-and-build heuristics.

## Two boards

**Classic** — the familiar 40-tile loop with eight colour groups, four airports, two companies and its own Surprise/Treasure deck. Up to 4 players.

**World Tour** — a larger 56-tile board themed around real cities across every region, ten colour groups, six airports, four companies and a richer card deck. Up to 8 players.

Adding a new map is a single file in `shared/src/maps/` — export a `MapDef` object with the tile list, colour groups and card decks, then register it in `shared/src/maps/index.ts`.

## Running it locally

```bash
npm install
npm run dev
```

This starts the game server on port 3001 and the Vite dev server on port 5173. Open `http://localhost:5173` in as many browser tabs as you like.

To run just the tests:

```bash
npm test
```

To build everything for production:

```bash
npm run build
npm start        # serves the built client from the same port as the API
```

## How rooms work

- The host creates a room and gets a five-character code plus a shareable invite link (e.g. `/?room=XYZAB`).
- Guests paste the code or click the link to join.
- The host picks the board, tweaks settings (starting cash, auctions on/off, vacation pot, turn timer) and can add AI bots to fill seats.
- Once the game starts the room stays alive until everyone leaves. If you close the tab and reopen it, the session is restored from `localStorage`.

## Project layout

```
shared/    Pure game engine, types, maps and card decks (Vitest tests live here)
server/    Node + Express + Socket.io — authoritative state, rooms, bots
client/    React + TypeScript + Vite — board renderer and all UI
```

The server is the single source of truth. Every action goes through the engine as a pure function (state in → state out, no mutation), which makes the logic straightforward to test and reason about.

## Tech

- TypeScript across the whole monorepo (npm workspaces)
- React 18, Vite 5
- Socket.io 4 for real-time room sync
- Vitest for deterministic engine tests (seeded PRNG so results are reproducible)
- Zero database — everything is in memory, which keeps the setup simple
