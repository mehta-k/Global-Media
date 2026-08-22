import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import config from '../config.js';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, tv: user.tokenVersion || 0 },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

// Lightweight parse for optional-auth GET routes (does not enforce tokenVersion).
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      req.userId = payload.id;
    } catch {
      /* invalid token -> continue as guest */
    }
  }
  next();
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  // Enforce token invalidation: a changed password / logout bumps tokenVersion.
  const user = db.find('users', (u) => u.id === payload.id);
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  if ((user.tokenVersion || 0) !== (payload.tv || 0)) {
    return res.status(401).json({ error: 'Session expired, please sign in again' });
  }
  req.userId = payload.id;
  next();
}

export { config as authConfig };
