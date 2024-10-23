// The contract between client and server. Both sides import these so event
// names and payloads stay in lock-step.

import type { GameState, Settings, TradeOffer } from './types';

export interface LobbyPlayer {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isBot: boolean;
  connected: boolean;
}

/** Everything a client needs to render a room, lobby or live game. */
export interface RoomView {
  code: string;
  hostId: string;
  mapId: string;
  settings: Settings;
  started: boolean;
  players: LobbyPlayer[];
  game: GameState | null;
}

export interface ClientToServerEvents {
  createRoom: (
    payload: { name: string; avatar: string },
    ack: (res: { code: string; playerId: string } | { error: string }) => void,
  ) => void;
  joinRoom: (
    payload: { code: string; name: string; avatar: string },
    ack: (res: { code: string; playerId: string } | { error: string }) => void,
  ) => void;
  reconnect: (
    payload: { code: string; playerId: string },
    ack: (res: { ok: true } | { error: string }) => void,
  ) => void;
  leaveRoom: () => void;
  updateSettings: (settings: Partial<Settings>) => void;
  setMap: (mapId: string) => void;
  addBot: () => void;
  removeBot: (botId: string) => void;
  startGame: () => void;
  rollDice: () => void;
  buy: () => void;
  decline: () => void;
  bid: (amount: number) => void;
  passBid: () => void;
  build: (tileId: number) => void;
  sellBuilding: (tileId: number) => void;
  mortgage: (tileId: number) => void;
  unmortgage: (tileId: number) => void;
  jailAction: (action: 'roll' | 'pay' | 'card') => void;
  endTurn: () => void;
  bankrupt: () => void;
  proposeTrade: (payload: { toId: string; give: TradeOffer; receive: TradeOffer }) => void;
  respondTrade: (payload: { tradeId: string; accept: boolean }) => void;
  chat: (text: string) => void;
}

export interface ChatMessage {
  id: number;
  from: string;
  name: string;
  text: string;
  ts: number;
}

export interface ServerToClientEvents {
  room: (view: RoomView) => void;
  errorMsg: (message: string) => void;
  chat: (message: ChatMessage) => void;
  kicked: (reason: string) => void;
}
