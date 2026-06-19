// The authoritative, deterministic game engine. Every exported action takes the
// current state plus an action and returns a brand-new state — inputs are never
// mutated. The server is the only caller that applies these; the client and the
// bots reuse the same pure logic.

import type {
  GameState,
  Player,
  Settings,
  MapDef,
  Tile,
  OwnableTile,
  Card,
  TradeOffer,
} from '../types';
import { JAIL_FINE } from '../types';
import { getMap } from '../maps/index';
import { rollDie, shuffle } from '../rng';

const clone = (s: GameState): GameState => structuredClone(s);

// ---------- small lookups ------------------------------------------------

function tileAt(map: MapDef, id: number): Tile {
  return map.tiles[id];
}

function isOwnable(t: Tile): t is OwnableTile {
  return t.kind === 'property' || t.kind === 'airport' || t.kind === 'company';
}

function findPlayer(state: GameState, id: string): Player {
  const p = state.players.find((x) => x.id === id);
  if (!p) throw new Error('No such player');
  return p;
}

function current(state: GameState): Player {
  return state.players[state.currentIdx];
}

function jailTileId(map: MapDef): number {
  const t = map.tiles.find((x) => x.kind === 'jail');
  return t ? t.id : 0;
}

function activePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.isBankrupt);
}

function log(state: GameState, text: string): void {
  state.log.push({ id: state.logSeq++, text, ts: Date.now() });
  if (state.log.length > 200) state.log.shift();
}

// ---------- ownership & rent --------------------------------------------

function groupTiles(map: MapDef, group: string): Tile[] {
  return map.tiles.filter((t) => t.kind === 'property' && t.group === group);
}

function ownsGroup(state: GameState, map: MapDef, ownerId: string, group: string): boolean {
  const g = groupTiles(map, group);
  return g.length > 0 && g.every((t) => state.tiles[t.id]?.ownerId === ownerId);
}

function groupHasBuildings(state: GameState, map: MapDef, group: string): boolean {
  return groupTiles(map, group).some((t) => {
    const ts = state.tiles[t.id];
    return ts && (ts.houses > 0 || ts.hotel);
  });
}

function ownedKindCount(state: GameState, map: MapDef, ownerId: string, kind: Tile['kind']): number {
  return map.tiles.filter((t) => t.kind === kind && state.tiles[t.id]?.ownerId === ownerId).length;
}

export function rentFor(state: GameState, map: MapDef, tileId: number, diceSum: number): number {
  const tile = tileAt(map, tileId);
  const ts = state.tiles[tileId];
  if (!ts || !ts.ownerId || ts.mortgaged) return 0;

  if (tile.kind === 'property') {
    if (ts.hotel) return tile.rent[5];
    if (ts.houses > 0) return tile.rent[ts.houses];
    let base = tile.rent[0];
    if (
      state.settings.x2RentOnFullSet &&
      ownsGroup(state, map, ts.ownerId, tile.group) &&
      !groupHasBuildings(state, map, tile.group)
    ) {
      base *= 2;
    }
    return base;
  }
  if (tile.kind === 'airport') {
    const count = ownedKindCount(state, map, ts.ownerId, 'airport');
    return tile.baseRent * Math.pow(2, Math.max(0, count - 1));
  }
  if (tile.kind === 'company') {
    const count = ownedKindCount(state, map, ts.ownerId, 'company');
    const mult = [0, 4, 10, 20, 40][Math.min(count, 4)];
    return diceSum * mult;
  }
  return 0;
}

// ---------- money & debt -------------------------------------------------

function settleDebt(state: GameState): void {
  const d = state.debt;
  if (!d) return;
  const payer = findPlayer(state, d.playerId);
  if (payer.cash >= d.amount) {
    payer.cash -= d.amount;
    if (d.creditorId) {
      const creditor = state.players.find((p) => p.id === d.creditorId && !p.isBankrupt);
      if (creditor) creditor.cash += d.amount;
    }
    state.debt = null;
  }
}

/** Charge a player. If they can't cover it, a debt is opened that must be
 *  settled (by raising cash) or ended in bankruptcy before the turn proceeds. */
