

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const loading = document.getElementById('loading');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        Toast.error('Please fill in all fields.');
        return;
    }

    btn.disabled = true;
    loading.style.display = 'flex';

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            if (data.user.role !== 'admin') {
                Toast.error('This account does not have admin privileges.');
                btn.disabled = false;
                loading.style.display = 'none';
                return;
            }

            Auth.setToken(data.token);
            Auth.setUser(data.user);
            Toast.success('Admin access granted. Redirecting...');

            setTimeout(() => {
                window.location.href = '/admin-dashboard.html';
            }, 800);
        } else {
            Toast.error(data.error || 'Login failed');
            btn.disabled = false;
            loading.style.display = 'none';
        }
    } catch (err) {
        Toast.error('Network error. Please check your connection.');
        btn.disabled = false;
        loading.style.display = 'none';
    }
});


if (Auth.isAuthenticated() && Auth.isAdmin()) {
    window.location.href = '/admin-dashboard.html';
}
