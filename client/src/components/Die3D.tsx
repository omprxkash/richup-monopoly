const FACE_TRANSFORMS: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateX(0deg) rotateY(180deg)',
  3: 'rotateX(0deg) rotateY(-90deg)',
  4: 'rotateX(0deg) rotateY(90deg)',
  5: 'rotateX(90deg) rotateY(0deg)',
  6: 'rotateX(-90deg) rotateY(0deg)',
};

// 3×3 grid pip positions (0–8): row-major, top-left is 0
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DieFace({ n }: { n: number }) {
  const pips = PIPS[n] ?? [];
  return (
    <div className="die-3d-face">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={pips.includes(i) ? 'die-pip' : 'die-pip-empty'} />
      ))}
    </div>
  );
}

export function Die3D({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <div className="die-3d-scene">
      <div
        className={'die-3d-cube' + (rolling ? ' die-3d-rolling' : '')}
        style={rolling ? undefined : { transform: FACE_TRANSFORMS[value] ?? FACE_TRANSFORMS[1] }}
      >
        {/* faces in order: front(1) back(2) right(3) left(4) top(5) bottom(6) */}
        <DieFace n={1} />
        <DieFace n={2} />
        <DieFace n={3} />
        <DieFace n={4} />
        <DieFace n={5} />
        <DieFace n={6} />
      </div>
    </div>
  );
}
