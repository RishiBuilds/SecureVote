

let adminChart = null;
let electionsCache = [];

function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t || '';
    return d.innerHTML;
}

function setLoading(v) {
    document.getElementById('loading').style.display = v ? 'flex' : 'none';
}


async function init() {
    if (!Auth.requireAuth('admin')) return;
    const user = Auth.getUser();
    document.getElementById('admin-name').textContent = `Admin: ${user?.full_name || 'Admin'}`;
    setupTabs();
    await loadOverview();
}


function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    const titles = {
        overview: 'Overview', elections: 'Elections', candidates: 'Candidates',
        results: 'Results & Analytics', voters: 'Registered Voters',
        votes: 'Vote Ledger', fraud: 'Fraud Alerts', audit: 'Audit Trail'
    };
    document.getElementById('page-title').textContent = titles[tabName] || 'Dashboard';

    
    const loaders = {
        overview: loadOverview, elections: loadElections, candidates: loadCandidates,
        results: loadResultsTab, voters: loadVoters, votes: loadVotes,
        fraud: loadFraudAlerts, audit: loadAuditLogs
    };
    if (loaders[tabName]) loaders[tabName]();
}


async function loadOverview() {
    setLoading(true);
    try {
        const res = await Auth.request('/api/admin/stats');
        if (!res || !res.ok) return;
        const d = await res.json();

        document.getElementById('stats-grid').innerHTML = `
            <div class="stat-card">
                <div class="stat-icon" style="background:#DBEAFE; color:#2563EB;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <div class="stat-value">${d.total_voters}</div>
                <div class="stat-label">Registered Voters</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#EDE9FE; color:#7C3AED;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18 13h-5v5c0 .55-.45 1-1 1s-1-.45-1-1v-5H6c-.55 0-1-.45-1-1s.45-1 1-1h5V6c0-.55.45-1 1-1s1 .45 1 1v5h5c.55 0 1 .45 1 1s-.45 1-1 1z"/></svg>
                </div>
                <div class="stat-value">${d.total_votes}</div>
                <div class="stat-label">Votes Cast</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#D1FAE5; color:#059669;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/></svg>
                </div>
                <div class="stat-value">${d.turnout_percentage}%</div>
                <div class="stat-label">Turnout</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#FEF3C7; color:#D97706;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
                </div>
                <div class="stat-value">${d.active_elections}</div>
                <div class="stat-label">Active Elections</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#F1F5F9; color:#475569;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3z"/></svg>
                </div>
                <div class="stat-value">${d.total_candidates}</div>
                <div class="stat-label">Candidates</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:${d.unresolved_alerts > 0 ? '#FEE2E2' : '#D1FAE5'}; color:${d.unresolved_alerts > 0 ? '#DC2626' : '#059669'};">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                </div>
                <div class="stat-value">${d.unresolved_alerts}</div>
                <div class="stat-label">Fraud Alerts</div>
            </div>
        `;
    } catch (e) {
        Toast.error('Failed to load statistics');
    } finally {
        setLoading(false);
    }
}


async function loadElections() {
    setLoading(true);
    try {
        const res = await Auth.request('/api/admin/elections');
        if (!res || !res.ok) return;
        const data = await res.json();
        electionsCache = data.elections;
        renderElections(data.elections);
    } catch (e) {
        Toast.error('Failed to load elections');
    } finally {
        setLoading(false);
    }
}

function renderElections(elections) {
    const container = document.getElementById('elections-list');
    if (!elections.length) {
        container.innerHTML = '<div class="empty-state"><h3>No elections yet</h3><p>Create your first election above.</p></div>';
        return;
    }

    let html = '<table><thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Candidates</th><th>Votes</th><th>Actions</th></tr></thead><tbody>';
    elections.forEach(e => {
        const statusClass = e.status === 'active' ? 'badge-success' : e.status === 'ended' ? 'badge-error' : 'badge-neutral';
        html += `<tr>
            <td>#${e.id}</td>
            <td><strong>${escapeHtml(e.title)}</strong><br><span style="font-size:0.78rem;color:var(--color-text-muted);">${escapeHtml(e.description || '')}</span></td>
            <td><span class="badge ${statusClass}">${e.status}</span></td>
            <td>${e.candidate_count}</td>
            <td>${e.vote_count}</td>
            <td style="display:flex;gap:6px;flex-wrap:wrap;">
                ${e.status === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="updateElection(${e.id}, 'active')">Start</button>` : ''}
                ${e.status === 'active' ? `<button class="btn btn-danger btn-sm" onclick="updateElection(${e.id}, 'ended')">End</button>` : ''}
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = `<div class="table-container">${html}</div>`;
}

document.getElementById('create-election-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('election_title').value.trim();
    const description = document.getElementById('election_desc').value.trim();
    if (!title) return Toast.warning('Title is required');

    try {
        const res = await Auth.request('/api/admin/election', {
            method: 'POST',
            body: JSON.stringify({ title, description }),
        });
        const data = await res.json();
        if (res.ok) {
            Toast.success('Election created!');
            document.getElementById('create-election-form').reset();
            loadElections();
        } else {
            Toast.error(data.error);
        }
    } catch (e) { Toast.error('Network error'); }
});

