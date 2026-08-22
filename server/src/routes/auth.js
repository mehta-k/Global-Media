import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, publicUser } from '../db.js';
import { authMiddleware, signToken } from '../middleware/auth.js';
import config from '../config.js';
import {
  validateUsername,
  validateEmail,
  validateMobile,
  checkPasswordStrength,
  sanitizeText,
  rateLimit,
  randomToken,
  hashToken
} from '../security.js';
import bcrypt from 'bcryptjs';

const router = Router();

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

const SOCIAL_EMOJI = { google: '🔵', github: '🐙' };

// --- Real "Sign in with Google" (OAuth 2.0 authorization code flow) ---
router.get('/google', (req, res) => {
  if (!config.google.enabled) {
    return res.redirect('/index.html?auth_error=configuration');
  }
  const state = randomToken(16);
  res.cookie('gm_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: 10 * 60 * 1000
  });
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: 'code',
    scope: config.google.scope,
    state,
    access_type: 'online',
    prompt: 'select_account'
  });
  res.redirect(`${config.google.authorizeUrl}?${params.toString()}`);
});

router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const cookies = parseCookies(req);
  if (error) return res.redirect('/index.html?auth_error=' + encodeURIComponent(String(error)));
  if (!code) return res.redirect('/index.html?auth_error=missing_code');
  if (!state || !cookies.gm_oauth_state || state !== cookies.gm_oauth_state) {
    return res.redirect('/index.html?auth_error=state_mismatch');
  }
  // Clear the state cookie.
  res.cookie('gm_oauth_state', '', { httpOnly: true, sameSite: 'lax', secure: config.isProduction, maxAge: 0 });

  try {
    const tokenRes = await fetch(config.google.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: config.google.redirectUri,
        grant_type: 'authorization_code'
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.redirect('/index.html?auth_error=token_exchange_failed');
    }
    const userRes = await fetch(config.google.userInfoUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await userRes.json();
    if (!userRes.ok || !profile.email) {
      return res.redirect('/index.html?auth_error=no_email');
    }
    if (profile.email_verified === false) {
      return res.redirect('/index.html?auth_error=email_unverified');
    }

    const email = String(profile.email).toLowerCase();
    let user = db.getUserByEmail(email);
    if (!user) {
      // Derive a unique username from the email local-part.
      const base = email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'google';
      let username = base;
      let n = 1;
      while (db.getUserByUsername(username)) username = `${base}${n++}`;
      user = await db.createUser({
        fullName: sanitizeText(profile.name || base, 60),
        username,
        email,
        password: randomUUID(), // random; real auth happens via Google
        mobile: null,
        avatar: profile.picture || null,
        emoji: '🔵'
      });
    } else if (!user.avatar && profile.picture) {
      db.update('users', user.id, { avatar: profile.picture, email });
    }

    const token = signToken(user);
    const safeUser = publicUser(user, user.id);
    const redirect = `/google-callback.html?token=${encodeURIComponent(token)}&user=${encodeURIComponent(
      JSON.stringify(safeUser)
    )}`;
    res.redirect(redirect);
  } catch (err) {
    res.redirect('/index.html?auth_error=google_callback_error');
  }
});


// Brute-force protection on the auth surface (per IP).
const authLimiter = rateLimit({ windowMs: config.rateLimitWindowMs, max: config.authRateLimit, keyPrefix: 'auth' });

function clientIp(req) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function applyAuthLimit(req, res, next) {
  const r = authLimiter(clientIp(req));
  res.setHeader('X-RateLimit-Limit', String(config.authRateLimit));
  res.setHeader('X-RateLimit-Remaining', String(r.remaining));
  if (!r.allowed) {
    return res.status(429).json({ error: 'Too many authentication attempts, please try again later.', retryAfter: r.retryAfter });
  }
  next();
}

router.post('/social', applyAuthLimit, async (req, res) => {
  try {
    const { provider, name, email } = req.body || {};
    if (!provider || !email) {
      return res.status(400).json({ error: 'Provider and email are required' });
    }
    const safeBase = String(email)
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '') || `${provider}_user`;
    const username = `${provider}_${safeBase}`;
    let user = db.getUserByUsername(username);
    if (!user) {
      user = await db.createUser({
        fullName: sanitizeText(name || `${provider} User`, 60),
        username,
        email: String(email).toLowerCase(),
        password: randomUUID(), // random, unused password; social accounts auth via JWT
        mobile: null,
        emoji: SOCIAL_EMOJI[provider] || '👤'
      });
    } else if (user.email !== String(email).toLowerCase()) {
      db.update('users', user.id, { email: String(email).toLowerCase() });
    }
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Social login failed' });
  }
});

