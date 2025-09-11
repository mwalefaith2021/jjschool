// Admin Dashboard JavaScript

// Make sure this is not inside DOMContentLoaded
function loginAdminUser(username, password) {
    if (username === "admin" && password === "1") {
        window.location.href = "admindashboard.html"; 
    } else {
        alert("Invalid admin credentials");
    }
}


// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Dashboard initialized');
    
    // Check if user is authenticated as admin
    if (!checkAuth()) {
        return;
    }
    
    // Initialize dashboard
    initializeAdminDashboard();
    
    // Load pending signups on first load
    displayPendingSignups();
});

// Authentication check
/*function checkAuth() {
    const userType = localStorage.getItem('userType');
    const username = localStorage.getItem('username');
    
    if (!userType || !username || userType !== 'admin') {
        alert('Access denied. Please login as administrator.');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}*/

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
    
    // Initialize sample data if needed
    initializeSampleData();
}

// Handle navigation between sections
function handleNavigation(sectionName) {
    let targetSection;
    
    switch(sectionName) {
        case 'student-management':
            targetSection = 'students';
            break;
        case 'applications':
            targetSection = 'applications';
            break;
        case 'pending-signups':
            targetSection = 'signups';
            displayPendingSignups(); // Refresh signups when navigating to this section
            break;
        case 'fee-management':
            targetSection = 'fees';
            break;
        case 'reports':
            targetSection = 'reports';
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

// Display pending signups
function displayPendingSignups() {
    const signupsList = document.getElementById('signupsList');
    if (!signupsList) return;
    
    const signups = JSON.parse(localStorage.getItem('pendingSignups')) || [];
    const pendingSignups = signups.filter(signup => signup.status === 'pending');
    
    if (pendingSignups.length === 0) {
        signupsList.innerHTML = '<p style="color: #1e5631; font-style: italic; text-align: center; padding: 20px;">No pending account signups.</p>';
        return;
    }
    
    let html = '';
    pendingSignups.forEach(signup => {
        html += `
            <div class="signup-item" style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <div>
                    <h4 style="color: #1e5631; margin-bottom: 10px;">${signup.fullName}</h4>
                    <p><strong>Email:</strong> ${signup.email}</p>
                    <p><strong>Phone:</strong> ${signup.phone}</p>
                    <p><strong>Desired Username:</strong> ${signup.desiredUsername}</p>
                    <p><strong>Form:</strong> Form ${signup.form}</p>
                    <p><strong>Applied:</strong> ${signup.applicationDate}</p>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="action-btn approve-btn" onclick="approveSignup('${signup.id}')">Approve</button>
                    <button class="action-btn reject-btn" onclick="rejectSignup('${signup.id}')">Reject</button>
                </div>
            </div>
        `;
    });
    
    signupsList.innerHTML = html;
}

// Approve signup
function approveSignup(signupId) {
    const signups = JSON.parse(localStorage.getItem('pendingSignups')) || [];
    const signup = signups.find(s => s.id === signupId);
    
    if (signup) {
        if (confirm(`Approve account for ${signup.fullName}?`)) {
            // Generate student ID
            const studentId = 'JS' + Date.now().toString().slice(-6);
            
            // Get existing student data
            let studentData = JSON.parse(localStorage.getItem('studentData')) || {};
            
            // Add new student
            studentData[signup.desiredUsername] = {
                password: signup.password,
                profile: {
                    studentId: studentId,
                    name: signup.fullName,
                    class: `Form ${signup.form}A`,
                    dob: 'Not provided',
                    parent: 'Not provided',
                    contact: signup.phone,
                    email: signup.email,
                    address: 'Not provided'
                }
            };
            
            // Save updated student data
            localStorage.setItem('studentData', JSON.stringify(studentData));
            
            // Mark signup as approved
            signup.status = 'approved';
            signup.approvalDate = new Date().toLocaleDateString();
            localStorage.setItem('pendingSignups', JSON.stringify(signups));
            
            alert(`Account approved for ${signup.fullName}!\n\nLogin credentials:\nUsername: ${signup.desiredUsername}\nPassword: ${signup.password}\nStudent ID: ${studentId}`);
            
            // Refresh the display
            displayPendingSignups();
        }
    }
}

// Reject signup
function rejectSignup(signupId) {
    const signups = JSON.parse(localStorage.getItem('pendingSignups')) || [];
    const signup = signups.find(s => s.id === signupId);
    
    if (signup) {
        const reason = prompt(`Reason for rejecting ${signup.fullName}'s application:`);
        if (reason && reason.trim()) {
            signup.status = 'rejected';
            signup.rejectionReason = reason;
            signup.rejectionDate = new Date().toLocaleDateString();
            localStorage.setItem('pendingSignups', JSON.stringify(signups));
            
            alert(`Account application rejected for ${signup.fullName}.\nReason: ${reason}`);
            displayPendingSignups();
        }
    }
}

// Student management functions
function viewStudent(studentId) {
    alert(`Viewing detailed profile for student ${studentId}\n\nThis feature would show:\n- Complete student profile\n- Academic records\n- Payment history\n- Parent/guardian information`);
}

// Application management functions
function viewApplication(applicationId) {
    alert(`Viewing application details for ${applicationId}\n\nThis would show:\n- Complete application form\n- Uploaded documents\n- Academic history\n- Application status timeline`);
}

function approveApplication(applicationId) {
    if (confirm(`Are you sure you want to approve application ${applicationId}?`)) {
        alert(`Application ${applicationId} has been approved.\n\nStudent and parents will be notified via:\n- Email notification\n- SMS alert\n- Portal update`);
        updateApplicationStatus(applicationId, 'approved');
    }
}

function rejectApplication(applicationId) {
    const reason = prompt(`Please provide a reason for rejecting application ${applicationId}:`);
    if (reason && reason.trim()) {
        alert(`Application ${applicationId} has been rejected.\n\nReason: ${reason}\n\nApplicant will be notified with rejection details.`);
        updateApplicationStatus(applicationId, 'rejected');
    }
}

// Update application status in the table
function updateApplicationStatus(applicationId, status) {
    const rows = document.querySelectorAll('#admin-applications tbody tr');
    rows.forEach(row => {
        const idCell = row.cells[0];
        if (idCell && idCell.textContent === applicationId) {
            const statusCell = row.cells[4];
            const actionsCell = row.cells[5];
            
            // Update status badge
            if (status === 'approved') {
                statusCell.innerHTML = '<span class="status-badge status-approved">Approved</span>';
                actionsCell.innerHTML = `<button class="action-btn view-btn" onclick="viewApplication('${applicationId}')">View</button>`;
            } else if (status === 'rejected') {
                statusCell.innerHTML = '<span class="status-badge status-rejected">Rejected</span>';
                actionsCell.innerHTML = `<button class="action-btn view-btn" onclick="viewApplication('${applicationId}')">View</button>`;
            }
        }
    });
}

// Utility functions
function sendFeeReminder(studentId) {
    if (confirm(`Send fee payment reminder to student ${studentId}?`)) {
        alert(`Fee reminder sent to student ${studentId} via:\n- Email notification\n- SMS alert\n- Portal notification\n\nReminder includes payment details and due dates.`);
    }
}

function exportStudentData(format = 'Excel') {
    if (confirm(`Export all student data in ${format} format?`)) {
        alert(`Student data export initiated.\n\nFormat: ${format}\nIncludes: Student profiles, academic records, payment history\n\nDownload will start shortly...`);
        
        // Simulate download process
        setTimeout(() => {
            alert(`Export completed!\nFile: student_data_${new Date().toISOString().slice(0,10)}.${format.toLowerCase()}`);
        }, 2000);
    }
}

function generateReport(reportType) {
    const reports = {
        'enrollment': 'Enrollment Statistics Report',
        'financial': 'Financial Summary Report',
        'academic': 'Academic Performance Report',
        'attendance': 'Attendance Report'
    };
    
    const reportName = reports[reportType] || 'Custom Report';
    
    if (confirm(`Generate ${reportName}?`)) {
        alert(`${reportName} generation started.\n\nThis will include:\n- Summary statistics\n- Detailed breakdowns\n- Visual charts\n- Comparative analysis\n\nReport will be ready for download shortly...`);
        
        // Simulate report generation
        setTimeout(() => {
            alert(`${reportName} generated successfully!\nFile: ${reportType}_report_${new Date().toISOString().slice(0,10)}.pdf`);
        }, 3000);
    }
}

// Initialize sample data for demonstration
function initializeSampleData() {
    // Initialize pending signups if not exists
    if (!localStorage.getItem('pendingSignups')) {
        const sampleSignups = [
            {
                id: 'SIGNUP001',
                fullName: 'Faith Mwale',
                email: 'faith.mwale@email.com',
                phone: '+265 999 876 543',
                desiredUsername: 'faith.mwale',
                password: 'faith123',
                form: '1',
                applicationDate: '26/08/2025',
                status: 'pending'
            },
            {
                id: 'SIGNUP002',
                fullName: 'Joey Wilson',
                email: 'joey.wilson@email.com',
                phone: '+265 888 765 432',
                desiredUsername: 'joey.wilson',
                password: 'joey123',
                form: '2',
                applicationDate: '25/08/2025',
                status: 'pending'
            }
        ];
        
        localStorage.setItem('pendingSignups', JSON.stringify(sampleSignups));
    }
    
    // Initialize student data if not exists
    if (!localStorage.getItem('studentData')) {
        const sampleStudentData = {
            'josh.doe': {
                password: '123',
                profile: {
                    studentId: 'JS2024001',
                    name: 'Josh Doe',
                    class: 'Form 4A',
                    dob: '15/03/2008',
                    parent: 'Jane Doe',
                    contact: '+265 991 234 567',
                    email: 'josh.doe@email.com',
                    address: '123 Main Street, Lilongwe'
                }
            }
        };
        
        localStorage.setItem('studentData', JSON.stringify(sampleStudentData));
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('userType');
        localStorage.removeItem('username');
        localStorage.removeItem('userProfile');
        alert('Logged out successfully!');
        window.location.href = 'login.html';
    }
}

