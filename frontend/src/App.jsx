import React, { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SessionPage from './pages/SessionPage';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('if_token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('if_user') || 'null'));

  function handleAuth(t, u) {
    setToken(t);
    setUser(u);
    localStorage.setItem('if_token', t);
    localStorage.setItem('if_user', JSON.stringify(u));
  }

  if (!token) return <Login onAuth={handleAuth} />;

  // Basic route selection by simple state for demo
  const [route, setRoute] = useState({ name: 'dashboard' });
  if (route.name === 'dashboard') return <Dashboard user={user} token={token} onSignOut={() => { localStorage.clear(); setToken(null); setUser(null); }} onOpenSession={(s)=>setRoute({name:'session', session:s})} />;
  if (route.name === 'session') return <SessionPage session={route.session} user={user} token={token} onExit={() => setRoute({name:'dashboard'})} />;
  return null;
}
