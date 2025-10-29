let users = [
    { id: 1, name: 'John Doe', email: 'john.doe@example.com', phone: '+1-555-0101', role: 'Admin', status: 'Active', permissions: { manageUsers: true, manageLeads: true, makeCalls: true, viewReports: true, manageSettings: true } },
    { id: 2, name: 'Sarah Johnson', email: 'sarah.j@example.com', phone: '+1-555-0102', role: 'Manager', status: 'Active', permissions: { manageUsers: false, manageLeads: true, makeCalls: true, viewReports: true, manageSettings: false } },
    { id: 3, name: 'Michael Chen', email: 'michael.c@example.com', phone: '+1-555-0103', role: 'Caller', status: 'Active', permissions: { manageUsers: false, manageLeads: true, makeCalls: true, viewReports: false, manageSettings: false } },
    { id: 4, name: 'Emily Davis', email: 'emily.d@example.com', phone: '+1-555-0104', role: 'Caller', status: 'Active', permissions: { manageUsers: false, manageLeads: true, makeCalls: true, viewReports: false, manageSettings: false } },
    { id: 5, name: 'Robert Wilson', email: 'robert.w@example.com', phone: '+1-555-0105', role: 'Manager', status: 'Inactive', permissions: { manageUsers: false, manageLeads: true, makeCalls: true, viewReports: true, manageSettings: false } },
    { id: 6, name: 'Jessica Brown', email: 'jessica.b@example.com', phone: '+1-555-0106', role: 'Viewer', status: 'Active', permissions: { manageUsers: false, manageLeads: false, makeCalls: false, viewReports: true, manageSettings: false } },
    { id: 7, name: 'David Martinez', email: 'david.m@example.com', phone: '+1-555-0107', role: 'Caller', status: 'Active', permissions: { manageUsers: false, manageLeads: true, makeCalls: true, viewReports: false, manageSettings: false } },
    { id: 8, name: 'Amanda Taylor', email: 'amanda.t@example.com', phone: '+1-555-0108', role: 'Manager', status: 'Active', permissions: { manageUsers: false, manageLeads: true, makeCalls: true, viewReports: true, manageSettings: false } }
];

let leadStages = [
    { id: 1, name: 'New Lead', color: '#3b82f6', order: 1 },
    { id: 2, name: 'Contacted', color: '#8b5cf6', order: 2 },
    { id: 3, name: 'Qualified', color: '#f59e0b', order: 3 },
    { id: 4, name: 'Proposal Sent', color: '#10b981', order: 4 },
    { id: 5, name: 'Negotiation', color: '#f97316', order: 5 },
    { id: 6, name: 'Closed Won', color: '#22c55e', order: 6 },
    { id: 7, name: 'Closed Lost', color: '#ef4444', order: 7 }
];

