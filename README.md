

# InterviewFlow — Full-stack interview platform.



InterviewFlow is a full‑stack collaborative coding platform designed as a production‑oriented project: session persistence, authenticated users, real‑time collaboration, chat, and an extensible code‑execution integration. It is intended as a buildable, maintainable project that demonstrates system design, engineering trade‑offs, and deployment readiness.

Project status: Active — development and polish in progress.

## Project overview

InterviewFlow provides a collaborative environment for technical interviews where participants:
- create and persist interview sessions,
- edit code together in real time (Monaco Editor + Socket.io),
- chat inside the session,
- preview local video, and
- run code via an external execution service (pluggable: mocked, public Piston, self‑hosted Piston, or Judge0).

This repository is structured as a real project (not just a toy demo): it has backend services, database migrations (Prisma), developer scripts, and containerization-ready artifacts.

Why this is a project (not a throwaway demo)
- Design decisions are explicit (JWT auth, Prisma ORM, externalized execution for safety).
- Infrastructure and deployment are considered: Docker + nginx patterns are supported and the codebase is structured for maintainability and testing.
- The execution layer is pluggable and separated from the app to avoid unsafe sandboxing inside the primary process.

---

## Motivation & goals

Primary objective
- Build a robust, extensible collaborative coding platform that showcases practical engineering skills across frontend, backend, realtime systems, storage, and deployment.

Secondary objectives
- Keep the architecture production-approachable (easy to replace SQLite with Postgres, use managed execution providers, add CI/CD).
- Maintain good developer experience (clear env, migrations, dev scripts).
- Produce a project that can be shown to recruiters/engineering managers with minimal setup.

---

## Key features

- User authentication (register / login) using JWT
- Create, list, and open persistent interview sessions
- Real‑time collaborative editing (Monaco Editor) via Socket.io rooms
- In‑session chat messages (Socket.io)
- Local video preview (getUserMedia) and foundation for WebRTC signaling
- Pluggable code execution: mocked by default; can connect to Piston/Judge0 or a self‑hosted executor
- Prisma for DB modeling and migrations
- Developer scripts for common tasks (migrations, dev server)

---

## Architecture & components

- Frontend (Vite + React)
  - Monaco editor integration
  - Socket.io client for real-time events
  - Auth UI and session management
- Backend (Node.js + Express)
  - REST endpoints for auth and session persistence
  - Socket.io server for real‑time collaboration and signaling
  - Executor module (external execution adapter / mock)
- Database
  - Prisma ORM; local SQLite for development with migration files
- Optional infra
  - Piston (execution) — public, self‑hosted, or other providers
  - nginx for reverse proxy and API‑key enforcement (when self‑hosting executor)

High-level flow
1. User authenticates → receives JWT
2. User creates/opens a session → backend persists session via Prisma
3. On session open, client connects to Socket.io and joins session room
4. Editor and chat events are broadcast to room members
5. Run code → backend forwards code to configured executor (mock or remote) and returns stdout/stderr

---

## Getting started (development)

Prereqs
- Node.js 18+ and npm
- git
- (Optional) Docker & docker-compose for containerized workflow

