
const API_URL = window.location.origin;

const Auth = {
    getToken() {
        return localStorage.getItem('sv_token');
    },

    setToken(token) {
        localStorage.setItem('sv_token', token);
    },

    getUser() {
        const raw = localStorage.getItem('sv_user');
        return raw ? JSON.parse(raw) : null;
    },

    setUser(user) {
        localStorage.setItem('sv_user', JSON.stringify(user));
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    },

    logout() {
        localStorage.removeItem('sv_token');
        localStorage.removeItem('sv_user');
        window.location.href = '/index.html';
    },

    
    async request(url, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${API_URL}${url}`, {
                ...options,
                headers,
            });

            
            if (response.status === 401) {
                this.logout();
                return null;
            }

            return response;
        } catch (err) {
            console.error('API request failed:', err);
            throw err;
        }
    },

    
    requireAuth(requiredRole = null) {
        if (!this.isAuthenticated()) {
            window.location.href = '/login.html';
            return false;
        }
        if (requiredRole === 'admin' && !this.isAdmin()) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }
};
