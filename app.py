# app.py - Flask CRM using MongoDB (pymongo)
import os
import uuid
import traceback
from datetime import datetime
from functools import wraps

from flask import Flask, request, jsonify, render_template, send_from_directory, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS

from pymongo import MongoClient, ASCENDING, DESCENDING
import pymongo

# -----------------------
# Basic Flask + CORS setup
# -----------------------
app = Flask(__name__)
CORS(app)

app.secret_key = os.environ.get('SECRET_KEY', 'replace-this-secret-in-prod')
app.config['TEMPLATES_AUTO_RELOAD'] = True

# -----------------------
# Admin credentials (testing)
# -----------------------
# WARNING: Hardcoding credentials is acceptable for local/dev testing only.
# For production, remove hardcoded defaults and use secure environment variables.
ADMIN_USER = os.environ.get('ADMIN_USER', 'admin')
ADMIN_PASS = os.environ.get('ADMIN_PASS', 'admin123')  # <--- test admin password

# -----------------------
# Mongo config (env vars)
# -----------------------
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb+srv://ismail:ismail123@cluster0.t63ghmf.mongodb.net/?appName=Cluster0')
MONGO_DB = os.environ.get('MONGO_DB', 'crmdb')

# Create global client and DB (reuse across requests)
mongo_client = MongoClient(MONGO_URI)
db = mongo_client[MONGO_DB]

def ensure_indexes():
    """Create useful indexes if they don't exist."""
    try:
        db.leads.create_index([("id", ASCENDING)], unique=True)
        db.leads.create_index([("phoneDigits", ASCENDING)])
        db.leads.create_index([("stage", ASCENDING), ("createdAt", DESCENDING)])
        db.leads.create_index([("source", ASCENDING)])
        db.leads.create_index([("priority", ASCENDING)])
        db.callers.create_index([("username", ASCENDING)], unique=True)
        db.customers.create_index([("lead_id", ASCENDING)], unique=False)
    except Exception:
        app.logger.exception("Error ensuring indexes")

def create_default_test_caller():
    """
    Create a default test caller account if it doesn't exist.
    Username: caller1
    Password: caller123
    """
    try:
        if db.callers.find_one({"username": "caller1"}):
            return
        hashed = generate_password_hash("caller123")
        doc = {
            "username": "caller1",
            "password": hashed,
            "role": "caller",
            "status": "active",
            "createdAt": datetime.utcnow()
        }
        db.callers.insert_one(doc)
        app.logger.info("Inserted default test caller: caller1 / caller123")
    except Exception:
        app.logger.exception("Error creating default test caller")

# call at startup
ensure_indexes()
try:
    create_default_test_caller()
except Exception:
    app.logger.exception("Error during default caller creation")

# -----------------------
# Helpers
# -----------------------
def get_mongo_db():
    return db

def digits_only(s):
    return ''.join(filter(str.isdigit, (s or '')))

def iso_from_maybe_dt(val):
    if isinstance(val, datetime):
        return val.isoformat()
    try:
        # if string, try parse
        return datetime.fromisoformat(val.replace('Z', '+00:00')).isoformat()
    except Exception:
        return datetime.utcnow().isoformat()

def doc_to_dict(doc):
    if not doc:
        return None
    created = doc.get('createdAt')
    if isinstance(created, datetime):
        created_iso = created.isoformat()
    else:
        try:
            created_iso = str(created)
        except Exception:
            created_iso = datetime.utcnow().isoformat()
    return {
        "id": doc.get('id') or str(doc.get('_id')),
        "name": doc.get('name', ''),
        "phone": doc.get('phone', ''),
        "email": doc.get('email', ''),
        "city": doc.get('city', ''),
        "value": float(doc.get('value') or 0),
        "source": doc.get('source', ''),
        "stage": doc.get('stage', ''),
        "priority": doc.get('priority', ''),
        "createdAt": created_iso
    }

