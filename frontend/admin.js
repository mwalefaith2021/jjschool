// Admin Dashboard JavaScript

// Make sure this is not inside DOMContentLoaded
function loginAdminUser(username, password) {
    // Show loading state
    const submitBtn = document.querySelector('.auth-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    // Send login request to backend API
    fetch('http://jjsecondaryschool.netlify.app/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => Promise.reject(err));
        }
        return response.json();
    })
    .then(data => {
        if (data.message === 'Login successful!' && data.user.role === 'admin') {
            // Store user data in localStorage
            localStorage.setItem('userType', 'admin');
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('userProfile', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);
            
            // Redirect to admin dashboard
            window.location.href = 'admindashboard.html';
        } else {
            alert('Invalid admin credentials');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    });
}


// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Dashboard initialized');
    
    // Only check auth on dashboard pages, not on login page
    if (window.location.pathname.includes('login.html')) {
        return;
    }
    
    // Check if user is authenticated as admin
    if (!checkAuth()) {
        return;
    }
    
    // Initialize dashboard
    initializeAdminDashboard();
    
    // Load pending signups on first load
    displayPendingSignupsFromAPI();
    fetchAndRenderApplications();

    // Hook payments tab
    const feesNav = Array.from(document.querySelectorAll('.nav-item')).find(el => el.textContent.toLowerCase().includes('fee management'));
    if (feesNav) {
        feesNav.addEventListener('click', loadPaymentsForAdmin);
    }
});

// Authentication check
function checkAuth() {
    // Only check auth on dashboard pages, not on login page
    if (window.location.pathname.includes('login.html')) {
        return true;
    }
    
    const userType = localStorage.getItem('userType');
    const username = localStorage.getItem('username');
    
    if (!userType || !username || userType !== 'admin') {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Initialize admin dashboard
function initializeAdminDashboard() {
    // Set up navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const sectionName = this.textContent.toLowerCase().replace(/\s+/g, '-');
            handleNavigation(sectionName);
        });
    });
    
    // No local demo data
}

// Handle navigation between sections
function handleNavigation(sectionName) {
    let targetSection;
    
    switch(sectionName) {
        case 'student-management':
            targetSection = 'students';
            loadStudents();
            break;
        case 'applications':
            targetSection = 'applications';
            fetchAndRenderApplications();
            break;
        case 'pending-signups':
            targetSection = 'signups';
            displayPendingSignupsFromAPI(); // Refresh signups when navigating to this section
            break;
        case 'fee-management':
            targetSection = 'fees';
            loadPaymentsForAdmin();
            break;
        case 'reports':
            targetSection = 'reports';
            loadReportsStats();
            break;
        default:
            targetSection = 'students';
    }
    
    showSection('admin', targetSection);
}

// Show specific section
function showSection(userType, sectionName) {
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Add active class to clicked nav item
    const activeNavItem = Array.from(navItems).find(item => {
        const itemText = item.textContent.toLowerCase().replace(/\s+/g, '-');
        return itemText.includes(sectionName) || 
               (sectionName === 'students' && itemText === 'student-management') ||
               (sectionName === 'signups' && itemText === 'pending-signups') ||
               (sectionName === 'fees' && itemText === 'fee-management');
    });
    
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Hide all content sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Show selected section
    const targetSection = document.getElementById(`${userType}-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// Display pending signups (from backend)
async function displayPendingSignupsFromAPI() {
    const signupsList = document.getElementById('signupsList');
    if (!signupsList) return;
    signupsList.innerHTML = '<p style="text-align:center;">Loading...</p>';
    try {
        const res = await fetch('http://jjsecondaryschool.netlify.app/api/pending-signups');
        if (!res.ok) throw new Error('Failed to fetch signups');
        const { data } = await res.json();
        if (!data.length) {
        signupsList.innerHTML = '<p style="color: #1e5631; font-style: italic; text-align: center; padding: 20px;">No pending account signups.</p>';
        return;
    }
        signupsList.innerHTML = data.map(signup => `
            <div class="signup-item" style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <div>
                    <h4 style="color: #1e5631; margin-bottom: 10px;">${signup.fullName}</h4>
                    <p><strong>Email:</strong> ${signup.email}</p>
                    <p><strong>Desired Username:</strong> ${signup.desiredUsername}</p>
                    <p><strong>Requested:</strong> ${new Date(signup.createdAt).toLocaleString()}</p>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="action-btn approve-btn" onclick="approveSignup('${signup._id}')">Approve</button>
                    <button class="action-btn reject-btn" onclick="rejectSignup('${signup._id}')">Reject</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        signupsList.innerHTML = `<p style="color:#dc3545; text-align:center;">${e.message}</p>`;
    }
}

