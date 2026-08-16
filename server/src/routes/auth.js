import { Router } from 'express';
import { db, publicUser } from '../db.js';
import { authMiddleware, signToken } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = Router();

router.post('/signup', async (req, res) => {
  try {
    const { fullName, username, password, confirmPassword, mobileNumber, mobile, emoji, avatar } = req.body;
    if (!fullName || !username || !password) {
      return res.status(400).json({ error: 'Full name, username and password are required' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (db.getUserByUsername(username)) {
      return res.status(409).json({ error: 'That username is already taken' });
    }
    const user = await db.createUser({
      fullName,
      username,
      password,
      mobile: mobileNumber || mobile,
      emoji,
      avatar
    });
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Could not create account' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const user = db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.find('users', (u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user, req.userId) });
});

export default router;