# -----------------------
# Auth decorator
# -----------------------
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('user'):
            return redirect(url_for('login', next=request.path))
        return f(*args, **kwargs)
    return decorated

# -----------------------
# Static file helpers
# -----------------------
@app.route('/<path:filename>.css')
def serve_css(filename):
    return send_from_directory('static', f'{filename}.css', mimetype='text/css')

@app.route('/<path:filename>.js')
def serve_js(filename):
    return send_from_directory('static', f'{filename}.js', mimetype='application/javascript')

# -----------------------
# Template routes (protected)
# -----------------------
@app.route('/')
@login_required
def index():
    return render_template('index.html', active='home')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', active='dashboard')

@app.route('/leads')
@login_required
def leads():
    return render_template('leads.html', active='leads')

@app.route('/pipeline')
@login_required
def pipeline():
    return render_template('pipeline.html', active='pipeline')

@app.route('/reports')
@login_required
def reports():
    return render_template('reports.html', active='reports')

@app.route('/analytics')
@login_required
def analytics():
    return render_template('analytics.html', active='analytics')

@app.route('/settings')
@login_required
def settings():
    if session.get('role') != 'admin':
        return "Unauthorized", 403

    callers = []
    users = []
    try:
        db = get_mongo_db()
        for c in db.callers.find().sort("createdAt", DESCENDING).limit(100):
            callers.append({
                "id": str(c.get('_id')),
                "username": c.get('username'),
                "role": c.get('role'),
                "status": c.get('status'),
                "createdAt": c.get('createdAt').isoformat() if isinstance(c.get('createdAt'), datetime) else str(c.get('createdAt') or '')
            })
    except Exception:
        traceback.print_exc()
    return render_template('settings.html', callers=callers, users=users)

# -----------------------
# Login / Logout
# -----------------------
@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    next_url = request.args.get('next') or url_for('index')

    if request.method == 'POST':
        username = (request.form.get('username') or '').strip()
        password = request.form.get('password') or ''
        role = request.form.get('role', 'caller')

        # Debug logging (safe: does NOT log the password)
        # This will print what the server received and what admin creds are expected.
        expected_user = os.environ.get('ADMIN_USER', ADMIN_USER)
        expected_pass = os.environ.get('ADMIN_PASS', ADMIN_PASS)
        # mask the expected password for logs
        def mask(s):
            if not s:
                return ""
            return s if len(s) <= 2 else s[0] + '*'*(len(s)-2) + s[-1]
        app.logger.debug("Login POST received: username=%s role=%s", username, role)
        app.logger.debug("Expected admin username=%s expected_pass_masked=%s",
                         expected_user, mask(expected_pass))

        # QUICK TEST FIX: explicit test admin check (guaranteed to work for testing)
        # Bypass any environment overrides and accept admin/admin123 explicitly.
        # Remove or comment this block before production.
        if role == 'admin':
            if username == 'admin' and password == 'admin123':
                session['user'] = username
                session['role'] = 'admin'
                session['admin'] = True
                app.logger.info("Admin login (explicit test) successful for user=%s", username)
                return redirect(next_url)
            # if explicit test admin didn't match, fall back to environment/default check below
            app.logger.debug("Explicit test admin check failed; falling back to configured admin creds.")

        # Standard admin check (supports env vars or defaults)
        if role == 'admin':
            if username == expected_user and password == expected_pass:
                session['user'] = username
                session['role'] = 'admin'
                session['admin'] = True
                app.logger.info("Admin login successful (configured) for user=%s", username)
                return redirect(next_url)
            else:
                app.logger.warning("Invalid admin credentials attempt for user=%s", username)
                error = 'Invalid admin credentials.'
        else:
            # Caller login path (DB-backed)
            try:
                db = get_mongo_db()
                caller = db.callers.find_one({"username": username})
                if not caller:
                    error = 'Caller not found.'
                elif (caller.get('status') or '').lower() != 'active':
                    error = 'Caller account is inactive.'
                elif not check_password_hash(caller.get('password', ''), password):
                    error = 'Incorrect password.'
                else:
                    session['user'] = caller.get('username')
                    session['role'] = caller.get('role', 'caller')
                    session['caller_id'] = str(caller.get('_id'))
                    app.logger.info("Caller login successful: %s", username)
                    return redirect(next_url)
            except Exception:
                traceback.print_exc()
                error = 'Error checking caller credentials.'

    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session_keys = list(session.keys())
    for k in session_keys:
        session.pop(k, None)
    return redirect(url_for('login'))

