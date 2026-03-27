const API_URL = 'http://127.0.0.1:5000';

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    document.getElementById('success-message').style.display = 'none';
}

function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    document.getElementById('error-message').style.display = 'none';
}

function hideMessages() {
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('success-message').style.display = 'none';
}

function setLoading(isLoading) {
    document.getElementById('loading').style.display = isLoading ? 'block' : 'none';
    document.getElementById('register-form').style.display = isLoading ? 'none' : 'block';
}

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();
    
    const full_name = document.getElementById('full_name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!full_name || !email || !password) {
        showError('All fields are required');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }
    
    setLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ full_name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showError(data.error || 'Registration failed');
            setLoading(false);
        }
    } catch (error) {
        showError('Network error. Please check your connection and try again.');
        setLoading(false);
    }
});
