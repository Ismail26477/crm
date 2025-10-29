// Data storage
let leads = [];
let filteredLeads = [];
let currentLeadId = null;
let currentView = 'list';
let sortColumn = '';
let sortDirection = 'asc';
let selectedLeads = new Set();
let importedData = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadLeads();
    renderLeads();
    updateStats();
});

// Load leads from localStorage
function loadLeads() {
    // try server
    fetch('/api/leads')
        .then(r => r.json())
        .then(data => {
            if (data && data.success && Array.isArray(data.leads)) {
                leads = data.leads;
                saveLeads();
                filteredLeads = [...leads];
                renderLeads();
            } else {
                // fallback to local
                const stored = localStorage.getItem('crm_leads');
                if (stored) {
                    leads = JSON.parse(stored);
                } else {
                    leads = generateSampleData();
                    saveLeads();
                }
                filteredLeads = [...leads];
                renderLeads();
            }
        })
        .catch(err => {
            // offline fallback
            const stored = localStorage.getItem('crm_leads');
            if (stored) {
                leads = JSON.parse(stored);
            } else {
                leads = generateSampleData();
                saveLeads();
            }
            filteredLeads = [...leads];
            renderLeads();
        });
}


// Generate sample data
function generateSampleData() {
    return [
        {
            id: generateId(),
            name: 'John Smith',
            phone: '+1-555-0101',
            email: 'john@example.com',
            city: 'New York',
            value: 45000,
            source: 'Website Form',
            stage: 'New Lead',
            priority: 'Hot',
            createdAt: new Date().toISOString()
        },
        {
            id: generateId(),
            name: 'Sarah Johnson',
            phone: '+1-555-0102',
            email: 'sarah@example.com',
            city: 'Los Angeles',
            value: 75000,
            source: 'Google Ads',
            stage: 'Qualified',
            priority: 'Hot',
            createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
            id: generateId(),
            name: 'Mike Chen',
            phone: '+1-555-0103',
            email: 'mike@example.com',
            city: 'Chicago',
            value: 32000,
            source: 'Referral',
            stage: 'Proposal',
            priority: 'Warm',
            createdAt: new Date(Date.now() - 172800000).toISOString()
        }
    ];
}

// Save leads to localStorage
function saveLeads() {
    localStorage.setItem('crm_leads', JSON.stringify(leads));
}