# -----------------------
# API: Leads CRUD & helpers
# -----------------------
@app.route('/api/leads', methods=['GET'])
def get_leads():
    try:
        stage_filter = request.args.get('stage')
        db = get_mongo_db()
        query = {}
        if stage_filter:
            query['stage'] = stage_filter
        cursor = db.leads.find(query).sort('createdAt', DESCENDING)
        leads = [doc_to_dict(doc) for doc in cursor]
        return jsonify({"success": True, "leads": leads})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/leads/<lead_id>', methods=['GET'])
def get_lead(lead_id):
    try:
        db = get_mongo_db()
        doc = db.leads.find_one({"id": lead_id})
        if not doc:
            return jsonify({"success": False, "error": "Lead not found"}), 404
        return jsonify({"success": True, "lead": doc_to_dict(doc)})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/leads', methods=['POST'])
def create_lead():
    try:
        payload = request.get_json(force=True) or {}
        name = (payload.get('name') or '').strip()
        phone = (payload.get('phone') or '').strip()
        city = (payload.get('city') or '').strip()
        if not name or not phone or not city:
            return jsonify({"success": False, "error": "Missing required fields: name, phone, city"}), 400

        # createdAt handling
        created_at_raw = payload.get('createdAt')
        if created_at_raw:
            try:
                created_at = datetime.fromisoformat(created_at_raw.replace('Z', '+00:00'))
            except Exception:
                created_at = datetime.utcnow()
        else:
            created_at = datetime.utcnow()

        # id handling (accept client UUID or create one)
        client_id = payload.get('id')
        try:
            u = uuid.UUID(str(client_id))
            doc_id = str(u)
        except Exception:
            doc_id = str(uuid.uuid4())

        doc = {
            "id": doc_id,
            "name": name,
            "phone": phone,
            "phoneDigits": digits_only(phone),
            "email": payload.get('email') or '',
            "city": city,
            "value": float(payload.get('value') or 0),
            "source": payload.get('source') or '',
            "stage": payload.get('stage') or 'New Lead',
            "priority": payload.get('priority') or 'Warm',
            "createdAt": created_at
        }

        db = get_mongo_db()
        db.leads.insert_one(doc)
        return jsonify({"success": True, "lead": {"id": doc_id}}), 201
    except pymongo.errors.DuplicateKeyError:
        # extremely rare: id collision; generate new
        try:
            db = get_mongo_db()
            new_id = str(uuid.uuid4())
            doc['id'] = new_id
            db.leads.insert_one(doc)
            return jsonify({"success": True, "lead": {"id": new_id}}), 201
        except Exception:
            traceback.print_exc()
            return jsonify({"success": False, "error": "Duplicate and retry failed"}), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/leads/<lead_id>', methods=['PUT'])