let auditLogs = [
    { id: 1, timestamp: '2025-10-16 10:30:15', user: 'John Doe', action: 'created', entityType: 'Lead', entityId: 'L-1001', details: 'Created new lead for ABC Corp' },
    { id: 2, timestamp: '2025-10-16 10:25:42', user: 'Sarah Johnson', action: 'updated', entityType: 'Lead', entityId: 'L-0998', details: 'Changed status to Qualified' },
    { id: 3, timestamp: '2025-10-16 10:15:33', user: 'Michael Chen', action: 'created', entityType: 'Call', entityId: 'C-5042', details: 'Made outbound call to prospect' },
    { id: 4, timestamp: '2025-10-16 09:45:18', user: 'Emily Davis', action: 'updated', entityType: 'Lead', entityId: 'L-0995', details: 'Added follow-up notes' },
    { id: 5, timestamp: '2025-10-16 09:30:25', user: 'John Doe', action: 'created', entityType: 'User', entityId: 'U-008', details: 'Added new caller to team' },
    { id: 6, timestamp: '2025-10-16 09:12:47', user: 'Amanda Taylor', action: 'deleted', entityType: 'Lead', entityId: 'L-0890', details: 'Removed duplicate lead' },
    { id: 7, timestamp: '2025-10-16 08:55:33', user: 'David Martinez', action: 'login', entityType: 'Session', entityId: 'S-12345', details: 'User logged in' },
    { id: 8, timestamp: '2025-10-16 08:30:12', user: 'Sarah Johnson', action: 'updated', entityType: 'Settings', entityId: 'CALL-001', details: 'Changed default call type to Outbound' },
    { id: 9, timestamp: '2025-10-15 17:45:22', user: 'Robert Wilson', action: 'logout', entityType: 'Session', entityId: 'S-12340', details: 'User logged out' },
    { id: 10, timestamp: '2025-10-15 17:30:55', user: 'Jessica Brown', action: 'created', entityType: 'Report', entityId: 'R-042', details: 'Generated monthly sales report' },
    { id: 11, timestamp: '2025-10-15 16:22:18', user: 'John Doe', action: 'updated', entityType: 'User', entityId: 'U-005', details: 'Changed user role to Manager' },
    { id: 12, timestamp: '2025-10-15 15:45:33', user: 'Michael Chen', action: 'created', entityType: 'Lead', entityId: 'L-1000', details: 'Imported lead from Google Sheets' },
    { id: 13, timestamp: '2025-10-15 15:10:42', user: 'Emily Davis', action: 'updated', entityType: 'Lead', entityId: 'L-0992', details: 'Scheduled follow-up call' },
    { id: 14, timestamp: '2025-10-15 14:55:27', user: 'Amanda Taylor', action: 'created', entityType: 'Call', entityId: 'C-5040', details: 'Completed discovery call' },
    { id: 15, timestamp: '2025-10-15 14:22:13', user: 'David Martinez', action: 'updated', entityType: 'Lead', entityId: 'L-0988', details: 'Updated contact information' }
];

let currentUsersPage = 1;
let currentLogsPage = 1;
const itemsPerPage = 10;
let filteredUsers = [...users];
let filteredLogs = [...auditLogs];
let deleteCallback = null;

function initializePage() {
    renderUsers();
    renderStages();
    renderAuditLogs();
    loadSettings();
    populateLogUserFilter();

    const savedData = localStorage.getItem('crmSettings');
    if (savedData) {
        const data = JSON.parse(savedData);
        if (data.users) users = data.users;
        if (data.leadStages) leadStages = data.leadStages;
        if (data.auditLogs) auditLogs = data.auditLogs;
        renderUsers();
        renderStages();
        renderAuditLogs();
    }
}

function saveToLocalStorage() {
    localStorage.setItem('crmSettings', JSON.stringify({
        users,
        leadStages,
        auditLogs
    }));
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(tabName);

    if (activeBtn) activeBtn.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
    });
});

function renderUsers() {
    const tbody = document.getElementById('usersTable');
    const startIndex = (currentUsersPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageUsers = filteredUsers.slice(startIndex, endIndex);

    tbody.innerHTML = pageUsers.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.phone}</td>
            <td>${user.role}</td>
            <td>
                <span class="status-badge status-${user.status.toLowerCase()}">${user.status}</span>
            </td>
            <td>
                <button class="action-btn" onclick="toggleUserStatus(${user.id})" title="Toggle Status">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </button>
                <button class="action-btn" onclick="editUser(${user.id})" title="Edit User">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="action-btn delete" onclick="deleteUser(${user.id})" title="Delete User">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');

    renderUsersPagination();
}

function renderUsersPagination() {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const pagination = document.getElementById('usersPagination');

    let html = `
        <button onclick="changeUsersPage(${currentUsersPage - 1})" ${currentUsersPage === 1 ? 'disabled' : ''}>Previous</button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="${i === currentUsersPage ? 'active' : ''}" onclick="changeUsersPage(${i})">${i}</button>`;
    }

    html += `
        <button onclick="changeUsersPage(${currentUsersPage + 1})" ${currentUsersPage === totalPages ? 'disabled' : ''}>Next</button>
    `;

    pagination.innerHTML = html;
}

