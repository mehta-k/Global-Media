import { Router } from 'express';
import { db } from '../db.js';
import { publicUser } from '../db.js';
import { serializePost } from '../serialize.js';

const router = Router();

// Search posts + users + trending hashtags
router.get('/', (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase();
  const data = db.all();

  let posts = data.posts;
  if (q) {
    posts = posts.filter((p) => p.content.toLowerCase().includes(q));
  }
  posts = posts
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 30)
    .map((p) => serializePost(p, req.userId));

  let users = [];
  if (q) {
    users = data.users
      .filter((u) => u.username.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q))
      .slice(0, 10)
      .map((u) => publicUser(u, req.userId));
  }

  // Trending hashtags from post content
  const tagCounts = {};
  data.posts.forEach((p) => {
    const tags = p.content.match(/#\w+/g) || [];
    tags.forEach((t) => {
      const key = t.toLowerCase();
      tagCounts[key] = (tagCounts[key] || 0) + 1;
    });
  });
  const trends = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  res.json({ posts, users, trends });
});

export default router;
