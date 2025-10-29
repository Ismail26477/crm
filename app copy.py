# app.py (revised)
import os
import json
import uuid
import re
import traceback
from datetime import datetime

import pyodbc
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS

# ---------- Configuration ----------
app = Flask(__name__)
CORS(app)  # enable CORS for API access from frontend during development

app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['TEMPLATES_AUTO_RELOAD'] = True

# DB config - prefer to set these as environment variables in production
DB_CONFIG = {
    'server': os.environ.get('DB_SERVER', 'crmserver123.database.windows.net'),
    'database': os.environ.get('DB_NAME', 'CRMDatabase'),
    'username': os.environ.get('DB_USER', 'Ismail'),
    'password': os.environ.get('DB_PASS', 'Aamir@10'),
    'driver': os.environ.get('DB_DRIVER', '{ODBC Driver 18 for SQL Server}'),
    'port': os.environ.get('DB_PORT', '1433')
}

DEBUG_MODE = os.environ.get('FLASK_DEBUG', '1') == '1'


# ---------- Helpers ----------
def get_db_connection():
    """
    Return a new pyodbc connection.
    Ensure the driver string keeps braces, e.g. {ODBC Driver 18 for SQL Server}
    """
    conn_str = (
        f"DRIVER={DB_CONFIG['driver']};"
        f"SERVER={DB_CONFIG['server']},{DB_CONFIG['port']};"
        f"DATABASE={DB_CONFIG['database']};"
        f"UID={DB_CONFIG['username']};PWD={DB_CONFIG['password']};"
        "Encrypt=yes;TrustServerCertificate=yes;"
    )
    # autocommit True avoids needing conn.commit() for simple INSERT/UPDATE/DELETE
    return pyodbc.connect(conn_str, autocommit=True)


def normalize_phone(phone):
    """Basic phone normalization: remove non-digit chars, keep last 10-12 digits."""
    if not phone:
        return None
    digits = re.sub(r'\D', '', str(phone))
    # If digits length > 10, keep last 10-12 (best-effort)
    if len(digits) > 12:
        digits = digits[-12:]
    return digits or None


def parse_value(raw):
    try:
        return float(raw) if raw is not None and raw != '' else 0.0
    except Exception:
        return 0.0


def parse_datetime(raw):
    if not raw:
        return datetime.utcnow()
    try:
        # Accept ISO format
        return datetime.fromisoformat(raw)
    except Exception:
        try:
            # try common formats
            return datetime.strptime(raw, "%Y-%m-%d %H:%M:%S")
        except Exception:
            return datetime.utcnow()


# ---------- Template routes ----------
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')


@app.route('/leads')
def leads():
    # renamed function to avoid confusion with variable names
    return render_template('leads.html')


@app.route('/pipeline')
def pipeline():
    return render_template('pipeline.html')


@app.route('/reports')
def reports():
    return render_template('reports.html')


@app.route('/<path:filename>.css')
def serve_css(filename):
    return send_from_directory('public', f'{filename}.css', mimetype='text/css')


@app.route('/<path:filename>.js')
def serve_js(filename):
    return send_from_directory('public', f'{filename}.js', mimetype='application/javascript')


# ---------- Test DB route ----------
@app.route('/test-db', methods=['GET'])
def test_db():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT TOP 5 id, name, email, createdAt FROM dbo.Leads ORDER BY createdAt DESC")
        rows = cur.fetchall()
        cur.close()
        conn.close()

        data = []
        for r in rows:
            # r is a tuple
            created_at = None
            try:
                created_at = r[3].isoformat() if r[3] is not None else None
            except Exception:
                created_at = None
            data.append({
                "id": r[0],
                "name": r[1],
                "email": r[2],
                "createdAt": created_at
            })
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        tb = traceback.format_exc()
        if DEBUG_MODE:
            return jsonify({"status": "error", "message": str(e), "traceback": tb}), 500
        return jsonify({"status": "error", "message": str(e)}), 500


