import { db } from './db.js';

export function serializePost(post, viewerId) {
  const author = db.find('users', (u) => u.id === post.userId) || null;
  return {
    id: post.id,
    content: post.content,
    image: post.image || null,
    type: post.type || 'post',
    createdAt: post.createdAt,
    timestamp: post.timestamp,
    author: author
      ? {
          id: author.id,
          username: author.username,
          fullName: author.fullName,
          avatar: author.avatar,
          emoji: author.emoji
        }
      : { username: 'unknown', fullName: 'Unknown' },
    likes: post.likes || 0,
    comments: post.comments || 0,
    retweets: post.retweets || 0,
    liked: viewerId ? post.likedBy?.includes(viewerId) ?? false : false,
    saved: viewerId ? post.savedBy?.includes(viewerId) ?? false : false,
    retweeted: viewerId ? post.retweetedBy?.includes(viewerId) ?? false : false
  };
}

export function serializeComment(comment) {
  const author = db.find('users', (u) => u.id === comment.userId) || null;
  return {
    id: comment.id,
    postId: comment.postId,
    content: comment.content,
    createdAt: comment.createdAt,
    author: author
      ? { id: author.id, username: author.username, fullName: author.fullName, avatar: author.avatar, emoji: author.emoji }
      : { username: 'unknown', fullName: 'Unknown' }
  };
}

export function serializeMessage(message) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    text: message.text,
    createdAt: message.createdAt,
    read: message.read
  };
}
