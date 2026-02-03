# InterviewFlow

# InterviewFlow — demo-ready full-stack interview platform (React + Node + Prisma + Socket.io).

# InterviewFlow

InterviewFlow — a collaborative, real‑time coding interview platform built as a full‑stack demo.  
Designed to showcase practical engineering skills (real‑time systems, auth, infra, and execution sandboxing) for recruiters and interviewers.

Live demo: (none) — See "Local demo" below to run locally.

---

## Elevator pitch (one line)
A lightweight collaborative coding interview tool with real‑time code sync, chat, and (optional) remote code execution — ideal for live technical interviews and take‑home review.

Why this is recruiter‑friendly
- Demonstrates end‑to‑end engineering: frontend, backend, DB, realtime (socket.io), and integrations.
- Covers important production concerns: auth (JWT), DB migrations (Prisma), execution isolation (external executor or mocked), and developer experience (Docker, scripts).
- Easy to run locally for a quick demo during screening calls.

---

## Tech stack
- Frontend: React (Vite) + @monaco-editor/react + socket.io-client
- Backend: Node.js + Express + Socket.io
- Database: SQLite (Prisma ORM)
- Code execution (optional): Piston (public or self‑hosted) or mocked executor
- Dev infra: nodemon, Docker (optional), nginx (for proxying/self‑hosted piston)
- Languages: JavaScript (Node & React)

---

## Key features
- User auth (register / login) using JWT
- Create, list, open interview sessions
- Real‑time collaborative code editing (socket.io + Monaco Editor)
- Chat within a session
- Local video preview (getUserMedia) with scaffolding for WebRTC signaling
- Code execution API (mocked by default; can be wired to Piston or Judge0)
- Persisted sessions via Prisma + SQLite

What this demonstrates to recruiters
- Real‑time systems and synchronization
- Full‑stack engineering and pragmatic choices
- Secure-ish execution architecture (delegates exec to external service)
- Developer ergonomics (env, migrations, docker-ready)

---

## Repo structure (high level)
- backend/
  - src/ — Express server, routes, socket.io, executor
  - prisma/ — Prisma schema
  - .env.example
- frontend/
  - src/ — React app, pages, components
  - index.html, .env.local (Vite)
- README.md — this file

---

## Quick local demo (5–10 minutes)

Prerequisites
- Node.js 18+ and npm
- (Optional) Docker & docker-compose for a full stack container demo
- (Optional) ngrok for exposing to the internet

1. Start the backend
```bash
cd InterviewFlow/backend
cp .env.example .env
# edit .env if you want to enable real executor (PISTON_URL / PISTON_KEY)
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

2. Start the frontend
```bash
# in a new terminal
cd InterviewFlow/frontend
cat > .env.local <<'EOF'
VITE_API_BASE=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
EOF
npm install
npm run dev
```

3. Open the app
- Visit the Vite URL (usually http://localhost:5173)
- Register / Login → Create a session → Open session
- To demo collaboration: open the same session in another browser or Incognito and login again

4. Run code
- Click "Run (Python)" on the Session page:
  - If `PISTON_URL` is NOT set in backend/.env → a safe mocked output is returned
  - To enable real execution, set `PISTON_URL` to a working executor (e.g. public Piston) or self‑host Piston and set `PISTON_KEY` if required, then restart backend.

---

## Useful CLI commands (for reviewers / testers)

Register a user:
```bash
curl -s -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123","name":"Demo"}'
```

Login and extract token (bash/sed):
```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}' \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
echo "$TOKEN"
```

Create a session:
```bash
curl -s -X POST http://localhost:4000/api/sessions \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer ${TOKEN}" \
 -d '{"title":"Interview Demo"}'
```

Execute code (session id 1):
```bash
curl -s -X POST http://localhost:4000/api/sessions/1/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"language":"python","code":"print(2+3)"}'
```

---

## Dev notes / environment variables

Backend (.env)
- PORT=4000
- JWT_SECRET=change_me_for_demo
- DATABASE_URL="file:./dev.db"
- PISTON_URL=    # leave empty to use mocked executor
- PISTON_KEY=    # optional (used if your executor requires a key)

Frontend (.env.local)
- VITE_API_BASE=http://localhost:4000
- VITE_SOCKET_URL=http://localhost:4000

---

## Execution service options
- Mocked (default): safest for interviews — no external network required.
- Public Piston endpoint: set PISTON_URL to `https://emkc.org/api/v2/piston/execute` (may be rate-limited/unreliable).
- Self‑hosted Piston + nginx: recommended for repeated demos. You can place nginx in front to enforce a API key (set PISTON_KEY in `.env`) and configure executor to send `Authorization` or `X-API-Key` headers.
- Judge0 or paid services: adapt executor to target their API and keys.

---

## Troubleshooting quick list
- 401 Invalid token: make sure the token exists (localStorage key `if_token`) and use `Authorization: Bearer <token>`.
- Socket issues: ensure VITE_SOCKET_URL matches backend and both servers are reachable (CORS configured).
- Port in use: kill existing process on 4000 or change PORT in `.env`.
- Executor errors: check backend logs — executor prints request/response; ensure PISTON_URL is reachable if enabled.

---

## How to present this to recruiters/interviewers (2‑minute demo script)
1. "I'll create a session and invite you — this persists a session record to the DB."
2. "When you open the session we establish a socket room for real‑time updates."
3. "Watch the editor and chat — changes propagate instantly between collaborators."
4. "Now I'll run the code (either mocked or via a secure execution service) — output appears here."
5. "We can persist the final code, export or review it later. Tech highlights: socket.io for realtime, Prisma for DB, externalized execution for safety."

Talking points / skills to call out
- Real-time engineering (socket rooms, events)
- API design & authentication (JWT)
- Pragmatic persistence (Prisma + SQLite for demo; easy to switch to Postgres)
- Safe execution architecture (delegating to a sandboxed executor)
- Infra readiness: Dockerizable, and easy to expose via ngrok or deploy to Render/Vercel

---

## Next improvements (good talking points)
- Add STUN/TURN + full WebRTC peer connections for two‑way video
- Add persistent participant presence with roles (interviewer/candidate)
- Build a problem library and timed sessions
- Add CI, unit tests, and e2e tests for the critical workflow
- Replace SQLite with Postgres for production and add RBAC


## Author / Contact
Project by: yukthapriya  
GitHub: https://github.com/yukthapriya

If you want, I can:
- Add a Docker Compose for a single-command local demo (backend + piston + nginx + static frontend).
- Add a deploy guide for Render/Vercel.
- Create a short README tailored for non‑technical recruiters (one‑page pitch + screenshots).

Tell me which of the above you'd like next and I will add it (Docker compose, deploy guide, or recruiter one‑pager).