// Generate unique ID
function generateId() {
    return 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Render leads
function renderLeads() {
    if (currentView === 'list') {
        renderTableView();
    } else {
        renderGridView();
    }
    updateStats();
}

// Render table view
function renderTableView() {
    const tbody = document.getElementById('leadsTableBody');
    const emptyState = document.getElementById('emptyState');

    if (filteredLeads.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = filteredLeads.map(lead => `
        <tr>
            <td>
                <input type="checkbox" class="lead-checkbox" value="${lead.id}" onchange="handleLeadSelection('${lead.id}', this.checked)">
            </td>
            <td class="lead-name-cell" onclick="viewLeadDetails('${lead.id}')" style="cursor: pointer;">
                ${escapeHtml(lead.name)}
            </td>
            <td class="phone-cell">
                <span class="phone-number" onclick="copyPhoneNumber('${lead.phone || '-'}')" title="Click to copy">
                    ${lead.phone || '-'}
                </span>
                ${lead.phone ? `<button class="btn-copy" onclick="copyPhoneNumber('${lead.phone}')" title="Copy number">Copy</button>` : ''}
            </td>
            <td>${escapeHtml(lead.email || '-')}</td>
            <td>${escapeHtml(lead.city || '-')}</td>
            <td class="lead-value-cell">${formatCurrency(lead.value)}</td>
            <td><span class="source-badge">${lead.source}</span></td>
            <td>
                <select class="inline-select stage-select stage-${lead.stage.toLowerCase().replace(' ', '-')}"
                        onchange="updateLeadStage('${lead.id}', this.value)">
                    <option value="New Lead" ${lead.stage === 'New Lead' ? 'selected' : ''}>New Lead</option>
                    <option value="Qualified" ${lead.stage === 'Qualified' ? 'selected' : ''}>Qualified</option>
                    <option value="Proposal" ${lead.stage === 'Proposal' ? 'selected' : ''}>Proposal</option>
                    <option value="Negotiation" ${lead.stage === 'Negotiation' ? 'selected' : ''}>Negotiation</option>
                    <option value="Closed Won" ${lead.stage === 'Closed Won' ? 'selected' : ''}>Closed Won</option>
                </select>
            </td>
            <td>
                <select class="inline-select priority-select priority-${lead.priority.toLowerCase()}"
                        onchange="updateLeadPriority('${lead.id}', this.value)">
                    <option value="Hot" ${lead.priority === 'Hot' ? 'selected' : ''}>Hot</option>
                    <option value="Warm" ${lead.priority === 'Warm' ? 'selected' : ''}>Warm</option>
                    <option value="Cold" ${lead.priority === 'Cold' ? 'selected' : ''}>Cold</option>
                </select>
            </td>
            <td class="contact-actions">
                ${lead.phone ? `
                    <button class="btn-call" onclick="makeCall('${lead.phone}', '${escapeHtml(lead.name)}')" title="Call ${escapeHtml(lead.name)}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                    </button>
                    <button class="btn-whatsapp" onclick="sendWhatsApp('${lead.phone}', '${escapeHtml(lead.name)}')" title="WhatsApp ${escapeHtml(lead.name)}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                    </button>
                ` : '<span style="color: #94a3b8;">-</span>'}
            </td>
            <td class="">
                <button class="btn-small btn-edit" onclick="editLead('${lead.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                </button>
            </td>
        </tr>
    `).join('');
}

// Render grid view
function renderGridView() {
    const gridContainer = document.getElementById('gridView');

    if (filteredLeads.length === 0) {
        gridContainer.innerHTML = '<div class="empty-state"><p>No leads found</p></div>';
        return;
    }

    gridContainer.innerHTML = filteredLeads.map(lead => `
        <div class="lead-card" onclick="viewLeadDetails('${lead.id}')" style="cursor: pointer;">
            <div class="lead-card-header">
                <div>
                    <div class="lead-card-title">${escapeHtml(lead.name)}</div>
                    <div class="lead-card-company">${escapeHtml(lead.city || '-')}</div>
                </div>
                <div class="lead-card-value">${formatCurrency(lead.value)}</div>
            </div>
            <div class="lead-card-body">
                <div class="lead-card-info">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    ${lead.phone || '-'}
                </div>
                <div class="lead-card-info">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    ${lead.email || '-'}
                </div>
            </div>
            <div class="lead-card-footer">
                <span class="stage-badge stage-${lead.stage.toLowerCase().replace(' ', '-')}">${lead.stage}</span>
                <span class="priority-badge priority-${lead.priority.toLowerCase()}">${lead.priority}</span>
            </div>
        </div>
    `).join('');
}

// Toggle view
function toggleView(view) {
    currentView = view;
    document.getElementById('listView').style.display = view === 'list' ? 'block' : 'none';
    document.getElementById('gridView').style.display = view === 'grid' ? 'block' : 'none';
    document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
    document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
    renderLeads();
}

// Filter leads
function filterLeads() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const stageFilter = document.getElementById('filterStage').value;
    const sourceFilter = document.getElementById('filterSource').value;
    const priorityFilter = document.getElementById('filterPriority').value;

    filteredLeads = leads.filter(lead => {
        const matchesSearch = !searchTerm ||
            lead.name.toLowerCase().includes(searchTerm) ||
            (lead.city && lead.city.toLowerCase().includes(searchTerm)) ||
            (lead.email && lead.email.toLowerCase().includes(searchTerm)) ||
            (lead.phone && lead.phone.toLowerCase().includes(searchTerm));

        const matchesStage = !stageFilter || lead.stage === stageFilter;
        const matchesSource = !sourceFilter || lead.source === sourceFilter;
        const matchesPriority = !priorityFilter || lead.priority === priorityFilter;

        return matchesSearch && matchesStage && matchesSource && matchesPriority;
    });

    renderLeads();
}

// Clear filters
function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterStage').value = '';
    document.getElementById('filterSource').value = '';
    document.getElementById('filterPriority').value = '';
    filterLeads();
}

