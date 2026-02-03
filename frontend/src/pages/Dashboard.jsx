import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/api';

export default function Dashboard({ user, token, onSignOut, onOpenSession }) {
  const client = apiClient(token);
  const [sessions, setSessions] = useState([]);
  const [title, setTitle] = useState('');

  async function load() {
    try {
      const res = await client.get('/sessions');
      setSessions(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function create() {
    try {
      const res = await client.post('/sessions', { title: title || 'Interview Session' });
      load();
      onOpenSession(res.data);
    } catch (err) {
      alert('Could not create session');
    }
  }

  useEffect(()=>{ load(); }, []);

  return (
    <div className="dashboard">
      <header>
        <h2>Welcome, {user?.name || user?.email}</h2>
        <div>
          <button onClick={onSignOut}>Sign Out</button>
        </div>
      </header>
      <section className="create-session">
        <input placeholder="Session title" value={title} onChange={e=>setTitle(e.target.value)} />
        <button onClick={create}>Create Session</button>
      </section>
      <section className="sessions-list">
        <h3>Recent Sessions</h3>
        <ul>
          {sessions.map(s => (
            <li key={s.id}>
              <div>
                <strong>{s.title}</strong> <small>#{s.id}</small>
              </div>
              <div>
                <button onClick={() => onOpenSession(s)}>Open</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
