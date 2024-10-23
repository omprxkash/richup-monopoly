import { useEffect, useState } from 'react';
import { actions, joinByUrlCode } from '../net/socket';

const AVATARS = ['🦊', '🐼', '🐵', '🐯', '🐸', '🐙', '🦄', '🐲', '🦁', '🐧', '🦉', '🐝'];

export function Home() {
  const [name, setName] = useState(() => localStorage.getItem('richup_name') || '');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [code, setCode] = useState('');

  useEffect(() => {
    const urlCode = joinByUrlCode();
    if (urlCode) setCode(urlCode);
  }, []);

  const remember = () => localStorage.setItem('richup_name', name.trim());

  const create = () => {
    if (!name.trim()) return;
    remember();
    actions.createRoom(name.trim(), avatar);
  };
  const join = () => {
    if (!name.trim() || !code.trim()) return;
    remember();
    actions.joinRoom(code.trim(), name.trim(), avatar);
  };

  return (
    <div className="home">
      <div className="home-card">
        <h1 className="logo">
          Richup<span>·Monopoly</span>
        </h1>
        <p className="tagline">Roll, buy cities, build hotels, bankrupt your friends.</p>

        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            maxLength={16}
            placeholder="e.g. Alex"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
        </label>

        <div className="field">
          <span>Pick a token</span>
          <div className="avatar-grid">
            {AVATARS.map((a) => (
              <button
                key={a}
                className={'avatar' + (a === avatar ? ' selected' : '')}
                onClick={() => setAvatar(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <button className="primary big" onClick={create} disabled={!name.trim()}>
          Create a room
        </button>

        <div className="divider">or join with a code</div>

        <div className="join-row">
          <input
            value={code}
            placeholder="ROOM CODE"
            className="code-input"
            maxLength={5}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && join()}
          />
          <button className="secondary" onClick={join} disabled={!name.trim() || !code.trim()}>
            Join
          </button>
        </div>
      </div>
      <footer className="home-foot">A weekend project — play with friends over a shared link.</footer>
    </div>
  );
}
