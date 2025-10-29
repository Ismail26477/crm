// ----------------- Data Storage -----------------
let leads = [];
let filteredLeads = [];
let startDate = null;
let endDate = null;

// ----------------- Initialize -----------------
document.addEventListener("DOMContentLoaded", () => {
    loadData();           // Load from localStorage or sample
    setDefaultDates();    // Set last 30 days
    initializeReports();
});

// ----------------- Load Sample / Local Data -----------------
function loadData() {
    const stored = localStorage.getItem('crm_leads');
    if (stored) {
        leads = JSON.parse(stored);
    } else {
        leads = generateSampleData();
        localStorage.setItem('crm_leads', JSON.stringify(leads));
    }
    filteredLeads = [...leads];
}

function generateSampleData() {
    const stages = ['New Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won'];
    const sources = ['Website Form', 'Meta Ads', 'Google Ads', 'Google Sheet', 'External API', 'Manual Entry', 'Referral', 'Cold Outreach'];
    const priorities = ['Hot', 'Warm', 'Cold'];
    const companies = ['Tech Corp', 'Global Industries', 'StartupXYZ', 'Manufacturing Co', 'Finance Plus', 'E-commerce Store', 'Sales Team Inc', 'Data Systems', 'Cloud Services', 'Innovation Labs'];
    const dealNames = ['Property Listing', 'Luxury Villa', 'Urban Apartment', 'Commercial Space', 'Retail Outlet', 'Plot Purchase', 'Renovation Project', 'Lease Agreement', 'Rental Listing', 'Investment Plot'];
    const sampleLeads = [];
    const now = Date.now();

    for (let i = 0; i < 100; i++) {
        const daysAgo = Math.floor(Math.random() * 180);
        const createdDate = new Date(now - daysAgo * 86400000);
        const stage = stages[Math.floor(Math.random() * stages.length)];
        const value = Math.floor(Math.random() * 20000000) + 200000; // property-like values
        sampleLeads.push({
            id: 'lead_' + now + '_' + i,
            name: dealNames[Math.floor(Math.random() * dealNames.length)] + ' #' + (i + 1),
            company: companies[Math.floor(Math.random() * companies.length)],
            contact: `Contact ${i + 1}`,
            value: value,
            stage: stage,
            source: sources[Math.floor(Math.random() * sources.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            createdAt: createdDate.toISOString(),
            listedDate: createdDate.toISOString(),
            soldDate: stage === 'Closed Won' ? new Date(createdDate.getTime() + (Math.floor(Math.random() * 60) + 7) * 86400000).toISOString() : null
        });
    }
    return sampleLeads;
}

// ----------------- Default Dates -----------------
function setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    document.getElementById('startDate').value = formatDateInput(thirtyDaysAgo);
    document.getElementById('endDate').value = formatDateInput(today);

    startDate = thirtyDaysAgo;
    endDate = today;
}

function formatDateInput(date) {
    return date.toISOString().split('T')[0];
}

// ----------------- Date Filter -----------------
function filterByDateRange() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    if (start && end) {
        startDate = new Date(start);
        endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);

        filteredLeads = leads.filter(lead => {
            const leadDate = new Date(lead.createdAt);
            return leadDate >= startDate && leadDate <= endDate;
        });

        initializeReports();
    }
}

// ----------------- Initialize Reports -----------------
function initializeReports() {
    updateQuickStats();
    renderListingsAnalysis();
    renderLeadPerformance();
    renderConversionFunnel();
    renderTimeAnalysis();
    renderPriorityInsights();
    renderExecutiveSummary();
}

// ----------------- Quick Stats -----------------
function updateQuickStats() {
    const activeListings = filteredLeads.filter(l => l.stage !== 'Closed Won').length;
    const pipelineValue = filteredLeads.filter(l => l.stage !== 'Closed Won').reduce((sum, l) => sum + (l.value || 0), 0);
    const soldThisMonth = filteredLeads.filter(l => {
        if (l.stage !== 'Closed Won' || !l.soldDate) return false;
        const sd = new Date(l.soldDate);
        const now = new Date();
        return sd.getFullYear() === now.getFullYear() && sd.getMonth() === now.getMonth();
    }).length;
    const avgDOM = calculateAverageDaysOnMarket();

    document.getElementById('statActiveListings').textContent = activeListings;
    document.getElementById('statPipelineValue').textContent = formatINRCurrency(pipelineValue);
    document.getElementById('statSoldThisMonth').textContent = soldThisMonth;
    document.getElementById('statAvgDOM').textContent = avgDOM + ' days';
}

