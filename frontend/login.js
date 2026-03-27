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
    document.getElementById('login-form').style.display = isLoading ? 'none' : 'block';
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showError('All fields are required');
        return;
    }
    
    setLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', 
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('voter_authenticated', 'true');
            localStorage.setItem('voter_name', data.voter.full_name);
            window.location.href = 'dashboard.html';
        } else {
            showError(data.error || 'Login failed');
            setLoading(false);
        }
    } catch (error) {
        showError('Network error. Please check your connection and try again.');
        setLoading(false);
    }
});
