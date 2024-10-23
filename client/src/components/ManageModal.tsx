import { getMap, type GameState, type OwnableTile } from '@richup/shared';
import { actions } from '../net/socket';

export function ManageModal({ game, me, onClose }: { game: GameState; me: string | null; onClose: () => void }) {
  const map = getMap(game.mapId);
  const mine = map.tiles.filter((t) => 'price' in t && game.tiles[t.id].ownerId === me) as OwnableTile[];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal manage" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Your properties</h3>
          <button className="tiny" onClick={onClose}>
            ✕
          </button>
        </div>

        {mine.length === 0 && <p className="muted">You don't own anything yet.</p>}

        <div className="manage-list">
          {mine.map((t) => {
            const ts = game.tiles[t.id];
            const group = t.kind === 'property' ? map.groups.find((g) => g.id === t.group) : null;
            return (
              <div key={t.id} className="manage-row" style={{ borderLeftColor: group?.color ?? '#666' }}>
                <div className="manage-name">
                  {t.name}
                  {ts.hotel ? ' 🏨' : ts.houses > 0 ? ' ' + '🏠'.repeat(ts.houses) : ''}
                  {ts.mortgaged && <span className="mtg-tag">mortgaged</span>}
                </div>
                <div className="manage-btns">
                  {t.kind === 'property' && !ts.mortgaged && (
                    <>
                      <button className="tiny" onClick={() => actions.build(t.id)}>
                        Build ${t.houseCost}
                      </button>
                      <button className="tiny" onClick={() => actions.sellBuilding(t.id)}>
                        Sell
                      </button>
                    </>
                  )}
                  {!ts.mortgaged ? (
                    <button className="tiny" onClick={() => actions.mortgage(t.id)}>
                      Mortgage ${t.mortgage}
                    </button>
                  ) : (
                    <button className="tiny" onClick={() => actions.unmortgage(t.id)}>
                      Unmortgage ${Math.ceil(t.mortgage * 1.1)}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