function charge(state: GameState, payer: Player, amount: number, creditorId: string | null): void {
  if (amount <= 0) return;
  if (payer.cash >= amount) {
    payer.cash -= amount;
    if (creditorId) {
      const creditor = state.players.find((p) => p.id === creditorId && !p.isBankrupt);
      if (creditor) creditor.cash += amount;
    }
  } else {
    state.debt = { playerId: payer.id, amount, creditorId };
  }
}

// ---------- movement & landing ------------------------------------------

function moveSteps(state: GameState, map: MapDef, player: Player, steps: number): void {
  const n = map.tiles.length;
  const old = player.position;
  if (steps > 0 && old + steps >= n) {
    player.cash += state.settings.startBonus;
    log(state, `${player.name} passed Start and collected ${state.settings.startBonus}.`);
  }
  let np = (old + steps) % n;
  if (np < 0) np += n;
  player.position = np;
}

function moveToTile(state: GameState, _map: MapDef, player: Player, tileId: number, collectStart: boolean): void {
  if (collectStart && tileId < player.position) {
    player.cash += state.settings.startBonus;
    log(state, `${player.name} passed Start and collected ${state.settings.startBonus}.`);
  }
  player.position = tileId;
}

function sendToJail(state: GameState, map: MapDef, player: Player): void {
  player.position = jailTileId(map);
  player.inJail = true;
  player.jailTurns = 0;
  state.doublesCount = 0;
  log(state, `${player.name} was sent to Jail.`);
}

function drawCard(state: GameState, map: MapDef, deck: 'surprise' | 'treasure'): Card {
  let pile = state.decks[deck];
  if (pile.length === 0) {
    const ids = map[deck].map((c) => c.id);
    const sh = shuffle(ids, state.seed);
    state.seed = sh.seed;
    pile = sh.result;
  }
  const id = pile.shift()!;
  state.decks[deck] = pile;
  const card = map[deck].find((c) => c.id === id)!;
  return card;
}

function applyCard(state: GameState, map: MapDef, player: Player, card: Card): void {
  const a = card.action;
  switch (a.type) {
    case 'money':
      if (a.amount >= 0) player.cash += a.amount;
      else charge(state, player, -a.amount, null);
      break;
    case 'collect-each':
      for (const other of activePlayers(state)) {
        if (other.id === player.id) continue;
        const take = Math.min(a.amount, other.cash);
        other.cash -= take;
        player.cash += take;
      }
      break;
    case 'pay-each': {
      const others = activePlayers(state).filter((p) => p.id !== player.id);
      const total = a.amount * others.length;
      if (player.cash >= total) {
        for (const other of others) {
          player.cash -= a.amount;
          other.cash += a.amount;
        }
      } else {
        charge(state, player, total, null);
      }
      break;
    }
    case 'move-to':
      moveToTile(state, map, player, a.tileId, !!a.collectStart);
      resolveLanding(state, map, player, false);
      break;
    case 'move-by':
      moveSteps(state, map, player, a.steps);
      resolveLanding(state, map, player, false);
      break;
    case 'goto-jail':
      sendToJail(state, map, player);
      break;
    case 'jail-card':
      player.jailCards += 1;
      break;
    case 'repairs': {
      let total = 0;
      for (const t of map.tiles) {
        if (t.kind !== 'property') continue;
        const ts = state.tiles[t.id];
        if (ts?.ownerId !== player.id) continue;
        if (ts.hotel) total += a.perHotel;
        else total += ts.houses * a.perHouse;
      }
      charge(state, player, total, null);
      break;
    }
  }
}

