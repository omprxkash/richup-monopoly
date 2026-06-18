// Core data shapes shared by the engine, the server and the client.

export type TileKind =
  | 'start'
  | 'property'
  | 'airport'
  | 'company'
  | 'tax'
  | 'surprise'
  | 'treasure'
  | 'jail'
  | 'gotojail'
  | 'vacation';

export interface BaseTile {
  id: number;
  name: string;
  kind: TileKind;
}

/** A buildable street belonging to a colour group. rent = [base,1h,2h,3h,4h,hotel]. */
export interface PropertyTile extends BaseTile {
  kind: 'property';
  group: string;
  price: number;
  rent: [number, number, number, number, number, number];
  houseCost: number;
  mortgage: number;
}

/** Airports work like railroads: rent depends on how many the owner holds. */
export interface AirportTile extends BaseTile {
  kind: 'airport';
  price: number;
  baseRent: number;
  mortgage: number;
}

/** Companies work like utilities: rent is a multiplier on the dice roll. */
export interface CompanyTile extends BaseTile {
  kind: 'company';
  price: number;
  mortgage: number;
}

export interface TaxTile extends BaseTile {
  kind: 'tax';
  amount: number;
}

export interface SimpleTile extends BaseTile {
  kind: 'start' | 'surprise' | 'treasure' | 'jail' | 'gotojail' | 'vacation';
}

export type Tile = PropertyTile | AirportTile | CompanyTile | TaxTile | SimpleTile;

export type OwnableTile = PropertyTile | AirportTile | CompanyTile;

export interface ColorGroup {
  id: string;
  name: string;
  color: string;
}

export type CardAction =
  | { type: 'money'; amount: number }
  | { type: 'collect-each'; amount: number }
  | { type: 'pay-each'; amount: number }
  | { type: 'move-to'; tileId: number; collectStart?: boolean }
  | { type: 'move-by'; steps: number }
  | { type: 'goto-jail' }
  | { type: 'jail-card' }
  | { type: 'repairs'; perHouse: number; perHotel: number };

export interface Card {
  id: string;
  text: string;
  action: CardAction;
}

export interface MapDef {
  id: string;
  name: string;
  description: string;
  maxPlayers: number;
  perSide: number;
  tiles: Tile[];
  groups: ColorGroup[];
  surprise: Card[];
  treasure: Card[];
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: string;
  cash: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  jailCards: number;
  isBankrupt: boolean;
  isBot: boolean;
}

export interface TileState {
  ownerId: string | null;
  houses: number;
  hotel: boolean;
  mortgaged: boolean;
}

export interface Settings {
  startingCash: number;
  auctionsEnabled: boolean;
  x2RentOnFullSet: boolean;
  vacationCashPot: boolean;
  startBonus: number;
  turnTimerSec: number;
  maxPlayers: number;
}

export interface AuctionState {
  tileId: number;
  highBid: number;
  highBidder: string | null;
  participants: string[];
  passed: string[];
  turn: string;
}

export interface TradeOffer {
  cash: number;
  tileIds: number[];
  jailCards: number;
}

export interface Trade {
  id: string;
  from: string;
  to: string;
  give: TradeOffer;
  receive: TradeOffer;
}

export interface LogEntry {
  id: number;
  text: string;
  ts: number;
}

export type Phase =
  | 'rolling'
  | 'awaiting-buy'
  | 'auction'
  | 'jail-decision'
  | 'turn-end'
  | 'ended';

export interface Debt {
  playerId: string;
  amount: number;
  creditorId: string | null;
}

export interface PendingCard {
  deck: 'surprise' | 'treasure';
  card: Card;
}

export interface GameState {
  mapId: string;
  players: Player[];
  currentIdx: number;
  phase: Phase;
  dice: [number, number] | null;
  doublesCount: number;
  tiles: Record<number, TileState>;
  decks: { surprise: string[]; treasure: string[] };
  pot: number;
  pendingAuction: AuctionState | null;
  pendingTrades: Trade[];
  pendingCard: PendingCard | null;
  debt: Debt | null;
  log: LogEntry[];
  logSeq: number;
  winnerId: string | null;
  settings: Settings;
  seed: number;
}

export const DEFAULT_SETTINGS: Settings = {
  startingCash: 1500,
  auctionsEnabled: true,
  x2RentOnFullSet: true,
  vacationCashPot: true,
  startBonus: 200,
  turnTimerSec: 0,
  maxPlayers: 4,
};

export const PLAYER_COLORS = [
  '#e6194b',
  '#3cb44b',
  '#4363d8',
  '#f58231',
  '#911eb4',
  '#42d4f4',
  '#f032e6',
  '#bfef45',
];

export const JAIL_FINE = 50;
