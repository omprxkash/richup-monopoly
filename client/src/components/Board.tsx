import { useEffect, useRef, useState } from 'react';
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
  airport: '✈️', company: '⚡', surprise: '❓', treasure: '🎁', tax: '💸',
};

export function Board({ game, me, onTileClick }: {
  game: GameState;
  me: string | null;
  onTileClick?: (tileId: number) => void;
}) {
  const map = getMap(game.mapId);
  const G = map.perSide + 2;
  const current = game.players[game.currentIdx];
  const totalTiles = map.tiles.length;

  // Displayed positions for each player (drives animation)
  const [displayPos, setDisplayPos] = useState<Record<string, number>>(() =>
    Object.fromEntries(game.players.map((p) => [p.id, p.position])),
  );
  const animTimers = useRef<Record<string, ReturnType<typeof setTimeout>[]>>({});

  useEffect(() => {
    game.players.forEach((player) => {
      const from = displayPos[player.id] ?? player.position;
      const to = player.position;
      if (from === to) return;

      // Cancel existing animation for this player
      (animTimers.current[player.id] ?? []).forEach(clearTimeout);
      animTimers.current[player.id] = [];

      // Compute forward path
      const path: number[] = [];
      let pos = from;
      let steps = 0;
      while (pos !== to && steps < totalTiles) {
        pos = (pos + 1) % totalTiles;
        path.push(pos);
        steps++;
      }

      // Teleport for jail jumps (path > half the board)
      if (path.length > totalTiles / 2 || path.length === 0) {
        setDisplayPos((prev) => ({ ...prev, [player.id]: to }));
        return;
      }

      // Hop one space every 140ms
      path.forEach((step, i) => {
        const t = setTimeout(() => {
          setDisplayPos((prev) => ({ ...prev, [player.id]: step }));
        }, i * 140);
        animTimers.current[player.id].push(t);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.players.map((p) => `${p.id}:${p.position}`).join(',')]);

  // Sync display positions for new/reset players
  useEffect(() => {
    setDisplayPos((prev) => {
      const next = { ...prev };
      game.players.forEach((p) => {
        if (!(p.id in next)) next[p.id] = p.position;
      });
      return next;
    });
  }, [game.players.length]);

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
        const here = game.players.filter(
          (p) => !p.isBankrupt && (displayPos[p.id] ?? p.position) === tile.id,
        );
        const gc = groupColor(map, tile);
        const isCorner = side === 'corner';
        const isMine = ts?.ownerId === me;
        const isActive = here.some((p) => p.id === current?.id);
        const isOwnable = 'price' in tile;

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
              isOwnable ? 'tile-ownable' : '',
            ].join(' ')}
            style={{
              gridRow: r,
              gridColumn: c,
              '--owner-color': owner?.color ?? 'transparent',
            } as React.CSSProperties}
            onClick={isOwnable ? () => onTileClick?.(tile.id) : undefined}
          >
            {gc && <div className="tile-strip" style={{ background: gc }} />}
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

            {here.length > 0 && (
              <div className="tile-tokens">
                {here.map((p) => (
                  <span
                    key={p.id}
                    className={'board-token' + (p.id === me ? ' token-me' : '') + ' token-arrive'}
                    style={{ background: p.color }}
                    title={p.name}
                  >
                    {p.avatar}
                  </span>
                ))}
              </div>
            )}

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