function calculateAverageDaysOnMarket() {
    const closed = filteredLeads.filter(l => l.stage === 'Closed Won' && l.listedDate && l.soldDate);
    if (closed.length === 0) return 0;
    const totalDays = closed.reduce((sum, lead) => {
        const listed = new Date(lead.listedDate);
        const sold = new Date(lead.soldDate);
        return sum + Math.max(0, Math.round((sold - listed) / 86400000));
    }, 0);
    return Math.round(totalDays / closed.length);
}

// ----------------- Listings Analysis -----------------
function renderListingsAnalysis() {
    const monthlyData = getMonthlyListingsClosed();
    renderBarChart('listingsChart', monthlyData, 'Closed Listings', '#4facfe', '#43e97b');

    const currentMonthClosed = monthlyData[monthlyData.length - 1]?.count || 0;
    const lastMonthClosed = monthlyData[monthlyData.length - 2]?.count || 0;
    const ytdClosed = monthlyData.reduce((sum, d) => sum + d.count, 0);
    const avgMonthly = monthlyData.length ? ytdClosed / monthlyData.length : 0;
    const projected = Math.round(avgMonthly * (12 - (new Date().getMonth())));

    document.getElementById('currentMonthClosed').textContent = currentMonthClosed;
    document.getElementById('lastMonthClosed').textContent = lastMonthClosed;
    document.getElementById('ytdClosed').textContent = ytdClosed;
    document.getElementById('projectedClosings').textContent = projected;
}

function getMonthlyListingsClosed() {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyData = [];
    const currentMonthIndex = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    for (let i = 11; i >= 0; i--) {
        const mIndex = (currentMonthIndex - i + 12) % 12;
        const yearAdjust = currentMonthIndex - i < 0 ? currentYear - 1 : currentYear;
        const count = filteredLeads.filter(l => {
            if (l.stage !== 'Closed Won' || !l.soldDate) return false;
            const sd = new Date(l.soldDate);
            return sd.getMonth() === mIndex && sd.getFullYear() === yearAdjust;
        }).length;
        monthlyData.push({ month: months[mIndex], value: count, count });
    }
    return monthlyData;
}

// ----------------- Render Bar Chart -----------------
function renderBarChart(canvasId, data, label, colorStart, colorEnd) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || !data.length) return;
    const ctx = canvas.getContext('2d');

    // fallback canvas size
    const width = canvas.offsetWidth || 600;
    const height = canvas.offsetHeight || 300;
    canvas.width = width;
    canvas.height = height;

    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = chartWidth / data.length;

    ctx.clearRect(0, 0, width, height);

    const maxValue = Math.max(...data.map(d => isFinite(d.count) ? d.count : 0), 1);

    // grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    data.forEach((item, index) => {
        const barHeight = (item.count / maxValue) * chartHeight;
        const x = padding + index * barWidth;
        const y = height - padding - barHeight;

        const gradient = ctx.createLinearGradient(x, y, x, height - padding);
        gradient.addColorStop(0, colorStart);
        gradient.addColorStop(1, colorEnd);

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 8, y, barWidth - 16, barHeight);

        // month label
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.month, x + barWidth / 2, height - padding + 25);

        // value label
        if (item.count > 0) {
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 11px Arial';
            ctx.fillText(item.count, x + barWidth / 2, y - 5);
        }
    });
}

// ----------------- Other charts and tables remain unchanged -----------------
// (You can safely reuse your existing renderSourceChart, renderStatusChart, renderConversionFunnel,
// renderTimeAnalysis, renderPriorityInsights, renderExecutiveSummary functions as-is)

// ----------------- Currency Helper -----------------
function formatINRCurrency(amount) {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

// ----------------- Window Resize Re-render -----------------
window.addEventListener('resize', () => {
    renderListingsAnalysis();
    renderLeadPerformance();
    renderConversionFunnel();
    renderTimeAnalysis();
    renderPriorityInsights();
    renderExecutiveSummary();
});
 