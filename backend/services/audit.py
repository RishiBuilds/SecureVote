import json
from database import get_db_connection


def log_action(action, user_id=None, ip_address=None, metadata=None):
    """Write an entry to the audit log."""
    meta_json = json.dumps(metadata) if metadata else '{}'
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO audit_logs (action, user_id, ip_address, metadata) VALUES (?, ?, ?, ?)',
        (action, user_id, ip_address, meta_json)
    )
    conn.commit()
    conn.close()


def get_audit_logs(limit=100, user_id=None, action_filter=None):
    """Retrieve audit logs with optional filters."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = '''
        SELECT 
            al.id, al.action, al.ip_address, al.metadata, al.timestamp,
            u.full_name as user_name, u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
    '''
    params = []

    if user_id:
        query += ' AND al.user_id = ?'
        params.append(user_id)

    if action_filter:
        query += ' AND al.action LIKE ?'
        params.append(f'%{action_filter}%')

    query += ' ORDER BY al.timestamp DESC LIMIT ?'
    params.append(limit)

    cursor.execute(query, params)
    logs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return logs
