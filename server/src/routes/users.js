import { Router } from 'express';
import { db, publicUser } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { serializePost } from '../serialize.js';

const router = Router();

function nextId(collection) {
  const items = db.all()[collection];
  return items.length ? Math.max(...items.map((x) => x.id)) + 1 : 1;
}

// Public profile by username
router.get('/:username', (req, res) => {
  const user = db.getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const posts = db
    .all()
    .posts.filter((p) => p.userId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({
    user: publicUser(user, req.userId),
    posts: posts.map((p) => serializePost(p, req.userId))
  });
});

// Update own profile (auth)
router.patch('/me', authMiddleware, (req, res) => {
  const user = db.find('users', (u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { fullName, bio, location, website, emoji, avatar, privateAccount, showMobile } = req.body;
  const patch = {};
  if (fullName !== undefined) patch.fullName = fullName;
  if (bio !== undefined) patch.bio = bio;
  if (location !== undefined) patch.location = location;
  if (website !== undefined) patch.website = website;
  if (emoji !== undefined) patch.emoji = emoji;
  if (avatar !== undefined) patch.avatar = avatar;
  if (privateAccount !== undefined) patch.privateAccount = privateAccount ? 1 : 0;
  if (showMobile !== undefined) patch.showMobile = showMobile ? 1 : 0;
  const updated = db.update('users', user.id, patch);
  res.json({ user: publicUser(updated, req.userId) });
});

// Follow / unfollow (auth)
router.post('/:username/follow', authMiddleware, (req, res) => {
  const target = db.getUserByUsername(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.userId) return res.status(400).json({ error: 'You cannot follow yourself' });

  const me = db.find('users', (u) => u.id === req.userId);
  me.followingList = me.followingList || [];
  target.followerList = target.followerList || [];

  const idx = me.followingList.indexOf(target.id);
  if (idx === -1) {
    me.followingList.push(target.id);
    target.followerList.push(me.id);
    me.following = me.followingList.length;
    target.followers = target.followerList.length;
  } else {
    me.followingList.splice(idx, 1);
    const tIdx = target.followerList.indexOf(me.id);
    if (tIdx !== -1) target.followerList.splice(tIdx, 1);
    me.following = me.followingList.length;
    target.followers = target.followerList.length;
  }
  db.update('users', me.id, me);
  db.update('users', target.id, target);
  res.json({ user: publicUser(target, req.userId) });
});

// Search users
router.get('/search/users', (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase();
  if (!q) return res.json({ users: [] });
  const users = db
    .all()
    .users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q)
    )
    .slice(0, 20)
    .map((u) => publicUser(u, req.userId));
  res.json({ users });
});

export default router;
