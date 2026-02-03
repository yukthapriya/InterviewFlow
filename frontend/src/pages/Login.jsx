import React, { useState } from 'react';
import { apiClient } from '../api/api';

export default function Login({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');

  async function submit(e) {
    e.preventDefault();
    const client = apiClient();
    try {
      const res = await client.post('/auth/' + (mode === 'login' ? 'login' : 'register'), { email, password, name: email.split('@')[0] });
      onAuth(res.data.token, res.data.user);
    } catch (err) {
      alert(err?.response?.data?.error || 'Auth failed');
    }
  }

  return (
    <div className="auth-wrap">
      <h1>InterviewFlow</h1>
      <form onSubmit={submit} className="auth-form">
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit">{mode === 'login' ? 'Sign in' : 'Register'}</button>
      </form>
      <div className="auth-switch">
        <button onClick={()=>setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create account' : 'Have an account? Sign in'}</button>
      </div>
    </div>
  );
}
