import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { serializeMessage } from '../serialize.js';

const router = Router();

function nextId(collection) {
  const items = db.all()[collection];
  return items.length ? Math.max(...items.map((x) => x.id)) + 1 : 1;
}

// List my conversations
router.get('/', authMiddleware, (req, res) => {
  const conversations = db
    .all()
    .conversations.filter((c) => c.participants.includes(req.userId))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((c) => decorateConversation(c, req.userId));
  res.json({ conversations });
});

// Create a conversation with another user
router.post('/', authMiddleware, (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });
  const other = db.getUserByUsername(username);
  if (!other) return res.status(404).json({ error: 'User not found' });
  if (other.id === req.userId) return res.status(400).json({ error: 'Cannot message yourself' });

  const existing = db
    .all()
    .conversations.find(
      (c) => c.participants.includes(req.userId) && c.participants.includes(other.id)
    );
  if (existing) {
    return res.json({ conversation: decorateConversation(existing, req.userId) });
  }

  const conversation = {
    id: nextId('conversations'),
    participants: [req.userId, other.id],
    lastMessage: '',
    unread: 0,
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.insert('conversations', conversation);
  res.status(201).json({ conversation: decorateConversation(conversation, req.userId) });
});

// Messages in a conversation
router.get('/:id/messages', authMiddleware, (req, res) => {
  const conversation = db.find('conversations', (c) => c.id === Number(req.params.id));
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  if (!conversation.participants.includes(req.userId)) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  const messages = db
    .all()
    .messages.filter((m) => m.conversationId === conversation.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(serializeMessage);
  res.json({ messages });
});

// Send a message
router.post('/:id/messages', authMiddleware, (req, res) => {
  const conversation = db.find('conversations', (c) => c.id === Number(req.params.id));
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  if (!conversation.participants.includes(req.userId)) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Message text is required' });

  const message = {
    id: nextId('messages'),
    conversationId: conversation.id,
    senderId: req.userId,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    read: false
  };
  db.insert('messages', message);

  conversation.lastMessage = message.text;
  conversation.updatedAt = message.createdAt;
  const otherId = conversation.participants.find((p) => p !== req.userId);
  conversation.unread = (conversation.unread || 0) + 1;
  db.update('conversations', conversation.id, conversation);

  res.status(201).json({ message: serializeMessage(message) });
});

// Mark conversation read
router.post('/:id/read', authMiddleware, (req, res) => {
  const conversation = db.find('conversations', (c) => c.id === Number(req.params.id));
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  if (!conversation.participants.includes(req.userId)) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  conversation.unread = 0;
  db.update('conversations', conversation.id, conversation);
  const data = db.all();
  data.messages
    .filter((m) => m.conversationId === conversation.id && m.senderId !== req.userId)
    .forEach((m) => {
      m.read = true;
    });
  db.save(data);
  res.json({ success: true });
});

// Toggle pin
router.post('/:id/pin', authMiddleware, (req, res) => {
  const conversation = db.find('conversations', (c) => c.id === Number(req.params.id));
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  if (!conversation.participants.includes(req.userId)) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  conversation.pinned = !conversation.pinned;
  db.update('conversations', conversation.id, conversation);
  res.json({ conversation: decorateConversation(conversation, req.userId) });
});

function decorateConversation(conversation, viewerId) {
  const otherId = conversation.participants.find((p) => p !== viewerId);
  const other = db.find('users', (u) => u.id === otherId);
  const messages = db.all().messages.filter((m) => m.conversationId === conversation.id);
  const last = messages[messages.length - 1];
  return {
    id: conversation.id,
    name: other ? other.fullName : 'Unknown',
    username: other ? other.username : null,
    emoji: other ? other.emoji : '👤',
    avatar: other ? other.avatar : null,
    lastMessage: conversation.lastMessage || (last ? last.text : 'No messages yet'),
    unread: conversation.unread || 0,
    pinned: conversation.pinned || false,
    updatedAt: conversation.updatedAt
  };
}

export default router;
