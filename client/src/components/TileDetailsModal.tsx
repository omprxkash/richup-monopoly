import { getMap, type GameState } from '@richup/shared';
import { actions } from '../net/socket';

interface Props {
  tileId: number;
  game: GameState;
  me: string | null;
  onClose: () => void;
}

export function TileDetailsModal({ tileId, game, me, onClose }: Props) {
  const map = getMap(game.mapId);
  const tile = map.tiles[tileId];

  if (!('price' in tile)) return null;

  const ts = game.tiles[tileId];
  const owner = ts?.ownerId ? game.players.find((p) => p.id === ts.ownerId) : null;
  const isMyTile = ts?.ownerId === me;
  const groupColor = tile.kind === 'property' ? map.groups.find((g) => g.id === tile.group)?.color : null;
  const groupName = tile.kind === 'property' ? map.groups.find((g) => g.id === tile.group)?.name : null;

  const current = game.players[game.currentIdx];
  const myPlayer = game.players.find((p) => p.id === me);
  const canBuy = game.phase === 'awaiting-buy' && current?.id === me && current?.position === tileId;
  const canAfford = (myPlayer?.cash ?? 0) >= tile.price;

  const rentLabels = ['Base rent', '1 house', '2 houses', '3 houses', '4 houses', 'Hotel'];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal deed-modal" onClick={(e) => e.stopPropagation()}>
        {/* Colour banner */}
        <div
          className="deed-banner"
          style={{
            background: groupColor ?? (tile.kind === 'airport' ? '#1c2c5b' : '#2d4a2a'),
          }}
        >
          <span className="deed-group-name">
            {groupName ?? (tile.kind === 'airport' ? '✈️ Airport' : '⚡ Utility')}
          </span>
        </div>

        <div className="modal-head deed-head">
          <h3 className="deed-title">{tile.name}</h3>
          <button className="ghost small" onClick={onClose}>✕</button>
        </div>

        {/* Ownership status */}
        {owner ? (
          <div className="deed-owner-row">
            <span className="deed-owner-dot" style={{ background: owner.color }} />
            <span>
              {isMyTile ? 'Your property' : `Owned by ${owner.name}`}
              {ts?.mortgaged && <span className="mtg-tag"> · MORTGAGED</span>}
            </span>
          </div>
        ) : (
          <div className="deed-owner-row">
            <span className="deed-unowned">Unowned · For sale</span>
          </div>
        )}

        {/* Rent table */}
        {tile.kind === 'property' && (
          <table className="rent-table">
            <tbody>
              {tile.rent.map((amount, i) => {
                const isHotel = i === 5;
                const active = isHotel ? ts?.hotel : ts?.houses === i && !ts?.hotel;
                return (
                  <tr key={i} className={active ? 'rent-row-active' : ''}>
                    <td>{rentLabels[i]}</td>
                    <td className="rent-val">${amount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {tile.kind === 'airport' && (
          <table className="rent-table">
            <tbody>
              {[25, 50, 100, 200].map((rent, i) => (
                <tr key={i}>
                  <td>{i + 1} airport{i > 0 ? 's' : ''} owned</td>
                  <td className="rent-val">${rent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tile.kind === 'company' && (
          <table className="rent-table">
            <tbody>
              <tr><td>1 company owned</td><td className="rent-val">4× dice roll</td></tr>
              <tr><td>2 companies owned</td><td className="rent-val">10× dice roll</td></tr>
            </tbody>
          </table>
        )}

        <div className="deed-meta">
          <span>Price <strong>${tile.price}</strong></span>
          <span>Mortgage <strong>${tile.mortgage}</strong></span>
          {tile.kind === 'property' && <span>House <strong>${tile.houseCost}</strong></span>}
        </div>

        {/* Buy actions */}
        {canBuy && (
          <div className="deed-actions">
            <button
              className="primary"
              onClick={() => { actions.buy(); onClose(); }}
              disabled={!canAfford}
            >
              {canAfford ? `Buy $${tile.price}` : `Need $${tile.price - (myPlayer?.cash ?? 0)} more`}
            </button>
            <button className="secondary" onClick={() => { actions.decline(); onClose(); }}>
              {game.settings.auctionsEnabled ? 'Decline → Auction' : 'Skip'}
            </button>
          </div>
        )}

        {/* Manage my property */}
        {isMyTile && !canBuy && (
          <div className="deed-actions">
            {tile.kind === 'property' && !ts?.mortgaged && ts?.houses !== undefined && (
              <>
                {(ts.houses < 4 || ts.hotel) ? null : null}
                {!ts.hotel && (
                  <button
                    className="primary small"
                    onClick={() => actions.build(tileId)}
                  >
                    {ts.houses === 4 ? `Build hotel $${tile.houseCost}` : `Build house $${tile.houseCost}`}
                  </button>
                )}
                {(ts.houses > 0 || ts.hotel) && (
                  <button className="secondary small" onClick={() => actions.sellBuilding(tileId)}>
                    Sell building
                  </button>
                )}
              </>
            )}
            {!ts?.mortgaged ? (
              <button className="ghost small" onClick={() => actions.mortgage(tileId)}>
                Mortgage +${tile.mortgage}
              </button>
            ) : (
              <button className="secondary small" onClick={() => actions.unmortgage(tileId)}>
                Unmortgage −${Math.ceil(tile.mortgage * 1.1)}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