def update_lead(lead_id):
    try:
        payload = request.get_json(force=True)
        name = (payload.get('name') or '').strip()
        phone = (payload.get('phone') or '').strip()
        city = (payload.get('city') or '').strip()
        if not name or not phone or not city:
            return jsonify({"success": False, "error": "Missing required fields: name, phone, city"}), 400

        created_at_raw = payload.get('createdAt')
        try:
            created_at = datetime.fromisoformat(created_at_raw.replace('Z', '+00:00'))
        except Exception:
            created_at = datetime.utcnow()

        db = get_mongo_db()
        res = db.leads.update_one(
            {"id": lead_id},
            {"$set": {
                "name": name,
                "phone": phone,
                "phoneDigits": digits_only(phone),
                "email": payload.get('email') or '',
                "city": city,
                "value": float(payload.get('value') or 0),
                "source": payload.get('source') or '',
                "stage": payload.get('stage') or 'New Lead',
                "priority": payload.get('priority') or 'Warm',
                "createdAt": created_at
            }}
        )
        if res.matched_count == 0:
            return jsonify({"success": False, "error": "Lead not found"}), 404
        return jsonify({"success": True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/leads/<lead_id>', methods=['PATCH'])
def patch_lead(lead_id):
    try:
        payload = request.get_json(force=True)
        set_fields = {}
        for f in ['name','phone','email','city','value','source','stage','priority']:
            if f in payload:
                if f == 'phone':
                    set_fields['phoneDigits'] = digits_only(payload.get('phone'))
                set_fields[f] = payload.get(f)
        if not set_fields:
            return jsonify({"success": False, "error": "No fields to update"}), 400

        db = get_mongo_db()
        res = db.leads.update_one({"id": lead_id}, {"$set": set_fields})
        if res.matched_count == 0:
            return jsonify({"success": False, "error": "Lead not found"}), 404
        return jsonify({"success": True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/leads/<lead_id>', methods=['DELETE'])
@login_required
def delete_lead_api(lead_id):
    try:
        db = get_mongo_db()
        res = db.leads.delete_one({"id": lead_id})
        if res.deleted_count == 0:
            return jsonify({"success": False, "error": "Lead not found"}), 404
        return jsonify({"success": True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/leads/bulk-delete', methods=['POST'])
def bulk_delete_leads():
    try:
        payload = request.get_json(force=True)
        lead_ids = payload.get('ids') or []
        if not lead_ids or not isinstance(lead_ids, list):
            return jsonify({"success": False, "error": "No lead IDs provided"}), 400
        db = get_mongo_db()
        res = db.leads.delete_many({"id": {"$in": lead_ids}})
        return jsonify({"success": True, "deleted": res.deleted_count})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/leads/<lead_id>/stage', methods=['PATCH'])
def patch_stage(lead_id):
    try:
        payload = request.get_json(force=True)
        new_stage = payload.get('stage')
        if new_stage is None:
            return jsonify({"success": False, "error": "Missing 'stage'"}), 400
        db = get_mongo_db()
        db.leads.update_one({"id": lead_id}, {"$set": {"stage": new_stage}})
        return jsonify({"success": True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/leads/<lead_id>/priority', methods=['PATCH'])
def patch_priority(lead_id):
    try:
        payload = request.get_json(force=True)
        new_priority = payload.get('priority')
        if new_priority is None:
            return jsonify({"success": False, "error": "Missing 'priority'"}), 400
        db = get_mongo_db()
        db.leads.update_one({"id": lead_id}, {"$set": {"priority": new_priority}})
        return jsonify({"success": True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

# -----------------------
# Bulk import (merge by phone)
# -----------------------
@app.route('/api/leads/import', methods=['POST'])
def import_leads():
    try:
        payload = request.get_json(force=True)
        new_leads = payload.get('leads') or []
        if not isinstance(new_leads, list) or len(new_leads) == 0:
            return jsonify({"success": False, "error": "No leads provided"}), 400

        db = get_mongo_db()
        imported_count = 0
        for nl in new_leads:
            phone_raw = (nl.get('phone') or nl.get('number') or '').strip()
            phone_clean = digits_only(phone_raw)

            # ensure id (UUID string)
            try:
                lead_id = str(uuid.UUID(str(nl.get('id'))))
            except Exception:
                lead_id = str(uuid.uuid4())

            created_at_raw = nl.get('createdAt')
            if created_at_raw:
                try:
                    created_at = datetime.fromisoformat(created_at_raw.replace('Z', '+00:00'))
                except Exception:
                    created_at = datetime.utcnow()
            else:
                created_at = datetime.utcnow()

            if not phone_clean:
                doc = {
                    "id": lead_id,
                    "name": nl.get('name') or '',
                    "phone": nl.get('phone') or '',
                    "phoneDigits": digits_only(nl.get('phone') or ''),
                    "email": nl.get('email') or '',
                    "city": nl.get('city') or '',
                    "value": float(nl.get('value') or 0),
                    "source": nl.get('source') or '',
                    "stage": nl.get('stage') or 'New Lead',
                    "priority": nl.get('priority') or 'Warm',
                    "createdAt": created_at
                }
                db.leads.insert_one(doc)
                imported_count += 1
                continue

            # try exact phoneDigits match first
            existing = db.leads.find_one({"phoneDigits": phone_clean})
            if existing:
                existing_id = existing.get('id')
                merged = {
                    'name': nl.get('name') or existing.get('name'),
                    'phone': nl.get('phone') or existing.get('phone'),
                    'phoneDigits': digits_only(nl.get('phone') or existing.get('phone')),
                    'email': nl.get('email') or existing.get('email'),
                    'city': nl.get('city') or existing.get('city'),
                    'value': float(nl.get('value') or existing.get('value') or 0),
                    'source': nl.get('source') or existing.get('source'),
                    'stage': nl.get('stage') or existing.get('stage'),
                    'priority': nl.get('priority') or existing.get('priority')
                }
                db.leads.update_one({"id": existing_id}, {"$set": merged})
            else:
                doc = {
                    "id": lead_id,
                    "name": nl.get('name') or '',
                    "phone": nl.get('phone') or '',
                    "phoneDigits": phone_clean,
                    "email": nl.get('email') or '',
                    "city": nl.get('city') or '',
                    "value": float(nl.get('value') or 0),
                    "source": nl.get('source') or '',
                    "stage": nl.get('stage') or 'New Lead',
                    "priority": nl.get('priority') or 'Warm',
                    "createdAt": created_at
                }
                db.leads.insert_one(doc)
            imported_count += 1

        return jsonify({"success": True, "imported": imported_count})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

# -----------------------
# Customers (from leads where stage == 'Won')
# -----------------------
@app.route('/customers')
@login_required
def customers():
    app.logger.debug("GET /customers called user=%s", session.get('user'))
    customers_list = []
    try:
        db = get_mongo_db()
        cursor = db.leads.find({"stage": "Won"}).sort("createdAt", DESCENDING)
        for r in cursor:
            customers_list.append(doc_to_dict(r))
    except Exception:
        traceback.print_exc()
    return render_template('customers.html', customers=customers_list)

@app.route('/api/customers', methods=['GET'])
@login_required
def get_customers():
    app.logger.debug("GET /api/customers called user=%s", session.get('user'))
    try:
        db = get_mongo_db()
        cursor = db.leads.find({"stage": "Won"}).sort("createdAt", DESCENDING)
        customers_list = [doc_to_dict(r) for r in cursor]
        return jsonify({"success": True, "customers": customers_list})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/leads/sync-to-customers', methods=['POST'])
@login_required
def sync_won_leads_to_customers():
    app.logger.debug("POST /api/leads/sync-to-customers called by user=%s", session.get('user'))
    try:
        db = get_mongo_db()
        won = list(db.leads.find({"stage": "Won"}))
        inserted = 0
        for lead in won:
            if not db.customers.find_one({"lead_id": lead.get('id')}):
                cust = {
                    "lead_id": lead.get('id'),
                    "name": lead.get('name',''),
                    "phone": lead.get('phone',''),
                    "email": lead.get('email',''),
                    "company": lead.get('company',''),
                    "city": lead.get('city',''),
                    "value": lead.get('value',0),
                    "lifetime_value": lead.get('value',0),
                    "source": lead.get('source',''),
                    "priority": lead.get('priority',''),
                    "notes": '',
                    "createdAt": lead.get('createdAt', datetime.utcnow())
                }
                db.customers.insert_one(cust)
                inserted += 1
        return jsonify({"success": True, "inserted": inserted})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

# -----------------------
# Reports & analytics
# -----------------------
@app.route("/api/reports/leads")
def get_lead_reports():
    try:
        db = get_mongo_db()
        cursor = db.leads.find().sort("createdAt", DESCENDING)
        leads = []
        for r in cursor:
            leads.append({
                "id": r.get('id'),
                "name": r.get('name'),
                "source": r.get('source'),
                "stage": r.get('stage'),
                "value": float(r.get('value') or 0),
                "priority": r.get('priority'),
                "created_at": r.get('createdAt').strftime("%Y-%m-%d") if isinstance(r.get('createdAt'), datetime) else None,
            })
        return jsonify({"leads": leads})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/analytics/leads-by-source', methods=['GET'])
@login_required
def leads_by_source():
    try:
        db = get_mongo_db()
        pipeline = [
            {"$group": {"_id": {"$ifNull": ["$source", "Unknown"]},
                        "count": {"$sum": 1},
                        "total_value": {"$sum": {"$ifNull": ["$value", 0]}}}},
            {"$project": {"source": "$_id", "count": 1, "value": "$total_value", "_id": 0}},
            {"$sort": {"count": -1}}
        ]
        rows = list(db.leads.aggregate(pipeline))
        # cast types
        for r in rows:
            r['count'] = int(r['count'])
            r['value'] = float(r.get('value') or 0.0)
        return jsonify({"success": True, "data": rows})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/analytics/leads-by-priority', methods=['GET'])
@login_required
def leads_by_priority():
    try:
        db = get_mongo_db()
        pipeline = [
            {"$group": {"_id": {"$ifNull": ["$priority", "Unknown"]}, "count": {"$sum": 1}}},
            {"$project": {"priority": "$_id", "count": 1, "_id": 0}},
            {"$sort": {"count": -1}}
        ]
        rows = list(db.leads.aggregate(pipeline))
        for r in rows:
            r['count'] = int(r['count'])
        return jsonify({"success": True, "data": rows})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/analytics/leads-trend', methods=['GET'])
@login_required
def leads_trend():
    try:
        db = get_mongo_db()
        pipeline = [
            {"$project": {"month": {"$dateToString": {"format": "%Y-%m", "date": "$createdAt"}}}},
            {"$group": {"_id": "$month", "count": {"$sum": 1}}},
            {"$project": {"month": "$_id", "count": 1, "_id": 0}},
            {"$sort": {"month": 1}}
        ]
        rows = list(db.leads.aggregate(pipeline))
        for r in rows:
            r['count'] = int(r['count'])
        return jsonify({"success": True, "data": rows})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/pipeline/summary', methods=['GET'])
@login_required
def pipeline_summary():
    try:
        db = get_mongo_db()
        pipeline = [
            {"$group": {"_id": {"$ifNull": ["$stage", "Unknown"]},
                        "count": {"$sum": 1},
                        "total_value": {"$sum": {"$ifNull": ["$value", 0]}}}},
            {"$project": {"stage": "$_id", "count": 1, "value": "$total_value", "_id": 0}},
            {"$sort": {"count": -1}}
        ]
        rows = list(db.leads.aggregate(pipeline))
        for r in rows:
            r['count'] = int(r['count'])
            r['value'] = float(r.get('value') or 0.0)
        return jsonify({"success": True, "summary": rows})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

# -----------------------
# Start app
# -----------------------
if __name__ == '__main__':
    print("Starting CRM Flask app with MongoDB integration...")
    # show only username and masked password for safety in logs
    def mask(p):
        if not p:
            return ""
        return p if len(p) <= 2 else p[0] + '*'*(len(p)-2) + p[-1]
    print(f"Admin Test Login Enabled — Username: {ADMIN_USER}, Password: {mask(ADMIN_PASS)}")
    print("Default test caller (caller1 / caller123) created if not present.")
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_DEBUG', '1') == '1'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
