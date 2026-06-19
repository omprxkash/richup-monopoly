import { useState } from 'react';
import { getMap, type GameState, type TradeOffer, type OwnableTile, type Trade } from '@richup/shared';
import { actions } from '../net/socket';

function tradeableTiles(game: GameState, ownerId: string): OwnableTile[] {
  const map = getMap(game.mapId);
  return map.tiles.filter((t) => {
    if (!('price' in t)) return false;
    const ts = game.tiles[t.id];
    if (ts.ownerId !== ownerId) return false;
    if (t.kind === 'property' && (ts.houses > 0 || ts.hotel)) return false;
    return true;
  }) as OwnableTile[];
}

export function TradeModal({ game, me, onClose }: { game: GameState; me: string | null; onClose: () => void }) {
  const others = game.players.filter((p) => p.id !== me && !p.isBankrupt);
  const [partner, setPartner] = useState(others[0]?.id ?? '');
  const [giveCash, setGiveCash] = useState(0);
  const [recvCash, setRecvCash] = useState(0);
  const [giveTiles, setGiveTiles] = useState<number[]>([]);
  const [recvTiles, setRecvTiles] = useState<number[]>([]);
  const [giveJail, setGiveJail] = useState(0);
  const [recvJail, setRecvJail] = useState(0);
  const [counteringId, setCounteringId] = useState<string | null>(null);

  const incoming = game.pendingTrades.filter((t) => t.to === me);
  const myTiles = me ? tradeableTiles(game, me) : [];
  const theirTiles = partner ? tradeableTiles(game, partner) : [];
  const partnerPlayer = game.players.find((p) => p.id === partner);

  const toggle = (arr: number[], set: (v: number[]) => void, id: number) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const propose = () => {
    if (!partner) return;
    const give: TradeOffer = { cash: giveCash, tileIds: giveTiles, jailCards: giveJail };
    const receive: TradeOffer = { cash: recvCash, tileIds: recvTiles, jailCards: recvJail };
    actions.proposeTrade(partner, give, receive);
    onClose();
  };

  const startCounter = (t: Trade) => {
    // Pre-fill form with swapped offer
    setPartner(t.from);
    setGiveCash(t.receive.cash);
    setGiveTiles([...t.receive.tileIds]);
    setGiveJail(t.receive.jailCards);
    setRecvCash(t.give.cash);
    setRecvTiles([...t.give.tileIds]);
    setRecvJail(t.give.jailCards);
    setCounteringId(t.id);
    // Decline the original
    actions.respondTrade(t.id, false);
  };

  const map = getMap(game.mapId);
  const names = (ids: number[]) => ids.map((id) => map.tiles[id]?.name).filter(Boolean).join(', ') || '—';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal trade" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Trade{counteringId ? ' — Counter-offer' : ''}</h3>
          <button className="tiny" onClick={onClose}>✕</button>
        </div>

        {/* Incoming offers */}
        {incoming.length > 0 && !counteringId && (
          <div className="incoming-trades">
            <h4>Offers to you</h4>
            {incoming.map((t) => {
              const from = game.players.find((p) => p.id === t.from);
              return (
                <div key={t.id} className="incoming">
                  <div>
                    <strong>{from?.name}</strong> gives you: ${t.give.cash}
                    {t.give.tileIds.length > 0 && `, ${names(t.give.tileIds)}`}
                    {t.give.jailCards > 0 && `, ${t.give.jailCards} jail card(s)`}
                  </div>
                  <div>
                    You give: ${t.receive.cash}
                    {t.receive.tileIds.length > 0 && `, ${names(t.receive.tileIds)}`}
                    {t.receive.jailCards > 0 && `, ${t.receive.jailCards} jail card(s)`}
                  </div>
                  <div className="incoming-btns">
                    <button className="primary tiny" onClick={() => actions.respondTrade(t.id, true)}>
                      Accept
                    </button>
                    <button className="secondary tiny" onClick={() => actions.respondTrade(t.id, false)}>
                      Decline
                    </button>
                    <button className="ghost tiny" onClick={() => startCounter(t)}>
                      Counter-offer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {counteringId && (
          <div className="counter-badge">
            Countering offer from {game.players.find(p => p.id === partner)?.name} — adjust and send
          </div>
        )}

        {others.length === 0 ? (
          <p className="muted">No one to trade with.</p>
        ) : (
          <>
            <label className="srow">
              <span>Trade with</span>
              <select value={partner} onChange={(e) => { setPartner(e.target.value); setCounteringId(null); }}>
                {others.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>

            <div className="trade-cols">
              <div className="trade-col">
                <h4>You give</h4>
                <label className="srow">
                  <span>Cash</span>
                  <input type="number" min={0} value={giveCash} onChange={(e) => setGiveCash(Number(e.target.value))} />
                </label>
                <label className="srow">
                  <span>Jail cards</span>
                  <input type="number" min={0} value={giveJail} onChange={(e) => setGiveJail(Number(e.target.value))} />
                </label>
                <div className="trade-tiles">
                  {myTiles.map((t) => (
                    <label key={t.id} className="trade-tile">
                      <input
                        type="checkbox"
                        checked={giveTiles.includes(t.id)}
                        onChange={() => toggle(giveTiles, setGiveTiles, t.id)}
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="trade-col">
                <h4>You receive{partnerPlayer ? ` from ${partnerPlayer.name}` : ''}</h4>
                <label className="srow">
                  <span>Cash</span>
                  <input type="number" min={0} value={recvCash} onChange={(e) => setRecvCash(Number(e.target.value))} />
                </label>
                <label className="srow">
                  <span>Jail cards</span>
                  <input type="number" min={0} value={recvJail} onChange={(e) => setRecvJail(Number(e.target.value))} />
                </label>
                <div className="trade-tiles">
                  {theirTiles.map((t) => (
                    <label key={t.id} className="trade-tile">
                      <input
                        type="checkbox"
                        checked={recvTiles.includes(t.id)}
                        onChange={() => toggle(recvTiles, setRecvTiles, t.id)}
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button className="primary" onClick={propose}>
              {counteringId ? 'Send counter-offer' : 'Send offer'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
