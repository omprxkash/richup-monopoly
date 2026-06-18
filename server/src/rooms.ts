import {
  DEFAULT_SETTINGS,
  PLAYER_COLORS,
  getMap,
  type GameState,
  type LobbyPlayer,
  type RoomView,
  type Settings,
} from '@richup/shared';

export interface Room {
  code: string;
  hostId: string;
  mapId: string;
  settings: Settings;
  started: boolean;
  players: LobbyPlayer[];
  sockets: Map<string, string>; // playerId -> socketId
  game: GameState | null;
  seed: number;
  botTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, Room>();

const BOT_NAMES = ['Botley', 'Maxine', 'Cosmo', 'Pixel', 'Nova', 'Echo', 'Turing', 'Ada'];

function randomId(len = 9): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function makeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  do {
    code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

function nextColor(room: Room): string {
  const used = new Set(room.players.map((p) => p.color));
  return PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[room.players.length % PLAYER_COLORS.length];
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function createRoom(name: string, avatar: string): { room: Room; playerId: string } {
  const code = makeCode();
  const playerId = randomId();
  const room: Room = {
    code,
    hostId: playerId,
    mapId: 'classic',
    settings: { ...DEFAULT_SETTINGS },
    started: false,
    players: [],
    sockets: new Map(),
    game: null,
    seed: (Math.random() * 0x7fffffff) | 0,
    botTimer: null,
  };
  room.players.push({ id: playerId, name: cleanName(name), avatar, color: nextColor(room), isBot: false, connected: true });
  rooms.set(code, room);
  return { room, playerId };
}

export function joinRoom(code: string, name: string, avatar: string): { room: Room; playerId: string } | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  if (room.started) return { error: 'That game has already started' };
  if (room.players.length >= room.settings.maxPlayers) return { error: 'Room is full' };
  const playerId = randomId();
  room.players.push({ id: playerId, name: cleanName(name), avatar, color: nextColor(room), isBot: false, connected: true });
  return { room, playerId };
}

export function addBot(room: Room): void {
  if (room.started) return;
  if (room.players.length >= room.settings.maxPlayers) return;
  const used = new Set(room.players.map((p) => p.name));
  const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot${room.players.length}`;
  room.players.push({
    id: 'bot_' + randomId(6),
    name,
    avatar: '🤖',
    color: nextColor(room),
    isBot: true,
    connected: true,
  });
}

export function removeBot(room: Room, botId: string): void {
  if (room.started) return;
  room.players = room.players.filter((p) => !(p.id === botId && p.isBot));
}

export function removePlayer(room: Room, playerId: string): void {
  room.sockets.delete(playerId);
  if (!room.started) {
    room.players = room.players.filter((p) => p.id !== playerId);
    if (room.hostId === playerId) {
      const nextHost = room.players.find((p) => !p.isBot);
      if (nextHost) room.hostId = nextHost.id;
    }
  }
  const humans = room.players.filter((p) => !p.isBot);
  const anyConnected = humans.some((p) => room.sockets.has(p.id));
  if (humans.length === 0 || !anyConnected) {
    destroyRoom(room.code);
  }
}

export function destroyRoom(code: string): void {
  const room = rooms.get(code);
  if (room?.botTimer) clearTimeout(room.botTimer);
  rooms.delete(code);
}

export function clampSettings(room: Room, patch: Partial<Settings>): void {
  const s = room.settings;
  if (typeof patch.startingCash === 'number') s.startingCash = clamp(patch.startingCash, 500, 5000);
  if (typeof patch.auctionsEnabled === 'boolean') s.auctionsEnabled = patch.auctionsEnabled;
  if (typeof patch.x2RentOnFullSet === 'boolean') s.x2RentOnFullSet = patch.x2RentOnFullSet;
  if (typeof patch.vacationCashPot === 'boolean') s.vacationCashPot = patch.vacationCashPot;
  if (typeof patch.startBonus === 'number') s.startBonus = clamp(patch.startBonus, 0, 1000);
  if (typeof patch.turnTimerSec === 'number') s.turnTimerSec = clamp(patch.turnTimerSec, 0, 300);
  const map = getMap(room.mapId);
  if (typeof patch.maxPlayers === 'number') {
    s.maxPlayers = clamp(patch.maxPlayers, Math.max(2, room.players.length), map.maxPlayers);
  }
}

export function setMap(room: Room, mapId: string): void {
  if (room.started) return;
  try {
    const map = getMap(mapId);
    room.mapId = mapId;
    if (room.settings.maxPlayers > map.maxPlayers) room.settings.maxPlayers = map.maxPlayers;
  } catch {
    // ignore unknown map
  }
}

export function toView(room: Room): RoomView {
  return {
    code: room.code,
    hostId: room.hostId,
    mapId: room.mapId,
    settings: room.settings,
    started: room.started,
    players: room.players.map((p) => ({
      ...p,
      connected: p.isBot || room.sockets.has(p.id),
    })),
    game: room.game,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function cleanName(name: string): string {
  const trimmed = (name || '').trim().slice(0, 16);
  return trimmed.length > 0 ? trimmed : 'Player';
}