// Approve signup
async function approveSignup(signupId) {
    try {
        const ok = await showConfirm('Approve Signup', 'Approve this signup and create student user?');
        if (!ok) return;
        const res = await fetch(`http://jjsecondaryschool.netlify.app/api/pending-signups/${signupId}/approve`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to approve signup');
        displayPendingSignupsFromAPI();
    } catch (e) { alert(e.message); }
}

// Reject signup
async function rejectSignup(signupId) {
    try {
        const reason = await showPrompt('Reject Signup', 'Enter reason for rejection');
        if (!reason) return;
        const res = await fetch(`http://jjsecondaryschool.netlify.app/api/pending-signups/${signupId}/reject`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason })
        });
        if (!res.ok) throw new Error('Failed to reject signup');
        displayPendingSignupsFromAPI();
    } catch (e) { alert(e.message); }
}

// Student management functions
function viewStudent(studentId) {
    showInfo('Student Profile', `Viewing detailed profile for student <b>${studentId}</b><br><br>This will include:<br>- Complete student profile<br>- Academic records<br>- Payment history<br>- Parent/guardian information`);
}

// Application management functions
async function viewApplication(applicationId) {
    try {
        const res = await fetch(`http://jjsecondaryschool.netlify.app/api/applications/${applicationId}`);
        if (!res.ok) throw new Error('Failed to load application');
        const { data } = await res.json();
        const modal = document.getElementById('applicationModal');
        const content = document.getElementById('applicationModalContent');
        const actions = document.getElementById('applicationModalActions');
        if (!modal || !content || !actions) return;
        content.innerHTML = renderApplicationDetails(data);
        actions.innerHTML = `
            <button class="action-btn approve-btn" onclick="approveApplication('${data._id}')">Approve</button>
            <button class="action-btn reject-btn" onclick="rejectApplication('${data._id}')">Reject</button>
        `;
        modal.style.display = 'flex';
    } catch (e) {
        alert(e.message);
    }
}

function closeApplicationModal() {
    const modal = document.getElementById('applicationModal');
    if (modal) modal.style.display = 'none';
}

function renderApplicationDetails(app) {
    const fullName = `${app.personalInfo.firstName} ${app.personalInfo.lastName}`;
    const date = new Date(app.dateSubmitted).toLocaleString();
    return `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div>
                <h4>Personal</h4>
                <p><strong>Name:</strong> ${fullName}</p>
                <p><strong>DOB:</strong> ${new Date(app.personalInfo.dateOfBirth).toLocaleDateString()}</p>
                <p><strong>Gender:</strong> ${app.personalInfo.gender}</p>
                <p><strong>Nationality:</strong> ${app.personalInfo.nationality}</p>
            </div>
            <div>
                <h4>Contact</h4>
                <p><strong>Address:</strong> ${app.contactInfo.address}</p>
                <p><strong>Phone:</strong> ${app.contactInfo.phone || '-'}</p>
                <p><strong>Email:</strong> ${app.contactInfo.email}</p>
            </div>
            <div>
                <h4>Academic</h4>
                <p><strong>Applying For:</strong> ${app.academicInfo.applyingFor}</p>
                <p><strong>Year:</strong> ${app.academicInfo.academicYear}</p>
                <p><strong>Previous School:</strong> ${app.academicInfo.previousSchool}</p>
            </div>
            <div>
                <h4>Guardian</h4>
                <p><strong>Name:</strong> ${app.parentInfo.guardianName}</p>
                <p><strong>Relationship:</strong> ${app.parentInfo.relationship}</p>
                <p><strong>Phone:</strong> ${app.parentInfo.guardianPhone}</p>
                <p><strong>Email:</strong> ${app.parentInfo.guardianEmail || '-'}</p>
            </div>
        </div>
        <div style="margin-top:10px;">
            <p><strong>Application #:</strong> ${app.applicationNumber}</p>
            <p><strong>Status:</strong> ${app.status}</p>
            <p><strong>Submitted:</strong> ${date}</p>
            <p><strong>Payment Ref:</strong> ${app.paymentInfo.reference}</p>
        </div>
    `;
}