async function updateElection(id, status) {
    const action = status === 'active' ? 'start' : 'end';
    if (!confirm(`Are you sure you want to ${action} this election?`)) return;

    try {
        const res = await Auth.request(`/api/admin/election/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
        if (res.ok) {
            Toast.success(`Election ${action}ed successfully`);
            loadElections();
        } else {
            const d = await res.json();
            Toast.error(d.error);
        }
    } catch (e) { Toast.error('Network error'); }
}


async function loadCandidates() {
    setLoading(true);
    try {
        
        const eRes = await Auth.request('/api/admin/elections');
        if (eRes && eRes.ok) {
            const eData = await eRes.json();
            electionsCache = eData.elections;
            const select = document.getElementById('cand_election');
            select.innerHTML = '<option value="">Select election</option>' +
                eData.elections.map(e => `<option value="${e.id}">${escapeHtml(e.title)}</option>`).join('');
        }

        
        if (electionsCache.length > 0) {
            let allCandidates = [];
            for (const el of electionsCache) {
                const res = await Auth.request(`/api/elections/${el.id}/candidates`);
                if (res && res.ok) {
                    const data = await res.json();
                    allCandidates.push(...data.candidates.map(c => ({ ...c, election_title: el.title, election_id: el.id })));
                }
            }
            renderCandidatesTable(allCandidates);
        }
    } catch (e) {
        Toast.error('Failed to load candidates');
    } finally {
        setLoading(false);
    }
}

function renderCandidatesTable(candidates) {
    const container = document.getElementById('candidates-list');
    if (!candidates.length) {
        container.innerHTML = '<div class="empty-state"><h3>No candidates yet</h3><p>Add candidates using the form above.</p></div>';
        return;
    }

    let html = '<table><thead><tr><th>ID</th><th>Name</th><th>Party</th><th>Symbol</th><th>Election</th><th>Actions</th></tr></thead><tbody>';
    candidates.forEach(c => {
        html += `<tr>
            <td>#${c.id}</td>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td>${escapeHtml(c.party)}</td>
            <td>${escapeHtml(c.symbol || '-')}</td>
            <td><span class="badge badge-neutral">${escapeHtml(c.election_title)}</span></td>
            <td><button class="btn-delete" onclick="deleteCandidate(${c.id})">Delete</button></td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

document.getElementById('add-candidate-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const election_id = parseInt(document.getElementById('cand_election').value);
    const name = document.getElementById('cand_name').value.trim();
    const party = document.getElementById('cand_party').value.trim();
    const symbol = document.getElementById('cand_symbol').value.trim();
    const description = document.getElementById('cand_desc').value.trim();

    if (!election_id || !name || !party) return Toast.warning('Election, name, and party are required');

    try {
        const res = await Auth.request('/api/admin/candidate', {
            method: 'POST',
            body: JSON.stringify({ election_id, name, party, symbol, description }),
        });
        const data = await res.json();
        if (res.ok) {
            Toast.success('Candidate added!');
            document.getElementById('add-candidate-form').reset();
            document.getElementById('cand_symbol').value = '👤';
            loadCandidates();
        } else {
            Toast.error(data.error);
        }
    } catch (e) { Toast.error('Network error'); }
});

async function deleteCandidate(id) {
    if (!confirm('Delete this candidate?')) return;
    try {
        const res = await Auth.request(`/api/admin/candidate/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            Toast.success('Candidate deleted');
            loadCandidates();
        } else {
            Toast.error(data.error);
        }
    } catch (e) { Toast.error('Network error'); }
}


async function loadResultsTab() {
    setLoading(true);
    try {
        const eRes = await Auth.request('/api/admin/elections');
        if (eRes && eRes.ok) {
            const data = await eRes.json();
            electionsCache = data.elections;
            const select = document.getElementById('results-election');
            select.innerHTML = data.elections.map(e =>
                `<option value="${e.id}">${escapeHtml(e.title)} (${e.status})</option>`
            ).join('');
            if (data.elections.length > 0) {
                await loadResultsForElection(data.elections[0].id);
            }
        }
    } catch (e) {
        Toast.error('Failed to load results');
    } finally {
        setLoading(false);
    }
}

document.getElementById('results-election').addEventListener('change', (e) => {
    loadResultsForElection(parseInt(e.target.value));
});

async function loadResultsForElection(electionId) {
    try {
        const res = await Auth.request(`/api/results/${electionId}`);
        if (!res || !res.ok) return;
        const data = await res.json();

        const container = document.getElementById('results-content');
        if (data.results.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No votes yet</h3></div>';
            return;
        }

        let html = `<p style="margin-bottom:var(--spacing-4);color:var(--color-text-muted);font-weight:600;">Total votes: ${data.total_votes}</p>`;
        data.results.forEach(r => {
            const rankClass = r.rank <= 3 ? `rank-${r.rank}` : '';
            html += `<div style="margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <div><span class="rank-badge ${rankClass}">#${r.rank}</span> <strong>${escapeHtml(r.name)}</strong> · ${escapeHtml(r.party)}</div>
                    <span style="font-weight:700;color:var(--color-accent);">${r.vote_count} (${r.percentage}%)</span>
                </div>
                <div class="result-bar"><div class="result-fill" style="width:${r.percentage}%"></div></div>
            </div>`;
        });
        container.innerHTML = html;

        
        const ctx = document.getElementById('admin-results-chart');
        if (adminChart) adminChart.destroy();
        const colors = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#8B5CF6', '#EF4444'];
        adminChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.results.map(r => `${r.name} (${r.party})`),
                datasets: [{
                    data: data.results.map(r => r.vote_count),
                    backgroundColor: colors.slice(0, data.results.length),
                    borderWidth: 2, borderColor: '#fff',
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { family: 'Inter', size: 11 } } } },
                cutout: '55%',
            }
        });

        
        document.getElementById('verify-chain-btn').dataset.electionId = electionId;
    } catch (e) {  }
}

document.getElementById('verify-chain-btn').addEventListener('click', async () => {
    const electionId = document.getElementById('verify-chain-btn').dataset.electionId;
    if (!electionId) return Toast.warning('Select an election first');

    try {
        const res = await Auth.request(`/api/admin/verify-chain/${electionId}`);
        if (!res || !res.ok) return;
        const data = await res.json();

        const div = document.getElementById('chain-result');
        if (data.chain_valid) {
            div.innerHTML = `<div class="alert alert-success">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                Chain VALID — All ${data.details.total} votes verified. No tampering detected.
            </div>`;
        } else {
            div.innerHTML = `<div class="alert alert-error">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                Chain BROKEN — ${data.details.errors.length} integrity error(s) detected!
            </div>`;
        }
    } catch (e) { Toast.error('Chain verification failed'); }
});


async function loadVoters() {
    setLoading(true);
    try {
        const res = await Auth.request('/api/admin/voters');
        if (!res || !res.ok) return;
        const data = await res.json();
        document.getElementById('voters-count').textContent = data.total;

        if (!data.voters.length) {
            document.getElementById('voters-list').innerHTML = '<div class="empty-state"><h3>No voters registered</h3></div>';
            return;
        }

        let html = '<table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Elections Voted</th><th>Registered</th></tr></thead><tbody>';
        data.voters.forEach(v => {
            html += `<tr>
                <td>#${v.id}</td>
                <td>${escapeHtml(v.full_name)}</td>
                <td>${escapeHtml(v.email)}</td>
                <td><span class="badge ${v.elections_voted > 0 ? 'badge-success' : 'badge-neutral'}">${v.elections_voted}</span></td>
                <td>${v.created_at}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('voters-list').innerHTML = html;
    } catch (e) { Toast.error('Failed to load voters'); }
    finally { setLoading(false); }
}


async function loadVotes() {
    setLoading(true);
    try {
        const res = await Auth.request('/api/admin/votes');
        if (!res || !res.ok) return;
        const data = await res.json();
        document.getElementById('votes-count').textContent = data.total;

        if (!data.votes.length) {
            document.getElementById('votes-list').innerHTML = '<div class="empty-state"><h3>No votes cast yet</h3></div>';
            return;
        }

        let html = '<table><thead><tr><th>Voter</th><th>Candidate</th><th>Election</th><th>Hash</th><th>Prev Hash</th><th>IP</th><th>Time</th></tr></thead><tbody>';
        data.votes.forEach(v => {
            html += `<tr>
                <td>${escapeHtml(v.voter_name)}</td>
                <td><strong>${escapeHtml(v.candidate_name)}</strong><br><span style="font-size:0.75rem;color:var(--color-text-muted);">${escapeHtml(v.candidate_party)}</span></td>
                <td><span class="badge badge-neutral">${escapeHtml(v.election_title)}</span></td>
                <td style="font-family:monospace;font-size:0.72rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;" title="${v.vote_hash}">${v.vote_hash.substring(0,16)}…</td>
                <td style="font-family:monospace;font-size:0.72rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;" title="${v.previous_hash}">${v.previous_hash.substring(0,16)}…</td>
                <td>${v.ip_address || '-'}</td>
                <td style="white-space:nowrap;">${v.timestamp}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('votes-list').innerHTML = html;
    } catch (e) { Toast.error('Failed to load votes'); }
    finally { setLoading(false); }
}


async function loadFraudAlerts() {
    setLoading(true);
    try {
        const res = await Auth.request('/api/admin/fraud-alerts');
        if (!res || !res.ok) return;
        const data = await res.json();
        document.getElementById('fraud-count').textContent = data.total;

        if (!data.alerts.length) {
            document.getElementById('fraud-list').innerHTML = '<div class="empty-state" style="padding:var(--spacing-8);"><h3>No fraud alerts</h3><p>The system is monitoring for suspicious activity.</p></div>';
            return;
        }

        let html = '<table><thead><tr><th>Type</th><th>Severity</th><th>Details</th><th>User</th><th>Election</th><th>Status</th><th>Time</th><th>Action</th></tr></thead><tbody>';
        data.alerts.forEach(a => {
            const sevClass = `severity-${a.severity}`;
            html += `<tr>
                <td><strong>${escapeHtml(a.alert_type)}</strong></td>
                <td><span class="severity-badge ${sevClass}">${a.severity}</span></td>
                <td style="max-width:200px;font-size:0.82rem;">${escapeHtml(a.details)}</td>
                <td>${escapeHtml(a.user_name || '-')}</td>
                <td>${escapeHtml(a.election_title || '-')}</td>
                <td><span class="badge ${a.resolved ? 'badge-success' : 'badge-warning'}">${a.resolved ? 'Resolved' : 'Open'}</span></td>
                <td style="white-space:nowrap;">${a.timestamp}</td>
                <td>${!a.resolved ? `<button class="btn btn-sm btn-secondary" onclick="resolveFraud(${a.id})">Resolve</button>` : ''}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('fraud-list').innerHTML = html;
    } catch (e) { Toast.error('Failed to load fraud alerts'); }
    finally { setLoading(false); }
}

async function resolveFraud(alertId) {
    try {
        const res = await Auth.request(`/api/admin/fraud-alerts/${alertId}/resolve`, { method: 'PUT' });
        if (res.ok) {
            Toast.success('Alert resolved');
            loadFraudAlerts();
        }
    } catch (e) { Toast.error('Failed to resolve alert'); }
}


async function loadAuditLogs() {
    setLoading(true);
    try {
        const res = await Auth.request('/api/admin/audit-logs');
        if (!res || !res.ok) return;
        const data = await res.json();
        document.getElementById('audit-count').textContent = data.total;

        if (!data.logs.length) {
            document.getElementById('audit-list').innerHTML = '<div class="empty-state"><h3>No audit logs</h3></div>';
            return;
        }

        let html = '<table><thead><tr><th>Action</th><th>User</th><th>IP</th><th>Details</th><th>Time</th></tr></thead><tbody>';
        data.logs.forEach(l => {
            const actionColors = {
                'login_success': 'badge-success', 'login_failed': 'badge-error',
                'user_registered': 'badge-info', 'vote_cast': 'badge-success',
                'election_created': 'badge-info', 'election_updated': 'badge-warning',
                'candidate_added': 'badge-info', 'candidate_deleted': 'badge-error',
            };
            const badgeClass = actionColors[l.action] || 'badge-neutral';

            let metaStr = '-';
            try {
                const meta = JSON.parse(l.metadata || '{}');
                metaStr = Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join(', ');
            } catch (e) { }

            html += `<tr>
                <td><span class="badge ${badgeClass}">${escapeHtml(l.action)}</span></td>
                <td>${escapeHtml(l.user_name || '-')}<br><span style="font-size:0.75rem;color:var(--color-text-muted);">${escapeHtml(l.user_email || '')}</span></td>
                <td>${escapeHtml(l.ip_address || '-')}</td>
                <td style="max-width:220px;font-size:0.8rem;color:var(--color-text-muted);">${escapeHtml(metaStr)}</td>
                <td style="white-space:nowrap;">${l.timestamp}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('audit-list').innerHTML = html;
    } catch (e) { Toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
}


document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());


init();
