# Global Media

A social media web app (Twitter-style) with a **Node + Express backend** and a vanilla HTML/CSS/JS frontend.

## Features (backend API)
- **Auth**: signup / login with JWT, password hashing (bcrypt)
- **Posts**: create, delete, like, retweet, save; feed + reels (type `reel`)
- **Comments**: add / list comments on posts
- **Users**: public profile, edit own profile, follow/unfollow, search
- **Messages**: conversations + direct messages
- **Explore**: search posts + users, trending hashtags

Data is stored in `data/db.json` (a simple JSON file store — no database setup required).

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