function resolveLanding(state: GameState, map: MapDef, player: Player, allowCards: boolean): void {
  const tile = tileAt(map, player.position);
  switch (tile.kind) {
    case 'start':
      break;
    case 'property':
    case 'airport':
    case 'company': {
      const ts = state.tiles[tile.id];
      if (!ts.ownerId) {
        state.phase = 'awaiting-buy';
        log(state, `${player.name} landed on ${tile.name} (${tile.price}).`);
      } else if (ts.ownerId !== player.id && !ts.mortgaged) {
        const sum = state.dice ? state.dice[0] + state.dice[1] : 0;
        const rent = rentFor(state, map, tile.id, sum);
        const owner = findPlayer(state, ts.ownerId);
        charge(state, player, rent, owner.id);
        log(state, `${player.name} paid ${rent} rent to ${owner.name} for ${tile.name}.`);
      }
      break;
    }
    case 'tax': {
      charge(state, player, tile.amount, null);
      if (state.settings.vacationCashPot) state.pot += tile.amount;
      log(state, `${player.name} paid ${tile.amount} in tax.`);
      break;
    }
    case 'surprise':
    case 'treasure': {
      if (!allowCards) break;
      const deck = tile.kind;
      const card = drawCard(state, map, deck);
      state.pendingCard = { deck, card };
      log(state, `${player.name} drew a ${deck === 'surprise' ? 'Surprise' : 'Treasure'}: ${card.text}`);
      applyCard(state, map, player, card);
      break;
    }
    case 'jail':
      break;
    case 'gotojail':
      sendToJail(state, map, player);
      break;
    case 'vacation':
      if (state.settings.vacationCashPot && state.pot > 0) {
        player.cash += state.pot;
        log(state, `${player.name} collected the ${state.pot} Vacation pot.`);
        state.pot = 0;
      }
      break;
  }
}

// ---------- turn flow ----------------------------------------------------

function finishRollPhase(state: GameState): void {
  if (state.winnerId) {
    state.phase = 'ended';
    return;
  }
  if (state.phase === 'awaiting-buy') return;
  if (state.debt) {
    state.phase = 'turn-end';
    return;
  }
  const cur = current(state);
  if (cur.inJail) {
    state.phase = 'turn-end';
    return;
  }
  if (state.dice && state.dice[0] === state.dice[1] && state.doublesCount < 3) {
    state.phase = 'rolling';
    return;
  }
  state.phase = 'turn-end';
}

function nextPlayerIdx(state: GameState): number {
  const n = state.players.length;
  let i = state.currentIdx;
  for (let step = 0; step < n; step++) {
    i = (i + 1) % n;
    if (!state.players[i].isBankrupt) return i;
  }
  return state.currentIdx;
}

function checkWin(state: GameState): void {
  const alive = activePlayers(state);
  if (alive.length === 1) {
    state.winnerId = alive[0].id;
    state.phase = 'ended';
    log(state, `${alive[0].name} wins!`);
  }
}

function advanceTurn(state: GameState): void {
  state.doublesCount = 0;
  state.dice = null;
  state.pendingCard = null;
  checkWin(state);
  if (state.winnerId) return;
  state.currentIdx = nextPlayerIdx(state);
  const cur = current(state);
  state.phase = cur.inJail ? 'jail-decision' : 'rolling';
}

// ---------- public actions ----------------------------------------------

export function createGame(
  players: Omit<Player, 'cash' | 'position' | 'inJail' | 'jailTurns' | 'jailCards' | 'isBankrupt'>[],
  mapId: string,
  settings: Settings,
  seed: number,
): GameState {
  const map = getMap(mapId);
  const tiles: GameState['tiles'] = {};
  for (const t of map.tiles) {
    if (isOwnable(t)) tiles[t.id] = { ownerId: null, houses: 0, hotel: false, mortgaged: false };
  }

  let s = seed;
  const sh1 = shuffle(map.surprise.map((c) => c.id), s);
  s = sh1.seed;
  const sh2 = shuffle(map.treasure.map((c) => c.id), s);
  s = sh2.seed;

  const state: GameState = {
    mapId,
    players: players.map((p) => ({
      ...p,
      cash: settings.startingCash,
      position: 0,
      inJail: false,
      jailTurns: 0,
      jailCards: 0,
      isBankrupt: false,
    })),
    currentIdx: 0,
    phase: 'rolling',
    dice: null,
    doublesCount: 0,
    tiles,
    decks: { surprise: sh1.result, treasure: sh2.result },
    pot: 0,
    pendingAuction: null,
    pendingTrades: [],
    pendingCard: null,
    debt: null,
    log: [],
    logSeq: 1,
    winnerId: null,
    settings,
    seed: s,
  };
  log(state, 'The game has started. Good luck!');
  return state;
}

