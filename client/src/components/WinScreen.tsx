import { useMemo } from 'react';
import { getMap, type GameState } from '@richup/shared';
import { actions } from '../net/socket';

function calcNetWorth(playerId: string, game: GameState, map: ReturnType<typeof getMap>): number {
  const p = game.players.find((x) => x.id === playerId);
  if (!p) return 0;
  let total = p.cash;
  for (const t of map.tiles) {
    if (!('price' in t)) continue;
    const ts = game.tiles[t.id];
    if (ts?.ownerId !== playerId) continue;
    total += ts.mortgaged ? Math.floor(t.price / 2) : t.price;
    if (t.kind === 'property') total += (ts.hotel ? 5 : ts.houses) * Math.floor(t.houseCost / 2);
  }
  return total;
}

interface Piece {
  id: number; color: string; x: number; size: number;
  delay: string; duration: string; rotate: number; isCircle: boolean;
}

function genConfetti(n: number): Piece[] {
  const colors = ['#5b6bff','#8a5cff','#2ecc71','#f39c12','#e5484d','#42d4f4','#f032e6','#bfef45','#ffffff'];
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    x: Math.floor(Math.random() * 100),
    size: 6 + Math.floor(Math.random() * 10),
    delay: (Math.random() * 3).toFixed(2),
    duration: (2.5 + Math.random() * 2.5).toFixed(2),
    rotate: Math.floor(Math.random() * 360),
    isCircle: Math.random() > 0.5,
  }));
}

export function WinScreen({ game }: { game: GameState }) {
  const map = getMap(game.mapId);
  const confetti = useMemo(() => genConfetti(60), []);
  const winner = game.players.find((p) => p.id === game.winnerId);
  const sorted = useMemo(
    () => [...game.players].sort((a, b) => calcNetWorth(b.id, game, map) - calcNetWorth(a.id, game, map)),
    [game, map],
  );

  return (
    <div className="win-screen">
      <div className="confetti-container" aria-hidden="true">
        {confetti.map((p) => (
          <div
            key={p.id}
            className="confetti-piece"
            style={{
              left: `${p.x}%`,
              width: p.size,
              height: p.isCircle ? p.size : Math.ceil(p.size * 0.55),
              borderRadius: p.isCircle ? '50%' : '2px',
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--rotate': `${p.rotate}deg`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="win-card">
        <div className="win-trophy">🏆</div>

        {winner && (
          <div className="win-winner">
            <div className="win-token" style={{ background: winner.color }}>
              {winner.avatar}
            </div>
            <h2 className="win-name">{winner.name} wins!</h2>
          </div>
        )}

        <div className="win-leaderboard">
          <div className="win-lb-title">Final standings</div>
          {sorted.map((p, i) => (
            <div
              key={p.id}
              className={'win-row' + (p.id === game.winnerId ? ' win-row-first' : '')}
              style={{ opacity: p.isBankrupt ? 0.45 : 1 }}
            >
              <span className="win-rank">#{i + 1}</span>
              <span className="win-p-token" style={{ background: p.color }}>{p.avatar}</span>
              <span className="win-p-name">{p.name}</span>
              <span className="win-p-worth">${calcNetWorth(p.id, game, map).toLocaleString()}</span>
              {p.isBankrupt && <span className="win-bankrupt">bankrupt</span>}
            </div>
          ))}
        </div>

        <button className="primary" style={{ width: '100%', marginTop: 4 }} onClick={actions.leaveRoom}>
          Back to Home
        </button>
      </div>
    </div>
  );
}
