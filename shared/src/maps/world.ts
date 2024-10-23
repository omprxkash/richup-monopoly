import type { MapDef, Tile, ColorGroup, Card } from '../types';

// A larger 56-tile board (13 tiles per side) themed around world cities, sized
// for up to 8 players. Ten colour groups, six airports, four companies, two tax
// tiles and its own Surprise / Treasure decks. All prices and rents are
// original — rents are derived from price so the ladder stays consistent.

const groups: ColorGroup[] = [
  { id: 'amber', name: 'Amber', color: '#e8a13a' },
  { id: 'rose', name: 'Rose', color: '#d471b0' },
  { id: 'lime', name: 'Lime', color: '#9acd32' },
  { id: 'sky', name: 'Sky', color: '#5bc0de' },
  { id: 'violet', name: 'Violet', color: '#8e5fd8' },
  { id: 'coral', name: 'Coral', color: '#ff6f61' },
  { id: 'teal', name: 'Teal', color: '#1fb6a6' },
  { id: 'indigo', name: 'Indigo', color: '#3b4fb0' },
  { id: 'gold', name: 'Gold', color: '#e6c229' },
  { id: 'ruby', name: 'Ruby', color: '#c81d4e' },
];

interface GroupDef {
  id: string;
  cities: string[];
  prices: number[];
  houseCost: number;
}

const gdefs: GroupDef[] = [
  { id: 'amber', cities: ['Hanoi', 'Manila', 'Jakarta'], prices: [80, 80, 100], houseCost: 50 },
  { id: 'rose', cities: ['Cairo', 'Lagos', 'Nairobi'], prices: [120, 120, 140], houseCost: 50 },
  { id: 'lime', cities: ['Lima', 'Bogota', 'Santiago'], prices: [160, 160, 180], houseCost: 100 },
  { id: 'sky', cities: ['Bangkok', 'Seoul', 'Taipei'], prices: [200, 200, 220], houseCost: 100 },
  { id: 'violet', cities: ['Warsaw', 'Prague', 'Vienna'], prices: [240, 240, 260], houseCost: 150 },
  { id: 'coral', cities: ['Madrid', 'Lisbon', 'Barcelona'], prices: [280, 280, 300], houseCost: 150 },
  { id: 'teal', cities: ['Toronto', 'Vancouver', 'Montreal'], prices: [320, 320, 340], houseCost: 200 },
  { id: 'indigo', cities: ['Stockholm', 'Oslo', 'Copenhagen'], prices: [360, 360, 380], houseCost: 200 },
  { id: 'gold', cities: ['Dubai', 'Doha', 'Istanbul', 'Riyadh'], prices: [400, 400, 420, 440], houseCost: 250 },
  { id: 'ruby', cities: ['Tokyo', 'Singapore', 'Sydney', 'Hong Kong'], prices: [460, 480, 500, 520], houseCost: 250 },
];

const airportNames = [
  'Changi Airport',
  'Incheon Airport',
  'Suvarnabhumi Airport',
  'Hamad Airport',
  'Schiphol Airport',
  'Haneda Airport',
];
const companyNames = ['Solar Grid', 'Hydro Works', 'Wind Farm', 'Data Center'];

function genRent(price: number): [number, number, number, number, number, number] {
  const b = Math.round((price * 0.09) / 1) || 1;
  return [b, b * 5, b * 14, b * 40, b * 55, b * 70];
}

function p(id: number, g: number, i: number): Tile {
  const d = gdefs[g];
  const price = d.prices[i];
  return {
    id,
    name: d.cities[i],
    kind: 'property',
    group: d.id,
    price,
    rent: genRent(price),
    houseCost: d.houseCost,
    mortgage: price / 2,
  };
}

let aIdx = 0;
function ap(id: number): Tile {
  return { id, name: airportNames[aIdx++], kind: 'airport', price: 200, baseRent: 25, mortgage: 100 };
}

let cIdx = 0;
function co(id: number): Tile {
  return { id, name: companyNames[cIdx++], kind: 'company', price: 150, mortgage: 75 };
}

const tiles: Tile[] = [
  { id: 0, name: 'Start', kind: 'start' },
  p(1, 0, 0),
  { id: 2, name: 'Treasure', kind: 'treasure' },
  p(3, 0, 1),
  p(4, 0, 2),
  ap(5),
  p(6, 1, 0),
  { id: 7, name: 'Surprise', kind: 'surprise' },
  p(8, 1, 1),
  p(9, 1, 2),
  co(10),
  p(11, 2, 0),
  p(12, 2, 1),
  p(13, 2, 2),
  { id: 14, name: 'Jail', kind: 'jail' },
  ap(15),
  p(16, 3, 0),
  { id: 17, name: 'Treasure', kind: 'treasure' },
  p(18, 3, 1),
  p(19, 3, 2),
  { id: 20, name: 'Income Tax', kind: 'tax', amount: 200 },
  p(21, 4, 0),
  { id: 22, name: 'Surprise', kind: 'surprise' },
  p(23, 4, 1),
  p(24, 4, 2),
  co(25),
  p(26, 5, 0),
  p(27, 5, 1),
  { id: 28, name: 'Vacation', kind: 'vacation' },
  p(29, 5, 2),
  ap(30),
  p(31, 6, 0),
  { id: 32, name: 'Surprise', kind: 'surprise' },
  p(33, 6, 1),
  p(34, 6, 2),
  co(35),
  p(36, 7, 0),
  { id: 37, name: 'Treasure', kind: 'treasure' },
  p(38, 7, 1),
  p(39, 7, 2),
  ap(40),
  p(41, 8, 0),
  { id: 42, name: 'Go to Jail', kind: 'gotojail' },
  p(43, 8, 1),
  p(44, 8, 2),
  p(45, 8, 3),
  co(46),
  p(47, 9, 0),
  { id: 48, name: 'Surprise', kind: 'surprise' },
  p(49, 9, 1),
  ap(50),
  p(51, 9, 2),
  { id: 52, name: 'Treasure', kind: 'treasure' },
  p(53, 9, 3),
  { id: 54, name: 'Luxury Tax', kind: 'tax', amount: 150 },
  ap(55),
];

