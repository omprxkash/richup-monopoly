import { getMap, type GameState, type OwnableTile } from '@richup/shared';
import { actions } from '../net/socket';
import { Dice } from './Dice';

interface Props {
  game: GameState;
  me: string | null;
  onManage: () => void;
  onTrade: () => void;
}

export function ActionBar({ game, me, onManage, onTrade }: Props) {
  const map = getMap(game.mapId);
  const current = game.players[game.currentIdx];
  const myTurn = current?.id === me;
  const iOweMoney = game.debt && game.debt.playerId === me;

  if (game.phase === 'ended') {
    const winner = game.players.find((p) => p.id === game.winnerId);
    return (
      <div className="actionbar ended">
        <h2>🏆 {winner ? `${winner.name} wins!` : 'Game over'}</h2>
        <button className="primary" onClick={actions.leaveRoom}>
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="actionbar">
      <div className="turn-line">
        <Dice dice={game.dice} />
        <span className="turn-name" style={{ color: current?.color }}>
          {myTurn ? 'Your turn' : `${current?.name}'s turn`}
        </span>
      </div>

      {iOweMoney && (
        <div className="debt">
          You owe ${game.debt!.amount}. Mortgage or sell to cover it, or declare bankruptcy.
          <button className="danger" onClick={actions.bankrupt}>
            Declare bankruptcy
          </button>
        </div>
      )}

      {myTurn && !iOweMoney && (
        <div className="action-buttons">
          {game.phase === 'jail-decision' && (
            <>
              <button className="primary" onClick={() => actions.jailAction('roll')}>
                Roll for doubles
              </button>
              <button className="secondary" onClick={() => actions.jailAction('pay')}>
                Pay $50 fine
              </button>
              {(current?.jailCards ?? 0) > 0 && (
                <button className="secondary" onClick={() => actions.jailAction('card')}>
                  Use jail card
                </button>
              )}
            </>
          )}

          {game.phase === 'rolling' && (
            <button className="primary big" onClick={actions.rollDice}>
              🎲 Roll dice
            </button>
          )}

          {game.phase === 'awaiting-buy' &&
            (() => {
              const tile = map.tiles[current!.position] as OwnableTile;
              const canAfford = current!.cash >= tile.price;
              return (
                <>
                  <button className="primary" onClick={actions.buy} disabled={!canAfford}>
                    Buy {tile.name} (${tile.price})
                  </button>
                  <button className="secondary" onClick={actions.decline}>
                    {game.settings.auctionsEnabled ? 'Decline → auction' : 'Skip'}
                  </button>
                </>
              );
            })()}

          {game.phase === 'turn-end' && (
            <button className="primary" onClick={actions.endTurn}>
              End turn
            </button>
          )}
        </div>
      )}

      {(myTurn || true) && (
        <div className="manage-buttons">
          <button className="ghost" onClick={onManage}>
            Manage properties
          </button>
          <button className="ghost" onClick={onTrade}>
            Trade
          </button>
        </div>
      )}
    </div>
  );
}