export function rollDice(prev: GameState, playerId: string): GameState {
  const state = clone(prev);
  const player = current(state);
  if (player.id !== playerId) throw new Error('Not your turn');
  if (state.phase !== 'rolling') throw new Error('You cannot roll now');
  if (state.debt) throw new Error('Settle your debt first');

  const map = getMap(state.mapId);
  const r1 = rollDie(state.seed);
  const r2 = rollDie(r1.seed);
  state.seed = r2.seed;
  state.dice = [r1.die, r2.die];
  state.pendingCard = null;
  const sum = r1.die + r2.die;
  const isDouble = r1.die === r2.die;
  log(state, `${player.name} rolled ${r1.die} and ${r2.die}.`);

  if (isDouble) {
    state.doublesCount += 1;
    if (state.doublesCount >= 3) {
      sendToJail(state, map, player);
      state.phase = 'turn-end';
      return state;
    }
  }

  moveSteps(state, map, player, sum);
  resolveLanding(state, map, player, true);
  finishRollPhase(state);
  return state;
}

export function buyProperty(prev: GameState, playerId: string): GameState {
  const state = clone(prev);
  const player = current(state);
  if (player.id !== playerId) throw new Error('Not your turn');
  if (state.phase !== 'awaiting-buy') throw new Error('Nothing to buy');
  const map = getMap(state.mapId);
  const tile = tileAt(map, player.position);
  if (!isOwnable(tile)) throw new Error('Not buyable');
  const ts = state.tiles[tile.id];
  if (ts.ownerId) throw new Error('Already owned');
  if (player.cash < tile.price) throw new Error('Not enough cash');
  player.cash -= tile.price;
  ts.ownerId = player.id;
  log(state, `${player.name} bought ${tile.name} for ${tile.price}.`);
  finishRollPhase(state);
  return state;
}

export function declineBuy(prev: GameState, playerId: string): GameState {
  const state = clone(prev);
  const player = current(state);
  if (player.id !== playerId) throw new Error('Not your turn');
  if (state.phase !== 'awaiting-buy') throw new Error('Nothing to decline');
  const map = getMap(state.mapId);
  const tile = tileAt(map, player.position);

  if (state.settings.auctionsEnabled) {
    const participants = activePlayers(state).map((p) => p.id);
    state.pendingAuction = {
      tileId: tile.id,
      highBid: 0,
      highBidder: null,
      participants,
      passed: [],
      turn: participants[0],
    };
    state.phase = 'auction';
    log(state, `${tile.name} goes to auction.`);
  } else {
    finishRollPhase(state);
  }
  return state;
}

function auctionActive(state: GameState): string[] {
  const a = state.pendingAuction!;
  return a.participants.filter((id) => !a.passed.includes(id));
}

function advanceAuctionTurn(state: GameState): void {
  const a = state.pendingAuction!;
  const order = a.participants;
  let i = order.indexOf(a.turn);
  for (let step = 0; step < order.length; step++) {
    i = (i + 1) % order.length;
    if (!a.passed.includes(order[i])) {
      a.turn = order[i];
      return;
    }
  }
}

function resolveAuction(state: GameState): void {
  const a = state.pendingAuction!;
  const map = getMap(state.mapId);
  const tile = tileAt(map, a.tileId);
  if (a.highBidder) {
    const winner = findPlayer(state, a.highBidder);
    winner.cash -= a.highBid;
    state.tiles[tile.id].ownerId = winner.id;
    log(state, `${winner.name} won ${tile.name} at auction for ${a.highBid}.`);
  } else {
    log(state, `${tile.name} drew no bids.`);
  }
  state.pendingAuction = null;
  finishRollPhase(state);
}

export function placeBid(prev: GameState, playerId: string, amount: number): GameState {
  const state = clone(prev);
  const a = state.pendingAuction;
  if (state.phase !== 'auction' || !a) throw new Error('No auction running');
  if (a.turn !== playerId) throw new Error('Not your bid');
  if (a.passed.includes(playerId)) throw new Error('You already passed');
  const player = findPlayer(state, playerId);
  if (amount <= a.highBid) throw new Error('Bid too low');
  if (amount > player.cash) throw new Error('You cannot afford that');
  a.highBid = amount;
  a.highBidder = playerId;
  log(state, `${player.name} bid ${amount}.`);
  if (auctionActive(state).length <= 1) {
    resolveAuction(state);
  } else {
    advanceAuctionTurn(state);
  }
  return state;
}

