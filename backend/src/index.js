require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');

const prisma = require('./utils/db');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);

// Basic health
app.get('/health', (req, res) => res.json({ ok: true, name: 'InterviewFlow Backend' }));

// Socket.io for real-time features (chat, code sync, signaling)
const io = new Server(server, { cors: { origin: '*' }});

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('joinSession', ({ sessionId, user }) => {
    socket.join('session:' + sessionId);
    socket.to('session:' + sessionId).emit('userJoined', { socketId: socket.id, user });
  });

  socket.on('leaveSession', ({ sessionId, user }) => {
    socket.leave('session:' + sessionId);
    socket.to('session:' + sessionId).emit('userLeft', { socketId: socket.id, user });
  });

  socket.on('chatMessage', ({ sessionId, message, user }) => {
    io.to('session:' + sessionId).emit('chatMessage', { message, user, ts: Date.now() });
  });

  socket.on('codeChange', ({ sessionId, code }) => {
    socket.to('session:' + sessionId).emit('codeChange', { code });
  });

  // WebRTC signaling passthrough
  socket.on('signal', ({ sessionId, payload }) => {
    if (payload.to) {
      io.to(payload.to).emit('signal', payload);
    } else {
      socket.to('session:' + sessionId).emit('signal', payload);
    }
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log('InterviewFlow backend listening on port', PORT);
});
