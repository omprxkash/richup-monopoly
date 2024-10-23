import { io, type Socket } from 'socket.io-client';
import { useSyncExternalStore } from 'react';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomView,
  ChatMessage,
  Settings,
  TradeOffer,
} from '@richup/shared';

const URL = import.meta.env.DEV ? 'http://localhost:3001' : undefined;

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(URL, {
  autoConnect: true,
});

interface Store {
  connected: boolean;
  room: RoomView | null;
  me: string | null;
  code: string | null;
  chat: ChatMessage[];
  error: string | null;
}

let state: Store = {
  connected: socket.connected,
  room: null,
  me: null,
  code: null,
  chat: [],
  error: null,
};

const listeners = new Set<() => void>();

function set(patch: Partial<Store>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getState(): Store {
  return state;
}

export function useStore(): Store {
  return useSyncExternalStore(subscribe, getState);
}

const SAVE_KEY = 'richup_session';

function saveSession(code: string, me: string): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ code, me }));
  } catch {
    /* ignore */
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

socket.on('connect', () => {
  set({ connected: true });
  // try to resume a saved session
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw && !state.room) {
      const { code, me } = JSON.parse(raw) as { code: string; me: string };
      socket.emit('reconnect', { code, playerId: me }, (res) => {
        if ('ok' in res) set({ code, me });
        else clearSession();
      });
    }
  } catch {
    /* ignore */
  }
});

socket.on('disconnect', () => set({ connected: false }));

socket.on('room', (view: RoomView) => set({ room: view }));

socket.on('chat', (msg: ChatMessage) => {
  set({ chat: [...state.chat, msg].slice(-100) });
});

socket.on('errorMsg', (message: string) => {
  set({ error: message });
  setTimeout(() => {
    if (state.error === message) set({ error: null });
  }, 3500);
});

socket.on('kicked', () => {
  clearSession();
  set({ room: null, me: null, code: null });
});

// ---------- actions ------------------------------------------------------

export const actions = {
  createRoom(name: string, avatar: string): void {
    socket.emit('createRoom', { name, avatar }, (res) => {
      if ('error' in res) set({ error: res.error });
      else {
        set({ code: res.code, me: res.playerId });
        saveSession(res.code, res.playerId);
      }
    });
  },
  joinRoom(code: string, name: string, avatar: string): void {
    socket.emit('joinRoom', { code: code.toUpperCase().trim(), name, avatar }, (res) => {
      if ('error' in res) set({ error: res.error });
      else {
        set({ code: res.code, me: res.playerId });
        saveSession(res.code, res.playerId);
      }
    });
  },
  leaveRoom(): void {
    socket.emit('leaveRoom');
    clearSession();
    set({ room: null, me: null, code: null, chat: [] });
  },
  updateSettings: (patch: Partial<Settings>) => socket.emit('updateSettings', patch),
  setMap: (mapId: string) => socket.emit('setMap', mapId),
  addBot: () => socket.emit('addBot'),
  removeBot: (id: string) => socket.emit('removeBot', id),
  startGame: () => socket.emit('startGame'),
  rollDice: () => socket.emit('rollDice'),
  buy: () => socket.emit('buy'),
  decline: () => socket.emit('decline'),
  bid: (amount: number) => socket.emit('bid', amount),
  passBid: () => socket.emit('passBid'),
  build: (tileId: number) => socket.emit('build', tileId),
  sellBuilding: (tileId: number) => socket.emit('sellBuilding', tileId),
  mortgage: (tileId: number) => socket.emit('mortgage', tileId),
  unmortgage: (tileId: number) => socket.emit('unmortgage', tileId),
  jailAction: (a: 'roll' | 'pay' | 'card') => socket.emit('jailAction', a),
  endTurn: () => socket.emit('endTurn'),
  bankrupt: () => socket.emit('bankrupt'),
  proposeTrade: (toId: string, give: TradeOffer, receive: TradeOffer) =>
    socket.emit('proposeTrade', { toId, give, receive }),
  respondTrade: (tradeId: string, accept: boolean) => socket.emit('respondTrade', { tradeId, accept }),
  chat: (text: string) => socket.emit('chat', text),
};

export function joinByUrlCode(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
}
