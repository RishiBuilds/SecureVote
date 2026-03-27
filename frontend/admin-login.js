const API_URL = 'http://127.0.0.1:5000';

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideMessages() {
    document.getElementById('error-message').style.display = 'none';
}

function setLoading(isLoading) {
    document.getElementById('loading').style.display = isLoading ? 'block' : 'none';
    document.getElementById('admin-login-form').style.display = isLoading ? 'none' : 'block';
}

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showError('All fields are required');
        return;
    }
    
    setLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('admin_authenticated', 'true');
            localStorage.setItem('admin_username', data.admin.username);
            window.location.href = 'admin-dashboard.html';
        } else {
            showError(data.error || 'Login failed');
            setLoading(false);
        }
    } catch (error) {
        showError('Network error. Please check your connection and try again.');
        setLoading(false);
    }
});
