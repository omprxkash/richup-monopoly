import { getMap, type GameState, type Tile } from '@richup/shared';

export function gridPos(index: number, perSide: number) {
  const G = perSide + 2;
  const corner = perSide + 1;
  if (index === 0)           return { r: G,   c: G,   side: 'corner' };
  if (index === corner)      return { r: G,   c: 1,   side: 'corner' };
  if (index === corner * 2)  return { r: 1,   c: 1,   side: 'corner' };
  if (index === corner * 3)  return { r: 1,   c: G,   side: 'corner' };
  if (index < corner)        return { r: G,   c: G - index,               side: 'bottom' };
  if (index < corner * 2)    return { r: G - 1 - (index - corner), c: 1,  side: 'left' };
  if (index < corner * 3)    return { r: 1,   c: 1 + (index - corner * 2), side: 'top' };
  return { r: 1 + (index - corner * 3), c: G,                             side: 'right' };
}

function groupColor(map: ReturnType<typeof getMap>, tile: Tile): string | null {
  if (tile.kind !== 'property') return null;
  return map.groups.find((g) => g.id === tile.group)?.color ?? '#888';
}

const CORNER_ICON: Record<string, string> = {
  start: '🏁', jail: '🚔', gotojail: '👮', vacation: '🏝️',
};
const KIND_ICON: Record<string, string> = {
  airport: '✈️', company: '⚡', surprise: '❓', treasure: '🎁',
  tax: '💸',
};

export function Board({ game, me }: { game: GameState; me: string | null }) {
  const map = getMap(game.mapId);
  const G = map.perSide + 2;
  const current = game.players[game.currentIdx];

  return (
    <div
      className="board"
      style={{
        gridTemplateColumns: `repeat(${G}, 1fr)`,
        gridTemplateRows: `repeat(${G}, 1fr)`,
      }}
    >
      {map.tiles.map((tile) => {
        const { r, c, side } = gridPos(tile.id, map.perSide);
        const ts = game.tiles[tile.id];
        const owner = ts?.ownerId ? game.players.find((p) => p.id === ts.ownerId) : null;
        const here = game.players.filter((p) => !p.isBankrupt && p.position === tile.id);
        const gc = groupColor(map, tile);
        const isCorner = side === 'corner';
        const isMine = ts?.ownerId === me;
        const isActive = here.some((p) => p.id === current?.id);

        return (
          <div
            key={tile.id}
            className={[
              'tile',
              `side-${side}`,
              `kind-${tile.kind}`,
              isCorner ? 'tile-corner' : '',
              isMine ? 'tile-mine' : '',
              isActive ? 'tile-active' : '',
            ].join(' ')}
            style={{
              gridRow: r,
              gridColumn: c,
              '--owner-color': owner?.color ?? 'transparent',
            } as React.CSSProperties}
          >
            {/* Colour strip for properties */}
            {gc && <div className="tile-strip" style={{ background: gc }} />}

            {/* Owner bar on non-property ownables */}
            {owner && !gc && (
              <div className="tile-owner-bar" style={{ background: owner.color }} />
            )}

            <div className="tile-body">
              {isCorner ? (
                <div className="tile-corner-inner">
                  <span className="tile-corner-icon">{CORNER_ICON[tile.kind]}</span>
                  <span className="tile-corner-name">{tile.name}</span>
                </div>
              ) : (
                <>
                  {KIND_ICON[tile.kind] && (
                    <span className="tile-kind-icon">{KIND_ICON[tile.kind]}</span>
                  )}
                  <div className="tile-name">{tile.name}</div>
                  {'price' in tile && !owner && (
                    <div className="tile-price">${tile.price}</div>
                  )}
                  {'amount' in tile && (
                    <div className="tile-price tax">${tile.amount}</div>
                  )}
                  {ts && (ts.houses > 0 || ts.hotel) && (
                    <div className="tile-buildings">
                      {ts.hotel
                        ? <span className="hotel-icon">H</span>
                        : Array.from({ length: ts.houses }, (_, i) => (
                            <span key={i} className="house-icon" />
                          ))}
                    </div>
                  )}
                  {ts?.mortgaged && <div className="tile-mort">MTG</div>}
                </>
              )}
            </div>

            {/* Player tokens */}
            {here.length > 0 && (
              <div className="tile-tokens">
                {here.map((p) => (
                  <span
                    key={p.id}
                    className={'board-token' + (p.id === me ? ' token-me' : '')}
                    style={{ background: p.color }}
                    title={p.name}
                  >
                    {p.avatar}
                  </span>
                ))}
              </div>
            )}

            {/* Owner dot in corner */}
            {owner && (
              <span
                className="tile-owner-dot"
                style={{ background: owner.color }}
                title={owner.name}
              />
            )}
          </div>
        );
      })}

      {/* Board centre */}
      <div
        className="board-center"
        style={{ gridRow: `2 / span ${map.perSide}`, gridColumn: `2 / span ${map.perSide}` }}
      >
        <div className="center-logo">Richup<span>·Monopoly</span></div>
        {game.pot > 0 && (
          <div className="center-pot">🏝️ Vacation ${game.pot}</div>
        )}
        {current && game.phase !== 'ended' && (
          <div className="center-turn" style={{ borderColor: current.color }}>
            <span className="ct-token" style={{ background: current.color }}>
              {current.avatar}
            </span>
            <span className="ct-name" style={{ color: current.color }}>
              {current.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
