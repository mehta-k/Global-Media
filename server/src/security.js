// Security helpers: input validation, password policy, rate limiting, lockout.
import crypto from 'node:crypto';

export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: false
};

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MOBILE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

export function validateUsername(username) {
  if (!username || typeof username !== 'string') return 'Username is required';
  const u = username.trim();
  if (u.length < 3 || u.length > 20) return 'Username must be 3-20 characters';
  if (!USERNAME_REGEX.test(u)) return 'Username may only contain letters, numbers and underscores';
  return null;
}

export function validateEmail(email) {
  if (!email) return null; // email is optional
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) return 'Invalid email address';
  return null;
}

export function validateMobile(mobile) {
  if (!mobile) return null; // optional
  if (typeof mobile !== 'string' || !MOBILE_REGEX.test(mobile.trim())) return 'Invalid mobile number';
  return null;
}

export function checkPasswordStrength(password) {
  if (!password || typeof password !== 'string') return 'Password is required';
  if (password.length < PASSWORD_POLICY.minLength) return `Password must be at least ${PASSWORD_POLICY.minLength} characters`;
  if (password.length > PASSWORD_POLICY.maxLength) return `Password must be at most ${PASSWORD_POLICY.maxLength} characters`;
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (PASSWORD_POLICY.requireNumber && !/[0-9]/.test(password)) return 'Password must contain a number';
  if (PASSWORD_POLICY.requireSymbol && !/[^A-Za-z0-9]/.test(password)) return 'Password must contain a symbol';
  return null;
}

// Sanitize free-text fields: strip control characters, trim, cap length.
export function sanitizeText(value, max = 500) {
  if (value == null) return '';
  let out = '';
  for (const ch of String(value)) {
    const code = ch.codePointAt(0);
    if (code <= 0x1f || code === 0x7f) continue; // strip control chars
    out += ch;
  }
  return out.trim().slice(0, max);
}

// Simple fixed-window in-memory rate limiter, keyed by IP + bucket.
// Avoids an external dependency; for multi-instance deployments use Redis.
const buckets = new Map();

export function rateLimit({ windowMs, max, keyPrefix = 'rl' } = {}) {
  return function limit(ip, weight = 1) {
    const now = Date.now();
    const key = `${keyPrefix}:${ip}`;
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += weight;
    const remaining = Math.max(0, max - bucket.count);
    const reset = Math.ceil((bucket.start + windowMs - now) / 1000);
    const allowed = bucket.count <= max;
    return { allowed, remaining, reset, retryAfter: allowed ? 0 : reset };
  };
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function constantTimeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export default {
  PASSWORD_POLICY,
  validateUsername,
  validateEmail,
  validateMobile,
  checkPasswordStrength,
  sanitizeText,
  rateLimit,
  randomToken,
  hashToken,
  constantTimeEqual
};
