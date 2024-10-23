const PIPS: Record<number, string> = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };

export function Dice({ dice }: { dice: [number, number] | null }) {
  if (!dice) return <div className="dice empty">—</div>;
  return (
    <div className="dice">
      <span className="die">{PIPS[dice[0]]}</span>
      <span className="die">{PIPS[dice[1]]}</span>
    </div>
  );
}