router.post('/signup', applyAuthLimit, async (req, res) => {
  try {
    const { fullName, username, password, confirmPassword, email, mobileNumber, mobile, emoji, avatar } = req.body;
    const nameErr = !fullName ? 'Full name is required' : null;
    const userErr = validateUsername(username);
    const emailErr = validateEmail(email);
    const mobileErr = validateMobile(mobileNumber || mobile);
    const passErr = checkPasswordStrength(password);

    if (nameErr) return res.status(400).json({ error: nameErr });
    if (userErr) return res.status(400).json({ error: userErr });
    if (emailErr) return res.status(400).json({ error: emailErr });
    if (mobileErr) return res.status(400).json({ error: mobileErr });
    if (passErr) return res.status(400).json({ error: passErr });
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (email && db.getUserByEmail(email)) {
      return res.status(409).json({ error: 'That email is already registered' });
    }
    if (db.getUserByUsername(username)) {
      return res.status(409).json({ error: 'That username is already taken' });
    }

    const user = await db.createUser({
      fullName: sanitizeText(fullName, 60),
      username: username.trim(),
      email: email ? String(email).toLowerCase() : null,
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

router.post('/login', applyAuthLimit, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const user = db.getUserByUsername(username);
    // Always run a hash compare to reduce user-enumeration timing differences.
    const hash = user ? user.password : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
    const ok = await bcrypt.compare(password, hash);

    if (!user || !ok) {
      if (user) {
        const { locked, lockUntil } = db.recordFailedLogin(user.id, config.maxLoginAttempts, config.lockMinutes);
        if (locked) {
          return res.status(429).json({
            error: `Account locked for ${config.lockMinutes} minutes due to too many failed attempts.`,
            lockUntil
          });
        }
      }
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (db.isLocked(user)) {
      return res.status(429).json({ error: `Account temporarily locked. Try again later.`, lockUntil: user.lockUntil });
    }

    db.clearFailedLogin(user.id);
    const token = signToken(user);
    res.json({ token, user: publicUser(user, user.id) });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Request a password reset. In production the token would be emailed/SMSed;
// here we return it so the local recovery UI can complete the flow.
router.post('/forgot-password', applyAuthLimit, async (req, res) => {
  try {
    const { identifier } = req.body || {};
    if (!identifier) return res.status(400).json({ error: 'Username or email is required' });
    const user = db.getUserByUsername(identifier) || db.getUserByEmail(identifier);
    if (!user) {
      // Do not reveal whether the account exists.
      return res.json({ message: 'If that account exists, a reset code has been generated.' });
    }
    const token = randomToken(32);
    const hash = hashToken(token);
    const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min
    db.setResetToken(user.id, hash, expiry);
    // In dev, return the token so the UI can use it without an email server.
    res.json({ message: 'Reset code generated.', resetToken: config.isProduction ? undefined : token });
  } catch (err) {
    res.status(500).json({ error: 'Could not process request' });
  }
});

router.post('/reset-password', applyAuthLimit, async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body || {};
    if (!token || !password) return res.status(400).json({ error: 'Reset token and new password are required' });
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    const passErr = checkPasswordStrength(password);
    if (passErr) return res.status(400).json({ error: passErr });

    const hash = hashToken(token);
    const user = db.getUserByResetToken(hash);
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

    await db.setPassword(user.id, password);
    db.clearResetToken(user.id);
    db.clearFailedLogin(user.id);
    db.incrementTokenVersion(user.id); // invalidate all existing sessions
    res.json({ message: 'Password updated. Please sign in again.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not reset password' });
  }
});

// Change password while authenticated (also logs out other sessions).
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    const passErr = checkPasswordStrength(newPassword);
    if (passErr) return res.status(400).json({ error: passErr });

    const user = db.find('users', (u) => u.id === req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    await db.setPassword(user.id, newPassword);
    db.incrementTokenVersion(user.id);
    const token = signToken(db.find('users', (u) => u.id === req.userId));
    res.json({ message: 'Password changed successfully.', token });
  } catch (err) {
    res.status(500).json({ error: 'Could not change password' });
  }
});

// Logout: bump token version so the current (and all) tokens are invalidated.
router.post('/logout', authMiddleware, (req, res) => {
  db.incrementTokenVersion(req.userId);
  res.json({ message: 'Logged out successfully.' });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.find('users', (u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user, req.userId) });
});

export default router;
