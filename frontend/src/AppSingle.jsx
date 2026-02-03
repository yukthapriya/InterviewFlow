import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import io from 'socket.io-client'
import Editor from '@monaco-editor/react'

/**
 * Single-file frontend app containing:
 * - App (routing + auth)
 * - Header
 * - Login
 * - Dashboard (list/create sessions)
 * - SessionPage (editor, chat, video, output)
 * - CodeEditorPanel, ChatPanel, VideoPanel, OutputPanel
 *
 * No external apiClient dependency: uses fetch() against API_BASE (see API_BASE below).
 * Requires Tailwind (optional) and @monaco-editor/react + socket.io-client installed.
 */

/* ---------- Config / helpers ---------- */
const API_BASE = (import.meta.env.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace(/\/$/, '') : 'http://localhost:4000') + '/api'
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (API_BASE.replace(/\/api$/, '') || 'http://localhost:4000')

async function apiFetch(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch (e) { json = { text } }
  if (!res.ok) {
    const err = new Error(json?.error || json?.message || `HTTP ${res.status}`)
    err.response = { status: res.status, data: json }
    throw err
  }
  return json
}

/* ---------- UI Components ---------- */

function Header({ user, onSignOut }) {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-accent-500 font-bold text-xl">InterviewFlow</div>
          <div className="text-sm text-gray-500">Collaborative coding</div>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="text-sm text-gray-600">{user.name || user.email}</div>
              <button onClick={onSignOut} className="px-3 py-1 border rounded-md text-sm">Sign out</button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  )
}

