import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_DB = {
  users: [],
  posts: [],
  comments: [],
  conversations: [],
  messages: []
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
  }
}

function read() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return structuredClone(DEFAULT_DB);
  }
}

function write(db) {
  ensureStore();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

export const db = {
  all: read,
  save: write,

  // Generic collection helpers
  find(collection, predicate) {
    return read()[collection].find(predicate);
  },
  filter(collection, predicate) {
    return read()[collection].filter(predicate);
  },
  insert(collection, item) {
    const data = read();
    data[collection].push(item);
    write(data);
    return item;
  },
  update(collection, id, patch) {
    const data = read();
    const idx = data[collection].findIndex((x) => x.id === id);
    if (idx === -1) return null;
    data[collection][idx] = { ...data[collection][idx], ...patch };
    write(data);
    return data[collection][idx];
  },
  remove(collection, predicate) {
    const data = read();
    const idx = data[collection].findIndex(predicate);
    if (idx === -1) return false;
    data[collection].splice(idx, 1);
    write(data);
    return true;
  },

  // User specific
  async createUser({ fullName, username, password, mobile, avatar, bio, location, website, emoji }) {
    const data = read();
    const hashed = await bcrypt.hash(password, 10);
    const user = {
      id: data.users.length ? Math.max(...data.users.map((u) => u.id)) + 1 : 1,
      fullName,
      username,
      password: hashed,
      mobile: mobile || null,
      avatar: avatar || null,
      emoji: emoji || '👤',
      bio: bio || '',
      location: location || '',
      website: website || '',
      followers: 0,
      following: 0,
      followingList: [],
      followerList: [],
      joinDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    data.users.push(user);
    write(data);
    return user;
  },

  getUserByUsername(username) {
    return read().users.find((u) => u.username.toLowerCase() === String(username).toLowerCase());
  }
};

export function publicUser(user, viewerId) {
  if (!user) return null;
  const { password, followingList, followerList, mobile, ...rest } = user;
  return {
    ...rest,
    isFollowing: viewerId ? followingList?.includes(user.id) ?? false : false
  };
}
