import { useEffect, useState } from 'react';
import { Die3D } from './Die3D';

interface Props {
  name: string;
  color: string;
  avatar: string;
  d1: number;
  d2: number;
}

export function DiceRollOverlay({ name, color, avatar, d1, d2 }: Props) {
  const [rolling, setRolling] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setRolling(false), 420);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="dice-overlay">
      <div className="dice-overlay-inner">
        <div className="dice-overlay-who">
          <span className="dice-overlay-token" style={{ background: color }}>{avatar}</span>
          <span style={{ color }}>{name} rolled</span>
        </div>
        <div className="dice-overlay-dice">
          <Die3D value={d1} rolling={rolling} />
          <span className="dice-plus">+</span>
          <Die3D value={d2} rolling={rolling} />
        </div>
        <div className="dice-overlay-sum">= {d1 + d2}</div>
      </div>
    </div>
  );
}
