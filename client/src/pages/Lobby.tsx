import { useState } from 'react';
import { MAP_LIST, getMap } from '@richup/shared';
import { actions, useStore } from '../net/socket';

export function Lobby() {
  const { room, me } = useStore();
  const [copied, setCopied] = useState(false);
  if (!room) return null;

  const isHost = room.hostId === me;
  const map = getMap(room.mapId);
  const s = room.settings;
  const canAddMore = room.players.length < s.maxPlayers;

  const inviteLink = `${window.location.origin}?room=${room.code}`;
  const copy = () => {
    navigator.clipboard?.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="lobby">
      <div className="lobby-grid">
        <section className="panel">
          <h2>Room {room.code}</h2>
          <div className="invite">
            <input readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
            <button className="secondary" onClick={copy}>
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>

          <h3>Players ({room.players.length}/{s.maxPlayers})</h3>
          <ul className="player-list">
            {room.players.map((p) => (
              <li key={p.id} style={{ borderColor: p.color }}>
                <span className="token" style={{ background: p.color }}>
                  {p.avatar}
                </span>
                <span className="pname">
                  {p.name}
                  {p.id === room.hostId && <em className="host-badge">host</em>}
                  {p.id === me && <em className="you-badge">you</em>}
                </span>
                {p.isBot && <span className="bot-tag">bot</span>}
                {isHost && p.isBot && (
                  <button className="tiny danger" onClick={() => actions.removeBot(p.id)}>
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>

          {isHost && (
            <div className="lobby-actions">
              <button className="secondary" onClick={actions.addBot} disabled={!canAddMore}>
                + Add bot
              </button>
              <button className="primary" onClick={actions.startGame} disabled={room.players.length < 2}>
                Start game
              </button>
            </div>
          )}
          {!isHost && <p className="muted">Waiting for the host to start…</p>}
          <button className="link-btn" onClick={actions.leaveRoom}>
            Leave room
          </button>
        </section>

        <section className="panel">
          <h3>Board</h3>
          <div className="map-picker">
            {MAP_LIST.map((m) => (
              <button
                key={m.id}
                className={'map-card' + (m.id === room.mapId ? ' selected' : '')}
                disabled={!isHost}
                onClick={() => actions.setMap(m.id)}
              >
                <strong>{m.name}</strong>
                <span>{m.description}</span>
              </button>
            ))}
          </div>

          <h3>Settings</h3>
          <fieldset className="settings" disabled={!isHost}>
            <label className="srow">
              <span>Starting cash</span>
              <input
                type="number"
                step={100}
                value={s.startingCash}
                onChange={(e) => actions.updateSettings({ startingCash: Number(e.target.value) })}
              />
            </label>
            <label className="srow">
              <span>Pass-Start bonus</span>
              <input
                type="number"
                step={50}
                value={s.startBonus}
                onChange={(e) => actions.updateSettings({ startBonus: Number(e.target.value) })}
              />
            </label>
            <label className="srow">
              <span>Max players</span>
              <input
                type="number"
                min={2}
                max={map.maxPlayers}
                value={s.maxPlayers}
                onChange={(e) => actions.updateSettings({ maxPlayers: Number(e.target.value) })}
              />
            </label>
            <label className="srow">
              <span>Turn timer (sec, 0 = off)</span>
              <input
                type="number"
                step={5}
                value={s.turnTimerSec}
                onChange={(e) => actions.updateSettings({ turnTimerSec: Number(e.target.value) })}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={s.auctionsEnabled}
                onChange={(e) => actions.updateSettings({ auctionsEnabled: e.target.checked })}
              />
              Auction declined properties
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={s.x2RentOnFullSet}
                onChange={(e) => actions.updateSettings({ x2RentOnFullSet: e.target.checked })}
              />
              Double rent on a full colour set
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={s.vacationCashPot}
                onChange={(e) => actions.updateSettings({ vacationCashPot: e.target.checked })}
              />
              Taxes pile up on Vacation
            </label>
            <label className="srow">
              <span>Income tax mode</span>
              <select
                value={s.incomeTaxMode}
                onChange={(e) => actions.updateSettings({ incomeTaxMode: e.target.value as 'flat' | 'percent' })}
              >
                <option value="flat">Flat amount</option>
                <option value="percent">10% of net worth</option>
              </select>
            </label>
            <label className="srow">
              <span>Bot difficulty</span>
              <select
                value={s.botDifficulty}
                onChange={(e) => actions.updateSettings({ botDifficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </fieldset>
        </section>
      </div>
    </div>
  );
}
