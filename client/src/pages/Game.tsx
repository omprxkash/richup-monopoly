import { useEffect, useRef, useState } from 'react';
import { getMap } from '@richup/shared';
import { useStore } from '../net/socket';
import { Board } from '../components/Board';
import { PlayerPanel } from '../components/PlayerPanel';
import { ActionBar } from '../components/ActionBar';
import { AuctionModal } from '../components/AuctionModal';
import { TradeModal } from '../components/TradeModal';
import { ManageModal } from '../components/ManageModal';
import { CardPopup } from '../components/CardPopup';
import { Log } from '../components/Log';
import { Chat } from '../components/Chat';
import { DiceRollOverlay } from '../components/DiceRollOverlay';
import { TileDetailsModal } from '../components/TileDetailsModal';
import { WinScreen } from '../components/WinScreen';

export function Game() {
  const { room, me } = useStore();
  const [showManage, setShowManage] = useState(false);
  const [showTrade, setShowTrade] = useState(false);
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);
  const [diceNotif, setDiceNotif] = useState<{
    name: string; color: string; avatar: string; d1: number; d2: number;
  } | null>(null);

  const prevDiceRef = useRef<string | null>(null);
  const game = room?.game;

  useEffect(() => {
    if (!game?.dice) return;
    const key = game.dice.join('-');
    if (key === prevDiceRef.current) return;
    prevDiceRef.current = key;

    const roller = game.players[game.currentIdx];
    if (!roller) return;
    setDiceNotif({
      name: roller.name,
      color: roller.color,
      avatar: roller.avatar,
      d1: game.dice[0],
      d2: game.dice[1],
    });
    const t = setTimeout(() => setDiceNotif(null), 2000);
    return () => clearTimeout(t);
  }, [game?.dice?.join('-')]);

  // Close deed modal when phase changes (e.g. after buy)
  useEffect(() => { setSelectedTileId(null); }, [game?.phase]);

  if (!room || !game) return null;

  const incomingTrades = game.pendingTrades.filter((t) => t.to === me).length;
  const current = game.players[game.currentIdx];
  const myTurn = current?.id === me;
  const map = getMap(game.mapId);

  return (
    <div className="game">
      {/* Turn banner */}
      <div className="turn-banner" style={{ borderColor: current?.color }}>
        <span className="turn-banner-dot" style={{ background: current?.color }} />
        {game.phase === 'ended'
          ? '🏆 Game over'
          : myTurn
            ? '🎯 Your turn'
            : `${current?.name}'s turn`}
      </div>

      <div className="game-body">
        {/* Board area */}
        <div className="game-main">
          <Board game={game} me={me} onTileClick={setSelectedTileId} />
          {diceNotif && <DiceRollOverlay {...diceNotif} />}
          <CardPopup game={game} />
        </div>

        {/* Sidebar */}
        <aside className="game-side">
          <PlayerPanel game={game} me={me} />

          {incomingTrades > 0 && (
            <button className="primary trade-alert" onClick={() => setShowTrade(true)}>
              📬 {incomingTrades} trade offer{incomingTrades > 1 ? 's' : ''} waiting
            </button>
          )}

          <ActionBar
            game={game}
            me={me}
            onManage={() => setShowManage(true)}
            onTrade={() => setShowTrade(true)}
          />

          <div className="side-tabs">
            <Log game={game} />
            <Chat />
          </div>
        </aside>
      </div>

      {/* Map label */}
      <div className="map-label">{map.name}</div>

      {/* Modals */}
      <AuctionModal game={game} me={me} />
      {showManage && <ManageModal game={game} me={me} onClose={() => setShowManage(false)} />}
      {showTrade && <TradeModal game={game} me={me} onClose={() => setShowTrade(false)} />}

      {selectedTileId !== null && (
        <TileDetailsModal
          tileId={selectedTileId}
          game={game}
          me={me}
          onClose={() => setSelectedTileId(null)}
        />
      )}

      {/* Win screen overlay */}
      {game.phase === 'ended' && <WinScreen game={game} />}
    </div>
  );
}
