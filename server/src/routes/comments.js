import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { serializeComment } from '../serialize.js';

const router = Router();

function nextId(collection) {
  const items = db.all()[collection];
  return items.length ? Math.max(...items.map((x) => x.id)) + 1 : 1;
}

// List comments for a post
router.get('/:id/comments', (req, res) => {
  const post = db.find('posts', (p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const comments = db
    .all()
    .comments.filter((c) => c.postId === post.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json({ comments: comments.map(serializeComment) });
});

// Add a comment (auth)
router.post('/:id/comments', authMiddleware, (req, res) => {
  const post = db.find('posts', (p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required' });
  }
  const comment = {
    id: nextId('comments'),
    postId: post.id,
    userId: req.userId,
    content: content.trim(),
    createdAt: new Date().toISOString()
  };
  db.insert('comments', comment);
  post.comments = (post.comments || 0) + 1;
  db.update('posts', post.id, post);
  res.status(201).json({ comment: serializeComment(comment) });
});

export default router;
