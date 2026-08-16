import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './src/middleware/auth.js';
import authRoutes from './src/routes/auth.js';
import postsRoutes from './src/routes/posts.js';
import commentsRoutes from './src/routes/comments.js';
import usersRoutes from './src/routes/users.js';
import messagesRoutes from './src/routes/messages.js';
import exploreRoutes from './src/routes/explore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Attach userId from token when present (optional auth for GET routes)
app.use((req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.userId = payload.id;
    } catch {
      // invalid token -> continue as guest
    }
  }
  next();
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/posts', commentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/conversations', messagesRoutes);
app.use('/api/explore', exploreRoutes);

// Serve the static frontend (parent "Global media" folder)
app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, () => {
  console.log(`Global Media server running at http://localhost:${PORT}`);
});
