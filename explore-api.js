// Explore page logic — live search across posts + users via the API.
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  return Math.floor(h / 24) + 'd';
}

function renderResults(data, query) {
  const container = document.getElementById('exploreResults');
  if (!container) return;

  let html = '';

  if (data.users && data.users.length) {
    html += `<div style="margin-bottom: 2rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">👤 People</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">`;
    html += data.users
      .map(
        (u) => `<div style="background: var(--bg-primary); border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-color); text-align: center;">
          <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#FF006E 0%,#8338EC 100%);display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin:0 auto 0.75rem;">${u.emoji || '👤'}</div>
          <h3 style="margin:0 0 0.25rem 0;">${u.fullName}</h3>
          <p style="margin:0 0 0.75rem 0;color:var(--text-secondary);font-size:0.9rem;">@${u.username}</p>
          <a class="btn btn-primary" style="text-decoration:none;" href="user-profile.html?u=${encodeURIComponent(u.username)}">View</a>
        </div>`
      )
      .join('');
    html += `</div></div>`;
  }

  if (data.posts && data.posts.length) {
    html += `<div style="margin-bottom: 2rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">📝 ${query ? 'Search Results' : 'Latest Posts'}</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">`;
    html += data.posts
      .map(
        (p) => `<div style="background: var(--bg-primary); border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-color);">
          <div style="display:flex;gap:0.6rem;align-items:center;margin-bottom:0.5rem;">
            <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#FF006E 0%,#8338EC 100%);display:flex;align-items:center;justify-content:center;font-size:1rem;">${p.author.emoji || '👤'}</div>
            <div style="font-size:0.9rem;"><strong>${p.author.fullName}</strong> <span style="color:var(--text-secondary);">@${p.author.username} · ${timeAgo(p.createdAt)}</span></div>
          </div>
          <p style="margin:0;line-height:1.4;font-size:0.95rem;">${escapeHtml(p.content)}</p>
          <div style="color:var(--text-secondary);font-size:0.8rem;margin-top:0.5rem;">❤️ ${p.likes} · 💬 ${p.comments} · 🔄 ${p.retweets}</div>
        </div>`
      )
      .join('');
    html += `</div></div>`;
  }

  if (data.trends && data.trends.length) {
    html += `<div style="margin-bottom: 2rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">🔥 Trending Topics</h2>
      <div style="background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-color);">`;
    html += data.trends
      .map(
        (t, i) => `<div style="padding: 1rem; border-bottom: ${i < data.trends.length - 1 ? '1px solid var(--border-color)' : 'none'}; cursor: pointer;" onclick="document.getElementById('exploreSearch').value='${t.tag}'; document.getElementById('exploreSearch').dispatchEvent(new Event('input'));">
          <p style="margin:0;font-weight:bold;">${t.tag}</p>
          <p style="margin:0.25rem 0 0 0;color:var(--text-secondary);font-size:0.9rem;">${t.count} posts</p>
        </div>`
      )
      .join('');
    html += `</div></div>`;
  }

  if (!html) {
    html = `<div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 16px; padding: 2rem; text-align: center; color: var(--text-secondary);">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
      <h2 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">No results</h2>
      <p>Try a different search term.</p>
    </div>`;
  }

  container.innerHTML = html;
}

async function runSearch(query) {
  try {
    const data = await API.get('/api/explore' + (query ? '?q=' + encodeURIComponent(query) : ''));
    renderResults(data, query);
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('exploreSearch');
  if (!input) return;
  let timer;
  input.addEventListener('input', (e) => {
    clearTimeout(timer);
    const q = e.target.value.trim();
    timer = setTimeout(() => runSearch(q), 300);
  });
  runSearch('');
});
