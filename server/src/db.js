import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'global_media.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const sqlite = new DatabaseSync(DB_FILE);
sqlite.exec('PRAGMA journal_mode = WAL;');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT,
    username TEXT UNIQUE,
    email TEXT,
    password TEXT,
    mobile TEXT,
    avatar TEXT,
    emoji TEXT DEFAULT '👤',
    bio TEXT DEFAULT '',
    location TEXT DEFAULT '',
    website TEXT DEFAULT '',
    followers INTEGER DEFAULT 0,
    following INTEGER DEFAULT 0,
    followingList TEXT DEFAULT '[]',
    followerList TEXT DEFAULT '[]',
    tokenVersion INTEGER DEFAULT 0,
    failedAttempts INTEGER DEFAULT 0,
    lockUntil TEXT,
    resetTokenHash TEXT,
    resetTokenExpiry TEXT,
    privateAccount INTEGER DEFAULT 0,
    showMobile INTEGER DEFAULT 0,
    joinDate TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    content TEXT,
    image TEXT,
    type TEXT DEFAULT 'post',
    createdAt TEXT,
    timestamp TEXT,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    retweets INTEGER DEFAULT 0,
    likedBy TEXT DEFAULT '[]',
    savedBy TEXT DEFAULT '[]',
    retweetedBy TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postId INTEGER,
    userId INTEGER,
    content TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participants TEXT DEFAULT '[]',
    lastMessage TEXT DEFAULT '',
    unread INTEGER DEFAULT 0,
    pinned INTEGER DEFAULT 0,
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversationId INTEGER,
    senderId INTEGER,
    text TEXT,
    createdAt TEXT,
    read INTEGER DEFAULT 0
  );
