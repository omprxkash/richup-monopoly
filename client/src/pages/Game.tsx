import { useState } from 'react';
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

export function Game() {
  const { room, me } = useStore();
  const [showManage, setShowManage] = useState(false);
  const [showTrade, setShowTrade] = useState(false);

  if (!room || !room.game) return null;
  const game = room.game;
  const incomingTrades = game.pendingTrades.filter((t) => t.to === me).length;

  return (
    <div className="game">
      <div className="game-main">
        <Board game={game} />
        <CardPopup game={game} />
      </div>

      <aside className="game-side">
        <PlayerPanel game={game} me={me} />
        <ActionBar
          game={game}
          me={me}
          onManage={() => setShowManage(true)}
          onTrade={() => setShowTrade(true)}
        />
        {incomingTrades > 0 && (
          <button className="primary trade-alert" onClick={() => setShowTrade(true)}>
            {incomingTrades} trade offer{incomingTrades > 1 ? 's' : ''} for you
          </button>
        )}
        <Log game={game} />
        <Chat />
      </aside>

      <AuctionModal game={game} me={me} />
      {showManage && <ManageModal game={game} me={me} onClose={() => setShowManage(false)} />}
      {showTrade && <TradeModal game={game} me={me} onClose={() => setShowTrade(false)} />}
    </div>
  );
}
