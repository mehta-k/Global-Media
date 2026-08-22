# Global Media

A social media web app (Twitter-style) with a **Node + Express backend** and a vanilla HTML/CSS/JS frontend.

## Features (backend API)
- **Database**: SQLite (`node:sqlite`), no external DB server needed
- **Auth**: signup / login with JWT, password hashing (bcrypt)
- **Posts**: create, delete, like, retweet, save; feed + reels (type `reel`)
- **Comments**: add / list comments on posts
- **Users**: public profile, edit own profile, follow/unfollow, search
- **Messages**: conversations + direct messages
- **Explore**: search posts + users, trending hashtags

Data is stored in a **SQLite database** (`server/data/global_media.db`, created automatically on first run via Node's built-in `node:sqlite` — no database server to install). User accounts, posts, likes, comments, messages, profiles and follows all persist there.

## Run it
```bash
cd server
npm install      # first time only
npm start        # serves frontend + API at http://localhost:3000
```
Then open http://localhost:3000 and either **register** an account or click
**"Continue as Demo User"** on the login screen.

## API summary
- `POST /api/auth/signup` · `POST /api/auth/login` · `GET /api/auth/me`
- `GET /api/posts` · `POST /api/posts` · `DELETE /api/posts/:id`
- `POST /api/posts/:id/like` · `/retweet` · `/save`
- `GET /api/posts/:id/comments` · `POST /api/posts/:id/comments`
- `GET /api/users/:username` · `PATCH /api/users/me` · `POST /api/users/:username/follow` · `GET /api/users/search/users`
- `GET /api/conversations` · `POST /api/conversations` · `GET|POST /api/conversations/:id/messages`
- `GET /api/explore?q=...`

## Security & privacy

The backend applies the following protections (all in `server/src`):

- **Passwords**: hashed with bcrypt (`bcryptjs`), never stored or returned in plaintext.
- **JWT**: signed with a strong secret from `.env` (`JWT_SECRET`). A per-user `tokenVersion`
  is embedded in every token; changing a password or logging out bumps it, instantly
  invalidating all previously issued tokens.
- **Brute-force protection**: per-IP rate limiting on auth routes + per-account lockout
  after `MAX_LOGIN_ATTEMPTS` failed logins (`LOCK_MINUTES` lock window).
- **Password policy**: min 8 chars, upper + lower case and a number (`src/security.js`).
- **Input validation & sanitization**: usernames, emails and free text are validated/trimmed.
- **Privacy**: `email`, `password`, `mobile`, failed-login and reset-token fields are never
  exposed via the API; `mobile` is hidden from other users unless the owner opts in
  (`showMobile`). Accounts can be marked `privateAccount`.
- **Password reset**: `/api/auth/forgot-password` issues a single-use, hashed, expiring token
  (`/api/auth/reset-password`). In production the token would be emailed, not returned.
- **HTTP hardening**: security headers (CSP, HSTS in prod, X-Frame-Options, etc.),
  body-size limit, restricted CORS (configurable via `CORS_ORIGIN`), and `.env` is gitignored.

### Secrets / configuration

Copy `server/.env.example` to `server/.env` (or set env vars). `JWT_SECRET` is auto-generated
and persisted to `.env` on first run if missing. **Never commit `.env`.**

### Sign in with Google (real OAuth 2.0)

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an
   **OAuth 2.0 Client ID** (type: Web application).
2. Add the redirect URI exactly: `http://localhost:3000/api/auth/google/callback`
   (in production use your HTTPS domain + the same path).
3. Put the client ID/secret in `.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
4. Restart the server. The "Continue with Google" button now performs a real OAuth flow:
   browser → Google consent → callback exchanges the code for a Google access token →
   Google `userinfo` is fetched and verified → a Global Media account is created/looked up
   by verified email → our JWT is issued and the user is signed in.

