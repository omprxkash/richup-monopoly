import type { GameState } from '@richup/shared';

export function Log({ game }: { game: GameState }) {
  const entries = game.log.slice(-40).reverse();
  return (
    <div className="log">
      <h4>Game log</h4>
      <ul>
        {entries.map((e) => (
          <li key={e.id}>{e.text}</li>
        ))}
      </ul>
    </div>
  );
}