# ---------- API: Leads CRUD ----------
@app.route('/api/leads', methods=['GET'])
def api_get_leads():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, name, company, contact, jobTitle, email, phone, website, linkedin, value, stage, source, priority, industry, notes, createdAt
            FROM dbo.Leads
            ORDER BY createdAt DESC
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        leads = []
        for r in rows:
            leads.append({
                'id': r[0],
                'name': r[1],
                'company': r[2],
                'contact': r[3],
                'jobTitle': r[4],
                'email': r[5],
                'phone': r[6],
                'website': r[7],
                'linkedin': r[8],
                'value': float(r[9]) if r[9] is not None else 0.0,
                'stage': r[10],
                'source': r[11],
                'priority': r[12],
                'industry': r[13],
                'notes': r[14],
                'createdAt': (r[15].isoformat() if r[15] else None)
            })
        return jsonify({'success': True, 'leads': leads})
    except Exception as e:
        tb = traceback.format_exc()
        if DEBUG_MODE:
            return jsonify({'success': False, 'error': str(e), 'traceback': tb}), 500
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/leads', methods=['POST'])
def api_create_lead():
    data = request.get_json(force=True, silent=True) or {}
    if not data.get('name'):
        return jsonify({'success': False, 'error': 'Name required'}), 400

    phone_norm = normalize_phone(data.get('phone'))
    email = (data.get('email') or '').strip().lower() or None

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Try to find by phone first, then by email
        existing_id = None
        if phone_norm:
            cur.execute("SELECT id FROM dbo.Leads WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ?", (f"%{phone_norm[-10:]}%",))
            row = cur.fetchone()
            if row:
                existing_id = row[0]

        if not existing_id and email:
            cur.execute("SELECT id FROM dbo.Leads WHERE LOWER(email) = ?", (email,))
            row = cur.fetchone()
            if row:
                existing_id = row[0]

        created_at = parse_datetime(data.get('createdAt'))

        if existing_id:
            # perform update (merge)
            cur.execute("""
                UPDATE dbo.Leads
                SET name=?, company=?, contact=?, jobTitle=?, email=?, phone=?, website=?, linkedin=?, value=?, stage=?, source=?, priority=?, industry=?, notes=?, createdAt=?
                WHERE id=?
            """, (
                data.get('name'),
                data.get('company'),
                data.get('contact'),
                data.get('jobTitle'),
                email,
                data.get('phone'),
                data.get('website'),
                data.get('linkedin'),
                parse_value(data.get('value')),
                data.get('stage') or 'New Lead',
                data.get('source') or 'Manual Entry',
                data.get('priority') or 'Warm',
                data.get('industry'),
                data.get('notes'),
                created_at,
                existing_id
            ))
            cur.close()
            conn.close()
            return jsonify({'success': True, 'lead': data, 'merged': True, 'id': existing_id}), 200

        # else insert new lead with generated id if not provided
        new_id = data.get('id') or str(uuid.uuid4())
        cur.execute("""
            INSERT INTO dbo.Leads (id, name, company, contact, jobTitle, email, phone, website, linkedin, value, stage, source, priority, industry, notes, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            new_id,
            data.get('name'),
            data.get('company'),
            data.get('contact'),
            data.get('jobTitle'),
            email,
            data.get('phone'),
            data.get('website'),
            data.get('linkedin'),
            parse_value(data.get('value')),
            data.get('stage') or 'New Lead',
            data.get('source') or 'Manual Entry',
            data.get('priority') or 'Warm',
            data.get('industry'),
            data.get('notes'),
            created_at
        ))
        cur.close()
        conn.close()
        return jsonify({'success': True, 'lead': data, 'merged': False, 'id': new_id}), 201
    except Exception as e:
        tb = traceback.format_exc()
        if DEBUG_MODE:
            return jsonify({'success': False, 'error': str(e), 'traceback': tb}), 500
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/leads/<lead_id>', methods=['PUT'])
def api_update_lead(lead_id):
    data = request.get_json(force=True, silent=True) or {}
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE dbo.Leads
            SET name = ?, company = ?, contact = ?, jobTitle = ?, email = ?, phone = ?, website = ?, linkedin = ?, value = ?, stage = ?, source = ?, priority = ?, industry = ?, notes = ?
            WHERE id = ?
        """, (
            data.get('name'),
            data.get('company'),
            data.get('contact'),
            data.get('jobTitle'),
            data.get('email'),
            data.get('phone'),
            data.get('website'),
            data.get('linkedin'),
            parse_value(data.get('value')),
            data.get('stage'),
            data.get('source'),
            data.get('priority'),
            data.get('industry'),
            data.get('notes'),
            lead_id
        ))
        cur.close()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        tb = traceback.format_exc()
        if DEBUG_MODE:
            return jsonify({'success': False, 'error': str(e), 'traceback': tb}), 500
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/leads/<lead_id>', methods=['DELETE'])
def api_delete_lead(lead_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM dbo.Leads WHERE id = ?", (lead_id,))
        cur.close()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        tb = traceback.format_exc()
        if DEBUG_MODE:
            return jsonify({'success': False, 'error': str(e), 'traceback': tb}), 500
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/leads/<lead_id>/stage', methods=['PATCH'])
def api_update_stage(lead_id):
    data = request.get_json(force=True, silent=True) or {}
    new_stage = data.get('stage')
    if not new_stage:
        return jsonify({'success': False, 'error': 'stage required'}), 400
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE dbo.Leads SET stage = ? WHERE id = ?", (new_stage, lead_id))
        cur.close()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        tb = traceback.format_exc()
        if DEBUG_MODE:
            return jsonify({'success': False, 'error': str(e), 'traceback': tb}), 500
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/leads/<lead_id>/priority', methods=['PATCH'])
def api_update_priority(lead_id):
    data = request.get_json(force=True, silent=True) or {}
    new_priority = data.get('priority')
    if not new_priority:
        return jsonify({'success': False, 'error': 'priority required'}), 400
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE dbo.Leads SET priority = ? WHERE id = ?", (new_priority, lead_id))
        cur.close()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        tb = traceback.format_exc()
        if DEBUG_MODE:
            return jsonify({'success': False, 'error': str(e), 'traceback': tb}), 500
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/leads/import', methods=['POST'])
def api_import_leads():
    payload = request.get_json(force=True, silent=True) or {}
    leads = payload.get('leads') or []
    if not isinstance(leads, list) or len(leads) == 0:
        return jsonify({'success': False, 'error': 'no leads provided'}), 400

    inserted = 0
    updated = 0
    errors = []

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        for ld in leads:
            try:
                phone_norm = normalize_phone(ld.get('phone'))
                email = (ld.get('email') or '').strip().lower() or None

                # find existing by phone (best-effort) or email
                existing_id = None
                if phone_norm:
                    cur.execute("SELECT id FROM dbo.Leads WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ?", (f"%{phone_norm[-10:]}%",))
                    row = cur.fetchone()
                    if row:
                        existing_id = row[0]

                if not existing_id and email:
                    cur.execute("SELECT id FROM dbo.Leads WHERE LOWER(email) = ?", (email,))
                    row = cur.fetchone()
                    if row:
                        existing_id = row[0]

                created_at = parse_datetime(ld.get('createdAt'))
                if existing_id:
                    # update existing
                    cur.execute("""
                        UPDATE dbo.Leads
                        SET name=?, company=?, contact=?, jobTitle=?, email=?, phone=?, website=?, linkedin=?, value=?, stage=?, source=?, priority=?, industry=?, notes=?, createdAt=?
                        WHERE id=?
                    """, (
                        ld.get('name'),
                        ld.get('company'),
                        ld.get('contact'),
                        ld.get('jobTitle'),
                        email,
                        ld.get('phone'),
                        ld.get('website'),
                        ld.get('linkedin'),
                        parse_value(ld.get('value')),
                        ld.get('stage') or 'New Lead',
                        ld.get('source') or 'Manual Entry',
                        ld.get('priority') or 'Warm',
                        ld.get('industry'),
                        ld.get('notes'),
                        created_at,
                        existing_id
                    ))
                    updated += 1
                else:
                    # insert new
                    new_id = ld.get('id') or str(uuid.uuid4())
                    cur.execute("""
                        INSERT INTO dbo.Leads (id, name, company, contact, jobTitle, email, phone, website, linkedin, value, stage, source, priority, industry, notes, createdAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        new_id,
                        ld.get('name'),
                        ld.get('company'),
                        ld.get('contact'),
                        ld.get('jobTitle'),
                        email,
                        ld.get('phone'),
                        ld.get('website'),
                        ld.get('linkedin'),
                        parse_value(ld.get('value')),
                        ld.get('stage') or 'New Lead',
                        ld.get('source') or 'Manual Entry',
                        ld.get('priority') or 'Warm',
                        ld.get('industry'),
                        ld.get('notes'),
                        created_at
                    ))
                    inserted += 1
            except Exception as le:
                errors.append({'lead': ld, 'error': str(le)})
                # continue with next lead

        cur.close()
        conn.close()
        return jsonify({'success': True, 'imported': inserted, 'updated': updated, 'errors': errors}), 200
    except Exception as e:
        tb = traceback.format_exc()
        if DEBUG_MODE:
            return jsonify({'success': False, 'error': str(e), 'traceback': tb}), 500
        return jsonify({'success': False, 'error': str(e)}), 500


# ---------- Run ----------
if __name__ == '__main__':
    print("Starting CRM Flask app with Azure SQL integration...")
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=DEBUG_MODE)