export function passBid(prev: GameState, playerId: string): GameState {
  const state = clone(prev);
  const a = state.pendingAuction;
  if (state.phase !== 'auction' || !a) throw new Error('No auction running');
  if (a.turn !== playerId) throw new Error('Not your turn to act');
  if (!a.passed.includes(playerId)) a.passed.push(playerId);
  log(state, `${findPlayer(state, playerId).name} passed.`);
  const active = auctionActive(state);
  if (active.length <= 1 && a.highBidder) {
    resolveAuction(state);
  } else if (active.length === 0) {
    resolveAuction(state);
  } else {
    advanceAuctionTurn(state);
  }
  return state;
}

function level(state: GameState, tileId: number): number {
  const ts = state.tiles[tileId];
  return ts.hotel ? 5 : ts.houses;
}

export function build(prev: GameState, playerId: string, tileId: number): GameState {
  const state = clone(prev);
  const player = current(state);
  if (player.id !== playerId) throw new Error('Not your turn');
  if (state.phase !== 'rolling' && state.phase !== 'turn-end') throw new Error('Cannot build now');
  const map = getMap(state.mapId);
  const tile = tileAt(map, tileId);
  if (tile.kind !== 'property') throw new Error('Not a buildable property');
  const ts = state.tiles[tileId];
  if (ts.ownerId !== playerId) throw new Error('You do not own this');
  if (!ownsGroup(state, map, playerId, tile.group)) throw new Error('You need the whole colour group');
  if (groupTiles(map, tile.group).some((t) => state.tiles[t.id].mortgaged))
    throw new Error('Unmortgage the group first');
  const lv = level(state, tileId);
  if (lv >= 5) throw new Error('Already has a hotel');
  const minLv = Math.min(...groupTiles(map, tile.group).map((t) => level(state, t.id)));
  if (lv !== minLv) throw new Error('Build evenly across the group');
  if (player.cash < tile.houseCost) throw new Error('Not enough cash');
  player.cash -= tile.houseCost;
  if (lv === 4) {
    ts.hotel = true;
    log(state, `${player.name} built a hotel on ${tile.name}.`);
  } else {
    ts.houses += 1;
    log(state, `${player.name} built a house on ${tile.name}.`);
  }
  return state;
}

export function sellBuilding(prev: GameState, playerId: string, tileId: number): GameState {
  const state = clone(prev);
  const player = current(state);
  if (player.id !== playerId) throw new Error('Not your turn');
  const map = getMap(state.mapId);
  const tile = tileAt(map, tileId);
  if (tile.kind !== 'property') throw new Error('Not a property');
  const ts = state.tiles[tileId];
  if (ts.ownerId !== playerId) throw new Error('You do not own this');
  const lv = level(state, tileId);
  if (lv <= 0) throw new Error('Nothing to sell');
  const maxLv = Math.max(...groupTiles(map, tile.group).map((t) => level(state, t.id)));
  if (lv !== maxLv) throw new Error('Sell evenly across the group');
  const refund = Math.floor(tile.houseCost / 2);
  player.cash += refund;
  if (ts.hotel) {
    ts.hotel = false;
    ts.houses = 4;
    log(state, `${player.name} sold the hotel on ${tile.name} for ${refund}.`);
  } else {
    ts.houses -= 1;
    log(state, `${player.name} sold a house on ${tile.name} for ${refund}.`);
  }
  settleDebt(state);
  return state;
}

export function mortgage(prev: GameState, playerId: string, tileId: number): GameState {
  const state = clone(prev);
  const map = getMap(state.mapId);
  const tile = tileAt(map, tileId);
  if (!isOwnable(tile)) throw new Error('Cannot mortgage this');
  const ts = state.tiles[tileId];
  if (ts.ownerId !== playerId) throw new Error('You do not own this');
  if (ts.mortgaged) throw new Error('Already mortgaged');
  if (tile.kind === 'property' && groupHasBuildings(state, map, tile.group))
    throw new Error('Sell the buildings in this group first');
  ts.mortgaged = true;
  const player = findPlayer(state, playerId);
  player.cash += tile.mortgage;
  log(state, `${player.name} mortgaged ${tile.name} for ${tile.mortgage}.`);
  settleDebt(state);
  return state;
}

