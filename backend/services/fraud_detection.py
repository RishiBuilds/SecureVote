import json
from datetime import datetime, timedelta
from database import get_db_connection


def create_fraud_alert(user_id, election_id, alert_type, details, severity='medium'):
    """Create a new fraud alert in the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO fraud_alerts (user_id, election_id, alert_type, details, severity)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_id, election_id, alert_type, details, severity))
    conn.commit()
    conn.close()


def check_ip_anomaly(ip_address, election_id):
    """Check if multiple different users have voted from the same IP."""
    if not ip_address:
        return False
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT COUNT(DISTINCT user_id) as count FROM votes WHERE ip_address = ? AND election_id = ?',
        (ip_address, election_id)
    )
    count = cursor.fetchone()['count']
    conn.close()

    if count >= 3:
        create_fraud_alert(
            user_id=None,
            election_id=election_id,
            alert_type='multiple_ip_votes',
            details=f'{count + 1} different users are attempting to vote from IP {ip_address}',
            severity='high' if count >= 5 else 'medium'
        )
        return count >= 5  # Return True if we should fully block (e.g., >= 5 from same IP)
    return False


def check_rapid_submission(user_id):
    """Check if a user has submitted actions suspiciously fast, indicating bot activity."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if this user had a login or register event in the last 2 seconds
    cursor.execute('''
        SELECT count(*) as recent_actions FROM audit_logs 
        WHERE user_id = ? 
        AND timestamp >= datetime("now", "-2 seconds")
    ''', (user_id,))
    
    recent_actions = cursor.fetchone()['recent_actions']
    conn.close()

    if recent_actions > 5:
        create_fraud_alert(
            user_id=user_id,
            election_id=None,
            alert_type='rapid_api_usage',
            details='User triggered > 5 protected API actions in within 2 seconds. Possible scripted bot.',
            severity='high'
        )
        return True
    return False