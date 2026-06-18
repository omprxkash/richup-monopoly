import { useState } from 'react';
import { actions, useStore } from '../net/socket';

export function Chat() {
  const { chat, me } = useStore();
  const [text, setText] = useState('');

  const send = () => {
    const t = text.trim();
    if (!t) return;
    actions.chat(t);
    setText('');
  };

  return (
    <div className="chat">
      <h4>Chat</h4>
      <div className="chat-msgs">
        {chat.map((m) => (
          <div key={m.id} className={'chat-msg' + (m.from === me ? ' mine' : '')}>
            <span className="chat-name">{m.name}:</span> {m.text}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          value={text}
          placeholder="Say something…"
          maxLength={200}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className="secondary" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}