function changeUsersPage(page) {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentUsersPage = page;
    renderUsers();
}

function filterUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.role.toLowerCase().includes(searchTerm) ||
        user.phone.toLowerCase().includes(searchTerm)
    );
    currentUsersPage = 1;
    renderUsers();
}

function openAddUserModal() {
    document.getElementById('userModalTitle').textContent = 'Add User';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userStatus').value = 'Active';
    document.getElementById('userModal').classList.add('active');
}

function editUser(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;

    document.getElementById('userModalTitle').textContent = 'Edit User';
    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.name;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userPhone').value = user.phone;
    document.getElementById('userRole').value = user.role;
    document.getElementById('userStatus').value = user.status;

    document.getElementById('permManageUsers').checked = user.permissions.manageUsers;
    document.getElementById('permManageLeads').checked = user.permissions.manageLeads;
    document.getElementById('permMakeCalls').checked = user.permissions.makeCalls;
    document.getElementById('permViewReports').checked = user.permissions.viewReports;
    document.getElementById('permManageSettings').checked = user.permissions.manageSettings;

    document.getElementById('userModal').classList.add('active');
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
}

function saveUser(event) {
    event.preventDefault();

    const id = document.getElementById('userId').value;
    const userData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        phone: document.getElementById('userPhone').value,
        role: document.getElementById('userRole').value,
        status: document.getElementById('userStatus').value,
        permissions: {
            manageUsers: document.getElementById('permManageUsers').checked,
            manageLeads: document.getElementById('permManageLeads').checked,
            makeCalls: document.getElementById('permMakeCalls').checked,
            viewReports: document.getElementById('permViewReports').checked,
            manageSettings: document.getElementById('permManageSettings').checked
        }
    };

    if (id) {
        const index = users.findIndex(u => u.id === parseInt(id));
        users[index] = { ...users[index], ...userData };
        addAuditLog('updated', 'User', `U-${String(id).padStart(3, '0')}`, `Updated user ${userData.name}`);
        showToast('User updated successfully', 'success');
    } else {
        const newUser = {
            id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
            ...userData
        };
        users.push(newUser);
        addAuditLog('created', 'User', `U-${String(newUser.id).padStart(3, '0')}`, `Created new user ${userData.name}`);
        showToast('User added successfully', 'success');
    }

    saveToLocalStorage();
    renderUsers();
    closeUserModal();
}

function toggleUserStatus(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;

    user.status = user.status === 'Active' ? 'Inactive' : 'Active';
    addAuditLog('updated', 'User', `U-${String(id).padStart(3, '0')}`, `Changed status to ${user.status}`);
    saveToLocalStorage();
    renderUsers();
    showToast(`User status changed to ${user.status}`, 'success');
}

function deleteUser(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;

    openDeleteModal(
        `Are you sure you want to delete user "${user.name}"? This action cannot be undone.`,
        () => {
            users = users.filter(u => u.id !== id);
            addAuditLog('deleted', 'User', `U-${String(id).padStart(3, '0')}`, `Deleted user ${user.name}`);
            saveToLocalStorage();
            renderUsers();
            showToast('User deleted successfully', 'success');
        }
    );
}

