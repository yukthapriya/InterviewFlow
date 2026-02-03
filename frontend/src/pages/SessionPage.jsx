import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { apiClient } from '../api/api';
import CodeEditorPanel from '../components/CodeEditorPanel';
import ChatPanel from '../components/ChatPanel';
import VideoPanel from '../components/VideoPanel';

export default function SessionPage({ session, user, token, onExit }) {
  const [socket, setSocket] = useState(null);
  const clientRef = useRef(apiClient(token));
  const [code, setCode] = useState(session.code || '');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const s = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000');
    setSocket(s);
    s.emit('joinSession', { sessionId: session.id, user });
    s.on('chatMessage', (m) => setMessages(prev => [...prev, m]));
    s.on('codeChange', ({ code }) => setCode(code));
    return () => {
      s.emit('leaveSession', { sessionId: session.id, user });
      s.disconnect();
    };
  }, []);

  async function persistCode(newCode) {
    setCode(newCode);
    if (socket) socket.emit('codeChange', { sessionId: session.id, code: newCode });
    try {
      await clientRef.current.put('/sessions/' + session.id + '/code', { code: newCode });
    } catch (err) { /* ignore for demo */ }
  }

  async function executeCode(language='python') {
    try {
      const res = await clientRef.current.post('/sessions/' + session.id + '/execute', { language, code });
      alert('Output:\\n' + (res.data.stdout || res.data.stderr || 'No output'));
    } catch (err) {
      alert('Execution failed');
    }
  }

  return (
    <div className="session-page">
      <header>
        <h2>{session.title} — #{session.id}</h2>
        <div>
          <button onClick={onExit}>Exit</button>
          <button onClick={() => executeCode('python')}>Run (Python)</button>
        </div>
      </header>

      <main className="session-grid">
        <CodeEditorPanel code={code} onChange={persistCode} />
        <div className="side-column">
          <VideoPanel socket={socket} user={user} />
          <ChatPanel messages={messages} onSend={(msg)=>socket?.emit('chatMessage', { sessionId: session.id, message: msg, user })} />
        </div>
      </main>
    </div>
  );
}