// Sort table
function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }

    filteredLeads.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        if (column === 'value') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
        } else {
            aVal = String(aVal || '').toLowerCase();
            bVal = String(bVal || '').toLowerCase();
        }

        if (sortDirection === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });

    renderLeads();
}

// Update stats
function updateStats() {
    const today = new Date().toDateString();
    const newToday = leads.filter(l => new Date(l.createdAt).toDateString() === today).length;
    const hotLeads = leads.filter(l => l.priority === 'Hot').length;
    const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);

    document.getElementById('totalLeads').textContent = leads.length;
    document.getElementById('newToday').textContent = newToday;
    document.getElementById('hotLeads').textContent = hotLeads;
    document.getElementById('totalValue').textContent = formatCurrency(totalValue);
}

// Handle lead selection
function handleLeadSelection(leadId, checked) {
    if (checked) {
        selectedLeads.add(leadId);
    } else {
        selectedLeads.delete(leadId);
    }
    updateBulkDeleteButton();
}

// Toggle select all
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.lead-checkbox');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
        handleLeadSelection(checkbox.value, selectAll.checked);
    });
}

// Update bulk delete button
function updateBulkDeleteButton() {
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (selectedLeads.size > 0) {
        bulkDeleteBtn.style.display = 'flex';
        bulkDeleteBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete Selected (${selectedLeads.size})
        `;
    } else {
        bulkDeleteBtn.style.display = 'none';
    }
}

// Bulk delete leads
// Bulk delete (posts to /api/leads/bulk-delete) with rollback and better error handling
async function bulkDeleteLeads() {
    if (selectedLeads.size === 0) return;

    const idsToDelete = Array.from(selectedLeads);
    const count = idsToDelete.length;

    if (!confirm(`Are you sure you want to delete ${count} lead(s)? This action cannot be undone.`)) return;

    const backupLeads = [...leads];

    // Optimistic removal locally
    leads = leads.filter(lead => !selectedLeads.has(lead.id));
    saveLeads();
    selectedLeads.clear();
    document.getElementById('selectAll').checked = false;
    filterLeads();
    updateBulkDeleteButton();
    showNotification(`Deleting ${count} lead(s)...`, 'info');

    try {
        const res = await fetch('/api/leads/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin', // or 'include' if cross-origin + CORS allows credentials
            body: JSON.stringify({ ids: idsToDelete })
        });

        const text = await res.text();
        let body = null;
        try { body = JSON.parse(text); } catch (e) { body = text; }

        if (!res.ok) {
            // rollback local deletion
            leads = backupLeads;
            saveLeads();
            filterLeads();
            showNotification(`Server error deleting leads: ${(body && body.error) ? body.error : res.status}`, 'error');
            console.warn('Bulk delete failed:', res.status, body);
            return;
        }

        // success
        showNotification(`Deleted ${count} lead(s) on server.`, 'success');
    } catch (err) {
        // network error -> rollback
        leads = backupLeads;
        saveLeads();
        filterLeads();
        showNotification('Network error — could not delete selected leads on server. Local changes restored.', 'error');
        console.error('Bulk delete error:', err);
    }
}

// Copy phone number
function copyPhoneNumber(phone) {
    if (!phone || phone === '-') {
        showNotification('No phone number to copy', 'error');
        return;
    }

    navigator.clipboard.writeText(phone).then(() => {
        showNotification(`Phone number ${phone} copied to clipboard!`, 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = phone;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification(`Phone number ${phone} copied to clipboard!`, 'success');
    });
}

// Make call
function makeCall(phone, contactName) {
    if (!phone || phone === '-') {
        showNotification('No phone number available', 'error');
        return;
    }

    if (confirm(`Do you want to call ${contactName} at ${phone}?`)) {
        window.location.href = `tel:${phone}`;
        showNotification(`Initiating call to ${contactName}...`, 'info');
    }
}

// Send WhatsApp message
function sendWhatsApp(phone, contactName) {
    if (!phone || phone === '-') {
        showNotification('No phone number available', 'error');
        return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = prompt(`Enter message to send to ${contactName} on WhatsApp:`);

    if (message) {
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        showNotification(`Opening WhatsApp chat with ${contactName}...`, 'success');
    }
}

// Update lead stage
// Update lead stage (sends partial update to server, fallback local)
async function updateLeadStage(leadId, newStage) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const oldStage = lead.stage;
    lead.stage = newStage;
    saveLeads();
    renderLeads();
    // showNotification(`Stage updated to "${newStage}" (local)`, 'info');

    try {
        const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stage: newStage })
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        showNotification(`Stage updated from "${oldStage}" to "${newStage}"`, 'success');
    } catch (err) {
        // revert local on failure OR keep local and notify; here we keep local and warn
        showNotification('Could not update stage on server — change saved locally.', 'warning');
        console.warn('updateLeadStage failed:', err);
    }
}

// Update lead priority
// Update lead priority (sends partial update to server, fallback local)
async function updateLeadPriority(leadId, newPriority) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const oldPriority = lead.priority;
    lead.priority = newPriority;
    saveLeads();
    renderLeads();
    // showNotification(`Priority updated to "${newPriority}" (local)`, 'info');

    try {
        const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: newPriority })
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        showNotification(`Priority updated from "${oldPriority}" to "${newPriority}"`, 'success');
    } catch (err) {
        showNotification('Could not update priority on server — change saved locally.', 'warning');
        console.warn('updateLeadPriority failed:', err);
    }
}

// Open import modal
function openImportModal() {
    document.getElementById('importModal').classList.add('active');
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importConfirmBtn').style.display = 'none';
    document.getElementById('excelFileInput').value = '';
    importedData = [];
}

// Close import modal
function closeImportModal() {
    document.getElementById('importModal').classList.remove('active');
    importedData = [];
}

// Download template
function downloadTemplate() {
    const template = [
        ['Name', 'Number', 'Email', 'City', 'Value', 'Source', 'Stage', 'Priority'],
        ['John Doe', '+1-555-0001', 'john@example.com', 'New York', '50000', 'Website Form', 'New Lead', 'Hot'],
        ['Jane Smith', '+1-555-0002', 'jane@example.com', 'Los Angeles', '75000', 'Referral', 'Qualified', 'Warm']
    ];

    const csv = template.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    showNotification('Template downloaded successfully!', 'success');
}

// Handle file select
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
}

// Handle file drop
function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadZone').classList.remove('drag-over');

    const file = event.dataTransfer.files[0];
    if (file) {
        processFile(file);
    }
}

// Handle drag over
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadZone').classList.add('drag-over');
}

// Handle drag leave
function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadZone').classList.remove('drag-over');
}

// Process file
function processFile(file) {
    const fileName = file.name.toLowerCase();
    const fileType = fileName.split('.').pop();

    if (!['csv', 'xlsx', 'xls'].includes(fileType)) {
        showNotification('Please upload a valid Excel (.xlsx, .xls) or CSV file', 'error');
        return;
    }

    showNotification('Processing file...', 'info');

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        parseCSV(text);
    };
    reader.readAsText(file);
}

// Parse CSV
function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        showNotification('File is empty or invalid', 'error');
        return;
    }

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    importedData = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const lead = {
            id: generateId(),
            name: values[0] || 'Unnamed Lead',
            phone: values[1] || '',
            email: values[2] || '',
            city: values[3] || '',
            value: parseFloat(values[4]) || 0,
            source: values[5] || 'Manual Entry',
            stage: values[6] || 'New Lead',
            priority: values[7] || 'Warm',
            createdAt: new Date().toISOString()
        };
        importedData.push(lead);
    }

    displayImportPreview();
}

// Display import preview
function displayImportPreview() {
    if (importedData.length === 0) {
        showNotification('No valid data found in file', 'error');
        return;
    }

    document.getElementById('previewCount').textContent = importedData.length;
    document.getElementById('importPreview').style.display = 'block';
    document.getElementById('importConfirmBtn').style.display = 'flex';

    const thead = document.getElementById('previewTableHead');
    const tbody = document.getElementById('previewTableBody');

    thead.innerHTML = `
        <tr>
            <th>Name</th>
            <th>Number</th>
            <th>Email</th>
            <th>City</th>
            <th>Value</th>
            <th>Priority</th>
        </tr>
    `;

    tbody.innerHTML = importedData.slice(0, 10).map(lead => `
        <tr>
            <td>${escapeHtml(lead.name)}</td>
            <td>${lead.phone}</td>
            <td>${lead.email || '-'}</td>
            <td>${lead.city || '-'}</td>
            <td>${formatCurrency(lead.value)}</td>
            <td><span class="priority-badge priority-${lead.priority.toLowerCase()}">${lead.priority}</span></td>
        </tr>
    `).join('');

    if (importedData.length > 10) {
        tbody.innerHTML += `<tr><td colspan="6" style="text-align: center; color: #64748b; font-style: italic;">... and ${importedData.length - 10} more leads</td></tr>`;
    }

    showNotification(`Found ${importedData.length} leads ready to import`, 'success');
}

// Confirm import
// Confirm import - tries API first, falls back to localStorage
function confirmImport() {
    if (importedData.length === 0) {
        showNotification('No data to import', 'error');
        return;
    }

    // Attempt to push to server
    fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: importedData })
    })
    .then(res => res.json())
    .then(result => {
        if (result && result.success) {
            showNotification(`Successfully imported ${result.imported || importedData.length} leads to server!`, 'success');
            closeImportModal();
            // reload from server if desired, else just update local UI
            // Optionally call API to refresh leads list; here we fallback to reload page:
            loadLeadsFromServer();
        } else {
            // server responded but failure - fallback to local
            leads.push(...importedData);
            saveLeads();
            closeImportModal();
            filterLeads();
            showNotification('Server refused import — saved locally instead.', 'warning');
        }
    })
    .catch(err => {
        // network error or server down -> fallback local
        leads.push(...importedData);
        saveLeads();
        closeImportModal();
        filterLeads();
        showNotification('Server unavailable — leads saved locally.', 'warning');
    });
}

// helper to load leads from server (call on page load if you want)
// Helper: load leads from server (call on page load if you want) — improved to merge fallback gracefully
function loadLeadsFromServer() {
    fetch('/api/leads')
        .then(r => {
            if (!r.ok) throw new Error(`Server returned ${r.status}`);
            return r.json();
        })
        .then(data => {
            if (data && data.success && Array.isArray(data.leads)) {
                leads = data.leads;
                saveLeads(); // cache locally
                filteredLeads = [...leads];
                renderLeads();
                showNotification('Loaded leads from server.', 'info');
            } else {
                console.warn('Failed to load leads from server (unexpected response):', data);
                // keep existing local leads
            }
        })
        .catch(err => {
            console.warn('Cannot reach server to load leads:', err);
            // keep local leads as-is; UI already falls back on localStorage in loadLeads()
        });
}

// Open add lead modal
function openAddLeadModal() {
    currentLeadId = null;
    document.getElementById('modalTitle').textContent = 'Add New Lead';
    document.getElementById('leadForm').reset();
    document.getElementById('leadId').value = '';
    document.getElementById('leadModal').classList.add('active');
}

// Close lead modal
function closeLeadModal() {
    document.getElementById('leadModal').classList.remove('active');
}

// Save lead
// Save lead (create or update) with server sync and fallback to local
// Save lead (create or update) with server sync and better error reporting
async function saveLead(event) {
    event.preventDefault();

    const leadIdFromForm = document.getElementById('leadId').value;
    const isUpdate = !!leadIdFromForm;

    const leadFromForm = {
        id: leadIdFromForm || generateId(),
        name: (document.getElementById('leadName').value || '').trim(),
        phone: (document.getElementById('leadPhone').value || '').trim(),
        email: (document.getElementById('leadEmail').value || '').trim(),
        city: (document.getElementById('leadCity').value || '').trim(),
        value: parseFloat(document.getElementById('leadValue').value) || 0,
        source: document.getElementById('leadSource').value || 'Manual Entry',
        stage: document.getElementById('leadStage').value || 'New Lead',
        priority: document.getElementById('leadPriority').value || 'Warm',
        createdAt: isUpdate
            ? (leads.find(l => l.id === leadIdFromForm)?.createdAt || new Date().toISOString())
            : new Date().toISOString()
    };

    // Basic client-side validation
    if (!leadFromForm.name || !leadFromForm.phone || !leadFromForm.city) {
        showNotification('Name, Phone and City are required.', 'error');
        return;
    }

    // optimistic local update
    const existingIndex = leads.findIndex(l => l.id === leadFromForm.id);
    if (existingIndex >= 0) {
        leads[existingIndex] = leadFromForm;
        // showNotification('Lead updated locally...', 'info');
    } else {
        leads.unshift(leadFromForm);
        // showNotification('Lead added locally...', 'info');
    }
    saveLeads();
    closeLeadModal();
    filterLeads();

    // Try to sync with server and show detailed errors if they occur
    try {
        const url = isUpdate ? `/api/leads/${encodeURIComponent(leadFromForm.id)}` : '/api/leads';
        const method = isUpdate ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(leadFromForm)
        });

        // read plain text and JSON safely
        let textBody = await res.text();
        let jsonBody;
        try { jsonBody = JSON.parse(textBody); } catch (e) { jsonBody = null; }

        console.log('saveLead response status:', res.status, 'body:', jsonBody || textBody);

        if (!res.ok) {
            // show server-provided message if present
            const serverMsg = jsonBody && jsonBody.error ? jsonBody.error : `Server returned ${res.status}`;
            showNotification(`Server error: ${serverMsg}`, 'error');
            // optionally rollback local change (commented out) — uncomment to restore backup
            // leads = backupLeads; saveLeads(); filterLeads();
            return;
        }

        showNotification(isUpdate ? 'Lead updated on server.' : 'Lead created on server.', 'success');

        // If server returns authoritative/DB-generated ID, update local store
        if (jsonBody && jsonBody.lead && jsonBody.lead.id && jsonBody.lead.id !== leadFromForm.id) {
            const newLead = Object.assign({}, leadFromForm, jsonBody.lead);
            leads = leads.map(l => l.id === leadFromForm.id ? newLead : l);
            saveLeads();
            filterLeads();
            console.log('Replaced local lead id with server id:', jsonBody.lead.id);
        }
    } catch (err) {
        console.error('saveLead server sync failed:', err);
        showNotification('Server unavailable — changes saved locally.', 'warning');
    }
}

// Edit lead
function editLead(id) {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    currentLeadId = id;
    document.getElementById('modalTitle').textContent = 'Edit Lead';
    document.getElementById('leadId').value = lead.id;
    document.getElementById('leadName').value = lead.name;
    document.getElementById('leadPhone').value = lead.phone || '';
    document.getElementById('leadEmail').value = lead.email || '';
    document.getElementById('leadCity').value = lead.city || '';
    document.getElementById('leadValue').value = lead.value;
    document.getElementById('leadSource').value = lead.source;
    document.getElementById('leadStage').value = lead.stage;
    document.getElementById('leadPriority').value = lead.priority;

    document.getElementById('leadModal').classList.add('active');
}

// View lead details
function viewLeadDetails(id) {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    currentLeadId = id;
    document.getElementById('detailsTitle').textContent = lead.name;
    document.getElementById('detailsStage').textContent = lead.stage;
    document.getElementById('detailsStage').className = `detail-badge stage-badge stage-${lead.stage.toLowerCase().replace(' ', '-')}`;

    document.getElementById('detailCompany').textContent = lead.city || '-';
    document.getElementById('detailContact').textContent = lead.name || '-';
    document.getElementById('detailJobTitle').textContent = '-';
    document.getElementById('detailIndustry').textContent = '-';
    document.getElementById('detailEmail').textContent = lead.email || '-';
    document.getElementById('detailPhone').textContent = lead.phone || '-';
    document.getElementById('detailWebsite').textContent = '-';
    document.getElementById('detailLinkedin').textContent = '-';
    document.getElementById('detailValue').textContent = formatCurrency(lead.value);
    document.getElementById('detailStage').textContent = lead.stage;
    document.getElementById('detailSource').textContent = lead.source;
    document.getElementById('detailPriority').textContent = lead.priority;
    document.getElementById('detailNotes').textContent = 'No notes available';

    document.getElementById('detailsModal').classList.add('active');
}

// Close details modal
function closeDetailsModal() {
    document.getElementById('detailsModal').classList.remove('active');
}

// Edit current lead
function editCurrentLead() {
    closeDetailsModal();
    editLead(currentLeadId);
}

// Delete lead
// Delete lead (single)
// Delete lead (single) — with rollback and detailed server error handling
async function deleteLead() {
    if (!currentLeadId) return;

    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return;

    const idToDelete = currentLeadId;
    const backupLeads = [...leads];

    // Optimistic UI removal
    leads = leads.filter(l => l.id !== idToDelete);
    saveLeads();
    filterLeads();
    closeDetailsModal();
    showNotification('Deleting lead...', 'info');

    try {
        const res = await fetch(`/api/leads/${encodeURIComponent(idToDelete)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin' // ensures session cookie is sent; use 'include' if cross-origin + CORS allows credentials
        });

        // Read response body
        const text = await res.text();
        let body = null;
        try { body = JSON.parse(text); } catch (e) { body = text; }

        if (!res.ok) {
            // rollback
            leads = backupLeads;
            saveLeads();
            filterLeads();

            const errMsg = (body && body.error) ? body.error : `Server returned ${res.status}`;
            showNotification(`Could not delete on server: ${errMsg}`, 'error');
            console.warn('Delete failed:', res.status, body);
            return;
        }

        // success
        showNotification('Lead deleted successfully (server).', 'success');
        selectedLeads.delete(idToDelete);
        updateBulkDeleteButton();
    } catch (err) {
        // network or unexpected error -> rollback
        leads = backupLeads;
        saveLeads();
        filterLeads();

        showNotification('Network error — could not delete lead on server. Local changes restored.', 'error');
        console.error('Delete error:', err);
    } finally {
        currentLeadId = null;
    }
}


// Export leads
function exportLeads() {
    const csv = [
        ['Name', 'Number', 'Email', 'City', 'Value', 'Source', 'Stage', 'Priority', 'Created Date']
    ];

    filteredLeads.forEach(lead => {
        csv.push([
            lead.name,
            lead.phone || '',
            lead.email || '',
            lead.city || '',
            lead.value,
            lead.source,
            lead.stage,
            lead.priority,
            new Date(lead.createdAt).toLocaleDateString()
        ]);
    });

    const csvContent = csv.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showNotification('Leads exported successfully!', 'success');
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show notification
function showNotification(message, type = 'success') {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        font-weight: 500;
        max-width: 400px;
    `;
    notification.textContent = message;

    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Close modals on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});


 