export function unmortgage(prev: GameState, playerId: string, tileId: number): GameState {
  const state = clone(prev);
  const map = getMap(state.mapId);
  const tile = tileAt(map, tileId);
  if (!isOwnable(tile)) throw new Error('Cannot unmortgage this');
  const ts = state.tiles[tileId];
  if (ts.ownerId !== playerId) throw new Error('You do not own this');
  if (!ts.mortgaged) throw new Error('Not mortgaged');
  const cost = Math.ceil(tile.mortgage * 1.1);
  const player = findPlayer(state, playerId);
  if (player.cash < cost) throw new Error('Not enough cash');
  player.cash -= cost;
  ts.mortgaged = false;
  log(state, `${player.name} lifted the mortgage on ${tile.name} for ${cost}.`);
  return state;
}

export function jailAction(prev: GameState, playerId: string, action: 'roll' | 'pay' | 'card'): GameState {
  const state = clone(prev);
  const player = current(state);
  if (player.id !== playerId) throw new Error('Not your turn');
  if (state.phase !== 'jail-decision' || !player.inJail) throw new Error('You are not in jail');
  const map = getMap(state.mapId);

  if (action === 'pay') {
    if (player.cash < JAIL_FINE) throw new Error('Not enough cash for the fine');
    player.cash -= JAIL_FINE;
    player.inJail = false;
    player.jailTurns = 0;
    state.phase = 'rolling';
    log(state, `${player.name} paid the ${JAIL_FINE} fine and left Jail.`);
    return state;
  }
  if (action === 'card') {
    if (player.jailCards <= 0) throw new Error('No jail card to use');
    player.jailCards -= 1;
    player.inJail = false;
    player.jailTurns = 0;
    state.phase = 'rolling';
    log(state, `${player.name} used a Get Out of Jail card.`);
    return state;
  }

  // roll for doubles
  const r1 = rollDie(state.seed);
  const r2 = rollDie(r1.seed);
  state.seed = r2.seed;
  state.dice = [r1.die, r2.die];
  const sum = r1.die + r2.die;
  log(state, `${player.name} rolled ${r1.die} and ${r2.die} in Jail.`);
  if (r1.die === r2.die) {
    player.inJail = false;
    player.jailTurns = 0;
    log(state, `${player.name} rolled doubles and left Jail.`);
    moveSteps(state, map, player, sum);
    resolveLanding(state, map, player, true);
    if ((state.phase as string) !== 'awaiting-buy' && !state.winnerId) state.phase = 'turn-end';
    return state;
  }
  player.jailTurns += 1;
  if (player.jailTurns >= 3) {
    charge(state, player, JAIL_FINE, null);
    player.inJail = false;
    player.jailTurns = 0;
    log(state, `${player.name} served their time, paid ${JAIL_FINE} and moved.`);
    if (!state.debt) {
      moveSteps(state, map, player, sum);
      resolveLanding(state, map, player, true);
    }
    if ((state.phase as string) !== 'awaiting-buy' && !state.winnerId) state.phase = 'turn-end';
  } else {
    state.phase = 'turn-end';
    log(state, `${player.name} stays in Jail.`);
  }
  return state;
}

export function endTurn(prev: GameState, playerId: string): GameState {
  const state = clone(prev);
  const player = current(state);
  if (player.id !== playerId) throw new Error('Not your turn');
  if (state.phase !== 'turn-end') throw new Error('You cannot end your turn yet');
  if (state.debt) throw new Error('Settle your debt first');
  advanceTurn(state);
  return state;
}

