import { getMap, type GameState } from '@richup/shared';

interface Props {
  game: GameState;
  me: string | null;
}

export function PlayerHUD({ game, me }: Props) {
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

  return (
    <div className="player-hud">
      {game.players.map((p) => {
        const isActive = current?.id === p.id && game.phase !== 'ended';
        const isMe = p.id === me;
        const nw = netWorth(p.id);
        return (
          <div
            key={p.id}
            className={[
              'hud-player',
              isActive ? 'hud-active' : '',
              p.isBankrupt ? 'hud-bankrupt' : '',
              isMe ? 'hud-me' : '',
            ].join(' ')}
            style={{ '--hc': p.color } as React.CSSProperties}
          >
            <div className="hud-avatar" style={{ background: p.color }}>
              {p.avatar}
            </div>
            <div className="hud-info">
              <div className="hud-name">
                {p.name}
                {isMe && <span className="hud-you">you</span>}
                {p.isBot && <span className="hud-bot">bot</span>}
                {p.inJail && <span className="hud-icon">🚔</span>}
                {p.jailCards > 0 && <span className="hud-icon">🎟️</span>}
              </div>
              <div className="hud-cash" style={{ color: p.cash < 200 ? '#e5484d' : '#a3e6b8' }}>
                ${p.cash.toLocaleString()}
                <span className="hud-nw"> · ${nw.toLocaleString()}</span>
              </div>
            </div>
            {p.isBankrupt && <div className="hud-bust">💀</div>}
          </div>
        );
      })}

      {game.settings.vacationCashPot && game.pot > 0 && (
        <div className="hud-pot" title="Vacation cash pot — land here to collect it all">
          🏖️ <strong>${game.pot}</strong>
        </div>
      )}
    </div>
  );
}
