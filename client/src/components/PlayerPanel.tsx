import { getMap, type GameState } from '@richup/shared';

export function PlayerPanel({ game, me }: { game: GameState; me: string | null }) {
  const map = getMap(game.mapId);
  const current = game.players[game.currentIdx];

  function netWorth(playerId: string): number {
    const p = game.players.find((x) => x.id === playerId)!;
    let total = p.cash;
    for (const t of map.tiles) {
      if (!('price' in t)) continue;
      const ts = game.tiles[t.id];
      if (ts.ownerId !== playerId) continue;
      total += ts.mortgaged ? Math.floor(t.price / 2) : t.price;
      if (t.kind === 'property') {
        const built = ts.hotel ? 5 : ts.houses;
        total += built * Math.floor(t.houseCost / 2);
      }
    }
    return total;
  }

  return (
    <div className="players">
      {game.players.map((p) => {
        const isTurn = current?.id === p.id && game.phase !== 'ended';
        const propCount = map.tiles.filter(
          (t) => 'price' in t && game.tiles[t.id].ownerId === p.id,
        ).length;
        return (
          <div
            key={p.id}
            className={'player-card' + (isTurn ? ' active' : '') + (p.isBankrupt ? ' bankrupt' : '')}
            style={{ borderColor: p.color }}
          >
            <span className="token" style={{ background: p.color }}>
              {p.avatar}
            </span>
            <div className="player-info">
              <div className="player-top">
                <span className="pname">
                  {p.name}
                  {p.id === me && <em className="you-badge">you</em>}
                </span>
                <span className="cash">${p.cash}</span>
              </div>
              <div className="player-sub">
                <span>{propCount} props</span>
                <span>net ${netWorth(p.id)}</span>
                {p.jailCards > 0 && <span>🎟️ {p.jailCards}</span>}
                {p.inJail && <span className="jailed">in jail</span>}
                {p.isBankrupt && <span className="out">bankrupt</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
