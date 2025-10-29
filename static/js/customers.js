let allCustomers = [];
let currentCustomer = null;

// Load all customers from API
async function loadCustomers() {
    const tableBody = document.getElementById('customerTableBody');
    tableBody.innerHTML = `<tr class="loading-row"><td colspan="11" class="loading-cell">
        <div class="loader"></div><p>Loading customers...</p></td></tr>`;

    try {
        const res = await fetch('/api/customers', { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const payload = await res.json();
        if (!payload.success) throw new Error(payload.error || 'Failed to load customers');

        allCustomers = payload.customers || [];

        if (!allCustomers.length) {
            document.getElementById('emptyState').style.display = 'block';
            document.querySelector('.table-section').style.display = 'none';
        } else {
            document.getElementById('emptyState').style.display = 'none';
            document.querySelector('.table-section').style.display = 'block';
            renderCustomers(allCustomers);
        }

        updateStats(allCustomers);
    } catch (err) {
        console.error(err);
        showError('Error loading customers');
    }
}

// Render table rows
function renderCustomers(customers) {
    const tableBody = document.getElementById('customerTableBody');
    if (!customers || !customers.length) {
        tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:2rem">No customers found</td></tr>`;
        return;
    }

    tableBody.innerHTML = customers.map((c, idx) => {
        const phone = c.phone || '';
        const digits = (phone.match(/\d+/g) || []).join('');
        const tel = digits ? `tel:${digits}` : '#';
        const wa = digits ? `https://wa.me/${digits}` : '#';
        return `
        <tr data-id="${c.id}">
            <td>${idx + 1}</td>
            <td><strong>${escapeHtml(c.name||'')}</strong></td>
            <td>${escapeHtml(phone||'N/A')}</td>
            <td>${escapeHtml(c.email||'N/A')}</td>
            <td>${escapeHtml(c.city||'N/A')}</td>
            <td>$${formatNumber(c.value||0)}</td>
            <td>${escapeHtml(c.source||'N/A')}</td>
            <td>${escapeHtml(c.stage||'N/A')}</td>
            <td><span class="badge badge-${(c.priority||'medium').toLowerCase()}">${escapeHtml(c.priority||'')}</span></td>
            <td>${digits ? `<a href="${tel}">📞</a> <a href="${wa}" target="_blank">💬</a>` : '—'}</td>
            <td>
                <button onclick="viewCustomer('${c.id}')">View</button>
                <button onclick="deleteCustomer('${c.id}')">Delete</button>
            </td>
        </tr>`;
    }).join('');
}

// Update stats cards
function updateStats(cs) {
    const total = cs.length;
    const totalValue = cs.reduce((s, x) => s + (parseFloat(x.value) || 0), 0);
    const vip = cs.filter(x => (x.priority||'').toUpperCase() === 'VIP').length;
    const avg = total ? totalValue / total : 0;

    document.getElementById('totalCustomers').textContent = total;
    document.getElementById('vipCustomers').textContent = vip;
    document.getElementById('avgValue').textContent = `$${formatNumber(avg)}`;
}

// View single customer in modal
async function viewCustomer(id) {
    try {
        const res = await fetch(`/api/leads/${id}`, { credentials: 'same-origin' });
        const p = await res.json();
        if (!p.success) throw new Error(p.error || 'Failed to load customer');

        const d = p.lead; currentCustomer = d;
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <label>Name<input id="editName" value="${escapeHtml(d.name||'')}" /></label>
            <label>Phone<input id="editPhone" value="${escapeHtml(d.phone||'')}" /></label>
            <label>Email<input id="editEmail" value="${escapeHtml(d.email||'')}" /></label>
            <label>City<input id="editCity" value="${escapeHtml(d.city||'')}" /></label>
            <label>Source<input id="editSource" value="${escapeHtml(d.source||'')}" /></label>
            <label>Stage<input id="editStage" value="${escapeHtml(d.stage||'')}" /></label>
            <label>Priority<select id="editPriority">
                <option ${d.priority==='Low'?'selected':''}>Low</option>
                <option ${d.priority==='Medium'?'selected':''}>Medium</option>
                <option ${d.priority==='High'?'selected':''}>High</option>
                <option ${d.priority==='VIP'?'selected':''}>VIP</option>
            </select></label>
            <label>Value<input id="editValue" type="number" value="${d.value || 0}" /></label>
        `;
        document.getElementById('customerModal').style.display = 'block';
    } catch (err) { console.error(err); showError('Failed to open customer'); }
}

// Save customer edits
async function saveCustomer() {
    if (!currentCustomer) return;
    try {
        const updates = {
            name: document.getElementById('editName').value,
            phone: document.getElementById('editPhone').value,
            email: document.getElementById('editEmail').value,
            city: document.getElementById('editCity').value,
            source: document.getElementById('editSource').value,
            stage: document.getElementById('editStage').value,
            priority: document.getElementById('editPriority').value,
            value: parseFloat(document.getElementById('editValue').value) || 0
        };
        if (!updates.name || !updates.phone || !updates.city) {
            showError('Name, phone and city are required.');
            return;
        }

        const res = await fetch(`/api/leads/${currentCustomer.id}`, {
            method: 'PUT',
            headers: {'Content-Type':'application/json'},
            credentials:'same-origin',
            body: JSON.stringify(updates)
        });
        const p = await res.json();
        if (!res.ok || !p.success) throw new Error(p.error || 'Update failed');

        alert('Saved'); closeModal(); loadCustomers();
    } catch (err) { console.error(err); showError('Save failed'); }
}

// Delete customer
async function deleteCustomer(id) {
    if (!confirm('Delete this customer?')) return;
    try {
        const res = await fetch(`/api/leads/${id}`, { method:'DELETE', credentials:'same-origin' });
        const p = await res.json();
        if (!res.ok || !p.success) throw new Error(p.error || 'Delete failed');
        alert('Deleted'); loadCustomers();
    } catch (err) { console.error(err); showError('Delete failed'); }
}

// Close modal
function closeModal() {
    document.getElementById('customerModal').style.display = 'none';
    currentCustomer = null;
}

// Export CSV
function exportToCSV() {
    if (!allCustomers.length) { alert('No customers'); return; }
    const headers = ['name','phone','email','city','value','source','stage','priority','createdAt'];
    let csv = headers.join(',') + '\n';
    allCustomers.forEach(c => {
        csv += headers.map(h => `"${String(c[h]||'').replace(/"/g,'""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type:'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `customers_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
}

// Filter customers
function filterCustomers() {
    const q = (document.getElementById('searchInput').value||'').toLowerCase();
    const p = document.getElementById('priorityFilter').value;
    const s = document.getElementById('sourceFilter').value;
    const filtered = allCustomers.filter(c => {
        const matchQ = !q || (c.name||'').toLowerCase().includes(q) ||
                       (c.email||'').toLowerCase().includes(q) ||
                       (c.city||'').toLowerCase().includes(q);
        const matchP = !p || c.priority === p;
        const matchS = !s || c.source === s;
        return matchQ && matchP && matchS;
    });
    renderCustomers(filtered);
}

// Utilities
function formatNumber(n){ return new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n); }
function escapeHtml(t){ if(t==null) return ''; const d=document.createElement('div'); d.textContent=String(t); return d.innerHTML; }
function showError(m){ alert(m); }

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput')?.addEventListener('input', filterCustomers);
    document.getElementById('priorityFilter')?.addEventListener('change', filterCustomers);
    document.getElementById('sourceFilter')?.addEventListener('change', filterCustomers);
    document.querySelectorAll('button[onclick="syncWonLeads()"]').forEach(b => b.addEventListener('click', loadCustomers));
    loadCustomers();
});

// Dummy function for syncing won leads (replace with actual API call)
function syncWonLeads(){ loadCustomers(); alert('Won leads synced!'); }