const surprise: Card[] = [
  { id: 'ws1', text: 'Clear skies. Advance to Start.', action: { type: 'move-to', tileId: 0, collectStart: true } },
  { id: 'ws2', text: 'Bumped to business class. Collect $200.', action: { type: 'money', amount: 200 } },
  { id: 'ws3', text: 'Overweight baggage. Pay $75.', action: { type: 'money', amount: -75 } },
  { id: 'ws4', text: 'Detained at customs. Go to Jail.', action: { type: 'goto-jail' } },
  { id: 'ws5', text: 'Layover in Tokyo. Advance there.', action: { type: 'move-to', tileId: 47, collectStart: true } },
  { id: 'ws6', text: 'Diplomatic pass. Get out of Jail free — keep this card.', action: { type: 'jail-card' } },
  { id: 'ws7', text: 'Turbulence. Go back 3 spaces.', action: { type: 'move-by', steps: -3 } },
  { id: 'ws8', text: 'You headline a festival. Each player pays you $30.', action: { type: 'collect-each', amount: 30 } },
  { id: 'ws9', text: 'Currency swing in your favour. Collect $120.', action: { type: 'money', amount: 120 } },
  { id: 'ws10', text: 'Connecting flight to Dubai. Advance there.', action: { type: 'move-to', tileId: 41, collectStart: true } },
  { id: 'ws11', text: 'Visa extension approved. Move forward 4 spaces.', action: { type: 'move-by', steps: 4 } },
  { id: 'ws12', text: 'International roaming charges. Pay $50.', action: { type: 'money', amount: -50 } },
  { id: 'ws13', text: 'Travel influencer moment. Collect $100 from each player.', action: { type: 'collect-each', amount: 100 } },
  { id: 'ws14', text: 'Lost luggage reimbursed. Collect $175.', action: { type: 'money', amount: 175 } },
  { id: 'ws15', text: 'Advance to Changi Airport.', action: { type: 'move-to', tileId: 5, collectStart: true } },
  { id: 'ws16', text: 'Exchange rate windfall. Collect $80.', action: { type: 'money', amount: 80 } },
];

const treasure: Card[] = [
  { id: 'wt1', text: 'Tax rebate. Collect $150.', action: { type: 'money', amount: 150 } },
  { id: 'wt2', text: 'Refunded a cancelled tour. Collect $60.', action: { type: 'money', amount: 60 } },
  { id: 'wt3', text: 'Annual licences due. Pay $120.', action: { type: 'money', amount: -120 } },
  { id: 'wt4', text: 'A distant relative remembers you. Collect $250.', action: { type: 'money', amount: 250 } },
  { id: 'wt5', text: 'Your anniversary. Each player gives you $25.', action: { type: 'collect-each', amount: 25 } },
  { id: 'wt6', text: 'Get out of Jail free — keep this card.', action: { type: 'jail-card' } },
  { id: 'wt7', text: 'City-wide inspection. Pay $45 per house and $130 per hotel.', action: { type: 'repairs', perHouse: 45, perHotel: 130 } },
  { id: 'wt8', text: 'You sponsor the gala. Pay each player $35.', action: { type: 'pay-each', amount: 35 } },
  { id: 'wt9', text: 'Won a design grant. Collect $90.', action: { type: 'money', amount: 90 } },
  { id: 'wt10', text: 'Late checkout penalty. Pay $80.', action: { type: 'money', amount: -80 } },
  { id: 'wt11', text: 'Won the city travel award. Collect $200.', action: { type: 'money', amount: 200 } },
  { id: 'wt12', text: 'Building permit delays. Pay $60 per house, $180 per hotel.', action: { type: 'repairs', perHouse: 60, perHotel: 180 } },
  { id: 'wt13', text: 'Hotel concierge tip. Advance to Vacation.', action: { type: 'move-to', tileId: 28 } },
  { id: 'wt14', text: 'Crowdfunded your trip. Collect $50 from each player.', action: { type: 'collect-each', amount: 50 } },
  { id: 'wt15', text: 'Flight refund processed. Collect $100.', action: { type: 'money', amount: 100 } },
  { id: 'wt16', text: 'Excess profits tax. Pay $140.', action: { type: 'money', amount: -140 } },
];

export const worldMap: MapDef = {
  id: 'world',
  name: 'World Tour',
  description: 'A larger 56-tile board for up to 8 players.',
  maxPlayers: 8,
  perSide: 13,
  tiles,
  groups,
  surprise,
  treasure,
};
