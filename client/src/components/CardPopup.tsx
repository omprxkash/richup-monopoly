import type { GameState } from '@richup/shared';

export function CardPopup({ game }: { game: GameState }) {
  if (!game.pendingCard) return null;
  const { deck, card } = game.pendingCard;
  return (
    <div className={'card-popup ' + deck}>
      <div className="card-popup-head">{deck === 'surprise' ? '❓ Surprise' : '🎁 Treasure'}</div>
      <div className="card-popup-text">{card.text}</div>
    </div>
  );
}
