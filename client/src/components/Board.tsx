import { getMap, type GameState, type Tile } from '@richup/shared';

interface Pos {
  gridRow: number;
  gridColumn: number;
  side: 'bottom' | 'left' | 'top' | 'right' | 'corner';
}

export function gridPos(index: number, perSide: number): Pos {
  const G = perSide + 2; // grid dimension
  const corner = perSide + 1;

  if (index === 0) return { gridRow: G, gridColumn: G, side: 'corner' };
  if (index === corner) return { gridRow: G, gridColumn: 1, side: 'corner' };
  if (index === corner * 2) return { gridRow: 1, gridColumn: 1, side: 'corner' };
  if (index === corner * 3) return { gridRow: 1, gridColumn: G, side: 'corner' };

  if (index < corner) {
    // bottom row, right -> left
    return { gridRow: G, gridColumn: G - index, side: 'bottom' };
  }
  if (index < corner * 2) {
    // left column, bottom -> top
    const k = index - corner;
    return { gridRow: G - 1 - k, gridColumn: 1, side: 'left' };
  }
  if (index < corner * 3) {
    // top row, left -> right
    const k = index - corner * 2;
    return { gridRow: 1, gridColumn: 1 + k, side: 'top' };
  }
  // right column, top -> bottom
  const k = index - corner * 3;
  return { gridRow: 1 + k, gridColumn: G, side: 'right' };
}

function groupColor(map: ReturnType<typeof getMap>, tile: Tile): string | null {
  if (tile.kind !== 'property') return null;
  return map.groups.find((g) => g.id === tile.group)?.color ?? '#888';
}

const KIND_ICON: Record<string, string> = {
  airport: '✈️',
  company: '💡',
  surprise: '❓',
  treasure: '🎁',
  tax: '💸',
  jail: '🚔',
  gotojail: '👮',
  vacation: '🏝️',
  start: '🏁',
};

export function Board({ game }: { game: GameState }) {
  const map = getMap(game.mapId);
  const G = map.perSide + 2;

  return (
    <div
      className="board"
      style={{
        gridTemplateColumns: `repeat(${G}, 1fr)`,
        gridTemplateRows: `repeat(${G}, 1fr)`,
      }}
    >
      {map.tiles.map((tile) => {
        const pos = gridPos(tile.id, map.perSide);
        const ts = game.tiles[tile.id];
        const owner = ts?.ownerId ? game.players.find((p) => p.id === ts.ownerId) : null;
        const here = game.players.filter((p) => !p.isBankrupt && p.position === tile.id);
        const gc = groupColor(map, tile);
        const ownable = tile.kind === 'property' || tile.kind === 'airport' || tile.kind === 'company';

        return (
          <div
            key={tile.id}
            className={`tile side-${pos.side} kind-${tile.kind}`}
            style={{
              gridRow: pos.gridRow,
              gridColumn: pos.gridColumn,
              boxShadow: owner ? `inset 0 0 0 3px ${owner.color}` : undefined,
            }}
          >
            {gc && <div className="tile-strip" style={{ background: gc }} />}
            <div className="tile-body">
              <div className="tile-name">
                {KIND_ICON[tile.kind] && <span className="tile-icon">{KIND_ICON[tile.kind]}</span>}
                {tile.name}
              </div>
              {ownable && !owner && 'price' in tile && <div className="tile-price">${tile.price}</div>}
              {ts && (ts.houses > 0 || ts.hotel) && (
                <div className="tile-build">{ts.hotel ? '🏨' : '🏠'.repeat(ts.houses)}</div>
              )}
              {ts?.mortgaged && <div className="tile-mortgage">MORTGAGED</div>}
            </div>
            {here.length > 0 && (
              <div className="tile-tokens">
                {here.map((p) => (
                  <span key={p.id} className="board-token" style={{ background: p.color }} title={p.name}>
                    {p.avatar}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div
        className="board-center"
        style={{ gridRow: `2 / span ${map.perSide}`, gridColumn: `2 / span ${map.perSide}` }}
      >
        <div className="center-logo">
          Richup<span>·Monopoly</span>
        </div>
        <div className="center-map">{map.name}</div>
        {game.pot > 0 && <div className="center-pot">🏝️ Vacation pot: ${game.pot}</div>}
      </div>
    </div>
  );
}