export function declareBankruptcy(prev: GameState, playerId: string): GameState {
  const state = clone(prev);
  const player = findPlayer(state, playerId);
  if (player.isBankrupt) throw new Error('Already bankrupt');
  const map = getMap(state.mapId);
  const creditorId = state.debt && state.debt.playerId === playerId ? state.debt.creditorId : null;
  const creditor = creditorId ? state.players.find((p) => p.id === creditorId) : null;

  for (const t of map.tiles) {
    if (!isOwnable(t)) continue;
    const ts = state.tiles[t.id];
    if (ts.ownerId !== playerId) continue;
    if (creditor) {
      ts.houses = 0;
      ts.hotel = false;
      ts.ownerId = creditor.id;
    } else {
      ts.ownerId = null;
      ts.houses = 0;
      ts.hotel = false;
      ts.mortgaged = false;
    }
  }
  if (creditor) {
    creditor.cash += Math.max(0, player.cash);
    creditor.jailCards += player.jailCards;
  }
  player.cash = 0;
  player.jailCards = 0;
  player.isBankrupt = true;
  player.inJail = false;
  log(state, `${player.name} went bankrupt${creditor ? `, assets to ${creditor.name}` : ''}.`);

  if (state.debt && state.debt.playerId === playerId) state.debt = null;
  state.pendingTrades = state.pendingTrades.filter((t) => t.from !== playerId && t.to !== playerId);

  if (state.currentIdx < state.players.length && current(state).id === playerId) {
    advanceTurn(state);
  } else {
    checkWin(state);
  }
  return state;
}

// ---------- trading ------------------------------------------------------

function canFulfill(state: GameState, map: MapDef, playerId: string, offer: TradeOffer): boolean {
  const player = findPlayer(state, playerId);
  if (player.cash < offer.cash) return false;
  if (player.jailCards < offer.jailCards) return false;
  for (const id of offer.tileIds) {
    const ts = state.tiles[id];
    if (!ts || ts.ownerId !== playerId) return false;
    const tile = tileAt(map, id);
    if (tile.kind === 'property' && (ts.houses > 0 || ts.hotel)) return false;
  }
  return true;
}

export function proposeTrade(
  prev: GameState,
  fromId: string,
  toId: string,
  give: TradeOffer,
  receive: TradeOffer,
): GameState {
  const state = clone(prev);
  if (state.phase === 'ended') throw new Error('Game is over');
  if (fromId === toId) throw new Error('Pick another player');
  const from = findPlayer(state, fromId);
  const to = findPlayer(state, toId);
  if (from.isBankrupt || to.isBankrupt) throw new Error('That player is out');
  const map = getMap(state.mapId);
  if (!canFulfill(state, map, fromId, give)) throw new Error('You cannot back that offer');
  if (!canFulfill(state, map, toId, receive)) throw new Error('They cannot back that side');
  const id = `tr${state.logSeq}_${Math.floor(state.seed >>> 0).toString(36)}`;
  state.pendingTrades.push({ id, from: fromId, to: toId, give, receive });
  log(state, `${from.name} proposed a trade to ${to.name}.`);
  return state;
}

export function respondTrade(prev: GameState, tradeId: string, accept: boolean, responderId: string): GameState {
  const state = clone(prev);
  const trade = state.pendingTrades.find((t) => t.id === tradeId);
  if (!trade) throw new Error('Trade not found');
  if (trade.to !== responderId) throw new Error('Not your trade to answer');
  state.pendingTrades = state.pendingTrades.filter((t) => t.id !== tradeId);
  if (!accept) {
    log(state, `${findPlayer(state, trade.to).name} declined the trade.`);
    return state;
  }
  const map = getMap(state.mapId);
  if (!canFulfill(state, map, trade.from, trade.give) || !canFulfill(state, map, trade.to, trade.receive)) {
    log(state, 'A trade fell through — assets changed.');
    return state;
  }
  const from = findPlayer(state, trade.from);
  const to = findPlayer(state, trade.to);
  // cash
  from.cash -= trade.give.cash;
  to.cash += trade.give.cash;
  to.cash -= trade.receive.cash;
  from.cash += trade.receive.cash;
  // jail cards
  from.jailCards -= trade.give.jailCards;
  to.jailCards += trade.give.jailCards;
  to.jailCards -= trade.receive.jailCards;
  from.jailCards += trade.receive.jailCards;
  // properties
  for (const id of trade.give.tileIds) state.tiles[id].ownerId = to.id;
  for (const id of trade.receive.tileIds) state.tiles[id].ownerId = from.id;
  log(state, `${from.name} and ${to.name} completed a trade.`);
  return state;
}

export { getMap };
