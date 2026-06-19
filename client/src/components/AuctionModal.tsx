import { useEffect, useRef, useState } from 'react';
import { getMap, type GameState } from '@richup/shared';
import { actions } from '../net/socket';

const TIMER_SECS = 5;

export function AuctionModal({ game, me }: { game: GameState; me: string | null }) {
  const a = game.pendingAuction;
  const [amount, setAmount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (a) setAmount(a.highBid + 10);
  }, [a?.highBid]);

  const myTurn = a?.turn === me;
  const iPassed = me ? (a?.passed.includes(me) ?? true) : true;

  // Countdown timer — resets each time the bidding turn changes
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!a || game.phase !== 'auction' || !myTurn || iPassed) return;

    setTimeLeft(TIMER_SECS);
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          actions.passBid();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [a?.turn, myTurn, iPassed, game.phase]);

  if (!a || game.phase !== 'auction') return null;

  const map = getMap(game.mapId);
  const tile = map.tiles[a.tileId];
  const turnPlayer = game.players.find((p) => p.id === a.turn);
  const highBidder = game.players.find((p) => p.id === a.highBidder);
  const myCash = game.players.find((p) => p.id === me)?.cash ?? 0;
  const timerPct = (timeLeft / TIMER_SECS) * 100;

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
            Now bidding:{' '}
            <strong style={{ color: turnPlayer?.color }}>{turnPlayer?.name}</strong>
          </div>
        </div>

        {myTurn && !iPassed ? (
          <>
            {/* Countdown bar */}
            <div className="auction-timer-wrap">
              <div
                className="auction-timer-bar"
                style={{
                  width: `${timerPct}%`,
                  background: timeLeft <= 2 ? 'var(--bad)' : 'var(--accent)',
                }}
              />
              <span className="auction-timer-label">{timeLeft}s</span>
            </div>

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
          </>
        ) : (
          <p className="muted">{iPassed ? 'You passed.' : 'Waiting for other bidders…'}</p>
        )}
      </div>
    </div>
  );
}
