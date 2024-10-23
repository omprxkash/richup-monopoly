import { useStore } from './net/socket';
import { Home } from './pages/Home';
import { Lobby } from './pages/Lobby';
import { Game } from './pages/Game';

export function App() {
  const { room, error, connected } = useStore();

  let view;
  if (!room) view = <Home />;
  else if (!room.started || !room.game) view = <Lobby />;
  else view = <Game />;

  return (
    <div className="app">
      {!connected && <div className="banner warn">Reconnecting…</div>}
      {error && <div className="banner error">{error}</div>}
      {view}
    </div>
  );
}
