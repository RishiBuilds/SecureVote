const API_URL = 'http://127.0.0.1:5000';

let currentVoter = null;
let candidates = [];
let selectedCandidateId = null;

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
        const response = await fetch(`${API_URL}/me`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            currentVoter = data;
            updateUI();
            await loadCandidates();
        } else {
            window.location.href = 'login.html';
        }
    } catch (error) {
        showError('Failed to verify authentication');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
}

function updateUI() {
    if (!currentVoter) return;
    
    document.getElementById('welcome-message').textContent = 
        `Welcome, ${escapeHtml(currentVoter.full_name)}!`;
    
    const statusDiv = document.getElementById('voting-status');
    
    if (currentVoter.has_voted) {
        statusDiv.className = 'voting-status status-voted';
        statusDiv.innerHTML = '<svg style="width:20px;height:20px;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> You have already securely cast your vote.';
        document.getElementById('vote-action').style.display = 'none';

        document.querySelectorAll('.candidate-card').forEach(card => {
            card.classList.add('disabled');
        });
    } else {
        statusDiv.className = 'voting-status status-not-voted';
        statusDiv.innerHTML = '<svg style="width:20px;height:20px;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg> Action Required: You have not voted yet.';
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
            candidates = data.candidates;
            renderCandidates();
        } else {
            showError('Failed to load candidates');
        }
    } catch (error) {
        showError('Network error while loading candidates');
    } finally {
        setLoading(false);
    }
}

function renderCandidates() {
    const grid = document.getElementById('candidates-grid');
    grid.innerHTML = '';
    
    if (candidates.length === 0) {
        grid.innerHTML = '<p>No candidates available yet.</p>';
        return;
    }
    
    candidates.forEach(candidate => {
        const card = document.createElement('div');
        card.className = 'candidate-card';
        card.dataset.candidateId = candidate.id;
        
        card.innerHTML = `
            <div class="candidate-symbol">${escapeHtml(candidate.symbol || '👤')}</div>
            <div class="candidate-name">${escapeHtml(candidate.candidate_name)}</div>
            <div class="candidate-party">${escapeHtml(candidate.party_name)}</div>
        `;

        if (!currentVoter.has_voted) {
            card.addEventListener('click', () => selectCandidate(candidate.id));
        } else {
            card.classList.add('disabled');
        }
        
        grid.appendChild(card);
    });
}

function selectCandidate(candidateId) {
    if (currentVoter.has_voted) return;
    
    selectedCandidateId = candidateId;
    document.querySelectorAll('.candidate-card').forEach(card => {
        if (card.dataset.candidateId == candidateId) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    document.getElementById('vote-action').style.display = 'block';
}

function showConfirmModal() {
    if (!selectedCandidateId) {
        showError('Please select a candidate first');
        return;
    }
    
    const candidate = candidates.find(c => c.id === selectedCandidateId);
    document.getElementById('modal-candidate-name').textContent = candidate.candidate_name;
    document.getElementById('modal-candidate-party').textContent = candidate.party_name;
    
    document.getElementById('confirm-modal').style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').style.display = 'none';
}

async function castVote() {
    closeConfirmModal();
    setLoading(true);
    hideMessages();
    
    try {
        const response = await fetch(`${API_URL}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ candidate_id: selectedCandidateId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Vote cast successfully! Your vote has been securely recorded.');
            currentVoter.has_voted = true;
            updateUI();
            renderCandidates();
            document.getElementById('vote-action').style.display = 'none';
        } else {
            showError(data.error || 'Failed to cast vote');
        }
    } catch (error) {
        showError('Network error while casting vote');
    } finally {
        setLoading(false);
    }
}

async function logout() {
    try {
        await fetch(`${API_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        localStorage.removeItem('voter_authenticated');
        localStorage.removeItem('voter_name');
        window.location.href = 'index.html';
    } catch (error) {
        window.location.href = 'index.html';
    }
}

document.getElementById('cast-vote-btn').addEventListener('click', showConfirmModal);
document.getElementById('modal-cancel-btn').addEventListener('click', closeConfirmModal);
document.getElementById('modal-confirm-btn').addEventListener('click', castVote);
document.getElementById('logout-btn').addEventListener('click', logout);

checkAuth();
