

let currentUser = null;
let elections = [];
let candidates = [];
let selectedCandidateId = null;
let currentElectionId = null;
let hasVoted = false;
let resultsChart = null;

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}


async function init() {
    if (!Auth.requireAuth()) return;

    try {
        const res = await Auth.request('/api/me');
        if (!res || !res.ok) return;
        currentUser = await res.json();

        if (currentUser.role === 'admin') {
            window.location.href = '/admin-dashboard.html';
            return;
        }

        document.getElementById('welcome-message').textContent = `Welcome, ${currentUser.full_name}!`;
        await loadElections();
    } catch (err) {
        Toast.error('Failed to load dashboard');
    }
}


async function loadElections() {
    try {
        const res = await Auth.request('/api/elections');
        if (!res || !res.ok) return;
        const data = await res.json();
        elections = data.elections;

        const select = document.getElementById('election-select');
        if (elections.length === 0) {
            select.innerHTML = '<option value="">No elections available</option>';
            return;
        }

        select.innerHTML = elections.map(e =>
            `<option value="${e.id}">${escapeHtml(e.title)} — ${e.status.toUpperCase()}</option>`
        ).join('');

        
        const active = elections.find(e => e.status === 'active');
        if (active) select.value = active.id;

        await loadElectionData(parseInt(select.value));
    } catch (err) {
        Toast.error('Failed to load elections');
    }
}

document.getElementById('election-select').addEventListener('change', async (e) => {
    const id = parseInt(e.target.value);
    if (id) await loadElectionData(id);
});

async function loadElectionData(electionId) {
    currentElectionId = electionId;
    selectedCandidateId = null;
    document.getElementById('vote-action').style.display = 'none';
    document.getElementById('loading').style.display = 'flex';

    try {
        const res = await Auth.request(`/api/elections/${electionId}/candidates`);
        if (!res || !res.ok) return;
        const data = await res.json();
        candidates = data.candidates;
        hasVoted = data.has_voted;

        const election = elections.find(e => e.id === electionId);
        updateVotingStatus(election, data.election_status);
        renderCandidates(data.election_status);
        await loadResults(electionId);
    } catch (err) {
        Toast.error('Failed to load election data');
    } finally {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('candidates-section').style.display = 'block';
    }
}

function updateVotingStatus(election, status) {
    const div = document.getElementById('voting-status');
    div.style.display = 'flex';

    if (status !== 'active') {
        div.className = 'voting-status status-closed';
        div.innerHTML = `
            <svg style="width:20px;height:20px;" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
            This election is currently ${status}. Voting is not available.
        `;
    } else if (hasVoted) {
        div.className = 'voting-status status-voted';
        div.innerHTML = `
            <svg style="width:20px;height:20px;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            Your vote has been securely recorded and sealed in the chain.
        `;
    } else {
        div.className = 'voting-status status-not-voted';
        div.innerHTML = `
            <svg style="width:20px;height:20px;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            Action Required: Please select a candidate and cast your vote.
        `;
    }
}

