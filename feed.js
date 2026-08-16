// Feed logic for index.html — loads/posts/likes/saves/comments via the API.
let feedPosts = [];
const commentsCache = {};

function timeAgo(iso) {
  if (!iso) return 'now';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  return Math.floor(h / 24) + 'd';
}

function avatarMarkup(author) {
  const emoji = author.emoji || '👤';
  return `<div class="post-avatar" style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#FF006E 0%,#8338EC 100%);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">${emoji}</div>`;
}

function createPostElement(post) {
  const el = document.createElement('div');
  el.className = 'post';
  el.style.cssText = 'background:var(--bg-primary);border:1px solid var(--border-color);border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;';
  el.innerHTML = `
    <div class="post-header" style="display:flex;align-items:center;gap:0.75rem;">
      ${avatarMarkup(post.author)}
      <div class="post-meta">
        <span class="post-author" style="font-weight:700;">${post.author.fullName}</span>
        <span class="post-handle" style="color:var(--text-secondary);">@${post.author.username}</span>
        <span class="post-time" style="color:var(--text-secondary);">· ${post.timestamp || timeAgo(post.createdAt)}</span>
      </div>
    </div>
    <div class="post-content" style="margin:0.75rem 0;line-height:1.5;">${escapeHtml(post.content)}</div>
    ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image" style="width:100%;border-radius:12px;margin-bottom:0.75rem;">` : ''}
    <div class="post-actions" style="display:flex;gap:1.5rem;color:var(--text-secondary);">
      <button class="action-btn" data-act="like" style="background:none;border:none;cursor:pointer;font-size:1rem;">${post.liked ? '❤️' : '🤍'} <span class="action-count">${post.likes}</span></button>
      <button class="action-btn" data-act="comment" style="background:none;border:none;cursor:pointer;font-size:1rem;">💬 <span class="action-count">${post.comments}</span></button>
      <button class="action-btn" data-act="retweet" style="background:none;border:none;cursor:pointer;font-size:1rem;">🔄 <span class="action-count">${post.retweets}</span></button>
      <button class="action-btn" data-act="share" style="background:none;border:none;cursor:pointer;font-size:1rem;">📤</button>
      <button class="action-btn" data-act="save" style="background:none;border:none;cursor:pointer;font-size:1rem;">${post.saved ? '🔖' : '📌'}</button>
    </div>
    <div class="comments-box" data-post="${post.id}" style="display:none;margin-top:1rem;border-top:1px solid var(--border-color);padding-top:1rem;"></div>
  `;

  el.querySelector('[data-act="like"]').addEventListener('click', () => toggleLike(post.id, el));
  el.querySelector('[data-act="retweet"]').addEventListener('click', () => toggleRetweet(post.id, el));
  el.querySelector('[data-act="save"]').addEventListener('click', () => toggleSave(post.id, el));
  el.querySelector('[data-act="share"]').addEventListener('click', () => sharePost(post));
  el.querySelector('[data-act="comment"]').addEventListener('click', () => openComments(post.id, el));
  return el;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderPosts() {
  const container = document.getElementById('feed-posts');
  if (!container) return;
  if (!feedPosts.length) {
    container.innerHTML = `<div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:16px;padding:2rem;text-align:center;color:var(--text-secondary);">
      <div style="font-size:3rem;margin-bottom:1rem;">✨</div>
      <h2 style="margin:0 0 0.5rem 0;color:var(--text-primary);">Your feed is empty</h2>
      <p>Follow people or create your first post to get started!</p>
    </div>`;
    return;
  }
  container.innerHTML = '';
  feedPosts.forEach((post) => container.appendChild(createPostElement(post)));
}

async function loadFeed() {
  if (!API.isLoggedIn()) return;
  try {
    const data = await API.get('/api/posts');
    feedPosts = data.posts;
    renderPosts();
  } catch (err) {
    console.error('Failed to load feed', err);
  }
}

window.loadFeed = loadFeed;

async function createPost() {
  const input = document.getElementById('postInput');
  const content = input.value.trim();
  if (!content) {
    alert('Please write something!');
    return;
  }
  try {
    const data = await API.post('/api/posts', { content });
    feedPosts.unshift(data.post);
    input.value = '';
    renderPosts();
  } catch (err) {
    alert(err.message || 'Could not create post');
  }
}

async function toggleLike(postId, el) {
  try {
    const data = await API.post(`/api/posts/${postId}/like`);
    updatePostInPlace(postId, data.post, el);
  } catch (err) { /* ignore */ }
}

async function toggleRetweet(postId, el) {
  try {
    const data = await API.post(`/api/posts/${postId}/retweet`);
    updatePostInPlace(postId, data.post, el);
    if (data.post.retweeted) showNotification('Post retweeted!');
  } catch (err) { /* ignore */ }
}

async function toggleSave(postId, el) {
  try {
    const data = await API.post(`/api/posts/${postId}/save`);
    updatePostInPlace(postId, data.post, el);
    showNotification(data.post.saved ? 'Post saved! 🔖' : 'Post removed from saved');
  } catch (err) { /* ignore */ }
}

function updatePostInPlace(postId, updated, el) {
  const idx = feedPosts.findIndex((p) => p.id === postId);
  if (idx !== -1) feedPosts[idx] = updated;
  const node = el || document.querySelector(`.post .comments-box[data-post="${postId}"]`)?.closest('.post');
  if (!node) return;
  const likeBtn = node.querySelector('[data-act="like"]');
  const rtBtn = node.querySelector('[data-act="retweet"]');
  const saveBtn = node.querySelector('[data-act="save"]');
  likeBtn.innerHTML = `${updated.liked ? '❤️' : '🤍'} <span class="action-count">${updated.likes}</span>`;
  rtBtn.innerHTML = `🔄 <span class="action-count">${updated.retweets}</span>`;
  saveBtn.textContent = updated.saved ? '🔖' : '📌';
}

function sharePost(post) {
  if (navigator.share) {
    navigator.share({ title: 'Global Media', text: post.content }).catch(() => {});
  } else {
    showNotification('Link copied to clipboard!');
  }
}

async function openComments(postId, el) {
  const box = el.querySelector('.comments-box');
  if (!box) return;
  if (box.style.display === 'none') {
    box.style.display = 'block';
    await renderComments(postId, box);
  } else {
    box.style.display = 'none';
  }
}

async function renderComments(postId, box) {
  try {
    const data = await API.get(`/api/posts/${postId}/comments`);
    commentsCache[postId] = data.comments;
  } catch {
    commentsCache[postId] = [];
  }
  box.innerHTML = `
    <div class="comment-list" style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:0.75rem;">
      ${commentsCache[postId].map((c) => `<div style="font-size:0.9rem;"><strong>${c.author.fullName}</strong> <span style="color:var(--text-secondary);">@${c.author.username}</span>: ${escapeHtml(c.content)}</div>`).join('') || '<div style="color:var(--text-secondary);font-size:0.9rem;">No comments yet.</div>'}
    </div>
    <input type="text" placeholder="Write a comment..." class="comment-input" style="width:100%;padding:0.6rem 0.8rem;border-radius:20px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);">
  `;
  const input = box.querySelector('.comment-input');
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      addComment(postId, e.target.value.trim(), box);
    }
  });
}

async function addComment(postId, content, box) {
  try {
    await API.post(`/api/posts/${postId}/comments`, { content });
    const idx = feedPosts.findIndex((p) => p.id === postId);
    if (idx !== -1) feedPosts[idx].comments += 1;
    await renderComments(postId, box);
    const countEl = document.querySelector(`.post .comments-box[data-post="${postId}"]`)?.closest('.post').querySelector('[data-act="comment"] .action-count');
    if (countEl) countEl.textContent = feedPosts.find((p) => p.id === postId).comments;
  } catch (err) {
    alert(err.message || 'Could not add comment');
  }
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = 'position:fixed;top:100px;right:20px;background-color:#1DA1F2;color:white;padding:1rem 1.5rem;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;';
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2000);
}

document.addEventListener('DOMContentLoaded', () => {
  const postBtn = document.getElementById('postBtn');
  const postInput = document.getElementById('postInput');
  if (postBtn) postBtn.addEventListener('click', createPost);
  if (postInput) {
    postInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') createPost();
    });
  }
});
