import { db } from './src/db.js';

const samples = [
  { fullName: 'Ava Martinez', username: 'ava', emoji: '🌟', bio: 'Designer & coffee lover', posts: [
    'Just shipped a new UI kit for Global Media! 🎨',
    'Coffee + code = best morning routine ☕'
  ]},
  { fullName: 'Leo Chen', username: 'leo', emoji: '🚀', bio: 'Building things on the web', posts: [
    'Shipped my side project this weekend 🚀',
    'Who else is excited about edge runtimes?'
  ]},
  { fullName: 'Mia Patel', username: 'mia', emoji: '🌸', bio: 'Photographer | Travel', posts: [
    'Golden hour in the mountains was unreal 🌄',
    'New reel dropping soon, stay tuned!'
  ]},
  { fullName: 'Noah Smith', username: 'noah', emoji: '🎧', bio: 'Music & dev', posts: [
    'Lo-fi beats make debugging 10x better 🎧',
    'Anyone got book recommendations?'
  ]}
];

async function seed() {
  for (const s of samples) {
    let user = db.getUserByUsername(s.username);
    if (!user) {
      user = await db.createUser({ fullName: s.fullName, username: s.username, password: 'password', emoji: s.emoji, bio: s.bio });
      console.log('created user', s.username);
    }
    const existing = db.filter('posts', (p) => p.userId === user.id);
    if (existing.length === 0) {
      for (const content of s.posts) {
        db.insert('posts', {
          userId: user.id,
          content,
          image: null,
          type: 'post',
          createdAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          likes: Math.floor(Math.random() * 20),
          comments: 0,
          retweets: Math.floor(Math.random() * 5),
          likedBy: '[]',
          savedBy: '[]',
          retweetedBy: '[]'
        });
      }
      console.log('seeded posts for', s.username);
    }
  }
  console.log('Seed complete.');
}

seed();
