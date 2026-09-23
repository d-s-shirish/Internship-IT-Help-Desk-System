// KRG Tech Help Desk - Frontend Application Script

// Global state variables
let currentUser = null;
let activeTab = 'dashboard';
let currentTicketId = null;
let allTickets = [];
let allEngineers = [];
let charts = {}; // Store Chart.js instances

// Run checkSession when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set current date in header
    updateHeaderDate();
    
    // Check if user is already logged in
    checkSession();
    
    // Default pre-fill for employee login
    selectRole('employee');
});

function updateHeaderDate() {
    const dateEl = document.getElementById('header-date');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }
}

// 1. Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-xmark';
    if (type === 'info') iconClass = 'fa-circle-info';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon"></i>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// 2. Authentication & Role Switcher
const demoCredentials = {
    employee: { email: 'shirish@krgtech.com', password: 'password123' },
    admin: { email: 'admin@krgtech.com', password: 'adminpassword' },
    engineer: { email: 'rahul@krgtech.com', password: 'password123' }
};

function selectRole(role) {
    // Highlight selected tab
    document.querySelectorAll('.role-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeBtn = document.getElementById(`role-btn-${role}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // Set form role and pre-fill credentials for easy demo
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const tipText = document.getElementById('demo-details-text');
    
    if (demoCredentials[role]) {
        emailInput.value = demoCredentials[role].email;
        passwordInput.value = demoCredentials[role].password;
        
        tipText.innerHTML = `Click "Sign In" to access with credentials: <strong>${demoCredentials[role].email} / ${demoCredentials[role].password}</strong>`;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Detect currently selected role
    const activeRoleTab = document.querySelector('.role-tab.active');
    const role = activeRoleTab ? activeRoleTab.dataset.role : 'employee';
    
    const submitBtn = document.getElementById('login-submit-btn');
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span>Signing In...</span> <i class="fa-solid fa-spinner fa-spin"></i>`;
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            showToast(`Welcome back, ${currentUser.name}!`, 'success');
            enterApp();
        } else {
            showToast(data.error || 'Authentication failed', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Network error, please try again later.', 'error');
    } finally {
        submitBtn.innerHTML = originalBtnHTML;
        submitBtn.disabled = false;
    }
}

async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
            currentUser = null;
            showToast('You have been logged out successfully.', 'info');
            exitApp();
        }
    } catch (err) {
        console.error(err);
        showToast('Error signing out', 'error');
    }
}

async function checkSession() {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const data = await response.json();
            if (data.user) {
                currentUser = data.user;
                enterApp();
            }
        }
    } catch (err) {
        console.error('Session check failed', err);
    }
}

// 3. App Shell UI Transitions
function enterApp() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('app-container').style.display = 'grid';
    
    // Update user profile card in sidebar
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-role-dept').textContent = `${currentUser.role.toUpperCase()} • ${currentUser.department}`;
    
    // Update avatar with initial letters
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    document.getElementById('user-avatar').innerHTML = initials || `<i class="fa-solid fa-user"></i>`;
    
    // Set visible navigation options based on role
    configureNavigation();
    
    // Default tab
    switchTab('dashboard');
}

function exitApp() {
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-section').style.display = 'flex';
    currentUser = null;
}

function configureNavigation() {
    const liRaise = document.getElementById('li-raise-ticket');
    const liAdmin = document.getElementById('li-admin-panel');
    const liReports = document.getElementById('li-reports');
    
    const empActions = document.getElementById('employee-actions');
    const admActions = document.getElementById('admin-actions');
    const engActions = document.getElementById('engineer-actions');
    
    // Hide all first
    liRaise.style.display = 'none';
    liAdmin.style.display = 'none';
    liReports.style.display = 'none';
    empActions.style.display = 'none';
    admActions.style.display = 'none';
    engActions.style.display = 'none';
    
    if (currentUser.role === 'admin') {
        liAdmin.style.display = 'block';
        liReports.style.display = 'block';
        admActions.style.display = 'block';
        
        // Fetch engineers list for dropdown assignment options
        fetchEngineersForAssign();
    } else if (currentUser.role === 'engineer') {
        engActions.style.display = 'block';
    } else { // employee
        liRaise.style.display = 'block';
        empActions.style.display = 'block';
    }
}

// 4. Tab Navigation Router
function switchTab(tabName) {
    activeTab = tabName;
    
    // Update heading title
    const titles = {
        'dashboard': 'Dashboard Overview',
        'tickets': currentUser.role === 'employee' ? 'My Support Tickets' : 
                   currentUser.role === 'engineer' ? 'Assigned Tickets' : 'IT Service Queue',
        'raise-ticket': 'Create Support Ticket',
        'admin-panel': 'Staff Directory & Management',
        'reports': 'System Analytics & Reports',
        'ticket-detail': 'Ticket Detail Panel'
    };
    document.getElementById('current-section-title').textContent = titles[tabName] || 'Help Desk';
    
    // Highlight sidebar link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.getElementById(`nav-${tabName}`);
    if (activeLink) activeLink.classList.add('active');
    
    // Show active panel
    document.querySelectorAll('.content-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    const activePanel = document.getElementById(`panel-${tabName}`);
    if (activePanel) activePanel.classList.add('active');
    
    // Load data for specific tabs
    if (tabName === 'dashboard') {
        loadDashboardStats();
    } else if (tabName === 'tickets') {
        loadTickets();
    } else if (tabName === 'admin-panel') {
        loadAdminPanel();
    } else if (tabName === 'reports') {
        loadReports();
    }
}

// Helper to navigate back to list from details
function goBackToTickets() {
    switchTab('tickets');
}

// 5. Dashboard Data Fetching
async function loadDashboardStats() {
    try {
        // Fetch tickets list to get quick table data
        const ticketsResponse = await fetch('/api/tickets');
        if (!ticketsResponse.ok) throw new Error('Failed to load tickets');
        const tickets = await ticketsResponse.json();
        
        // Fill recent tickets table (limit 5)
        const recentTbody = document.getElementById('recent-tickets-tbody');
        recentTbody.innerHTML = '';
        
        if (tickets.length === 0) {
            recentTbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No tickets found</td></tr>`;
        } else {
            const recent = tickets.slice(0, 5);
            recent.forEach(ticket => {
                const date = new Date(ticket.created_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
                const statusBadge = getStatusBadge(ticket.status);
                const priorityBadge = getPriorityBadge(ticket.priority);
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="font-bold">#${ticket.id}</td>
                    <td>${escapeHTML(ticket.problem)}</td>
                    <td>${priorityBadge}</td>
                    <td>${statusBadge}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="viewTicketDetail(${ticket.id})">
                            <i class="fa-solid fa-folder-open"></i> Manage
                        </button>
                    </td>
                `;
                recentTbody.appendChild(tr);
            });
        }
        
        // Update dashboard statistics cards
        // For admin, we can get full reports API stats
        if (currentUser.role === 'admin') {
            const reportsResponse = await fetch('/api/admin/reports');
            if (reportsResponse.ok) {
                const rep = await reportsResponse.json();
                document.getElementById('stat-total').textContent = rep.summary.totalTickets;
                document.getElementById('stat-pending').textContent = rep.summary.pending;
                document.getElementById('stat-resolved').textContent = rep.summary.resolved + rep.summary.closed;
                document.getElementById('stat-high').textContent = rep.summary.highPriority;
            }
        } else {
            // For employee/engineer, calculate from their scoped ticket list
            const total = tickets.length;
            const pending = tickets.filter(t => ['Open', 'Assigned', 'In Progress'].includes(t.status)).length;
            const completed = tickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length;
            const high = tickets.filter(t => t.priority === 'High' && t.status !== 'Closed').length;
            
            document.getElementById('stat-total').textContent = total;
            document.getElementById('stat-pending').textContent = pending;
            document.getElementById('stat-resolved').textContent = completed;
            document.getElementById('stat-high').textContent = high;
        }
        
    } catch (err) {
        console.error(err);
        showToast('Error loading dashboard stats', 'error');
    }
}

// 6. Tickets Table Loading & Filtering
async function loadTickets() {
    try {
        const response = await fetch('/api/tickets');
        if (!response.ok) throw new Error('Failed to load tickets');
        allTickets = await response.json();
        
        // Apply initial filter rendering
        filterTickets();
    } catch (err) {
        console.error(err);
        showToast('Failed to retrieve ticket queue', 'error');
    }
}

function filterTickets() {
    const searchQuery = document.getElementById('ticket-search').value.toLowerCase().trim();
    const filterStatus = document.getElementById('filter-status').value;
    const filterPriority = document.getElementById('filter-priority').value;
    
    const tbody = document.getElementById('tickets-list-tbody');
    tbody.innerHTML = '';
    
    // Apply filters
    const filtered = allTickets.filter(ticket => {
        // Search matches ID or title or description
        const matchesSearch = 
            ticket.id.toString().includes(searchQuery) ||
            ticket.problem.toLowerCase().includes(searchQuery) ||
            (ticket.employee_name && ticket.employee_name.toLowerCase().includes(searchQuery));
            
        const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
        const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
        
        return matchesSearch && matchesStatus && matchesPriority;
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No tickets match criteria</td></tr>`;
        return;
    }
    
    filtered.forEach(ticket => {
        const date = new Date(ticket.created_at).toLocaleDateString('en-US', {
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const statusBadge = getStatusBadge(ticket.status);
        const priorityBadge = getPriorityBadge(ticket.priority);
        const engineerName = ticket.engineer_name || `<span class="text-muted"><i class="fa-solid fa-hourglass"></i> Unassigned</span>`;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="font-bold">#${ticket.id}</td>
            <td>${escapeHTML(ticket.employee_name || 'System')}</td>
            <td class="text-sm">${escapeHTML(ticket.employee_dept || 'IT')}</td>
            <td><strong>${escapeHTML(ticket.problem)}</strong></td>
            <td>${priorityBadge}</td>
            <td>${engineerName}</td>
            <td>${statusBadge}</td>
            <td class="text-sm">${date}</td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="viewTicketDetail(${ticket.id})">
                    <i class="fa-solid fa-magnifying-glass"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function getStatusBadge(status) {
    const cls = status.toLowerCase().replace(' ', '-');
    return `<span class="badge-status ${cls}">${status}</span>`;
}

function getPriorityBadge(priority) {
    const cls = priority.toLowerCase();
    return `<span class="badge-priority ${cls}">${priority}</span>`;
}

// 7. Raising a Support Ticket
async function handleRaiseTicket(e) {
    e.preventDefault();
    
    const problem = document.getElementById('ticket-problem').value.trim();
    const priority = document.getElementById('ticket-priority').value;
    const description = document.getElementById('ticket-description').value.trim();
    
    const submitBtn = document.getElementById('btn-raise-ticket-submit');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span>Submitting...</span> <i class="fa-solid fa-spinner fa-spin"></i>`;
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ problem, priority, description })
        });
        
        const data = await response.json();
        
        if (response.ok || response.status === 210) {
            showToast(`Support Request #${data.id} raised successfully!`, 'success');
            document.getElementById('raise-ticket-form').reset();
            switchTab('tickets');
        } else {
            showToast(data.error || 'Failed to submit ticket', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Network error while submitting ticket.', 'error');
    } finally {
        submitBtn.innerHTML = originalHTML;
        submitBtn.disabled = false;
    }
}

// 8. Detailed Ticket View & Notes/Workflow Interactions
async function viewTicketDetail(ticketId) {
    currentTicketId = ticketId;
    switchTab('ticket-detail');
    
    try {
        const response = await fetch(`/api/tickets/${ticketId}`);
        if (!response.ok) throw new Error('Ticket not found');
        const ticket = await response.json();
        
        // Fill detail fields
        document.getElementById('detail-ticket-id').textContent = ticket.id;
        document.getElementById('detail-problem').textContent = ticket.problem;
        document.getElementById('detail-employee').textContent = ticket.employee_name;
        document.getElementById('detail-dept').textContent = ticket.employee_dept;
        document.getElementById('detail-description').textContent = ticket.description;
        document.getElementById('detail-assigned-engineer').textContent = ticket.engineer_name || 'Not Assigned';
        document.getElementById('detail-priority-tag').innerHTML = getPriorityBadge(ticket.priority);
        document.getElementById('detail-updated-at').textContent = new Date(ticket.updated_at).toLocaleString();
        
        // Created date
        document.getElementById('detail-created').textContent = new Date(ticket.created_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        // Status Badge Large
        const statusBadge = document.getElementById('detail-status-badge');
        statusBadge.textContent = ticket.status;
        statusBadge.className = `status-badge-lg ${ticket.status.toLowerCase().replace(' ', '-')}`;
        
        // Render comments feed
        renderCommentsFeed(ticket.notes || []);
        
        // Configure role controls
        configureTicketControls(ticket);
        
    } catch (err) {
        console.error(err);
        showToast('Error loading ticket details', 'error');
        switchTab('tickets');
    }
}

function renderCommentsFeed(notes) {
    const feed = document.getElementById('comments-feed');
    feed.innerHTML = '';
    
    if (notes.length === 0) {
        feed.innerHTML = `<div class="comment-bubble system">No comments logged yet.</div>`;
        return;
    }
    
    notes.forEach(note => {
        const bubble = document.createElement('div');
        const isSystem = note.author_name === 'System Log';
        
        if (isSystem) {
            bubble.className = 'comment-bubble system';
            bubble.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${escapeHTML(note.content)} <span class="comment-time">${formatTime(note.created_at)}</span>`;
        } else {
            const roleClass = note.author_role.toLowerCase();
            bubble.className = `comment-bubble ${roleClass}`;
            bubble.innerHTML = `
                <div class="comment-meta">
                    <span>${escapeHTML(note.author_name)} (${note.author_role.toUpperCase()})</span>
                </div>
                <div class="comment-text">${escapeHTML(note.content)}</div>
                <span class="comment-time">${formatTime(note.created_at)}</span>
            `;
        }
        feed.appendChild(bubble);
    });
    
    // Scroll to bottom of comments
    feed.scrollTop = feed.scrollHeight;
}

function formatTime(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function configureTicketControls(ticket) {
    const engActions = document.getElementById('engineer-status-actions');
    const empActions = document.getElementById('employee-status-actions');
    const adminControls = document.getElementById('admin-controls-section');
    
    engActions.style.display = 'none';
    empActions.style.display = 'none';
    adminControls.style.display = 'none';
    
    // 1. Admin controls
    if (currentUser.role === 'admin') {
        adminControls.style.display = 'block';
        
        // Pre-select priority and engineer
        document.getElementById('change-priority-select').value = ticket.priority;
        document.getElementById('assign-engineer-select').value = ticket.engineer_id || '';
    }
    
    // 2. Engineer controls (if active ticket is assigned to this engineer)
    if (currentUser.role === 'engineer' && ticket.engineer_id === currentUser.id) {
        if (ticket.status !== 'Resolved' && ticket.status !== 'Closed') {
            engActions.style.display = 'block';
            
            // Adjust buttons visibility depending on current progress state
            const inProgBtn = document.getElementById('btn-status-in-progress');
            if (ticket.status === 'In Progress') {
                inProgBtn.style.display = 'none';
            } else {
                inProgBtn.style.display = 'block';
            }
        }
    }
    
    // 3. Employee controls (if employee owns the ticket)
    if (currentUser.role === 'employee' && ticket.employee_id === currentUser.id) {
        // Can close the ticket if it's open, assigned, in progress, or resolved (not already closed)
        if (ticket.status !== 'Closed') {
            empActions.style.display = 'block';
        }
    }
}

// Add note/comment
async function submitComment(e) {
    e.preventDefault();
    
    const content = document.getElementById('new-comment-content').value.trim();
    if (!content) return;
    
    const submitBtn = document.getElementById('btn-submit-comment');
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/tickets/${currentTicketId}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            document.getElementById('new-comment-content').value = '';
            // Reload ticket details to show comment
            viewTicketDetail(currentTicketId);
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to post reply', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Network error while posting comment', 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

// Update ticket status
async function updateTicketStatus(newStatus) {
    try {
        const response = await fetch(`/api/tickets/${currentTicketId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            showToast(`Ticket status updated to ${newStatus}`, 'success');
            viewTicketDetail(currentTicketId);
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to update status', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Error communicating status update', 'error');
    }
}

// Admin assigns engineer
async function assignEngineer() {
    const engineerId = document.getElementById('assign-engineer-select').value;
    
    try {
        const response = await fetch(`/api/tickets/${currentTicketId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ engineer_id: engineerId ? parseInt(engineerId) : null })
        });
        
        if (response.ok) {
            showToast(engineerId ? 'Engineer assigned successfully' : 'Engineer unassigned', 'success');
            viewTicketDetail(currentTicketId);
        } else {
            const data = await response.json();
            showToast(data.error || 'Assignment update failed', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Assignment request failed', 'error');
    }
}

// Admin modifies priority
async function changePriority() {
    const priority = document.getElementById('change-priority-select').value;
    
    try {
        const response = await fetch(`/api/tickets/${currentTicketId}/priority`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority })
        });
        
        if (response.ok) {
            showToast(`Priority adjusted to ${priority}`, 'success');
            viewTicketDetail(currentTicketId);
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to adjust priority', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Priority request failed', 'error');
    }
}

// 9. Admin Staff & Directory Management
let adminSubtab = 'employees';

function switchAdminSubtab(subtab) {
    adminSubtab = subtab;
    
    document.querySelectorAll('.tab-subnav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`subtab-btn-${subtab}`).classList.add('active');
    
    document.querySelectorAll('.admin-subpanel').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(`admin-subpanel-${subtab}`).classList.add('active');
}

async function loadAdminPanel() {
    await loadAdminEmployees();
    await loadAdminEngineers();
}

async function loadAdminEmployees() {
    try {
        const res = await fetch('/api/employees');
        if (!res.ok) throw new Error();
        const employees = await res.json();
        
        const tbody = document.getElementById('admin-employees-tbody');
        tbody.innerHTML = '';
        
        employees.forEach(emp => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="font-bold">#${emp.id}</td>
                <td><strong>${escapeHTML(emp.name)}</strong></td>
                <td>${escapeHTML(emp.email)}</td>
                <td>${escapeHTML(emp.department)}</td>
                <td><span class="badge-priority ${emp.role === 'admin' ? 'high' : 'low'}">${emp.role.toUpperCase()}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="deleteUser('employee', ${emp.id})" ${emp.id === currentUser.id ? 'disabled' : ''}>
                        <i class="fa-solid fa-trash-can"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
        showToast('Error loading employees list', 'error');
    }
}

async function loadAdminEngineers() {
    try {
        const res = await fetch('/api/engineers');
        if (!res.ok) throw new Error();
        const engineers = await res.json();
        allEngineers = engineers; // Cache locally for assignment selectors
        
        // Re-render assign dropdown on ticket details
        const assignSelect = document.getElementById('assign-engineer-select');
        assignSelect.innerHTML = '<option value="">-- Select Engineer --</option>';
        engineers.forEach(eng => {
            const opt = document.createElement('option');
            opt.value = eng.id;
            opt.textContent = `${eng.name} (${eng.department})`;
            assignSelect.appendChild(opt);
        });
        
        const tbody = document.getElementById('admin-engineers-tbody');
        tbody.innerHTML = '';
        
        engineers.forEach(eng => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="font-bold">#${eng.id}</td>
                <td><strong>${escapeHTML(eng.name)}</strong></td>
                <td>${escapeHTML(eng.email)}</td>
                <td>${escapeHTML(eng.department)}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="deleteUser('engineer', ${eng.id})">
                        <i class="fa-solid fa-trash-can"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
        showToast('Error loading support staff directory', 'error');
    }
}

async function fetchEngineersForAssign() {
    // Basic silent cache fill
    try {
        const res = await fetch('/api/engineers');
        if (res.ok) {
            allEngineers = await res.json();
            const assignSelect = document.getElementById('assign-engineer-select');
            assignSelect.innerHTML = '<option value="">-- Select Engineer --</option>';
            allEngineers.forEach(eng => {
                const opt = document.createElement('option');
                opt.value = eng.id;
                opt.textContent = `${eng.name} (${eng.department})`;
                assignSelect.appendChild(opt);
            });
        }
    } catch (e) {
        console.error(e);
    }
}

function openAddUserModal(type) {
    const modal = document.getElementById('add-user-modal');
    const title = document.getElementById('modal-title');
    const roleGroup = document.getElementById('modal-role-group');
    const userTypeInput = document.getElementById('modal-user-type');
    
    // Clear form fields
    document.getElementById('add-user-form').reset();
    
    userTypeInput.value = type;
    
    if (type === 'employee') {
        title.textContent = 'Add New Employee';
        roleGroup.style.display = 'block';
    } else {
        title.textContent = 'Add Support Engineer';
        roleGroup.style.display = 'none';
    }
    
    modal.style.display = 'flex';
}

function closeAddUserModal() {
    document.getElementById('add-user-modal').style.display = 'none';
}

async function submitAddUserForm(e) {
    e.preventDefault();
    
    const userType = document.getElementById('modal-user-type').value;
    const name = document.getElementById('modal-user-name').value.trim();
    const email = document.getElementById('modal-user-email').value.trim();
    const department = document.getElementById('modal-user-dept').value.trim();
    const password = document.getElementById('modal-user-password').value;
    
    const payload = { name, email, department, password };
    
    if (userType === 'employee') {
        payload.role = document.getElementById('modal-user-role').value;
    }
    
    const submitBtn = document.getElementById('btn-modal-submit');
    submitBtn.disabled = true;
    
    const url = userType === 'employee' ? '/api/admin/employees' : '/api/admin/engineers';
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast(`${userType === 'employee' ? 'Employee' : 'Support Engineer'} created successfully!`, 'success');
            closeAddUserModal();
            loadAdminPanel();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to add user account', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Network error while adding staff member', 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

async function deleteUser(type, id) {
    if (!confirm(`Are you absolutely sure you want to remove this ${type}? This action cannot be undone.`)) return;
    
    const url = type === 'employee' ? `/api/admin/employees/${id}` : `/api/admin/engineers/${id}`;
    
    try {
        const response = await fetch(url, { method: 'DELETE' });
        if (response.ok) {
            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} record purged.`, 'warning');
            loadAdminPanel();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to purge account', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Error connection to server', 'error');
    }
}

// 10. Chart.js Reporting & Analytics View
async function loadReports() {
    try {
        const response = await fetch('/api/admin/reports');
        if (!response.ok) throw new Error();
        const data = await response.json();
        
        // Render charts
        renderStatusChart(data.statusCounts);
        renderPriorityChart(data.summary);
        renderDeptChart(data.departmentCounts);
        renderWorkloadChart(data.engineerWorkload);
        renderTrendChart(data.dailyTrend);
        
    } catch (err) {
        console.error(err);
        showToast('Could not compile system reports', 'error');
    }
}

// Destroy existing chart helper to avoid duplicate overlaps
function destroyChart(name) {
    if (charts[name]) {
        charts[name].destroy();
    }
}

function renderStatusChart(statusCounts) {
    destroyChart('status');
    
    const ctx = document.getElementById('chart-status').getContext('2d');
    charts['status'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#3b82f6', // Open
                    '#8b5cf6', // Assigned
                    '#f59e0b', // In Progress
                    '#10b981', // Resolved
                    '#64748b'  // Closed
                ],
                borderWidth: 2,
                borderColor: '#0c0f24'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#94a3b8', font: { family: 'Inter' } }
                }
            }
        }
    });
}

function renderPriorityChart(summary) {
    destroyChart('priority');
    
    const ctx = document.getElementById('chart-priority').getContext('2d');
    charts['priority'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                label: 'Active Tickets',
                data: [summary.highPriority, summary.mediumPriority, summary.lowPriority],
                backgroundColor: ['#ef4444', '#f97316', '#06b6d4'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

function renderDeptChart(deptCounts) {
    destroyChart('dept');
    
    const labels = Object.keys(deptCounts);
    const counts = Object.values(deptCounts);
    
    const ctx = document.getElementById('chart-dept').getContext('2d');
    charts['dept'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['None'],
            datasets: [{
                label: 'Tickets Raised',
                data: counts.length ? counts : [0],
                backgroundColor: '#6366f1',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', stepSize: 1 }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

function renderWorkloadChart(workload) {
    destroyChart('workload');
    
    const labels = workload.map(w => w.name);
    const data = workload.map(w => w.active_tickets);
    
    const ctx = document.getElementById('chart-workload').getContext('2d');
    charts['workload'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['No Engineers'],
            datasets: [{
                label: 'Assigned Issues',
                data: data.length ? data : [0],
                backgroundColor: '#d946ef',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

function renderTrendChart(trendData) {
    destroyChart('trend');
    
    const labels = trendData.map(t => t.date);
    const counts = trendData.map(t => t.count);
    
    const ctx = document.getElementById('chart-trend').getContext('2d');
    charts['trend'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tickets Raised',
                data: counts,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.3,
                borderWidth: 3,
                pointBackgroundColor: '#8b5cf6',
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', stepSize: 1 }
                },
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

// 11. Core Utility Functions
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
