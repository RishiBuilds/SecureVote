const API_URL = 'http://127.0.0.1:5000';

let currentAdmin = null;

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
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/admin/me`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            currentAdmin = data;
            document.getElementById('admin-name').textContent = `Admin: ${escapeHtml(data.username)}`;
            loadStatistics();
        } else {
            window.location.href = 'admin-login.html';
        }
    } catch (error) {
        window.location.href = 'admin-login.html';
    }
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');

            hideMessages();
            switch(tabName) {
                case 'stats':
                    loadStatistics();
                    break;
                case 'candidates':
                    loadCandidates();
                    break;
                case 'voters':
                    loadVoters();
                    break;
                case 'votes':
                    loadVotes();
                    break;
                case 'results':
                    loadResults();
                    break;
            }
        });
    });
}

async function loadStatistics() {
    setLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/admin/stats`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('stat-voters').textContent = data.total_voters;
            document.getElementById('stat-votes').textContent = data.total_votes;
            document.getElementById('stat-turnout').textContent = data.turnout_percentage + '%';
            document.getElementById('stat-candidates').textContent = data.total_candidates;
        } else {
            showError('Failed to load statistics');
        }
    } catch (error) {
        showError('Network error while loading statistics');
    } finally {
        setLoading(false);
    }
}

async function loadCandidates() {
    setLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/candidates`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            renderCandidates(data.candidates);
        } else {
            showError('Failed to load candidates');
        }
    } catch (error) {
        showError('Network error while loading candidates');
    } finally {
        setLoading(false);
    }
}

function renderCandidates(candidates) {
    const container = document.getElementById('candidates-list');
    
    if (candidates.length === 0) {
        container.innerHTML = '<p>No candidates yet.</p>';
        return;
    }
    
    let html = '<table><thead><tr><th>ID</th><th>Name</th><th>Party</th><th>Symbol</th><th>Actions</th></tr></thead><tbody>';
    
    candidates.forEach(c => {
        html += `
            <tr>
                <td>${c.id}</td>
                <td>${escapeHtml(c.candidate_name)}</td>
                <td>${escapeHtml(c.party_name)}</td>
                <td>${escapeHtml(c.symbol || '-')}</td>
                <td><button class="btn-delete" onclick="deleteCandidate(${c.id})">Delete</button></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

document.getElementById('add-candidate-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();
    
    const candidate_name = document.getElementById('candidate_name').value.trim();
    const party_name = document.getElementById('party_name').value.trim();
    const symbol = document.getElementById('symbol').value.trim();
    
    if (!candidate_name || !party_name) {
        showError('Candidate name and party name are required');
        return;
    }
    
    setLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/admin/add-candidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ candidate_name, party_name, symbol })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Candidate added successfully');
            document.getElementById('add-candidate-form').reset();
            loadCandidates();
        } else {
            showError(data.error || 'Failed to add candidate');
        }
    } catch (error) {
        showError('Network error');
    } finally {
        setLoading(false);
    }
});

async function deleteCandidate(id) {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    
    setLoading(true);
    hideMessages();
    
    try {
        const response = await fetch(`${API_URL}/admin/delete-candidate/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Candidate deleted successfully');
            loadCandidates();
        } else {
            showError(data.error || 'Failed to delete candidate');
        }
    } catch (error) {
        showError('Network error');
    } finally {
        setLoading(false);
    }
}

async function loadVoters() {
    setLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/admin/voters`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('voters-count').textContent = data.total;
            renderVoters(data.voters);
        } else {
            showError('Failed to load voters');
        }
    } catch (error) {
        showError('Network error');
    } finally {
        setLoading(false);
    }
}

function renderVoters(voters) {
    const container = document.getElementById('voters-list');
    
    if (voters.length === 0) {
        container.innerHTML = '<p>No voters registered yet.</p>';
        return;
    }
    
    let html = '<table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Status</th><th>Registered</th></tr></thead><tbody>';
    
    voters.forEach(v => {
        const status = v.has_voted ? '✅ Voted' : '⏳ Not Voted';
        html += `
            <tr>
                <td>${v.id}</td>
                <td>${escapeHtml(v.full_name)}</td>
                <td>${escapeHtml(v.email)}</td>
                <td>${status}</td>
                <td>${v.created_at}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function loadVotes() {
    setLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/admin/votes`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('votes-count').textContent = data.total;
            renderVotes(data.votes);
        } else {
            showError('Failed to load votes');
        }
    } catch (error) {
        showError('Network error');
    } finally {
        setLoading(false);
    }
}

function renderVotes(votes) {
    const container = document.getElementById('votes-list');
    
    if (votes.length === 0) {
        container.innerHTML = '<p>No votes cast yet.</p>';
        return;
    }
    
    let html = '<table><thead><tr><th>Voter</th><th>Candidate</th><th>Party</th><th>Timestamp</th></tr></thead><tbody>';
    
    votes.forEach(v => {
        html += `
            <tr>
                <td>${escapeHtml(v.voter_name)}</td>
                <td>${escapeHtml(v.candidate_name)}</td>
                <td>${escapeHtml(v.party_name)}</td>
                <td>${v.timestamp}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function loadResults() {
    setLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/admin/results`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            renderResults(data.results);
        } else {
            showError('Failed to load results');
        }
    } catch (error) {
        showError('Network error');
    } finally {
        setLoading(false);
    }
}

function renderResults(results) {
    const container = document.getElementById('results-list');
    
    if (results.length === 0) {
        container.innerHTML = '<p>No results available yet.</p>';
        return;
    }
    
    let html = '';
    
    results.forEach(r => {
        const rankClass = r.rank <= 3 ? `rank-${r.rank}` : '';
        html += `
            <div style="margin-bottom: 20px;">
                <div>
                    <span class="rank-badge ${rankClass}">Rank ${r.rank}</span>
                    <strong>${escapeHtml(r.candidate_name)}</strong> - ${escapeHtml(r.party_name)}
                </div>
                <div class="result-bar">
                    <div class="result-fill" style="width: ${r.percentage}%">
                        ${r.vote_count} votes (${r.percentage}%)
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function logout() {
    try {
        await fetch(`${API_URL}/admin/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        localStorage.removeItem('admin_authenticated');
        localStorage.removeItem('admin_username');
        window.location.href = 'index.html';
    } catch (error) {
        window.location.href = 'index.html';
    }
}

document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('refresh-stats-btn').addEventListener('click', loadStatistics);

setupTabs();
checkAuth();
