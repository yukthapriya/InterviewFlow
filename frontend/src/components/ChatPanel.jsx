import React, { useState } from 'react';

export default function ChatPanel({ messages, onSend }) {
  const [text, setText] = useState('');
  function send() {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  }
  return (
    <div className="chat-panel">
      <h4>Chat</h4>
      <div className="chat-list">
        {messages.map((m,i) => <div key={i} className="chat-item"><strong>{m.user?.name||m.user?.email}:</strong> {m.message}</div>)}
      </div>
      <div className="chat-input">
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={(e)=>e.key==='Enter' && send()} placeholder="Message..." />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
