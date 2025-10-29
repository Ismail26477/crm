// ---------------- Globals ----------------
let conversionsChart, callsChart, sourceChart, followupChart;
let leads = [];
let filteredLeads = [];

// ---------------- Fetch Leads from Server ----------------
async function loadLeadsFromServer() {
    try {
        const res = await fetch('/api/leads');
        const data = await res.json();
        leads = data.leads || [];
        applyFilters();
    } catch(err) {
        console.error("Failed to load leads:", err);
    }
}

// ---------------- Filters ----------------
function applyFilters() {
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    const source = document.getElementById('sourceFilter').value;

    filteredLeads = leads.filter(l => {
        let keep = true;
        if (fromDate) keep = keep && new Date(l.createdAt) >= new Date(fromDate);
        if (toDate) keep = keep && new Date(l.createdAt) <= new Date(toDate);
        if (source && source !== 'all') keep = keep && l.source.toLowerCase() === source.toLowerCase();
        return keep;
    });

    updateKPIs();
    updateFollowupTable();
    updateTeamTable();
    updateCharts();
}

// ---------------- Update KPIs ----------------
function updateKPIs() {
    document.getElementById('kpiTotalLeads').textContent = filteredLeads.length;
    document.getElementById('kpiContacted').textContent = filteredLeads.filter(l => l.status === 'done').length;
    document.getElementById('kpiConverted').textContent = filteredLeads.filter(l => l.stage === 'Won').length;
    document.getElementById('kpiMissed').textContent = filteredLeads.filter(l => l.status === 'missed').length;
    document.getElementById('kpiCalls').textContent = filteredLeads.length; // Replace with actual calls if tracked
}

// ---------------- Populate Tables ----------------
function updateFollowupTable() {
    const tbody = document.getElementById('followupTableBody');
    tbody.innerHTML = '';
    filteredLeads.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${l.name}</td>
            <td>${l.lastCallDate || '-'}</td>
            <td>${l.nextFollowup || '-'}</td>
            <td>${l.status || '-'}</td>
            <td>${l.assignedTo || '-'}</td>
            <td><button onclick="showLeadModal('${l.id}')">View</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateTeamTable() {
    const tbody = document.getElementById('teamTableBody');
    tbody.innerHTML = '';
    const members = {};
    filteredLeads.forEach(l => {
        const assignee = l.assignedTo || 'Unassigned';
        if (!members[assignee]) members[assignee] = { calls: 0, conversions: 0 };
        members[assignee].calls++;
        if (l.stage === 'Won') members[assignee].conversions++;
    });
    Object.keys(members).forEach(member => {
        const data = members[member];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${member}</td>
            <td>${data.calls}</td>
            <td>${data.conversions}</td>
            <td>${data.calls ? ((data.conversions / data.calls) * 100).toFixed(1) + '%' : '0%'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ---------------- Charts ----------------
function initCharts() {
    const convCtx = document.getElementById('conversionsChart').getContext('2d');
    conversionsChart = new Chart(convCtx, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Conversions', data: [], backgroundColor: '#4CAF50' }] },
        options: { responsive: true }
    });

    const callsCtx = document.getElementById('callsChart').getContext('2d');
    callsChart = new Chart(callsCtx, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Calls', data: [], borderColor: '#2196F3', fill: true }] },
        options: { responsive: true }
    });

    const sourceCtx = document.getElementById('sourceChart').getContext('2d');
    sourceChart = new Chart(sourceCtx, {
        type: 'pie',
        data: {
            labels: ['WhatsApp', 'Website', 'Referral', 'Social', 'Cold Call'],
            datasets: [{ data: [], backgroundColor: ['#4CAF50','#2196F3','#FFC107','#FF5722','#9E9E9E'] }]
        },
        options: { responsive: true }
    });

    const followCtx = document.getElementById('followupChart').getContext('2d');
    followupChart = new Chart(followCtx, {
        type: 'doughnut',
        data: { labels: ['Pending','Done','Missed','Overdue'], datasets: [{ data: [], backgroundColor: ['#FFA500','#4CAF50','#FF0000','#808080'] }] },
        options: { responsive: true }
    });
}

function updateCharts() {
    // Lead conversions (last 7 days)
    const labels = [];
    const convData = [];
    for (let i=6;i>=0;i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const day = d.toISOString().slice(5,10);
        labels.push(day);
        convData.push(filteredLeads.filter(l => l.stage === 'Won' && l.createdAt.slice(5,10) === day).length);
    }
    conversionsChart.data.labels = labels;
    conversionsChart.data.datasets[0].data = convData;
    conversionsChart.update();

    // Calls per day (dummy same as leads created)
    callsChart.data.labels = labels;
    callsChart.data.datasets[0].data = labels.map(day => filteredLeads.filter(l => l.createdAt.slice(5,10) === day).length);
    callsChart.update();

    // Lead source distribution
    const sourceCount = { whatsapp:0, website:0, referral:0, social:0, 'cold call':0 };
    filteredLeads.forEach(l => { sourceCount[l.source?.toLowerCase()] = (sourceCount[l.source?.toLowerCase()]||0)+1 });
    sourceChart.data.datasets[0].data = Object.values(sourceCount);
    sourceChart.update();

    // Follow-up status
    const statusCount = { pending:0, done:0, missed:0, overdue:0 };
    filteredLeads.forEach(l => { statusCount[l.status?.toLowerCase()] = (statusCount[l.status?.toLowerCase()]||0)+1 });
    followupChart.data.datasets[0].data = Object.values(statusCount);
    followupChart.update();
}

// ---------------- Modal ----------------
function showLeadModal(id){
    const lead = filteredLeads.find(l => l.id === id);
    if (!lead) return;
    document.getElementById('modalLeadName').textContent = lead.name;
    document.getElementById('modalAssignedTo').textContent = lead.assignedTo || '-';
    document.getElementById('modalLastCall').textContent = lead.lastCallDate || '-';
    document.getElementById('modalNextFollowup').textContent = lead.nextFollowup || '-';
    document.getElementById('modalStatus').textContent = lead.status || '-';
    document.getElementById('leadModal').setAttribute('aria-hidden','false');
}

document.getElementById('closeLeadModal').addEventListener('click', ()=>{
    document.getElementById('leadModal').setAttribute('aria-hidden','true');
});

// ---------------- Event Listeners ----------------
document.getElementById('applyFilters').addEventListener('click', applyFilters);
document.getElementById('resetFilters').addEventListener('click', ()=>{
    document.getElementById('fromDate').value = '';
    document.getElementById('toDate').value = '';
    document.getElementById('sourceFilter').value = 'all';
    applyFilters();
});

// ---------------- Initialize ----------------
document.addEventListener('DOMContentLoaded', ()=>{
    initCharts();
    loadLeadsFromServer();
});
