import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './src/config.js';
import { optionalAuth } from './src/middleware/auth.js';
import { rateLimit } from './src/security.js';
import authRoutes from './src/routes/auth.js';
import postsRoutes from './src/routes/posts.js';
import commentsRoutes from './src/routes/comments.js';
import usersRoutes from './src/routes/users.js';
import messagesRoutes from './src/routes/messages.js';
import exploreRoutes from './src/routes/explore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = config.port;

app.set('trust proxy', 1); // honour X-Forwarded-For behind a proxy/reverse server

// --- Security headers (Helmet-like, dependency-free) ---
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Strict-Transport-Security',
    config.isProduction ? 'max-age=31536000; includeSubDomains' : 'max-age=0'
  );
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none';"
  );
  res.setHeader('Permissions-Policy', "geolocation=(), microphone=(), camera=()");
  next();
});

// --- CORS: restrict to configured origins (same-origin in dev) ---
const allowedOrigins = config.corsOrigin;
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!allowedOrigins.length || (origin && allowedOrigins.includes(origin))) {
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '2mb' }));

// --- Global API rate limit (per IP) ---
const apiLimiter = rateLimit({ windowMs: config.rateLimitWindowMs, max: config.apiRateLimit, keyPrefix: 'api' });
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    const r = apiLimiter(req.ip);
    res.setHeader('X-RateLimit-Limit', String(config.apiRateLimit));
    res.setHeader('X-RateLimit-Remaining', String(r.remaining));
    if (!r.allowed) {
      return res.status(429).json({ error: 'Too many requests, please slow down.', retryAfter: r.retryAfter });
    }
  }
  next();
});

// Attach userId from token when present (optional auth for GET routes)
app.use(optionalAuth);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/posts', commentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/conversations', messagesRoutes);
app.use('/api/explore', exploreRoutes);

// Never serve secrets / env files. Block access to dotfiles under the app root.
app.use((req, res, next) => {
  if (req.path === '/.env' || req.path.startsWith('/.env')) return res.status(404).end();
  next();
});

// Serve the static frontend (parent "Global media" folder)
app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, () => {
  console.log(`Global Media server running at http://localhost:${PORT}`);
  if (!config.isProduction) {
    console.log('Dev mode: CORS is same-origin only. Set CORS_ORIGIN to allow remote clients.');
  }
});
