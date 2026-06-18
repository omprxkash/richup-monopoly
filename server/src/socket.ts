import type { Server, Socket } from 'socket.io';
import {
  createGame,
  rollDice,
  buyProperty,
  declineBuy,
  placeBid,
  passBid,
  build,
  sellBuilding,
  mortgage,
  unmortgage,
  jailAction,
  endTurn,
  declareBankruptcy,
  proposeTrade,
  respondTrade,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type GameState,
} from '@richup/shared';
import {
  type Room,
  getRoom,
  createRoom,
  joinRoom,
  addBot,
  removeBot,
  removePlayer,
  clampSettings,
  setMap,
  toView,
} from './rooms';
import { scheduleBots } from './bots';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents> & {
  data: { code?: string; playerId?: string };
};

export function registerHandlers(io: IO): void {
  function broadcast(room: Room): void {
    io.to(room.code).emit('room', toView(room));
  }

  function bind(socket: ClientSocket, room: Room, playerId: string): void {
    socket.data.code = room.code;
    socket.data.playerId = playerId;
    room.sockets.set(playerId, socket.id);
    socket.join(room.code);
  }

  function roomFor(socket: ClientSocket): Room | undefined {
    return socket.data.code ? getRoom(socket.data.code) : undefined;
  }

  function isHost(socket: ClientSocket, room: Room): boolean {
    return room.hostId === socket.data.playerId;
  }

  /** Run an engine action on behalf of this socket's player, then sync. */
  function act(socket: ClientSocket, fn: (g: GameState, playerId: string) => GameState): void {
    const room = roomFor(socket);
    const playerId = socket.data.playerId;
    if (!room || !room.game || !playerId) return;
    try {
      room.game = fn(room.game, playerId);
      broadcast(room);
      scheduleBots(room, () => broadcast(room));
    } catch (err) {
      socket.emit('errorMsg', err instanceof Error ? err.message : 'Invalid move');
    }
  }

  io.on('connection', (socket: ClientSocket) => {
    socket.on('createRoom', ({ name, avatar }, ack) => {
      const { room, playerId } = createRoom(name, avatar);
      bind(socket, room, playerId);
      ack({ code: room.code, playerId });
      broadcast(room);
    });

    socket.on('joinRoom', ({ code, name, avatar }, ack) => {
      const res = joinRoom(code, name, avatar);
      if ('error' in res) {
        ack({ error: res.error });
        return;
      }
      bind(socket, res.room, res.playerId);
      ack({ code: res.room.code, playerId: res.playerId });
      broadcast(res.room);
    });

    socket.on('reconnect', ({ code, playerId }, ack) => {
      const room = getRoom(code);
      if (!room || !room.players.some((p) => p.id === playerId)) {
        ack({ error: 'Room no longer exists' });
        return;
      }
      bind(socket, room, playerId);
      ack({ ok: true });
      broadcast(room);
    });

    socket.on('updateSettings', (patch) => {
      const room = roomFor(socket);
      if (!room || !isHost(socket, room) || room.started) return;
      clampSettings(room, patch);
      broadcast(room);
    });

    socket.on('setMap', (mapId) => {
      const room = roomFor(socket);
      if (!room || !isHost(socket, room) || room.started) return;
      setMap(room, mapId);
      broadcast(room);
    });

    socket.on('addBot', () => {
      const room = roomFor(socket);
      if (!room || !isHost(socket, room)) return;
      addBot(room);
      broadcast(room);
    });

    socket.on('removeBot', (botId) => {
      const room = roomFor(socket);
      if (!room || !isHost(socket, room)) return;
      removeBot(room, botId);
      broadcast(room);
    });

    socket.on('startGame', () => {
      const room = roomFor(socket);
      if (!room || !isHost(socket, room) || room.started) return;
      if (room.players.length < 2) {
        socket.emit('errorMsg', 'Need at least 2 players to start');
        return;
      }
      room.game = createGame(
        room.players.map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          color: p.color,
          isBot: p.isBot,
        })),
        room.mapId,
        room.settings,
        room.seed,
      );
      room.started = true;
      broadcast(room);
      scheduleBots(room, () => broadcast(room));
    });

    socket.on('rollDice', () => act(socket, (g, id) => rollDice(g, id)));
    socket.on('buy', () => act(socket, (g, id) => buyProperty(g, id)));
    socket.on('decline', () => act(socket, (g, id) => declineBuy(g, id)));
    socket.on('bid', (amount) => act(socket, (g, id) => placeBid(g, id, amount)));
    socket.on('passBid', () => act(socket, (g, id) => passBid(g, id)));
    socket.on('build', (tileId) => act(socket, (g, id) => build(g, id, tileId)));
    socket.on('sellBuilding', (tileId) => act(socket, (g, id) => sellBuilding(g, id, tileId)));
    socket.on('mortgage', (tileId) => act(socket, (g, id) => mortgage(g, id, tileId)));
    socket.on('unmortgage', (tileId) => act(socket, (g, id) => unmortgage(g, id, tileId)));
    socket.on('jailAction', (action) => act(socket, (g, id) => jailAction(g, id, action)));
    socket.on('endTurn', () => act(socket, (g, id) => endTurn(g, id)));
    socket.on('bankrupt', () => act(socket, (g, id) => declareBankruptcy(g, id)));

    socket.on('proposeTrade', ({ toId, give, receive }) =>
      act(socket, (g, id) => proposeTrade(g, id, toId, give, receive)),
    );
    socket.on('respondTrade', ({ tradeId, accept }) =>
      act(socket, (g, id) => respondTrade(g, tradeId, accept, id)),
    );

    socket.on('chat', (text) => {
      const room = roomFor(socket);
      const playerId = socket.data.playerId;
      if (!room || !playerId) return;
      const sender = room.players.find((p) => p.id === playerId);
      if (!sender) return;
      const clean = (text || '').toString().slice(0, 200).trim();
      if (!clean) return;
      io.to(room.code).emit('chat', {
        id: Date.now(),
        from: playerId,
        name: sender.name,
        text: clean,
        ts: Date.now(),
      });
    });

    socket.on('leaveRoom', () => {
      const room = roomFor(socket);
      if (!room || !socket.data.playerId) return;
      removePlayer(room, socket.data.playerId);
      socket.leave(room.code);
      socket.data.code = undefined;
      socket.data.playerId = undefined;
      if (getRoom(room.code)) broadcast(room);
    });

    socket.on('disconnect', () => {
      const room = roomFor(socket);
      if (!room || !socket.data.playerId) return;
      room.sockets.delete(socket.data.playerId);
      if (!room.started) {
        removePlayer(room, socket.data.playerId);
      }
      if (getRoom(room.code)) broadcast(room);
    });
  });
}