function renderStages() {
    const container = document.getElementById('stagesList');
    const sortedStages = [...leadStages].sort((a, b) => a.order - b.order);

    container.innerHTML = sortedStages.map(stage => `
        <div class="stage-item">
            <div class="stage-color" style="background-color: ${stage.color}"></div>
            <span class="stage-name">${stage.name}</span>
            <div style="margin-left: auto; display: flex; gap: 0.5rem;">
                <button class="action-btn" onclick="editStage(${stage.id})" title="Edit Stage">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="action-btn delete" onclick="deleteStage(${stage.id})" title="Delete Stage">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function openAddStageModal() {
    document.getElementById('stageModalTitle').textContent = 'Add Lead Stage';
    document.getElementById('stageForm').reset();
    document.getElementById('stageId').value = '';
    document.getElementById('stageColor').value = '#3b82f6';
    document.getElementById('stageOrder').value = leadStages.length + 1;
    document.getElementById('stageModal').classList.add('active');
}

function editStage(id) {
    const stage = leadStages.find(s => s.id === id);
    if (!stage) return;

    document.getElementById('stageModalTitle').textContent = 'Edit Lead Stage';
    document.getElementById('stageId').value = stage.id;
    document.getElementById('stageName').value = stage.name;
    document.getElementById('stageColor').value = stage.color;
    document.getElementById('stageOrder').value = stage.order;
    document.getElementById('stageModal').classList.add('active');
}

function closeStageModal() {
    document.getElementById('stageModal').classList.remove('active');
}

function saveStage(event) {
    event.preventDefault();

    const id = document.getElementById('stageId').value;
    const stageData = {
        name: document.getElementById('stageName').value,
        color: document.getElementById('stageColor').value,
        order: parseInt(document.getElementById('stageOrder').value)
    };

    if (id) {
        const index = leadStages.findIndex(s => s.id === parseInt(id));
        leadStages[index] = { ...leadStages[index], ...stageData };
        addAuditLog('updated', 'Lead Stage', `LS-${String(id).padStart(3, '0')}`, `Updated stage ${stageData.name}`);
        showToast('Stage updated successfully', 'success');
    } else {
        const newStage = {
            id: leadStages.length > 0 ? Math.max(...leadStages.map(s => s.id)) + 1 : 1,
            ...stageData
        };
        leadStages.push(newStage);
        addAuditLog('created', 'Lead Stage', `LS-${String(newStage.id).padStart(3, '0')}`, `Created new stage ${stageData.name}`);
        showToast('Stage added successfully', 'success');
    }

    saveToLocalStorage();
    renderStages();
    closeStageModal();
}

function deleteStage(id) {
    const stage = leadStages.find(s => s.id === id);
    if (!stage) return;

    openDeleteModal(
        `Are you sure you want to delete stage "${stage.name}"? This action cannot be undone.`,
        () => {
            leadStages = leadStages.filter(s => s.id !== id);
            addAuditLog('deleted', 'Lead Stage', `LS-${String(id).padStart(3, '0')}`, `Deleted stage ${stage.name}`);
            saveToLocalStorage();
            renderStages();
            showToast('Stage deleted successfully', 'success');
        }
    );
}

function saveCallSettings() {
    const callType = document.getElementById('defaultCallType').value;
    const followUpTime = document.getElementById('followUpTime').value;

    addAuditLog('updated', 'Settings', 'CALL-001', `Updated call settings: Type=${callType}, Follow-up=${followUpTime}h`);
    showToast('Call settings saved successfully', 'success');
}

function saveAssignmentRules() {
    const method = document.getElementById('assignmentMethod').value;
    const autoAssign = document.getElementById('autoAssign').checked;

    addAuditLog('updated', 'Settings', 'ASSIGN-001', `Updated assignment rules: Method=${method}, Auto-assign=${autoAssign}`);
    showToast('Assignment rules saved successfully', 'success');
}

function toggleIntegration(integration) {
    const checkbox = document.getElementById(`${integration}Sync`);
    const status = checkbox.checked ? 'enabled' : 'disabled';
    addAuditLog('updated', 'Integration', integration, `${integration} sync ${status}`);
    showToast(`${integration} sync ${status}`, 'success');
}

function saveIntegration(integration) {
    addAuditLog('updated', 'Integration', integration, `Updated ${integration} integration settings`);
    showToast(`${integration} integration saved successfully`, 'success');
}

function saveSecuritySettings() {
    addAuditLog('updated', 'Settings', 'SECURITY-001', 'Updated security settings');
    showToast('Security settings saved successfully', 'success');
}

function loadSettings() {
    const savedSettings = localStorage.getItem('crmAppSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.defaultCallType) document.getElementById('defaultCallType').value = settings.defaultCallType;
        if (settings.followUpTime) document.getElementById('followUpTime').value = settings.followUpTime;
        if (settings.assignmentMethod) document.getElementById('assignmentMethod').value = settings.assignmentMethod;
        if (settings.autoAssign !== undefined) document.getElementById('autoAssign').checked = settings.autoAssign;
    }
}

function renderAuditLogs() {
    const tbody = document.getElementById('auditLogsTable');
    const startIndex = (currentLogsPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageLogs = filteredLogs.slice(startIndex, endIndex);

    tbody.innerHTML = pageLogs.map(log => `
        <tr>
            <td>${log.timestamp}</td>
            <td>${log.user}</td>
            <td><span class="status-badge" style="background: #dbeafe; color: #1e40af;">${log.action}</span></td>
            <td>${log.entityType}</td>
            <td>${log.entityId}</td>
            <td>${log.details}</td>
        </tr>
    `).join('');

    renderLogsPagination();
}

function renderLogsPagination() {
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const pagination = document.getElementById('logsPagination');

    let html = `
        <button onclick="changeLogsPage(${currentLogsPage - 1})" ${currentLogsPage === 1 ? 'disabled' : ''}>Previous</button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="${i === currentLogsPage ? 'active' : ''}" onclick="changeLogsPage(${i})">${i}</button>`;
    }

    html += `
        <button onclick="changeLogsPage(${currentLogsPage + 1})" ${currentLogsPage === totalPages ? 'disabled' : ''}>Next</button>
    `;

    pagination.innerHTML = html;
}

function changeLogsPage(page) {
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentLogsPage = page;
    renderAuditLogs();
}

function populateLogUserFilter() {
    const select = document.getElementById('logUserFilter');
    const uniqueUsers = [...new Set(auditLogs.map(log => log.user))];

    select.innerHTML = '<option value="">All Users</option>' +
        uniqueUsers.map(user => `<option value="${user}">${user}</option>`).join('');
}

function filterLogs() {
    const userFilter = document.getElementById('logUserFilter').value;
    const actionFilter = document.getElementById('logActionFilter').value;
    const dateFrom = document.getElementById('logDateFrom').value;
    const dateTo = document.getElementById('logDateTo').value;

    filteredLogs = auditLogs.filter(log => {
        if (userFilter && log.user !== userFilter) return false;
        if (actionFilter && log.action !== actionFilter) return false;
        if (dateFrom && log.timestamp < dateFrom) return false;
        if (dateTo && log.timestamp > dateTo) return false;
        return true;
    });

    currentLogsPage = 1;
    renderAuditLogs();
}

function exportLogs() {
    const csv = [
        ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Details'],
        ...filteredLogs.map(log => [
            log.timestamp,
            log.user,
            log.action,
            log.entityType,
            log.entityId,
            log.details
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showToast('Audit logs exported successfully', 'success');
}

function addAuditLog(action, entityType, entityId, details) {
    const newLog = {
        id: auditLogs.length > 0 ? Math.max(...auditLogs.map(l => l.id)) + 1 : 1,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: 'Current User',
        action,
        entityType,
        entityId,
        details
    };

    auditLogs.unshift(newLog);
    saveToLocalStorage();
    renderAuditLogs();
    populateLogUserFilter();
}

function openDeleteModal(message, callback) {
    document.getElementById('deleteMessage').textContent = message;
    deleteCallback = callback;
    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    deleteCallback = null;
}

function confirmDelete() {
    if (deleteCallback) {
        deleteCallback();
    }
    closeDeleteModal();
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });
}

window.addEventListener('DOMContentLoaded', initializePage);