`);

// --- Schema migration: add columns that may be missing on an existing DB ---
const USER_COLUMNS = {
  email: 'TEXT',
  tokenVersion: 'INTEGER DEFAULT 0',
  failedAttempts: 'INTEGER DEFAULT 0',
  lockUntil: 'TEXT',
  resetTokenHash: 'TEXT',
  resetTokenExpiry: 'TEXT',
  privateAccount: 'INTEGER DEFAULT 0',
  showMobile: 'INTEGER DEFAULT 0'
};

(function migrateUsers() {
  const existing = new Set(sqlite.prepare('PRAGMA table_info(users)').all().map((r) => r.name));
  for (const [col, def] of Object.entries(USER_COLUMNS)) {
    if (!existing.has(col)) {
      sqlite.exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
    }
  }
})();

const JSON_COLS = {
  users: ['followingList', 'followerList'],
  posts: ['likedBy', 'savedBy', 'retweetedBy'],
  conversations: ['participants']
};

function coerce(v) {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return v;
}

function mapRow(collection, row) {
  if (!row) return row;
  const o = Object.assign({}, row);
  (JSON_COLS[collection] || []).forEach((c) => {
    if (o[c] != null) {
      try {
        o[c] = JSON.parse(o[c]);
      } catch {
        o[c] = [];
      }
    }
  });
  return o;
}

export const db = {
  _db: sqlite,

  selectAll(collection) {
    const rows = sqlite.prepare(`SELECT * FROM ${collection}`).all();
    return rows.map((r) => mapRow(collection, r));
  },

  all() {
    return {
      users: this.selectAll('users'),
      posts: this.selectAll('posts'),
      comments: this.selectAll('comments'),
      conversations: this.selectAll('conversations'),
      messages: this.selectAll('messages')
    };
  },

  find(collection, predicate) {
    return this.selectAll(collection).find(predicate);
  },

  filter(collection, predicate) {
    return this.selectAll(collection).filter(predicate);
  },

  insert(collection, item) {
    const cols = Object.keys(item).filter((k) => item[k] !== undefined);
    const jsonCols = JSON_COLS[collection] || [];
    const values = cols.map((k) => coerce(jsonCols.includes(k) ? JSON.stringify(item[k]) : item[k]));
    const ph = cols.map(() => '?').join(', ');
    sqlite.prepare(`INSERT INTO ${collection} (${cols.join(',')}) VALUES (${ph})`).run(...values);
    const id = item.id != null ? item.id : Number(sqlite.prepare('SELECT last_insert_rowid() AS id').get().id);
    return this.find(collection, (r) => r.id === id);
  },

  update(collection, id, patch) {
    const jsonCols = JSON_COLS[collection] || [];
    const cols = Object.keys(patch).filter((k) => patch[k] !== undefined);
    const sets = cols.map((k) => `${k} = ?`).join(', ');
    const values = cols.map((k) => coerce(jsonCols.includes(k) ? JSON.stringify(patch[k]) : patch[k]));
    values.push(id);
    sqlite.prepare(`UPDATE ${collection} SET ${sets} WHERE id = ?`).run(...values);
    return this.find(collection, (r) => r.id === id);
  },

  remove(collection, predicate) {
    const matches = this.filter(collection, predicate);
    if (!matches.length) return false;
    const ids = matches.map((m) => m.id);
    const ph = ids.map(() => '?').join(', ');
    sqlite.prepare(`DELETE FROM ${collection} WHERE id IN (${ph})`).run(...ids);
    return true;
  },

  async createUser({ fullName, username, password, email, mobile, avatar, bio, location, website, emoji }) {
    const hashed = await bcrypt.hash(password, 10);
    sqlite
      .prepare(
        `INSERT INTO users (fullName, username, email, password, mobile, avatar, emoji, bio, location, website, joinDate, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        fullName,
        username,
        email || null,
        hashed,
        mobile || null,
        avatar || null,
        emoji || '👤',
        bio || '',
        location || '',
        website || '',
        new Date().toISOString(),
        new Date().toISOString()
      );
    const id = Number(sqlite.prepare('SELECT last_insert_rowid() AS id').get().id);
    return this.find('users', (u) => u.id === id);
  },

  getUserByUsername(username) {
    const row = sqlite.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').get(username);
    return row ? mapRow('users', row) : undefined;
  },

  getUserByEmail(email) {
    if (!email) return undefined;
    const row = sqlite.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email);
    return row ? mapRow('users', row) : undefined;
  },

  async setPassword(userId, password) {
    const hashed = await bcrypt.hash(password, 10);
    sqlite.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, userId);
  },

  // Bump token version so all previously issued JWTs become invalid.
  incrementTokenVersion(userId) {
    sqlite.prepare('UPDATE users SET tokenVersion = tokenVersion + 1 WHERE id = ?').run(userId);
    const u = this.find('users', (x) => x.id === userId);
    return u ? u.tokenVersion : 0;
  },

  // Brute-force lockout tracking.
  recordFailedLogin(userId, maxAttempts, lockMinutes) {
    const now = Date.now();
    const user = this.find('users', (u) => u.id === userId);
    const attempts = (user.failedAttempts || 0) + 1;
    let lockUntil = user.lockUntil || null;
    if (attempts >= maxAttempts) {
      lockUntil = new Date(now + lockMinutes * 60 * 1000).toISOString();
    }
    sqlite.prepare('UPDATE users SET failedAttempts = ?, lockUntil = ? WHERE id = ?').run(attempts, lockUntil, userId);
    return { attempts, locked: !!lockUntil, lockUntil };
  },

  clearFailedLogin(userId) {
    sqlite.prepare("UPDATE users SET failedAttempts = 0, lockUntil = NULL WHERE id = ?").run(userId);
  },

  isLocked(user) {
    if (!user || !user.lockUntil) return false;
    return new Date(user.lockUntil).getTime() > Date.now();
  },

  // Password reset tokens are stored only as a salted hash with an expiry.
  setResetToken(userId, tokenHash, expiryISO) {
    sqlite.prepare('UPDATE users SET resetTokenHash = ?, resetTokenExpiry = ? WHERE id = ?').run(tokenHash, expiryISO, userId);
  },

  clearResetToken(userId) {
    sqlite.prepare('UPDATE users SET resetTokenHash = NULL, resetTokenExpiry = NULL WHERE id = ?').run(userId);
  },

  getUserByResetToken(tokenHash) {
    const row = sqlite.prepare('SELECT * FROM users WHERE resetTokenHash = ?').get(tokenHash);
    if (!row) return undefined;
    const user = mapRow('users', row);
    if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry).getTime() < Date.now()) return undefined;
    return user;
  },

  markMessagesRead(conversationId, viewerId) {
    sqlite
      .prepare('UPDATE messages SET read = 1 WHERE conversationId = ? AND senderId != ?')
      .run(conversationId, viewerId);
  }
};

export function publicUser(user, viewerId) {
  if (!user) return null;
  const { password, followingList, followerList, mobile, email, resetTokenHash, resetTokenExpiry, failedAttempts, lockUntil, ...rest } = user;
  const isSelf = viewerId && viewerId === user.id;
  // Mobile is private by default and only shown to the account owner.
  const safeMobile = isSelf || user.showMobile ? mobile : undefined;
  return {
    ...rest,
    mobile: safeMobile,
    isFollowing: viewerId ? followingList?.includes(viewerId) ?? false : false
  };
}
