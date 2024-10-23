import { describe, it, expect } from 'vitest';
import {
  createGame,
  rollDice,
  declineBuy,
  placeBid,
  passBid,
  build,
  mortgage,
  unmortgage,
  rentFor,
  declareBankruptcy,
  proposeTrade,
  respondTrade,
} from './index';
import { getMap } from '../maps/index';
import { rollDie } from '../rng';
import { DEFAULT_SETTINGS, type GameState } from '../types';

const map = getMap('classic');

function newGame(seed = 12345): GameState {
  return createGame(
    [
      { id: 'a', name: 'Ann', avatar: '🦊', color: '#e6194b', isBot: false },
      { id: 'b', name: 'Ben', avatar: '🐼', color: '#3cb44b', isBot: false },
    ],
    'classic',
    { ...DEFAULT_SETTINGS },
    seed,
  );
}

/** Find a raw seed value whose next two dice rolls are (non-)doubles.
 *  Used to override game.seed directly — bypasses deck-shuffle advancement. */
function findRawSeed(wantDouble: boolean): { seed: number; sum: number } {
  for (let s = 1; s < 200000; s++) {
    const a = rollDie(s);
    const b = rollDie(a.seed);
    if ((a.die === b.die) === wantDouble) {
      return { seed: s, sum: a.die + b.die };
    }
  }
  throw new Error('no seed found');
}

describe('setup', () => {
  it('gives each player the starting cash and initialises ownable tiles', () => {
    const g = newGame();
    expect(g.players).toHaveLength(2);
    expect(g.players.every((p) => p.cash === 1500)).toBe(true);
    expect(g.tiles[1]).toEqual({ ownerId: null, houses: 0, hotel: false, mortgaged: false });
    expect(g.phase).toBe('rolling');
  });
});

describe('rent', () => {
  it('doubles base rent when the owner holds the full colour group with no houses', () => {
    const g = newGame();
    g.tiles[1].ownerId = 'a';
    g.tiles[3].ownerId = 'a';
    // tiles 1 and 3 are the two brown properties
    const single = newGame();
    single.tiles[1].ownerId = 'a';
    expect(rentFor(single, map, 1, 0)).toBe(2);
    expect(rentFor(g, map, 1, 0)).toBe(4);
  });

  it('uses the house rent ladder once buildings exist', () => {
    const g = newGame();
    g.tiles[1].ownerId = 'a';
    g.tiles[3].ownerId = 'a';
    g.tiles[1].houses = 2;
    expect(rentFor(g, map, 1, 0)).toBe(30);
  });

  it('charges nothing while mortgaged', () => {
    const g = newGame();
    g.tiles[1].ownerId = 'a';
    g.tiles[1].mortgaged = true;
    expect(rentFor(g, map, 1, 0)).toBe(0);
  });

  it('scales airport rent by the number owned', () => {
    const g = newGame();
    for (const id of [5, 15]) g.tiles[id].ownerId = 'a';
    expect(rentFor(g, map, 5, 0)).toBe(50); // 25 * 2^(2-1)
  });
});

describe('building', () => {
  it('builds evenly and refuses to jump ahead of the group', () => {
    let g = newGame();
    g.tiles[1].ownerId = 'a';
    g.tiles[3].ownerId = 'a';
    g.phase = 'turn-end';
    g = build(g, 'a', 1);
    expect(g.tiles[1].houses).toBe(1);
    // tile 1 now at 1 house, tile 3 at 0 -> cannot add a second to tile 1
    expect(() => build(g, 'a', 1)).toThrow();
    g = build(g, 'a', 3);
    expect(g.tiles[3].houses).toBe(1);
  });

  it('requires the full group before building', () => {
    const g = newGame();
    g.tiles[1].ownerId = 'a';
    g.phase = 'turn-end';
    expect(() => build(g, 'a', 1)).toThrow();
  });
});

describe('mortgage', () => {
  it('pays out half on mortgage and charges 10% interest to lift it', () => {
    let g = newGame();
    g.tiles[1].ownerId = 'a';
    const before = g.players[0].cash;
    g = mortgage(g, 'a', 1);
    expect(g.tiles[1].mortgaged).toBe(true);
    expect(g.players[0].cash).toBe(before + 30); // mortgage = 60/2
    g = unmortgage(g, 'a', 1);
    expect(g.tiles[1].mortgaged).toBe(false);
    expect(g.players[0].cash).toBe(before + 30 - 33); // ceil(30 * 1.1)
  });
});

describe('rolling and jail', () => {
  it('moves the active player by the dice total', () => {
    const g = newGame();
    g.seed = findRawSeed(false).seed;
    const start = g.players[0].position;
    const after = rollDice(g, 'a');
    const sum = after.dice![0] + after.dice![1];
    expect(after.players[0].position).toBe((start + sum) % map.tiles.length);
  });

  it('sends a player to jail on the third consecutive double', () => {
    const g = newGame();
    g.seed = findRawSeed(true).seed;
    g.doublesCount = 2;
    const after = rollDice(g, 'a');
    expect(after.players[0].inJail).toBe(true);
    expect(after.players[0].position).toBe(10);
  });
});

describe('auctions', () => {
  it('awards the property to the highest funded bid', () => {
    let s = newGame();
    // place the active player on brown property tile 1 with a buy pending
    s.players[0].position = 1;
    s.phase = 'awaiting-buy';
    s = declineBuy(s, 'a');
    expect(s.phase).toBe('auction');

    // Ann bids 50, Ben passes -> Ann wins tile 1 for 50
    s = placeBid(s, s.pendingAuction!.turn, 50);
    s = passBid(s, s.pendingAuction!.turn);

    expect(s.pendingAuction).toBeNull();
    expect(s.tiles[1].ownerId).toBe('a');
    expect(s.players[0].cash).toBe(1500 - 50);
  });
});

describe('bankruptcy', () => {
  it('transfers all assets to the creditor and ends the game', () => {
    const g = newGame();
    g.tiles[1].ownerId = 'b';
    g.players[1].cash = 5;
    g.debt = { playerId: 'b', amount: 1000, creditorId: 'a' };
    const after = declareBankruptcy(g, 'b');
    expect(after.players[1].isBankrupt).toBe(true);
    expect(after.tiles[1].ownerId).toBe('a');
    expect(after.winnerId).toBe('a');
    expect(after.phase).toBe('ended');
  });
});

describe('trading', () => {
  it('swaps cash and property when accepted', () => {
    let g = newGame();
    g.tiles[1].ownerId = 'a';
    g = proposeTrade(g, 'a', 'b', { cash: 0, tileIds: [1], jailCards: 0 }, { cash: 100, tileIds: [], jailCards: 0 });
    const tradeId = g.pendingTrades[0].id;
    g = respondTrade(g, tradeId, true, 'b');
    expect(g.tiles[1].ownerId).toBe('b');
    expect(g.players[0].cash).toBe(1500 + 100);
    expect(g.players[1].cash).toBe(1500 - 100);
  });
});
