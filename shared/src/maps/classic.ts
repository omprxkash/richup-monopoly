import type { MapDef, Tile, ColorGroup, Card } from '../types';

// The familiar 40-tile loop, re-themed around real world cities with original
// prices and rent tables. Four corners, eight colour groups, four airports,
// two companies, two tax tiles and the Surprise / Treasure card spaces.

const groups: ColorGroup[] = [
  { id: 'brown', name: 'Bronze', color: '#7b4a2d' },
  { id: 'cyan', name: 'Sky', color: '#7fd4e6' },
  { id: 'pink', name: 'Rose', color: '#d471b0' },
  { id: 'orange', name: 'Amber', color: '#e8853a' },
  { id: 'red', name: 'Crimson', color: '#d8332f' },
  { id: 'yellow', name: 'Gold', color: '#f4d03f' },
  { id: 'green', name: 'Forest', color: '#2f9e44' },
  { id: 'blue', name: 'Royal', color: '#2f5fd8' },
];

type Rent = [number, number, number, number, number, number];

function prop(
  id: number,
  name: string,
  group: string,
  price: number,
  rent: Rent,
  houseCost: number,
): Tile {
  return { id, name, kind: 'property', group, price, rent, houseCost, mortgage: price / 2 };
}

function airport(id: number, name: string): Tile {
  return { id, name, kind: 'airport', price: 200, baseRent: 25, mortgage: 100 };
}

function company(id: number, name: string): Tile {
  return { id, name, kind: 'company', price: 150, mortgage: 75 };
}

const tiles: Tile[] = [
  { id: 0, name: 'Start', kind: 'start' },
  prop(1, 'Salvador', 'brown', 60, [2, 10, 30, 90, 160, 250], 50),
  { id: 2, name: 'Treasure', kind: 'treasure' },
  prop(3, 'Rio', 'brown', 60, [4, 20, 60, 180, 320, 450], 50),
  { id: 4, name: 'Income Tax', kind: 'tax', amount: 200 },
  airport(5, 'Galeao Airport'),
  prop(6, 'Tel Aviv', 'cyan', 100, [6, 30, 90, 270, 400, 550], 50),
  { id: 7, name: 'Surprise', kind: 'surprise' },
  prop(8, 'Haifa', 'cyan', 100, [6, 30, 90, 270, 400, 550], 50),
  prop(9, 'Jerusalem', 'cyan', 120, [8, 40, 100, 300, 450, 600], 50),
  { id: 10, name: 'Jail', kind: 'jail' },
  prop(11, 'Venice', 'pink', 140, [10, 50, 150, 450, 625, 750], 100),
  company(12, 'Power Company'),
  prop(13, 'Milan', 'pink', 140, [10, 50, 150, 450, 625, 750], 100),
  prop(14, 'Rome', 'pink', 160, [12, 60, 180, 500, 700, 900], 100),
  airport(15, 'Fiumicino Airport'),
  prop(16, 'Frankfurt', 'orange', 180, [14, 70, 200, 550, 750, 950], 100),
  { id: 17, name: 'Treasure', kind: 'treasure' },
  prop(18, 'Munich', 'orange', 180, [14, 70, 200, 550, 750, 950], 100),
  prop(19, 'Berlin', 'orange', 200, [16, 80, 220, 600, 800, 1000], 100),
  { id: 20, name: 'Vacation', kind: 'vacation' },
  prop(21, 'Shenzhen', 'red', 220, [18, 90, 250, 700, 875, 1050], 150),
  { id: 22, name: 'Surprise', kind: 'surprise' },
  prop(23, 'Beijing', 'red', 220, [18, 90, 250, 700, 875, 1050], 150),
  prop(24, 'Shanghai', 'red', 240, [20, 100, 300, 750, 925, 1100], 150),
  airport(25, 'Pudong Airport'),
  prop(26, 'Lyon', 'yellow', 260, [22, 110, 330, 800, 975, 1150], 150),
  prop(27, 'Toulouse', 'yellow', 260, [22, 110, 330, 800, 975, 1150], 150),
  company(28, 'Water Company'),
  prop(29, 'Paris', 'yellow', 280, [24, 120, 360, 850, 1025, 1200], 150),
  { id: 30, name: 'Go to Jail', kind: 'gotojail' },
  prop(31, 'Liverpool', 'green', 300, [26, 130, 390, 900, 1100, 1275], 200),
  prop(32, 'Manchester', 'green', 300, [26, 130, 390, 900, 1100, 1275], 200),
  { id: 33, name: 'Treasure', kind: 'treasure' },
  prop(34, 'London', 'green', 320, [28, 150, 450, 1000, 1200, 1400], 200),
  airport(35, 'Heathrow Airport'),
  { id: 36, name: 'Surprise', kind: 'surprise' },
  prop(37, 'San Francisco', 'blue', 350, [35, 175, 500, 1100, 1300, 1500], 200),
  { id: 38, name: 'Luxury Tax', kind: 'tax', amount: 100 },
  prop(39, 'New York', 'blue', 400, [50, 200, 600, 1400, 1700, 2000], 200),
];

const surprise: Card[] = [
  { id: 's1', text: 'Tailwind on the runway. Advance to Start.', action: { type: 'move-to', tileId: 0, collectStart: true } },
  { id: 's2', text: 'Upgraded to first class. Collect 150.', action: { type: 'money', amount: 150 } },
  { id: 's3', text: 'Lost luggage fee. Pay 50.', action: { type: 'money', amount: -50 } },
  { id: 's4', text: 'Caught without a ticket. Go to Jail.', action: { type: 'goto-jail' } },
  { id: 's5', text: 'Take a city tour. Advance to Rome.', action: { type: 'move-to', tileId: 14, collectStart: true } },
  { id: 's6', text: 'Frequent flyer reward. Get out of Jail free, keep this card.', action: { type: 'jail-card' } },
  { id: 's7', text: 'A storm rolls in. Go back 3 spaces.', action: { type: 'move-by', steps: -3 } },
  { id: 's8', text: 'You won a travel raffle. Each player pays you 25.', action: { type: 'collect-each', amount: 25 } },
];

const treasure: Card[] = [
  { id: 't1', text: 'Tax refund arrives. Collect 100.', action: { type: 'money', amount: 100 } },
  { id: 't2', text: 'Hotel deposit returned. Collect 50.', action: { type: 'money', amount: 50 } },
  { id: 't3', text: 'Annual subscription due. Pay 100.', action: { type: 'money', amount: -100 } },
  { id: 't4', text: 'You inherit a little. Collect 200.', action: { type: 'money', amount: 200 } },
  { id: 't5', text: 'Birthday! Each player gives you 20.', action: { type: 'collect-each', amount: 20 } },
  { id: 't6', text: 'Get out of Jail free, keep this card.', action: { type: 'jail-card' } },
  { id: 't7', text: 'Building maintenance. Pay 40 per house and 115 per hotel.', action: { type: 'repairs', perHouse: 40, perHotel: 115 } },
  { id: 't8', text: 'You treat the table. Pay each player 30.', action: { type: 'pay-each', amount: 30 } },
];

export const classicMap: MapDef = {
  id: 'classic',
  name: 'Classic',
  description: 'The traditional 40-tile loop. Up to 4 players.',
  maxPlayers: 4,
  perSide: 9,
  tiles,
  groups,
  surprise,
  treasure,
};
