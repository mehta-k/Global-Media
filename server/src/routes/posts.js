import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { serializePost } from '../serialize.js';

const router = Router();

function nextId(collection) {
  const items = db.all()[collection];
  return items.length ? Math.max(...items.map((x) => x.id)) + 1 : 1;
}

// Feed: all posts (newest first). ?type=reel filters reels.
router.get('/', (req, res) => {
  const { type } = req.query;
  let posts = db.all().posts;
  if (type) posts = posts.filter((p) => (p.type || 'post') === type);
  posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ posts: posts.map((p) => serializePost(p, req.userId)) });
});

// Single post
router.get('/:id', (req, res) => {
  const post = db.find('posts', (p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json({ post: serializePost(post, req.userId) });
});

// Create post (auth)
router.post('/', authMiddleware, (req, res) => {
  const { content, image, type } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Post content is required' });
  }
  const post = {
    id: nextId('posts'),
    userId: req.userId,
    content: content.trim(),
    image: image || null,
    type: type || 'post',
    createdAt: new Date().toISOString(),
    timestamp: 'now',
    likes: 0,
    comments: 0,
    retweets: 0,
    likedBy: [],
    savedBy: [],
    retweetedBy: []
  };
  db.insert('posts', post);
  res.status(201).json({ post: serializePost(post, req.userId) });
});

// Delete own post (auth)
router.delete('/:id', authMiddleware, (req, res) => {
  const post = db.find('posts', (p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.userId !== req.userId) return res.status(403).json({ error: 'Not allowed' });
  db.remove('posts', (p) => p.id === post.id);
  res.json({ success: true });
});

// Toggle like
router.post('/:id/like', authMiddleware, (req, res) => {
  const post = db.find('posts', (p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  post.likedBy = post.likedBy || [];
  const idx = post.likedBy.indexOf(req.userId);
  if (idx === -1) {
    post.likedBy.push(req.userId);
    post.likes = (post.likes || 0) + 1;
  } else {
    post.likedBy.splice(idx, 1);
    post.likes = Math.max(0, (post.likes || 0) - 1);
  }
  db.update('posts', post.id, post);
  res.json({ post: serializePost(post, req.userId) });
});

// Toggle retweet
router.post('/:id/retweet', authMiddleware, (req, res) => {
  const post = db.find('posts', (p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  post.retweetedBy = post.retweetedBy || [];
  const idx = post.retweetedBy.indexOf(req.userId);
  if (idx === -1) {
    post.retweetedBy.push(req.userId);
    post.retweets = (post.retweets || 0) + 1;
  } else {
    post.retweetedBy.splice(idx, 1);
    post.retweets = Math.max(0, (post.retweets || 0) - 1);
  }
  db.update('posts', post.id, post);
  res.json({ post: serializePost(post, req.userId) });
});

// Toggle save
router.post('/:id/save', authMiddleware, (req, res) => {
  const post = db.find('posts', (p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  post.savedBy = post.savedBy || [];
  const idx = post.savedBy.indexOf(req.userId);
  if (idx === -1) {
    post.savedBy.push(req.userId);
  } else {
    post.savedBy.splice(idx, 1);
  }
  db.update('posts', post.id, post);
  res.json({ post: serializePost(post, req.userId) });
});

// Saved posts (auth)
router.get('/me/saved', authMiddleware, (req, res) => {
  const posts = db
    .all()
    .posts.filter((p) => p.savedBy?.includes(req.userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ posts: posts.map((p) => serializePost(p, req.userId)) });
});

export default router;