Clone and install
```bash
git clone https://github.com/<your-username>/InterviewFlow.git
cd InterviewFlow/backend
cp .env.example .env
# inspect .env and change secrets if desired
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Frontend (in new terminal)
```bash
cd ../frontend
cat > .env.local <<'EOF'
VITE_API_BASE=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
EOF
npm install
npm run dev
```

Open the frontend URL printed by Vite (commonly http://localhost:5173). Register/login, create a session and open it to see the editor and chat.

---

## Running a local (developer) demo

- For fast, safe demos keep execution mocked:
  - In `backend/.env` ensure:
    ```
    PISTON_URL=
    PISTON_KEY=
    ```
  - Restart backend — runs return a mock output.

- To enable real execution (for repeatable demos):
  - Option A: Use public Piston (may be rate-limited)
    ```
    PISTON_URL=https://emkc.org/api/v2/piston/execute
    PISTON_KEY=
    ```
  - Option B: Self‑host Piston behind nginx and enforce an API key:
    - Deploy Piston (official image), put nginx in front to enforce X-API-Key or Authorization header and set `PISTON_URL` to the nginx endpoint and `PISTON_KEY` to the generated key.
  - Restart backend to apply changes.

---

## Configuration & environment variables

Backend (.env)
- PORT=4000
- JWT_SECRET=<your_jwt_secret>
- DATABASE_URL="file:./dev.db"
- PISTON_URL=         # leave empty for mock executor
- PISTON_KEY=         # optional (for self-hosted executor)

Frontend (.env.local)
- VITE_API_BASE=http://localhost:4000
- VITE_SOCKET_URL=http://localhost:4000

---

## Testing & quality

Unit & integration
- Add unit tests for critical logic (auth helpers, executor adapter).
- Add integration tests for REST endpoints and socket interactions (e.g., using supertest and socket.io-client).

Suggested quick checks
- API health: `curl http://localhost:4000/health`
- Auth: register/login endpoints, ensure token returned
- Socket: open two browser windows and confirm code and chat events sync

---

## Deployment (recommended approach)

A minimal production deployment:
- Replace SQLite with Postgres (update `DATABASE_URL`)
- Deploy backend to a container host (Render, Heroku, AWS ECS, or a VPS)
- Serve the built frontend as a static site (Vercel/Netlify) or via nginx
- For execution:
  - Prefer a managed provider (Judge0 cloud) OR self‑host Piston behind nginx with API key enforcement
  - Never execute untrusted code inside the primary backend process

Example steps
1. Build & push Docker images (backend & frontend)
2. Configure managed DB for production
3. Set environment variables (JWT_SECRET, DATABASE_URL, PISTON_URL/KEY)
4. Run migrations: `prisma migrate deploy`
5. Scale and monitor logs/metrics

---

## Security & operational notes

- Execution isolation: externalize code execution to sandboxed service (Piston/Judge0) to avoid running untrusted code in the main app.
- JWT secrets: rotate in production and use a secret management solution.
- CORS & sockets: configure origins for production to avoid overly permissive settings.
- Rate limiting: apply rate limits to auth and executor endpoints to avoid abuse.
- Monitoring: collect logs for socket events and executor failures; instrument for errors.

---

## Contributing

Contributions are welcome. Suggested workflow:
1. Fork the repository
2. Create a feature branch `git checkout -b feat/short-description`
3. Run tests locally and implement changes
4. Open a pull request with a descriptive title and what you changed

Areas where contributions are especially useful
- Add tests and CI pipeline
- Replace SQLite with Postgres in examples and platform scripts
- Add a problem library UI and timed session support
- Full WebRTC two‑way video using STUN/TURN configuration

---

## Roadmap

Planned improvements
- Full WebRTC peer-to-peer video with STUN/TURN and TURN server support
- Role‑based participants (interviewer / candidate) and permissions
- Export session artifacts (zip/gist) and session replay
- Production deployment scripts (Terraform / Docker Compose for production)
- CI + automated end‑to‑end tests



## Author & contact

Author: yukthapriya  
GitHub: https://github.com/yukthapriya  
Email: use the contact details on my GitHub profile

Test screenshot 1  
![Test 1](frontend/screenshots/test%201.png)

Test screenshot 2  
![Test 2](frontend/screenshots/test%202.png)

Test screenshot 3  
![Test 3](frontend/screenshots/test%203.png)
## A note for reviewers

If you run into any environment issues, check the `backend/.env` file for `DATABASE_URL` and `JWT_SECRET`, and confirm the backend is running before starting the frontend. If you’d like, I can add a `docker-compose.yml` that runs the full stack for a one‑command local deployment — open an issue or PR and I’ll include it.
