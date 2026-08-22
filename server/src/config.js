// Central configuration + a tiny dependency-free .env loader.
// Security-critical values (JWT secret, CORS origin) are read from the
// environment so they never live in source control.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');

// Minimal .env parser (no external dependency).
function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return;
  const raw = fs.readFileSync(ENV_PATH, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile();

// Ensure a JWT secret exists. In production this MUST come from the environment
// (.env / secrets manager). We generate a strong random one if missing and
// persist it to .env so existing tokens stay valid across restarts.
function resolveJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
    return process.env.JWT_SECRET;
  }
  const generated = crypto.randomBytes(48).toString('hex');
  try {
    const header = '# Global Media server configuration\n';
    const comment = process.env.JWT_SECRET
      ? '# WARNING: existing JWT_SECRET was too short (<32 chars); replaced with a strong one.\n'
      : '# Auto-generated strong JWT secret. Keep this private.\n';
    fs.writeFileSync(ENV_PATH, `${header}${comment}JWT_SECRET=${generated}\n`, { flag: 'a' });
  } catch {
    /* non-fatal: in-memory only */
  }
  return generated;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Comma-separated allowed origins for CORS. Empty => same-origin only.
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
    : [],
  // Brute-force protection.
  maxLoginAttempts: Number(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  lockMinutes: Number(process.env.LOCK_MINUTES) || 15,
  // Rate limiting (requests per window).
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  authRateLimit: Number(process.env.AUTH_RATE_LIMIT) || 10,
  apiRateLimit: Number(process.env.API_RATE_LIMIT) || 300,
  isProduction: (process.env.NODE_ENV || 'development') === 'production'
};

// Google OAuth 2.0 (real "Sign in with Google").
// Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET from a Google Cloud OAuth client.
// The redirect URI must be registered in the Google Console and match
// config.google.redirectUri exactly.
const baseUrl = process.env.APP_BASE_URL || `http://localhost:${config.port}`;
config.google = {
  enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/auth/google/callback`,
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
  scope: 'openid email profile'
};


export default config;
