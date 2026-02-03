const express = require('express');
const prisma = require('../utils/db');
const { authMiddleware } = require('../utils/auth');
const { executeCode } = require('../exec/executor');

const router = express.Router();

// Create session
router.post('/', authMiddleware, async (req, res) => {
  const { title } = req.body;
  const userId = req.user.id;
  const session = await prisma.session.create({ data: { title: title || 'Untitled Session', creatorId: userId }});
  res.json(session);
});

// List sessions
router.get('/', authMiddleware, async (req, res) => {
  const list = await prisma.session.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(list);
});

// Get single session
router.get('/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const session = await prisma.session.findUnique({ where: { id }});
  if (!session) return res.status(404).json({ error: 'Not found' });
  res.json(session);
});

// Update code (persist)
router.put('/:id/code', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const { code } = req.body;
  const session = await prisma.session.update({ where: { id }, data: { code }});
  res.json(session);
});

// Execute code
router.post('/:id/execute', authMiddleware, async (req, res) => {
  const { language = 'python', code = '', stdin = '' } = req.body;
  try {
    const result = await executeCode(language, code, stdin);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Execution failed', detail: err.message });
  }
});

module.exports = router;
