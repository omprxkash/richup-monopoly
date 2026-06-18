import { useState } from 'react';
import { getMap, type GameState, type OwnableTile } from '@richup/shared';
import { actions } from '../net/socket';

interface Props {
  game: GameState;
  me: string | null;
  onManage: () => void;
  onTrade: () => void;
}

export function ActionBar({ game, me, onManage, onTrade }: Props) {
  const [rolling, setRolling] = useState(false);
  const map = getMap(game.mapId);
  const current = game.players[game.currentIdx];
  const myTurn = current?.id === me;
  const iOweMoney = game.debt && game.debt.playerId === me;

  const handleRoll = () => {
    setRolling(true);
    actions.rollDice();
    setTimeout(() => setRolling(false), 800);
  };

  if (game.phase === 'ended') {
    const winner = game.players.find((p) => p.id === game.winnerId);
    return (
      <div className="actionbar ended">
        <div className="ended-crown">🏆</div>
        <h3>{winner ? `${winner.name} wins!` : 'Game over'}</h3>
        <button className="primary" onClick={actions.leaveRoom}>
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="actionbar">
      {/* Debt warning */}
      {iOweMoney && (
        <div className="debt-panel">
          <div className="debt-icon">⚠️</div>
          <div className="debt-text">
            You owe <strong>${game.debt!.amount}</strong>.
            Mortgage or sell buildings to cover it.
          </div>
          <button className="danger small" onClick={actions.bankrupt}>
            Declare bankruptcy
          </button>
        </div>
      )}

      {/* Main actions */}
      {myTurn && !iOweMoney && (
        <div className="action-area">
          {game.phase === 'jail-decision' && (
            <div className="jail-actions">
              <div className="jail-label">🚔 You're in jail</div>
              <button className="primary" onClick={() => actions.jailAction('roll')}>
                Roll for doubles
              </button>
              <button className="secondary" onClick={() => actions.jailAction('pay')}>
                Pay $50 fine
              </button>
              {(current?.jailCards ?? 0) > 0 && (
                <button className="secondary" onClick={() => actions.jailAction('card')}>
                  🎟️ Use free card
                </button>
              )}
            </div>
          )}

          {game.phase === 'rolling' && (
            <button
              className={'roll-btn' + (rolling ? ' rolling' : '')}
              onClick={handleRoll}
              disabled={rolling}
            >
              {rolling ? (
                <span className="roll-anim">⚄ ⚂</span>
              ) : (
                '🎲 Roll Dice'
              )}
            </button>
          )}

          {game.phase === 'awaiting-buy' &&
            (() => {
              const tile = map.tiles[current!.position] as OwnableTile;
              const canAfford = current!.cash >= tile.price;
              const gc = tile.kind === 'property'
                ? map.groups.find((g) => g.id === tile.group)?.color
                : null;
              return (
                <div className="buy-panel">
                  <div className="buy-tile" style={{ borderLeftColor: gc ?? '#666' }}>
                    <div className="buy-name">{tile.name}</div>
                    <div className="buy-price">${tile.price}</div>
                  </div>
                  <button className="primary" onClick={actions.buy} disabled={!canAfford}>
                    Buy
                  </button>
                  <button className="secondary" onClick={actions.decline}>
                    {game.settings.auctionsEnabled ? 'Auction' : 'Skip'}
                  </button>
                </div>
              );
            })()}

          {game.phase === 'turn-end' && (
            <button className="primary end-turn-btn" onClick={actions.endTurn}>
              End Turn →
            </button>
          )}
        </div>
      )}

      {!myTurn && game.phase !== 'ended' && (
        <div className="waiting-msg">
          <span className="waiting-dot" style={{ background: current?.color }} />
          Waiting for {current?.name}…
        </div>
      )}

      {/* Manage + trade buttons — always shown */}
      <div className="quick-actions">
        <button className="ghost" onClick={onManage}>🏗️ Properties</button>
        <button className="ghost" onClick={onTrade}>🤝 Trade</button>
      </div>
    </div>
  );
}