function renderCandidates(status) {
    const grid = document.getElementById('candidates-grid');
    grid.innerHTML = '';

    if (candidates.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">
            <h3>No candidates yet</h3>
            <p>Candidates will appear here once added by the election administrator.</p>
        </div>`;
        return;
    }

    const canVote = status === 'active' && !hasVoted;

    candidates.forEach((c, i) => {
        const card = document.createElement('div');
        card.className = `candidate-card fade-in${canVote ? '' : ' disabled'}`;
        card.style.animationDelay = `${i * 0.06}s`;
        card.dataset.candidateId = c.id;

        card.innerHTML = `
            <div class="candidate-symbol">${escapeHtml(c.symbol || '👤')}</div>
            <div class="candidate-name">${escapeHtml(c.name)}</div>
            <div class="candidate-party">${escapeHtml(c.party)}</div>
            ${c.description ? `<div class="candidate-desc">${escapeHtml(c.description)}</div>` : ''}
        `;

        if (canVote) {
            card.addEventListener('click', () => selectCandidate(c.id));
        }

        grid.appendChild(card);
    });
}

function selectCandidate(id) {
    selectedCandidateId = id;
    document.querySelectorAll('.candidate-card').forEach(card => {
        card.classList.toggle('selected', parseInt(card.dataset.candidateId) === id);
    });
    document.getElementById('vote-action').style.display = 'block';
}


document.getElementById('cast-vote-btn').addEventListener('click', () => {
    if (!selectedCandidateId) {
        Toast.warning('Please select a candidate first.');
        return;
    }
    const c = candidates.find(c => c.id === selectedCandidateId);
    document.getElementById('modal-symbol').textContent = c.symbol || '👤';
    document.getElementById('modal-candidate-name').textContent = c.name;
    document.getElementById('modal-candidate-party').textContent = c.party;
    document.getElementById('confirm-modal').classList.add('active');
});

document.getElementById('modal-cancel-btn').addEventListener('click', () => {
    document.getElementById('confirm-modal').classList.remove('active');
});

document.getElementById('modal-confirm-btn').addEventListener('click', castVote);

async function castVote() {
    document.getElementById('confirm-modal').classList.remove('active');
    document.getElementById('loading').style.display = 'flex';

    try {
        const res = await Auth.request('/api/vote', {
            method: 'POST',
            body: JSON.stringify({
                candidate_id: selectedCandidateId,
                election_id: currentElectionId,
            }),
        });

        if (!res) return;
        const data = await res.json();

        if (res.ok) {
            Toast.success('Vote cast successfully! Your vote has been sealed in the blockchain.');
            hasVoted = true;

            
            const receipt = document.getElementById('vote-receipt');
            receipt.style.display = 'block';
            receipt.innerHTML = `
                <strong>🧾 Vote Receipt</strong><br><br>
                <strong>Vote Hash:</strong> ${data.vote.vote_hash}<br>
                <strong>Previous Hash:</strong> ${data.vote.previous_hash}<br>
                <strong>Timestamp:</strong> ${data.vote.timestamp}<br>
                <strong>Vote ID:</strong> #${data.vote.id}
            `;

            updateVotingStatus(null, 'active');
            renderCandidates('active');
            document.getElementById('vote-action').style.display = 'none';
            await loadResults(currentElectionId);
        } else {
            Toast.error(data.error || 'Failed to cast vote');
        }
    } catch (err) {
        Toast.error('Network error while casting vote');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}


async function loadResults(electionId) {
    try {
        const res = await Auth.request(`/api/results/${electionId}`);
        if (!res || !res.ok) return;
        const data = await res.json();

        const section = document.getElementById('results-section');
        if (data.total_votes === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        renderResultsBars(data.results);
        renderResultsChart(data.results);
    } catch (err) {
        
    }
}

function renderResultsBars(results) {
    const container = document.getElementById('results-bars');
    container.innerHTML = results.map(r => `
        <div class="result-bar-wrap">
            <div class="result-bar-header">
                <span class="name">${escapeHtml(r.symbol || '👤')} ${escapeHtml(r.name)} · ${escapeHtml(r.party)}</span>
                <span class="pct">${r.vote_count} votes (${r.percentage}%)</span>
            </div>
            <div class="result-bar">
                <div class="fill" style="width: ${r.percentage}%"></div>
            </div>
        </div>
    `).join('');
}

function renderResultsChart(results) {
    const ctx = document.getElementById('results-chart');
    if (resultsChart) resultsChart.destroy();

    const colors = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#8B5CF6', '#EF4444'];

    resultsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: results.map(r => `${r.name} (${r.party})`),
            datasets: [{
                data: results.map(r => r.vote_count),
                backgroundColor: colors.slice(0, results.length),
                borderWidth: 2,
                borderColor: '#fff',
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 16,
                        usePointStyle: true,
                        font: { family: 'Inter', size: 12, weight: '500' },
                    }
                }
            },
            cutout: '60%',
        }
    });
}


document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());


init();