/* Login component */
function Login({ onAuth }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register'
      const res = await apiFetch(path, 'POST', { email, password, name: email.split('@')[0] })
      const { token, user } = res
      try { localStorage.setItem('if_token', token); localStorage.setItem('if_user', JSON.stringify(user)) } catch (e) {}
      onAuth(token, user)
    } catch (error) {
      setErr(error?.response?.data?.error || error?.message || 'Auth failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-accent-500">InterviewFlow</h1>
          <p className="text-sm text-gray-500 mt-1">{mode === 'login' ? 'Sign in to continue' : 'Create a new account'}</p>
        </div>

        {err && <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{err}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Email</label>
            <input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-200" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Password</label>
            <input required type="password" value={password} onChange={(e)=>setPassword(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-200" />
          </div>

          <div className="flex items-center justify-between">
            <button type="submit" disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-md">
              {loading ? 'Working…' : (mode==='login' ? 'Sign in' : 'Create account')}
            </button>

            <button type="button" onClick={()=>{ setMode(mode==='login'?'register':'login'); setErr(null) }} className="text-sm text-gray-600 hover:underline">
              {mode==='login' ? 'Create account' : 'Have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* Dashboard */
function Dashboard({ token, user, onOpenSession }) {
  const [sessions, setSessions] = useState([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await apiFetch('/sessions', 'GET', null, token)
      setSessions(res || [])
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }

  async function create() {
    try {
      const res = await apiFetch('/sessions', 'POST', { title: title || 'Interview Session' }, token)
      setTitle('')
      onOpenSession && onOpenSession(res)
      load()
    } catch (e) { alert('Could not create session') }
  }

  useEffect(()=>{ load() }, [])

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Welcome, {user?.name || user?.email}</h1>
          <p className="text-sm text-gray-500">Your recent interview sessions</p>
        </div>
      </header>

      <section className="mb-6 bg-white rounded-xl shadow p-4">
        <div className="flex gap-3">
          <input placeholder="Session title" value={title} onChange={(e)=>setTitle(e.target.value)}
            className="flex-1 border rounded-md px-3 py-2" />
          <button onClick={create} className="px-4 py-2 bg-accent-500 text-white rounded-md">Create Session</button>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-4">
        <h3 className="text-lg font-medium mb-3">Recent Sessions</h3>
        {loading ? <div className="text-sm text-gray-500">Loading…</div> : (
          sessions.length === 0 ? <div className="text-sm text-gray-400">No sessions yet.</div> :
          <ul className="space-y-2">
            {sessions.map(s => (
              <li key={s.id} className="flex items-center justify-between p-3 border rounded-md hover:shadow-sm">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-gray-400">#{s.id} • {new Date(s.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>onOpenSession && onOpenSession(s)} className="px-3 py-1 text-sm border rounded-md">Open</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/* CodeEditorPanel - thin controlled monaco wrapper */
function CodeEditorPanel({ value = '', onChange = ()=>{}, language = 'python', height = '70vh' }) {
  return (
    <div className="editor-panel w-full h-full">
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={(v)=>onChange(v ?? '')}
        options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }}
        theme="vs-light"
      />
    </div>
  )
}

/* ChatPanel */
function ChatPanel({ messages = [], onSend = ()=>{}, user = null }) {
  const [text, setText] = useState('')
  const ref = useRef(null)
  useEffect(()=>{ const el = ref.current; if (el) el.scrollTop = el.scrollHeight }, [messages.length])
  function send() {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }
  function nameOf(m){ return m?.user?.name || m?.user?.email || m?.author || 'Anon' }
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">Chat</h4>
        <div className="text-xs text-gray-400">Live</div>
      </div>

      <div ref={ref} className="bg-gray-50 border border-gray-100 rounded-md p-3 max-h-48 overflow-auto space-y-3">
        {messages.length===0 && <div className="text-sm text-gray-400">No messages yet.</div>}
        {messages.map((m,i)=>(
          <div key={i} className={`flex ${user && m.user && ((user.id && m.user.id === user.id) || (user.email === m.user.email)) ? 'justify-end' : 'justify-start'}`}>
            {!((user && m.user && ((user.id && m.user.id === user.id) || (user.email === m.user.email)))) &&
              <div className="w-8 h-8 mr-2 bg-gray-300 rounded-full flex items-center justify-center text-xs text-white">{String(nameOf(m)[0]||'?').toUpperCase()}</div>
            }
            <div className="rounded-lg px-3 py-2 bg-white shadow-sm max-w-[80%]">
              <div className="text-xs text-gray-500 mb-1"><strong className="text-sm">{nameOf(m)}</strong> <span className="ml-2 text-[11px] text-gray-400">{new Date(m.ts||m.createdAt||Date.now()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div>
              <div className="text-sm whitespace-pre-wrap">{m.message}</div>
            </div>
            { (user && m.user && ((user.id && m.user.id === user.id) || (user.email === m.user.email))) &&
              <div className="w-8 h-8 ml-2 bg-indigo-600 rounded-full flex items-center justify-center text-xs text-white">{String(nameOf(m)[0]||'Y').toUpperCase()}</div>
            }
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <textarea value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send() } }}
          rows={1}
          className="flex-1 resize-none border rounded-md px-3 py-2 text-sm"
          placeholder="Message..." />
        <button onClick={send} className={`px-3 py-2 rounded-md text-sm ${text.trim() ? 'bg-accent-500 text-white' : 'bg-gray-100 text-gray-400'}`}>Send</button>
      </div>
    </div>
  )
}

/* OutputPanel */
function OutputPanel({ stdout = '', stderr = '' }) {
  const output = stdout || stderr || ''
  function copy() { navigator.clipboard?.writeText(output) }
  function download() {
    const blob = new Blob([output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'output.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-2"><h4 className="font-medium">Output</h4><div className="text-xs text-gray-400">Run result</div></div>
      <pre className="output-pre" style={{minHeight:120}}>{output || 'No output yet.'}</pre>
      <div className="flex items-center gap-2 mt-3"><button onClick={copy} className="px-3 py-1 border rounded-md text-sm">Copy</button><button onClick={download} className="px-3 py-1 border rounded-md text-sm">Download</button></div>
      {stderr ? <div className="mt-3 text-sm text-red-600"><strong>Error:</strong> {stderr}</div> : null}
    </div>
  )
}

/* VideoPanel - minimal local preview + controls */
function VideoPanel({ user = {}, autoStart = true }) {
  const localRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [isSharing, setIsSharing] = useState(false)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(()=>{ if (autoStart) startLocalPreview(); return stopLocalStream }, [])

  async function startLocalPreview() {
    setLoading(true); setError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(s); if (localRef.current) localRef.current.srcObject = s
      setIsSharing(true); setVideoEnabled(Boolean(s.getVideoTracks().length)); setAudioEnabled(Boolean(s.getAudioTracks().length))
    } catch (e) { setError('Camera/microphone unavailable') } finally { setLoading(false) }
  }
  function stopLocalStream() { if (stream) stream.getTracks().forEach(t=>{ try{t.stop()}catch(e){} }); setStream(null); setIsSharing(false); setVideoEnabled(false); setAudioEnabled(false) }
  function toggleVideo(){ if (!stream) return; const v = stream.getVideoTracks(); if (!v.length) return; v.forEach(t=>t.enabled=!t.enabled); setVideoEnabled(v.some(t=>t.enabled)) }
  function toggleAudio(){ if (!stream) return; const a = stream.getAudioTracks(); if (!a.length) return; a.forEach(t=>t.enabled=!t.enabled); setAudioEnabled(a.some(t=>t.enabled)) }

  return (
    <div>
      <div className="flex items-center justify-between mb-2"><h4 className="font-medium">Video</h4><div className="text-xs text-gray-400">{user?.name||'Local preview'}</div></div>
      <div className="bg-white rounded-xl shadow-sm p-3">
        <div className="w-full bg-black rounded-md overflow-hidden" style={{minHeight:140}}>
          <video ref={localRef} autoPlay playsInline muted className="w-full h-36 object-cover bg-black" />
          {!isSharing && !loading && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-300">Camera is off</div>}
          {loading && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-300">Starting…</div>}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={toggleVideo} className="inline-flex items-center gap-2 px-3 py-1 rounded-md border text-sm">{videoEnabled ? 'Camera On' : 'Camera Off'}</button>
          <button onClick={toggleAudio} className="inline-flex items-center gap-2 px-3 py-1 rounded-md border text-sm">{audioEnabled ? 'Mic On' : 'Mic Off'}</button>
          <button onClick={isSharing ? stopLocalStream : startLocalPreview} className={`ml-auto px-3 py-1 rounded-md text-sm ${isSharing ? 'bg-red-600 text-white' : 'bg-accent-500 text-white'}`}>{isSharing ? 'Stop' : 'Start'}</button>
        </div>
        {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
      </div>
    </div>
  )
}

/* ---------- SessionPage (uses sockets + editor + panels) ---------- */
function SessionPage({ token, user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const clientRef = useRef({ token })
  const socketRef = useRef(null)

  const [session, setSession] = useState(null)
  const [code, setCode] = useState('')
  const [messages, setMessages] = useState([])
  const [output, setOutput] = useState({ stdout:'', stderr:'' })
  const [running, setRunning] = useState(false)
  const persistTimer = useRef(null)

  useEffect(()=>{
    async function load() {
      try {
        const s = await apiFetch(`/sessions/${id}`, 'GET', null, token)
        setSession(s); setCode(s.code || '')
      } catch (e) { console.error(e); navigate('/', { replace:true }) }
    }
    load()
  }, [id, token, navigate])

  useEffect(()=> {
    if (!session) return
    const s = io(SOCKET_URL, { auth: { token } })
    socketRef.current = s
    s.on('connect', ()=> s.emit('joinSession', { sessionId: Number(id), user }))
    s.on('chatMessage', (m)=> setMessages(prev => [...prev, m]))
    s.on('codeChange', ({ code: newCode }) => setCode(cur => cur === newCode ? cur : newCode))
    s.on('executionResult', (res) => { setOutput({ stdout: res.stdout||'', stderr: res.stderr||'' }); setRunning(false) })
    return ()=> { try{ s.emit('leaveSession',{ sessionId: Number(id), user }); s.disconnect() }catch(e){} }
  }, [session, id, token, user])

  const persistCode = useCallback((newCode) => {
    setCode(newCode)
    if (socketRef.current) socketRef.current.emit('codeChange', { sessionId: Number(id), code: newCode })
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(()=>{ apiFetch(`/sessions/${id}/code`, 'PUT', { code: newCode }, token).catch(()=>{}) }, 600)
  }, [id, token])

  async function executeCode(language='python') {
    setRunning(true); setOutput({ stdout:'', stderr:'' })
    try {
      const res = await apiFetch(`/sessions/${id}/execute`, 'POST', { language, code }, token)
      setOutput({ stdout: res.stdout || res.run?.stdout || '', stderr: res.stderr || res.run?.stderr || '' })
      socketRef.current?.emit('executionResult', { sessionId: Number(id), stdout: res.stdout || res.run?.stdout || '', stderr: res.stderr || res.run?.stderr || '' })
    } catch (e) {
      setOutput({ stdout:'', stderr: e?.response?.data?.error || e?.message || 'Execution failed' })
    } finally { setRunning(false) }
  }

  if (!session) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">Loading session…</div></div>

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{session.title}</h2>
          <div className="text-sm text-gray-500">Session #{session.id}</div>
        </div>

        <div className="flex items-center gap-3">
          <select className="border rounded-md px-3 py-1 text-sm" defaultValue="python" id="lang-select">
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
          </select>

          <button onClick={()=> executeCode(document.getElementById('lang-select').value)} disabled={running} className={`inline-flex items-center gap-2 px-4 py-1 rounded-md text-white ${running ? 'bg-gray-400' : 'bg-accent-500 hover:bg-accent-600'}`}>{running ? 'Running…' : 'Run'}</button>
          <button onClick={()=> navigate('/')} className="px-3 py-1 border rounded-md text-sm">Back</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <main className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-xl shadow editor-area overflow-hidden">
            <CodeEditorPanel value={code} onChange={persistCode} language="python" height="70vh" />
          </div>
        </main>

        <aside className="col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <VideoPanel user={user} />
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <ChatPanel messages={messages} onSend={(msg)=> socketRef.current?.emit('chatMessage', { sessionId: Number(id), message: msg, user })} user={user} />
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <OutputPanel stdout={output.stdout} stderr={output.stderr} />
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ---------- Top-level App (handles auth + routes) ---------- */
function AppRoot() {
  const [token, setToken] = useState(localStorage.getItem('if_token') || null)
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('if_user')) } catch (e) { return null } })
  const navigate = useNavigate()

  function handleAuth(newToken, newUser) {
    setToken(newToken); setUser(newUser); localStorage.setItem('if_token', newToken); localStorage.setItem('if_user', JSON.stringify(newUser))
    navigate('/')
  }

  function signOut() {
    setToken(null); setUser(null); localStorage.removeItem('if_token'); localStorage.removeItem('if_user'); navigate('/login')
  }

  async function openSessionAndNavigate(s) {
    // s can be an object with id or id itself
    const id = (s && s.id) ? s.id : s
    navigate(`/sessions/${id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header user={user} onSignOut={signOut} />
      <Routes>
        <Route path="/login" element={ token ? <Navigate to="/" /> : <Login onAuth={handleAuth} /> } />
        <Route path="/" element={ token ? <Dashboard token={token} user={user} onOpenSession={openSessionAndNavigate} /> : <Navigate to="/login" /> } />
        <Route path="/sessions/:id" element={ token ? <SessionPage token={token} user={user} /> : <Navigate to="/login" /> } />
        <Route path="*" element={<Navigate to={token ? '/' : '/login'} />} />
      </Routes>
    </div>
  )
}

/* ---------- Mount if running standalone ---------- */
export default function AppSingle() {
  return (
    <BrowserRouter>
      <AppRoot />
    </BrowserRouter>
  )
}

/* If you want to mount this file directly in index.html, uncomment below: */
// const container = document.getElementById('root')
// if (container) { const root = createRoot(container); root.render(<AppSingle />) }