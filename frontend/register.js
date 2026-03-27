


document.getElementById('password').addEventListener('input', (e) => {
    const pwd = e.target.value;
    const bar = document.getElementById('strength-bar');
    const text = document.getElementById('strength-text');

    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    const levels = [
        { width: '0%', color: '#e2e8f0', label: '' },
        { width: '20%', color: '#EF4444', label: 'Weak' },
        { width: '40%', color: '#F59E0B', label: 'Fair' },
        { width: '60%', color: '#F59E0B', label: 'Good' },
        { width: '80%', color: '#10B981', label: 'Strong' },
        { width: '100%', color: '#059669', label: 'Very Strong' },
    ];

    const level = levels[score];
    bar.style.width = level.width;
    bar.style.background = level.color;
    text.textContent = level.label;
    text.style.color = level.color;
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('register-btn');
    const loading = document.getElementById('loading');

    const full_name = document.getElementById('full_name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!full_name || !email || !password) {
        Toast.error('Please fill in all fields.');
        return;
    }
    if (password.length < 6) {
        Toast.error('Password must be at least 6 characters.');
        return;
    }

    btn.disabled = true;
    loading.style.display = 'flex';

    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            Auth.setToken(data.token);
            Auth.setUser(data.user);
            Toast.success('Account created! Redirecting...');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 800);
        } else {
            Toast.error(data.error || 'Registration failed');
            btn.disabled = false;
            loading.style.display = 'none';
        }
    } catch (err) {
        Toast.error('Network error. Please check your connection.');
        btn.disabled = false;
        loading.style.display = 'none';
    }
});

if (Auth.isAuthenticated()) {
    window.location.href = '/dashboard.html';
}