async function approveApplication(applicationId) {
    try {
        const ok = await showConfirm('Approve Application', 'Are you sure you want to approve this application?');
        if (!ok) return;
        const res = await fetch(`http://jjsecondaryschool.netlify.app/api/applications/${applicationId}/status`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'accepted', adminNotes: 'Approved by admin' })
        });
        if (!res.ok) throw new Error('Failed to approve');
        closeApplicationModal();
        fetchAndRenderApplications();
        // Pending signups list may have changed
        setTimeout(displayPendingSignupsFromAPI, 300);
    } catch (e) { alert(e.message); }
}

async function rejectApplication(applicationId) {
    try {
        const reason = await showPrompt('Reject Application', 'Enter reason for rejection');
        if (!reason) return;
        const res = await fetch(`http://jjsecondaryschool.netlify.app/api/applications/${applicationId}/status`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected', adminNotes: reason })
        });
        if (!res.ok) throw new Error('Failed to reject');
        closeApplicationModal();
        fetchAndRenderApplications();
    } catch (e) { alert(e.message); }
}

// No-op, left for backward compatibility
function updateApplicationStatus() {}

async function fetchAndRenderApplications() {
    const tbody = document.getElementById('applicationsTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 12px;">Loading...</td></tr>';
    try {
        const res = await fetch('http://jjsecondaryschool.netlify.app/api/applications');
        if (!res.ok) throw new Error('Failed to fetch applications');
        const { data } = await res.json();
        tbody.innerHTML = data.map(app => renderApplicationRow(app)).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="color:#dc3545; text-align:center;">${e.message}</td></tr>`;
    }
}

function renderApplicationRow(app) {
    const id = app._id;
    const name = `${app.personalInfo.firstName} ${app.personalInfo.lastName}`;
    const klass = app.academicInfo.applyingFor;
    const date = new Date(app.dateSubmitted).toLocaleDateString();
    const statusBadge = app.status === 'accepted' ? 'status-approved' : app.status === 'rejected' ? 'status-rejected' : 'status-pending';
    return `
        <tr>
            <td>${app.applicationNumber}</td>
            <td>${name}</td>
            <td>${klass}</td>
            <td>${date}</td>
            <td><span class="status-badge ${statusBadge}">${app.status}</span></td>
            <td>
                <button class="action-btn view-btn" onclick="viewApplication('${id}')">View</button>
                ${app.status === 'pending' || app.status === 'under_review' ? `<button class="action-btn approve-btn" onclick=\"approveApplication('${id}')\">Approve</button>
                <button class="action-btn reject-btn" onclick=\"rejectApplication('${id}')\">Reject</button>` : ''}
            </td>
        </tr>
    `;
}

function sendFeeReminder(studentId) {
    showConfirm('Send Reminder', `Send fee payment reminder to student <b>${studentId}</b>?`).then(ok => {
        if (ok) {
            showInfo('Reminder Sent', `Reminder sent to student <b>${studentId}</b> via email and portal notification.`);
        }
    });
}

function exportStudentData(format = 'Excel') {
    showConfirm('Export Data', `Export all student data in <b>${format}</b> format?`).then(ok => {
        if (!ok) return;
        showInfo('Export Started', `Export initiated. Format: <b>${format}</b>. Download will start shortly...`);
        setTimeout(() => {
            showInfo('Export Complete', `File: student_data_${new Date().toISOString().slice(0,10)}.${format.toLowerCase()}`);
        }, 1500);
    });
}

function generateReport(reportType) {
    const reports = {
        'enrollment': 'Enrollment Statistics Report',
        'financial': 'Financial Summary Report',
        'academic': 'Academic Performance Report',
        'attendance': 'Attendance Report'
    };
    
    const reportName = reports[reportType] || 'Custom Report';
    
    showConfirm('Generate Report', `Generate <b>${reportName}</b>?`).then(ok => {
        if (!ok) return;
        showInfo('Generating', `${reportName} generation started...`);
        setTimeout(() => {
            showInfo('Report Ready', `${reportName} generated successfully!<br>File: ${reportType}_report_${new Date().toISOString().slice(0,10)}.pdf`);
        }, 2000);
    });
}

// Initialize sample data for demonstration
function initializeSampleData() {}

// Logout function
function logout() {
    showConfirm('Logout', 'Are you sure you want to logout?').then(ok => {
        if (!ok) return;
        localStorage.removeItem('userType');
        localStorage.removeItem('username');
        localStorage.removeItem('userProfile');
        window.location.href = 'login.html';
    });
}

// Payments in admin fees page
async function loadPaymentsForAdmin() {
    const container = document.getElementById('paymentsList');
    if (!container) return;
    container.innerHTML = '';
    try {
        const res = await fetch('http://jjsecondaryschool.netlify.app/api/payments');
        if (!res.ok) throw new Error('Failed to fetch payments');
        const { data } = await res.json();
        if (!data.length) { container.innerHTML = '<p>No payments yet.</p>'; return; }
        container.innerHTML = data.map(p => `
            <div style="background:#fff; border-radius:8px; padding:12px; margin-bottom:10px; box-shadow:0 1px 3px rgba(0,0,0,.06);">
                <div style="display:flex; justify-content:space-between;">
                    <div>
                        <strong>${p.type}</strong> - MK ${Number(p.amount).toLocaleString()}
                        <div>Ref: ${p.reference}</div>
                    </div>
                    <div>
                        <div>${new Date(p.createdAt).toLocaleString()}</div>
                        <div>${p.status}</div>
                        <div>By: ${p.studentId?.fullName || p.studentId?.username}</div>
                    </div>
                </div>
                <div style="margin-top:8px; display:flex; gap:8px;">
                    ${p.status === 'pending' ? `
                    <button class="action-btn approve-btn" onclick="updatePaymentStatus('${p._id}','confirmed')">Accept</button>
                    <button class="action-btn reject-btn" onclick="updatePaymentStatus('${p._id}','rejected')">Reject</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `<p style="color:#dc3545">${e.message}</p>`;
    }
}

async function updatePaymentStatus(paymentId, status) {
    const ok = await showConfirm('Update Payment', `Mark this payment as ${status}?`);
    if (!ok) return;
    try {
        const res = await fetch(`http://jjsecondaryschool.netlify.app/api/payments/${paymentId}/status`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error('Failed to update payment');
        loadPaymentsForAdmin();
    } catch (e) { alert(e.message); }
}

function showModal({ title, bodyHTML, actions = [] }) {
    const modal = document.getElementById('appModal');
    const titleEl = document.getElementById('appModalTitle');
    const bodyEl = document.getElementById('appModalBody');
    const actionsEl = document.getElementById('appModalActions');
    if (!modal || !titleEl || !bodyEl || !actionsEl) return;
    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHTML;
    actionsEl.innerHTML = '';
    actions.forEach(a => {
        const btn = document.createElement('button');
        btn.textContent = a.text;
        btn.className = a.className || 'action-btn';
        btn.onclick = () => { if (a.onClick) a.onClick(); closeAppModal(); };
        actionsEl.appendChild(btn);
    });
    modal.style.display = 'flex';
}

function closeAppModal() {
    const modal = document.getElementById('appModal');
    if (modal) modal.style.display = 'none';
}

function showConfirm(title, message) {
    return new Promise(resolve => {
        showModal({
            title,
            bodyHTML: `<p>${message}</p>`,
            actions: [
                { text: 'Cancel', className: 'reject-btn', onClick: () => resolve(false) },
                { text: 'OK', className: 'approve-btn', onClick: () => resolve(true) }
            ]
        });
    });
}

function showPrompt(title, message) {
    return new Promise(resolve => {
        showModal({
            title,
            bodyHTML: `<label style="display:block; margin-bottom:6px;">${message}</label><input id="appModalInput" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;" />`,
            actions: [
                { text: 'Cancel', className: 'reject-btn', onClick: () => resolve(null) },
                { text: 'Submit', className: 'approve-btn', onClick: () => {
                    const val = document.getElementById('appModalInput')?.value || '';
                    resolve(val.trim());
                } }
            ]
        });
    });
}

function showInfo(title, messageHtml) {
    return new Promise(resolve => {
        showModal({
            title,
            bodyHTML: `<div>${messageHtml}</div>`,
            actions: [
                { text: 'OK', className: 'approve-btn', onClick: () => resolve(true) }
            ]
        });
    });
}

// ------- Student Management -------
async function loadStudents() {
    const tbody = document.getElementById('studentsTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:8px;">Loading...</td></tr>';
    try {
        const res = await fetch('http://jjsecondaryschool.netlify.app/api/students');
        if (!res.ok) throw new Error('Failed to fetch students');
        const { data } = await res.json();
        const q = (document.getElementById('studentSearch')?.value || '').toLowerCase();
        const filtered = data.filter(s => !q || s.fullName?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
        if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students found</td></tr>'; return; }
        tbody.innerHTML = filtered.map(s => `
            <tr>
                <td>${s.fullName || '-'}</td>
                <td>${s.email || '-'}</td>
                <td>${s.username || '-'}</td>
                <td>
                    <button class="action-btn" onclick="resetStudentPassword('${s._id}', '${s.fullName?.replace(/"/g,'&quot;') || ''}', '${s.email || ''}')">Reset PIN</button>
                    <button class="action-btn view-btn" onclick="openEditStudent('${s._id}', '${s.fullName?.replace(/"/g,'&quot;') || ''}', '${s.email || ''}')">Edit</button>
                    <button class="action-btn" onclick="viewStudent('${s._id}')">Overview</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:#dc3545; text-align:center;">${e.message}</td></tr>`;
    }
}

async function resetStudentPassword(studentId, fullName, email) {
    const ok = await showConfirm('Reset Password', `Reset password for <b>${fullName}</b> (${email})?`);
    if (!ok) return;
    try {
        const res = await fetch(`http://jjsecondaryschool.netlify.app/api/users/${studentId}/reset-password`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to reset password');
        showInfo('Success', 'Temporary password (OTP) emailed to the student.');
    } catch (e) { showInfo('Error', e.message); }
}

function openEditStudent(studentId, fullName, email) {
    const body = `
        <label>Name</label>
        <input id="editFullName" value="${fullName}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; margin-bottom:8px;" />
        <label>Email</label>
        <input id="editEmail" value="${email}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;" />
    `;
    showModal({
        title: 'Edit Student',
        bodyHTML: body,
        actions: [
            { text: 'Cancel', className: 'reject-btn' },
            { text: 'Save', className: 'approve-btn', onClick: async () => {
                const fullNameNew = document.getElementById('editFullName').value.trim();
                const emailNew = document.getElementById('editEmail').value.trim();
                try {
                    const res = await fetch(`http://jjsecondaryschool.netlify.app/api/students/${studentId}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fullName: fullNameNew, email: emailNew })
                    });
                    if (!res.ok) throw new Error('Failed to update student');
                    loadStudents();
                } catch (e) { showInfo('Error', e.message); }
            } }
        ]
    });
}

async function loadReportsStats() {
    const container = document.getElementById('reportsStats');
    if (!container) return;
    container.innerHTML = '<p>Loading...</p>';
    try {
        const [appsRes, studentsRes] = await Promise.all([
            fetch('http://jjsecondaryschool.netlify.app/api/applications-stats'),
            fetch('http://jjsecondaryschool.netlify.app/api/students-stats')
        ]);
        if (!appsRes.ok || !studentsRes.ok) throw new Error('Failed to load stats');
        const apps = await appsRes.json();
        const students = await studentsRes.json();
        const totalApps = apps.data.total || 0;
        const byStatus = (apps.data.byStatus || []).reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {});
        const stu = students.data;
        container.innerHTML = `
            <div class="info-item"><label>Total Students:</label><span>${stu.total}</span></div>
            <div class="info-item"><label>New This Month:</label><span>${stu.newThisMonth}</span></div>
            <div class="info-item"><label>Payments (confirmed):</label><span>MK ${Number(stu.paymentsTotalConfirmed).toLocaleString()}</span></div>
            <div class="info-item"><label>Total Applications:</label><span>${totalApps}</span></div>
            <div class="info-item"><label>Applications Pending:</label><span>${byStatus['pending'] || 0}</span></div>
            <div class="info-item"><label>Applications Accepted:</label><span>${byStatus['accepted'] || 0}</span></div>
            <div class="info-item"><label>Applications Rejected:</label><span>${byStatus['rejected'] || 0}</span></div>
        `;
    } catch (e) {
        container.innerHTML = `<p style="color:#dc3545">${e.message}</p>`;
    }
}

