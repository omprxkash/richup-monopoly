// Simple heuristic bots. They reuse the same engine actions a human would, one
// step at a time, with a short delay so the table is readable.

import {
  getMap,
  rollDice,
  buyProperty,
  declineBuy,
  placeBid,
  passBid,
  build,
  mortgage,
  endTurn,
  jailAction,
  declareBankruptcy,
  respondTrade,
  type GameState,
  type Player,
  type OwnableTile,
  type TradeOffer,
} from '@richup/shared';
import type { Room } from './rooms';

const STEP_DELAY = 850;

function tileValue(g: GameState, tileId: number): number {
  const map = getMap(g.mapId);
  const t = map.tiles[tileId];
  if (t.kind === 'property' || t.kind === 'airport' || t.kind === 'company') {
    return (t as OwnableTile).price;
  }
  return 0;
}

function offerValue(g: GameState, o: TradeOffer): number {
  return o.cash + o.jailCards * 50 + o.tileIds.reduce((sum, id) => sum + tileValue(g, id), 0);
}

function isBotActor(g: GameState): Player | null {
  if (g.phase === 'auction' && g.pendingAuction) {
    const p = g.players.find((x) => x.id === g.pendingAuction!.turn);
    return p && p.isBot ? p : null;
  }
  const cur = g.players[g.currentIdx];
  return cur && cur.isBot && !cur.isBankrupt ? cur : null;
}

/** Bots auto-answer any trade addressed to them. Returns true if it acted. */
export function autoRespondBotTrades(room: Room): boolean {
  const g = room.game;
  if (!g) return false;
  for (const trade of g.pendingTrades) {
    const to = g.players.find((p) => p.id === trade.to);
    if (!to || !to.isBot) continue;
    // Bot receives trade.give, parts with trade.receive.
    const gain = offerValue(g, trade.give);
    const cost = offerValue(g, trade.receive);
    const accept = gain >= cost && to.cash >= trade.receive.cash;
    try {
      room.game = respondTrade(g, trade.id, accept, to.id);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** Perform a single bot action. Returns true if the state advanced. */
export function runBotStep(room: Room): boolean {
  const g = room.game;
  if (!g || g.phase === 'ended') return false;

  const actor = isBotActor(g);
  if (!actor) return false;

  try {
    // Resolve a debt before anything else.
    if (g.debt && g.debt.playerId === actor.id) {
      const raised = raiseCash(room, actor.id);
      if (!raised) room.game = declareBankruptcy(g, actor.id);
      return true;
    }

    switch (g.phase) {
      case 'jail-decision': {
        if (actor.jailCards > 0) room.game = jailAction(g, actor.id, 'card');
        else if (actor.cash > 120) room.game = jailAction(g, actor.id, 'pay');
        else room.game = jailAction(g, actor.id, 'roll');
        return true;
      }
      case 'rolling': {
        room.game = rollDice(g, actor.id);
        return true;
      }
      case 'awaiting-buy': {
        const map = getMap(g.mapId);
        const tile = map.tiles[actor.position] as OwnableTile;
        if (actor.cash - tile.price >= 120) room.game = buyProperty(g, actor.id);
        else room.game = declineBuy(g, actor.id);
        return true;
      }
      case 'auction': {
        const a = g.pendingAuction!;
        const cap = Math.floor(tileValue(g, a.tileId) * 0.7);
        const next = a.highBid + 10;
        if (next <= cap && next <= actor.cash) room.game = placeBid(g, actor.id, next);
        else room.game = passBid(g, actor.id);
        return true;
      }
      case 'turn-end': {
        if (tryBuildSomething(room, actor.id)) return true;
        room.game = endTurn(g, actor.id);
        return true;
      }
      default:
        return false;
    }
  } catch {
    // On any unexpected rejection, try to keep the game moving.
    try {
      if (room.game && room.game.phase === 'turn-end') room.game = endTurn(room.game, actor.id);
      else if (room.game && room.game.phase === 'awaiting-buy') room.game = declineBuy(room.game, actor.id);
      else return false;
      return true;
    } catch {
      return false;
    }
  }
}

function tryBuildSomething(room: Room, botId: string): boolean {
  const g = room.game!;
  const bot = g.players.find((p) => p.id === botId)!;
  if (bot.cash < 400) return false; // keep a cushion
  const map = getMap(g.mapId);
  for (const t of map.tiles) {
    if (t.kind !== 'property') continue;
    if (g.tiles[t.id].ownerId !== botId) continue;
    try {
      const next = build(g, botId, t.id);
      room.game = next;
      return true;
    } catch {
      // not buildable yet, keep looking
    }
  }
  return false;
}

function raiseCash(room: Room, botId: string): boolean {
  const g = room.game!;
  const need = g.debt ? g.debt.amount : 0;
  const map = getMap(g.mapId);
  for (const t of map.tiles) {
    if (!('price' in t)) continue;
    const ts = g.tiles[t.id];
    if (ts.ownerId !== botId || ts.mortgaged || ts.houses > 0 || ts.hotel) continue;
    try {
      room.game = mortgage(g, botId, t.id);
      if (!room.game.debt || room.game.players.find((p) => p.id === botId)!.cash >= need) return true;
      return true;
    } catch {
      // keep trying
    }
  }
  return false;
}

export function scheduleBots(room: Room, onChange: () => void): void {
  if (room.botTimer) clearTimeout(room.botTimer);
  if (!room.game || room.game.phase === 'ended') return;

  // Trades can be resolved immediately (no turn needed).
  if (autoRespondBotTrades(room)) {
    onChange();
    scheduleBots(room, onChange);
    return;
  }

  if (!isBotActor(room.game)) return;

  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    const changed = runBotStep(room);
    if (changed) {
      onChange();
      scheduleBots(room, onChange);
    }
  }, STEP_DELAY);
}
