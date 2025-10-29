let leads = [];
let dateRange = 30;
let activityPeriod = 'daily';

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initDashboard();
});

function loadData() {
    const stored = localStorage.getItem('crm_leads');
    if (stored) {
        leads = JSON.parse(stored);
    } else {
        leads = generateSampleData();
        localStorage.setItem('crm_leads', JSON.stringify(leads));
    }
}

function generateSampleData() {
    const stages = ['New Lead', 'Contacted', 'Qualified', 'Viewing Scheduled', 'Negotiation', 'Closed Won', 'Closed Lost'];
    const sources = ['Website Form', 'Meta Ads', 'Google Ads', 'Referral', 'Cold Call', 'Walk-in', 'Email Campaign'];
    const priorities = ['Hot', 'Warm', 'Cold'];
    const propertyTypes = ['Apartment', 'House', 'Villa', 'Townhouse', 'Penthouse', 'Studio', 'Commercial'];
    const agents = ['Sarah Johnson', 'Michael Chen', 'Emma Davis', 'John Smith', 'Lisa Anderson'];

    const sampleLeads = [];
    const now = Date.now();

    for (let i = 0; i < 75; i++) {
        const daysAgo = Math.floor(Math.random() * 90);
        const createdDate = new Date(now - daysAgo * 86400000);

        sampleLeads.push({
            id: 'lead_' + now + '_' + i,
            name: `Client ${i + 1}`,
            contact: `contact${i + 1}@example.com`,
            phone: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
            stage: stages[Math.floor(Math.random() * stages.length)],
            source: sources[Math.floor(Math.random() * sources.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            propertyType: propertyTypes[Math.floor(Math.random() * propertyTypes.length)],
            agent: agents[Math.floor(Math.random() * agents.length)],
            viewingScheduled: Math.random() > 0.6,
            viewingDate: Math.random() > 0.5 ? new Date(now + Math.random() * 14 * 86400000).toISOString() : null,
            followUpDate: Math.random() > 0.3 ? new Date(now + Math.random() * 7 * 86400000).toISOString() : null,
            responseTime: Math.floor(Math.random() * 240),
            createdAt: createdDate.toISOString(),
            lastActivity: new Date(now - Math.random() * 7 * 86400000).toISOString()
        });
    }

    return sampleLeads;
}

function initDashboard() {
    updateMetrics();
    renderActivityChart();
    renderPipelineChart();
    renderPropertyTypes();
    renderTopAgents();
    renderUpcomingFollowups();
    renderSourcesPerformance();
    renderResponseAnalysis();
    renderActivityTimeline();
    renderTodayTasks();
}

function updateMetrics() {
    const filteredLeads = getFilteredLeads();
    const previousLeads = getPreviousLeads();

    document.getElementById('totalLeads').textContent = filteredLeads.length;
    const leadsChange = calculateChange(filteredLeads.length, previousLeads.length);
    updateChangeIndicator('leadsChange', leadsChange);

    const today = new Date().toDateString();
    const newToday = leads.filter(l => new Date(l.createdAt).toDateString() === today).length;
    document.getElementById('newLeadsToday').textContent = newToday;

    const propertyTypes = [...new Set(filteredLeads.map(l => l.propertyType))].length;
    document.getElementById('totalProperties').textContent = propertyTypes * 15;
    document.getElementById('activeListings').textContent = propertyTypes * 12;
    updateChangeIndicator('propertiesChange', 8);

    const closedDeals = filteredLeads.filter(l => l.stage === 'Closed Won').length;
    document.getElementById('closedDeals').textContent = closedDeals;
    const thisMonth = new Date().getMonth();
    const monthlyDeals = leads.filter(l => {
        const leadDate = new Date(l.createdAt);
        return leadDate.getMonth() === thisMonth && l.stage === 'Closed Won';
    }).length;
    document.getElementById('thisMonthDeals').textContent = monthlyDeals;
    updateChangeIndicator('dealsChange', 15);

    const scheduledViewings = filteredLeads.filter(l => l.viewingScheduled).length;
    document.getElementById('scheduledViewings').textContent = scheduledViewings;
    const todayViewings = leads.filter(l => {
        if (!l.viewingDate) return false;
        return new Date(l.viewingDate).toDateString() === today;
    }).length;
    document.getElementById('todayViewings').textContent = todayViewings;
    updateChangeIndicator('viewingsChange', 22);
}

function updateChangeIndicator(elementId, change) {
    const element = document.getElementById(elementId);
    element.textContent = formatChange(change);
    element.className = `metric-change ${change >= 0 ? 'positive' : 'negative'}`;
}

function getFilteredLeads() {
    const now = Date.now();
    const rangeMs = dateRange * 86400000;
    return leads.filter(l => now - new Date(l.createdAt).getTime() <= rangeMs);
}

function getPreviousLeads() {
    const now = Date.now();
    const rangeMs = dateRange * 86400000;
    const previousStart = now - (rangeMs * 2);
    const previousEnd = now - rangeMs;
    return leads.filter(l => {
        const time = new Date(l.createdAt).getTime();
        return time >= previousStart && time <= previousEnd;
    });
}

function calculateChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
}

function formatChange(change) {
    const sign = change >= 0 ? '+' : '';
    return sign + change.toFixed(1) + '%';
}

function renderActivityChart() {
    const canvas = document.getElementById('activityChart');
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const activityData = getActivityData();
    const maxValue = Math.max(...activityData.map(d => Math.max(d.new, d.converted)));

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barWidth = chartWidth / activityData.length / 2.5;
    const spacing = barWidth * 0.5;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(maxValue - (maxValue / 5) * i), padding - 10, y + 4);
    }

    activityData.forEach((data, index) => {
        const x = padding + index * (barWidth * 2 + spacing);
        const newHeight = (data.new / maxValue) * chartHeight;
        const convertedHeight = (data.converted / maxValue) * chartHeight;

        const newGradient = ctx.createLinearGradient(x, canvas.height - padding - newHeight, x, canvas.height - padding);
        newGradient.addColorStop(0, '#667eea');
        newGradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = newGradient;
        ctx.fillRect(x, canvas.height - padding - newHeight, barWidth, newHeight);

        const convertedGradient = ctx.createLinearGradient(x + barWidth + spacing / 2, canvas.height - padding - convertedHeight, x + barWidth + spacing / 2, canvas.height - padding);
        convertedGradient.addColorStop(0, '#43e97b');
        convertedGradient.addColorStop(1, '#38f9d7');
        ctx.fillStyle = convertedGradient;
        ctx.fillRect(x + barWidth + spacing / 2, canvas.height - padding - convertedHeight, barWidth, convertedHeight);

        ctx.fillStyle = '#64748b';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(data.label, x + barWidth + spacing / 4, canvas.height - padding + 20);
    });

    const legendY = padding - 20;
    ctx.fillStyle = '#667eea';
    ctx.fillRect(canvas.width - 200, legendY, 12, 12);
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('New Leads', canvas.width - 180, legendY + 10);

    ctx.fillStyle = '#43e97b';
    ctx.fillRect(canvas.width - 90, legendY, 12, 12);
    ctx.fillText('Converted', canvas.width - 70, legendY + 10);
}

