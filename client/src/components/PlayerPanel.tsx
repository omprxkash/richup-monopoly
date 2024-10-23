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
      if (t.kind === 'property') total += (ts.hotel ? 5 : ts.houses) * Math.floor(t.houseCost / 2);
    }
    return total;
  }

  function ownedGroups(playerId: string): string[] {
    const groups = new Set<string>();
    for (const t of map.tiles) {
      if (t.kind !== 'property') continue;
      if (game.tiles[t.id].ownerId !== playerId) continue;
      groups.add(t.group);
    }
    return Array.from(groups);
  }

  return (
    <div className="players">
      {game.players.map((p) => {
        const isTurn = current?.id === p.id && game.phase !== 'ended';
        const isMe = p.id === me;
        const propCount = map.tiles.filter(
          (t) => 'price' in t && game.tiles[t.id].ownerId === p.id,
        ).length;
        const groups = ownedGroups(p.id);

        return (
          <div
            key={p.id}
            className={[
              'player-card',
              isTurn ? 'active' : '',
              p.isBankrupt ? 'bankrupt' : '',
              isMe ? 'is-me' : '',
            ].join(' ')}
            style={{ '--player-color': p.color } as React.CSSProperties}
          >
            <div className="pc-left">
              <div className="pc-token" style={{ background: p.color }}>
                {p.avatar}
              </div>
              {isTurn && <div className="pc-turn-ring" style={{ borderColor: p.color }} />}
            </div>

            <div className="pc-info">
              <div className="pc-row1">
                <span className="pc-name">
                  {p.name}
                  {isMe && <span className="you-tag">you</span>}
                  {p.isBot && <span className="bot-tag">bot</span>}
                </span>
                <span className="pc-cash" style={{ color: p.cash < 200 ? '#e5484d' : '#36c275' }}>
                  ${p.cash.toLocaleString()}
                </span>
              </div>

              <div className="pc-row2">
                <span className="pc-stat">{propCount} props</span>
                <span className="pc-stat">net ${netWorth(p.id).toLocaleString()}</span>
                {p.jailCards > 0 && <span className="pc-stat">🎟️×{p.jailCards}</span>}
              </div>

              {/* Colour group dots */}
              {groups.length > 0 && (
                <div className="pc-groups">
                  {groups.map((gid) => {
                    const grp = map.groups.find((g) => g.id === gid);
                    return grp ? (
                      <span key={gid} className="pc-group-dot" style={{ background: grp.color }} title={grp.name} />
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {p.isBankrupt && <div className="pc-bankrupt-overlay">BANKRUPT</div>}
            {p.inJail && <span className="pc-jail">🚔</span>}
          </div>
        );
      })}
    </div>
  );
}
