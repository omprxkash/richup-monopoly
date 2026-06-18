import { useEffect, useState } from 'react';
import { getMap, type GameState } from '@richup/shared';
import { actions } from '../net/socket';

export function AuctionModal({ game, me }: { game: GameState; me: string | null }) {
  const a = game.pendingAuction;
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (a) setAmount(a.highBid + 10);
  }, [a?.highBid]);

  if (!a || game.phase !== 'auction') return null;
  const map = getMap(game.mapId);
  const tile = map.tiles[a.tileId];
  const myTurn = a.turn === me;
  const turnPlayer = game.players.find((p) => p.id === a.turn);
  const highBidder = game.players.find((p) => p.id === a.highBidder);
  const myCash = game.players.find((p) => p.id === me)?.cash ?? 0;
  const iPassed = me ? a.passed.includes(me) : true;

  return (
    <div className="modal-backdrop">
      <div className="modal auction">
        <h3>Auction — {tile.name}</h3>
        <div className="auction-status">
          <div>
            High bid:{' '}
            <strong>{a.highBidder ? `$${a.highBid} (${highBidder?.name})` : 'no bids yet'}</strong>
          </div>
          <div>
            Now bidding: <strong style={{ color: turnPlayer?.color }}>{turnPlayer?.name}</strong>
          </div>
        </div>

        {myTurn && !iPassed ? (
          <div className="auction-controls">
            <input
              type="number"
              value={amount}
              min={a.highBid + 1}
              max={myCash}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <button
              className="primary"
              onClick={() => actions.bid(amount)}
              disabled={amount <= a.highBid || amount > myCash}
            >
              Bid ${amount}
            </button>
            <button className="secondary" onClick={actions.passBid}>
              Pass
            </button>
          </div>
        ) : (
          <p className="muted">{iPassed ? 'You passed.' : 'Waiting for other bidders…'}</p>
        )}
      </div>
    </div>
  );
}