function getActivityData() {
    const data = [];
    const now = new Date();

    if (activityPeriod === 'daily') {
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 86400000);
            const dateStr = date.toDateString();
            const dayLeads = leads.filter(l => new Date(l.createdAt).toDateString() === dateStr);
            const converted = dayLeads.filter(l => l.stage === 'Closed Won').length;

            data.push({
                label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
                new: dayLeads.length,
                converted: converted
            });
        }
    } else if (activityPeriod === 'weekly') {
        for (let i = 5; i >= 0; i--) {
            const weekStart = new Date(now.getTime() - (i * 7 + 7) * 86400000);
            const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
            const weekLeads = leads.filter(l => {
                const leadDate = new Date(l.createdAt);
                return leadDate >= weekStart && leadDate < weekEnd;
            });
            const converted = weekLeads.filter(l => l.stage === 'Closed Won').length;

            data.push({
                label: `W${52 - i}`,
                new: weekLeads.length,
                converted: converted
            });
        }
    } else {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = now.getMonth();

        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            const monthLeads = leads.filter(l => new Date(l.createdAt).getMonth() === monthIndex);
            const converted = monthLeads.filter(l => l.stage === 'Closed Won').length;

            data.push({
                label: months[monthIndex],
                new: monthLeads.length,
                converted: converted
            });
        }
    }

    return data;
}

