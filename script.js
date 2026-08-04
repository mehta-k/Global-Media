// Sample posts data
let posts = [
    {
        id: 1,
        author: 'Sarah Williams',
        handle: 'sarahw',
        avatar: 'https://via.placeholder.com/48',
        content: 'Just launched my new portfolio website! Check it out and let me know what you think. #WebDevelopment #Portfolio',
        image: 'https://via.placeholder.com/500x300',
        timestamp: '2h',
        likes: 342,
        comments: 28,
        retweets: 95,
        liked: false,
        saved: false
    },
    {
        id: 2,
        author: 'Mike Johnson',
        handle: 'mikej',
        avatar: 'https://via.placeholder.com/48',
        content: 'React 18 is amazing! The new features make building complex UIs so much easier.',
        image: null,
        timestamp: '4h',
        likes: 512,
        comments: 89,
        retweets: 234,
        liked: false,
        saved: false
    },
    {
        id: 3,
        author: 'Jane Smith',
        handle: 'janesmith',
        avatar: 'https://via.placeholder.com/48',
        content: 'Started learning TypeScript today. Any tips for a beginner?',
        image: null,
        timestamp: '6h',
        likes: 189,
        comments: 45,
        retweets: 67,
        liked: false,
        saved: false
    },
    {
        id: 4,
        author: 'Alex Kumar',
        handle: 'alexkumar',
        avatar: 'https://via.placeholder.com/48',
        content: 'Beautiful sunset at the beach today 🌅',
        image: 'https://via.placeholder.com/500x300',
        timestamp: '8h',
        likes: 876,
        comments: 120,
        retweets: 456,
        liked: false,
        saved: false
    }
];

// DOM Elements
const postInput = document.getElementById('postInput');
const postBtn = document.getElementById('postBtn');
const feedPosts = document.getElementById('feed-posts');
const postModal = document.getElementById('postModal');
const closeModal = document.querySelector('.close');
const modalPostContent = document.getElementById('modalPostContent');

// Event Listeners
postBtn.addEventListener('click', createPost);
postInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
        createPost();
    }
});
closeModal.addEventListener('click', closePostModal);
window.addEventListener('click', (e) => {
    if (e.target === postModal) {
        closePostModal();
    }
});

// Create a new post
function createPost() {
    const content = postInput.value.trim();
    if (!content) {
        alert('Please write something!');
        return;
    }

    const newPost = {
        id: posts.length + 1,
        author: 'You',
        handle: 'newuser',
        avatar: 'https://via.placeholder.com/48',
        content: content,
        image: null,
        timestamp: 'now',
        likes: 0,
        comments: 0,
        retweets: 0,
        liked: false,
        saved: false
    };

    posts.unshift(newPost);
    postInput.value = '';
    renderPosts();
}

// Render all posts
function renderPosts() {
    feedPosts.innerHTML = '';
    posts.forEach(post => {
        const postElement = createPostElement(post);
        feedPosts.appendChild(postElement);
    });
}

// Create a post element
function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.innerHTML = `
        <div class="post-header">
            <img src="${post.avatar}" alt="${post.author}" class="post-avatar">
            <div class="post-meta">
                <span class="post-author">${post.author}</span>
                <span class="post-handle">${post.handle}</span>
                <span class="post-time">${post.timestamp}</span>
            </div>
            <button class="action-btn" onclick="openMenu(event)">⋯</button>
        </div>
        <div class="post-content">
            ${post.content}
        </div>
        ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
        <div class="post-actions">
            <button class="action-btn" onclick="toggleLike(event, ${post.id})">
                <span>${post.liked ? '❤️' : '🤍'}</span>
                <span class="action-count">${post.likes}</span>
            </button>
            <button class="action-btn" onclick="openComments(${post.id})">
                <span>💬</span>
                <span class="action-count">${post.comments}</span>
            </button>
            <button class="action-btn" onclick="toggleRetweet(event, ${post.id})">
                <span>🔄</span>
                <span class="action-count">${post.retweets}</span>
            </button>
            <button class="action-btn" onclick="sharePost(${post.id})">
                <span>📤</span>
            </button>
            <button class="action-btn" onclick="toggleSave(event, ${post.id})">
                <span>${post.saved ? '🔖' : '📌'}</span>
            </button>
        </div>
    `;

    // Add event listener for opening post modal
    postDiv.addEventListener('click', (e) => {
        if (!e.target.closest('.action-btn')) {
            openPostModal(post);
        }
    });

    return postDiv;
}

// Toggle like
function toggleLike(event, postId) {
    event.stopPropagation();
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.liked = !post.liked;
        post.likes += post.liked ? 1 : -1;
        renderPosts();
    }
}

// Toggle retweet
function toggleRetweet(event, postId) {
    event.stopPropagation();
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.retweets += 1;
        renderPosts();
        showNotification('Post retweeted!');
    }
}

// Open comments
function openComments(postId) {
    const post = posts.find(p => p.id === postId);
    if (post) {
        alert(`Comments on "${post.content}"\n\nFeature coming soon!`);
    }
}

// Share post
function sharePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (post) {
        alert(`Share: "${post.content}"\n\nShare feature coming soon!`);
    }
}

// Toggle save post
function toggleSave(event, postId) {
    event.stopPropagation();
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.saved = !post.saved;
        renderPosts();
        showNotification(post.saved ? 'Post saved! 🔖' : 'Post removed from saved');
    }
}

// Open post modal
function openPostModal(post) {
    modalPostContent.innerHTML = `
        <div class="post-header">
            <img src="${post.avatar}" alt="${post.author}" class="post-avatar">
            <div class="post-meta">
                <span class="post-author">${post.author}</span>
                <span class="post-handle">${post.handle}</span>
                <span class="post-time">${post.timestamp}</span>
            </div>
        </div>
        <div class="post-content" style="margin-top: 1rem; font-size: 1.2rem;">
            ${post.content}
        </div>
        ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
        <div style="margin-top: 1rem; padding: 1rem 0; border-top: 1px solid #e1e8ed; color: #536471; font-size: 0.9rem;">
            ${post.timestamp}
        </div>
        <div class="post-actions" style="border: 1px solid #e1e8ed; border-left: none; border-right: none; border-bottom: none;">
            <button class="action-btn" onclick="toggleLike(event, ${post.id})">
                <span>${post.liked ? '❤️' : '🤍'}</span>
                <span class="action-count">${post.likes}</span>
            </button>
            <button class="action-btn" onclick="openComments(${post.id})">
                <span>💬</span>
                <span class="action-count">${post.comments}</span>
            </button>
            <button class="action-btn" onclick="toggleRetweet(event, ${post.id})">
                <span>🔄</span>
                <span class="action-count">${post.retweets}</span>
            </button>
            <button class="action-btn" onclick="sharePost(${post.id})">
                <span>📤</span>
            </button>
        </div>
    `;
    postModal.style.display = 'block';
}

// Close modal
function closePostModal() {
    postModal.style.display = 'none';
}

// Open menu
function openMenu(event) {
    event.stopPropagation();
    alert('Menu options coming soon!');
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background-color: #1DA1F2;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Add animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initial render
renderPosts();

// Add smooth scroll behavior
document.documentElement.style.scrollBehavior = 'smooth';

