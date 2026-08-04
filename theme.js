function initDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    if (!toggle) return;

    const savedMode = localStorage.getItem('darkMode');
    const isDarkMode = savedMode === 'enabled';

    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        toggle.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        toggle.textContent = '🌙';
    }

    toggle.addEventListener('click', () => {
        const enabled = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', enabled ? 'enabled' : 'disabled');
        toggle.textContent = enabled ? '☀️' : '🌙';
    });
}

document.addEventListener('DOMContentLoaded', initDarkMode);