function renderPipelineChart() {
    const canvas = document.getElementById('pipelineChart');
    const ctx = canvas.getContext('2d');
    const legend = document.getElementById('pipelineLegend');

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const stages = ['New Lead', 'Contacted', 'Qualified', 'Viewing Scheduled', 'Negotiation', 'Closed Won'];
    const colors = ['#667eea', '#4facfe', '#43e97b', '#f093fb', '#fa709a', '#38f9d7'];

    const stageData = stages.map((stage, index) => ({
        stage,
        count: leads.filter(l => l.stage === stage).length,
        color: colors[index]
    }));

    const total = stageData.reduce((sum, d) => sum + d.count, 0);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    const innerRadius = radius * 0.6;

    let currentAngle = -Math.PI / 2;

    stageData.forEach(data => {
        const sliceAngle = (data.count / total) * Math.PI * 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();

        ctx.fillStyle = data.color;
        ctx.fill();

        currentAngle += sliceAngle;
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, centerX, centerY - 10);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Total Leads', centerX, centerY + 10);

    legend.innerHTML = stageData.map(data => `
        <div class="legend-item">
            <div class="legend-left">
                <div class="legend-color" style="background: ${data.color}"></div>
                <span class="legend-label">${data.stage}</span>
            </div>
            <span class="legend-value">${data.count}</span>
        </div>
    `).join('');
}

function renderPropertyTypes() {
    const types = {};
    leads.forEach(lead => {
        types[lead.propertyType] = (types[lead.propertyType] || 0) + 1;
    });

    const sortedTypes = Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxCount = sortedTypes[0]?.[1] || 1;

    const colors = ['#667eea', '#4facfe', '#43e97b', '#f093fb', '#fa709a'];
    const icons = ['🏢', '🏠', '🏘️', '🏗️', '🏛️'];

    const html = sortedTypes.map(([type, count], index) => {
        const percentage = (count / maxCount) * 100;
        return `
            <div class="property-type-item">
                <div class="property-icon" style="background: ${colors[index]}20; color: ${colors[index]}">
                    ${icons[index]}
                </div>
                <div class="property-info">
                    <div class="property-name">${type}</div>
                    <div class="property-count">${count} properties</div>
                    <div class="property-bar">
                        <div class="property-bar-fill" style="width: ${percentage}%; background: ${colors[index]}"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('propertyTypesList').innerHTML = html;
}

function renderTopAgents() {
    const agentStats = {};
    leads.forEach(lead => {
        if (!agentStats[lead.agent]) {
            agentStats[lead.agent] = { total: 0, closed: 0 };
        }
        agentStats[lead.agent].total++;
        if (lead.stage === 'Closed Won') {
            agentStats[lead.agent].closed++;
        }
    });

    const sortedAgents = Object.entries(agentStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.closed - a.closed)
        .slice(0, 5);

    const colors = ['#667eea', '#4facfe', '#43e97b', '#f093fb', '#fa709a'];

    const html = sortedAgents.map((agent, index) => {
        const conversion = agent.total > 0 ? (agent.closed / agent.total) * 100 : 0;
        return `
            <div class="agent-item">
                <div class="agent-avatar" style="background: ${colors[index]}20; color: ${colors[index]}">
                    ${agent.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div class="agent-info">
                    <div class="agent-name">${agent.name}</div>
                    <div class="agent-deals">${agent.closed} deals closed</div>
                    <div class="agent-progress">
                        <div class="agent-progress-fill" style="width: ${conversion}%; background: ${colors[index]}"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('topAgents').innerHTML = html;
}

function renderUpcomingFollowups() {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 86400000);

    const followups = leads
        .filter(l => l.followUpDate && new Date(l.followUpDate) >= now && new Date(l.followUpDate) <= nextWeek)
        .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate))
        .slice(0, 5);

    const html = followups.map(lead => {
        const date = new Date(lead.followUpDate);
        const isToday = date.toDateString() === now.toDateString();
        const dateStr = isToday ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="followup-item">
                <div class="followup-info">
                    <div class="followup-client">${lead.name}</div>
                    <div class="followup-date">${lead.propertyType} - ${lead.agent}</div>
                </div>
                <div class="followup-time">${dateStr} ${timeStr}</div>
            </div>
        `;
    }).join('');

    document.getElementById('upcomingFollowups').innerHTML = html || '<p style="color: #64748b; font-size: 0.875rem;">No upcoming follow-ups</p>';
}

function renderSourcesPerformance() {
    const sourceStats = {};
    leads.forEach(lead => {
        if (!sourceStats[lead.source]) {
            sourceStats[lead.source] = { total: 0, converted: 0 };
        }
        sourceStats[lead.source].total++;
        if (lead.stage === 'Closed Won') {
            sourceStats[lead.source].converted++;
        }
    });

    const sortedSources = Object.entries(sourceStats)
        .map(([name, stats]) => ({
            name,
            total: stats.total,
            converted: stats.converted,
            rate: stats.total > 0 ? (stats.converted / stats.total) * 100 : 0
        }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5);

    const html = sortedSources.map(source => {
        let rateClass = 'good';
        if (source.rate < 20) rateClass = 'poor';
        else if (source.rate < 40) rateClass = 'average';

        return `
            <div class="source-performance-item">
                <div class="source-header">
                    <span class="source-name">${source.name}</span>
                    <span class="source-rate ${rateClass}">${source.rate.toFixed(1)}%</span>
                </div>
                <div class="source-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Leads</span>
                        <span class="stat-value">${source.total}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Converted</span>
                        <span class="stat-value">${source.converted}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('sourcesPerformance').innerHTML = html;
}

function renderResponseAnalysis() {
    const priorities = ['Hot', 'Warm', 'Cold'];
    const html = priorities.map(priority => {
        const priorityLeads = leads.filter(l => l.priority === priority);
        const avgResponse = priorityLeads.length > 0
            ? priorityLeads.reduce((sum, l) => sum + l.responseTime, 0) / priorityLeads.length
            : 0;

        let timeClass = 'fast';
        if (avgResponse > 120) timeClass = 'slow';
        else if (avgResponse > 60) timeClass = 'average';

        return `
            <div class="response-item">
                <div class="response-header">
                    <span class="response-priority">${priority} Priority</span>
                    <span class="response-time ${timeClass}">${Math.round(avgResponse)} min</span>
                </div>
                <div class="response-stats">
                    <div class="stat-item">
                        <span class="stat-label">Avg Response</span>
                        <span class="stat-value">${Math.round(avgResponse)} min</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Leads</span>
                        <span class="stat-value">${priorityLeads.length}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('responseAnalysis').innerHTML = html;
}

function renderActivityTimeline() {
    const recentLeads = [...leads]
        .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
        .slice(0, 6);

    const activities = [
        { icon: '📝', color: '#eff6ff', iconColor: '#2563eb', action: 'added new lead' },
        { icon: '📞', color: '#f0fdf4', iconColor: '#10b981', action: 'contacted client' },
        { icon: '🏠', color: '#fef3c7', iconColor: '#f59e0b', action: 'scheduled viewing' },
        { icon: '📧', color: '#fae8ff', iconColor: '#a855f7', action: 'sent proposal' },
        { icon: '🤝', color: '#dbeafe', iconColor: '#3b82f6', action: 'closed deal' },
        { icon: '✅', color: '#d1fae5', iconColor: '#065f46', action: 'qualified lead' }
    ];

    const html = recentLeads.map((lead, index) => {
        const activity = activities[index % activities.length];
        const timeAgo = getTimeAgo(new Date(lead.lastActivity));

        return `
            <div class="timeline-item">
                <div class="timeline-icon" style="background: ${activity.color}; color: ${activity.iconColor}">
                    ${activity.icon}
                </div>
                <div class="timeline-content">
                    <div class="timeline-text">
                        <strong>${lead.agent}</strong> ${activity.action} for <strong>${lead.name}</strong>
                    </div>
                    <div class="timeline-time">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('activityTimeline').innerHTML = html;
}

function renderTodayTasks() {
    const tasks = [
        { title: 'Follow up with hot leads', completed: false },
        { title: 'Prepare property listings for website', completed: false },
        { title: 'Review pending applications', completed: true },
        { title: 'Schedule team meeting', completed: false },
        { title: 'Update CRM database', completed: true }
    ];

    const html = tasks.map((task, index) => `
        <div class="task-item ${task.completed ? 'completed' : ''}" onclick="toggleTask(${index})">
            <div class="task-checkbox ${task.completed ? 'checked' : ''}">${task.completed ? '✓' : ''}</div>
            <div class="task-content">
                <div class="task-title">${task.title}</div>
            </div>
        </div>
    `).join('');

    document.getElementById('todayTasks').innerHTML = html;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
    return Math.floor(seconds / 604800) + ' weeks ago';
}

function updateDateRange() {
    dateRange = parseInt(document.getElementById('dateRange').value);
    initDashboard();
}

function refreshDashboard() {
    loadData();
    initDashboard();
    showNotification('Dashboard refreshed successfully');
}

function toggleTask(index) {
    showNotification('Task updated');
}

function scheduleViewing() {
    showNotification('Opening viewing scheduler...');
}

function addNewTask() {
    showNotification('Opening task creator...');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        font-weight: 500;
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

document.querySelectorAll('.chart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activityPeriod = btn.getAttribute('data-period');
        renderActivityChart();
    });
});

window.addEventListener('resize', () => {
    renderActivityChart();
    renderPipelineChart();
});
