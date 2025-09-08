// Sample data with Malawi details
const studentData = {
    'john.doe': {
        password: 'student123',
        profile: {
            studentId: 'JS2024001',
            name: 'John Doe',
            class: 'Grade 10A',
            dob: '15/03/2008',
            parent: 'Jane Doe',
            contact: '+265 991 234 567',
            email: 'john.doe@email.com',
            address: '123 Main Street, Lilongwe'
        }
    }
};

const adminData = {
    'admin': {
        password: 'admin123'
    }
};

// Array to store pending signups
let pendingSignups = [];

// Navigation functions
function goHome() {
    window.location.href = 'index.html';
}

function goToLogin() {
    window.location.href = 'login.html';
}

function goToSignup() {
    window.location.href = 'signup.html';
}

// Authentication functions
async function loginUser(userType, username, password) {
    try {
        if (userType === 'student') {
            if (studentData[username] && studentData[username].password === password) {
                localStorage.setItem('userType', 'student');
                localStorage.setItem('username', username);
                localStorage.setItem('userProfile', JSON.stringify(studentData[username].profile));
                window.location.href = 'studentdashboard.html';
                return true;
            } else {
                throw new Error('Invalid credentials. Please check your username and password.');
            }
        } else if (userType === 'admin') {
            if (adminData[username] && adminData[username].password === password) {
                localStorage.setItem('userType', 'admin');
                localStorage.setItem('username', username);
                window.location.href = 'admindashboard.html';
                return true;
            } else {
                throw new Error('Invalid admin credentials. Please check your username and password.');
            }
        }
    } catch (error) {
        alert(error.message);
        return false;
    }
}

// Signup functionality
function registerStudent(formData) {
    const signup = {
        id: 'SIGNUP' + Date.now(),
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        desiredUsername: formData.desiredUsername,
        password: formData.signupPassword,
        grade: formData.grade,
        applicationDate: new Date().toLocaleDateString(),
        status: 'pending'
    };
    
    // Get existing signups from localStorage
    let existingSignups = JSON.parse(localStorage.getItem('pendingSignups')) || [];
    existingSignups.push(signup);
    localStorage.setItem('pendingSignups', JSON.stringify(existingSignups));
    
    alert('Account application submitted successfully! Your application will be reviewed by the administrator. You will be notified once approved.');
    window.location.href = 'login.html';
}

// Check authentication
function checkAuth() {
    const userType = localStorage.getItem('userType');
    const username = localStorage.getItem('username');
    
    if (!userType || !username) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Load user profile data
function loadUserProfile() {
    const userType = localStorage.getItem('userType');
    const username = localStorage.getItem('username');
    
    if (userType === 'student') {
        const profile = JSON.parse(localStorage.getItem('userProfile'));
        if (profile) {
            updateStudentProfile(profile);
        }
    }
}

function updateStudentProfile(profile) {
    const elements = {
        'studentId': profile.studentId,
        'studentName': profile.name,
        'studentClass': profile.class,
        'studentDob': profile.dob,
        'parentName': profile.parent,
        'contactNumber': profile.contact,
        'studentEmail': profile.email,
        'studentAddress': profile.address
    };
    
    for (const [elementId, value] of Object.entries(elements)) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
}

// Logout functionality
function logout() {
    localStorage.removeItem('userType');
    localStorage.removeItem('username');
    localStorage.removeItem('userProfile');
    window.location.href = 'login.html';
}

// Dashboard navigation
function showSection(userType, sectionName) {
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Add active class to clicked nav item
    event.target.classList.add('active');
    
    // Hide all content sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Show selected section
    const targetSection = document.getElementById(`${userType}-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // If showing signups section, refresh the list
    if (sectionName === 'signups') {
        displayPendingSignups();
    }
}

// Payment functions
function initiatePayment(feeType, amount) {
    const paymentSection = document.getElementById('student-payment');
    if (paymentSection) {
        paymentSection.classList.add('active');
        
        // Hide other sections
        document.querySelectorAll('.content-section').forEach(section => {
            if (section.id !== 'student-payment') {
                section.classList.remove('active');
            }
        });
        
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const paymentNavItem = document.querySelectorAll('.nav-item')[2];
        if (paymentNavItem) paymentNavItem.classList.add('active');
        
        // Pre-fill payment form
        const amountInput = document.getElementById('paymentAmount');
        if (amountInput) {
            amountInput.value = amount;
        }
    }
}

function processPayment() {
    const amount = document.getElementById('paymentAmount')?.value;
    const type = document.getElementById('paymentType')?.value;
    const method = document.getElementById('paymentMethod')?.value;
    const reference = document.getElementById('referenceNumber')?.value;
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid payment amount');
        return;
    }
    
    if (!type || !method) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Generate a payment reference if not provided
    const paymentRef = reference || `PAY${Date.now()}`;
    
    // Show different payment instructions based on method
    let paymentInstructions = '';
    if (method === 'Airtel Money') {
        paymentInstructions = '\n\nPayment Instructions:\n1. Dial *150*01# from your Airtel line\n2. Select "Pay Bills"\n3. Enter Biller Code: JSS001\n4. Enter Amount: MK ' + amount + '\n5. Use Reference: ' + paymentRef;
    } else if (method === 'TNM Mpamba') {
        paymentInstructions = '\n\nPayment Instructions:\n1. Dial *150*01# from your TNM line\n2. Select "Pay Bills"\n3. Enter Biller Code: JSS001\n4. Enter Amount: MK ' + amount + '\n5. Use Reference: ' + paymentRef;
    } else if (method === 'Visa Card' || method === 'Mastercard') {
        paymentInstructions = '\n\nPayment Instructions:\nYou will be redirected to a secure payment gateway to complete your card payment.';
    } else if (method === 'Bank Transfer') {
        paymentInstructions = '\n\nPayment Instructions:\nBank: Standard Bank Malawi\nAccount Name: J Secondary School\nAccount Number: 9100012345\nReference: ' + paymentRef;
    }
    
    alert(`Payment Details:
Amount: MK ${amount}
Type: ${type}
Method: ${method}
Reference: ${paymentRef}

Payment submitted successfully! You will receive a confirmation SMS/email shortly.${paymentInstructions}`);
    
    // Clear the form
    if (document.getElementById('paymentAmount')) document.getElementById('paymentAmount').value = '';
    if (document.getElementById('referenceNumber')) document.getElementById('referenceNumber').value = '';
}

// Admin functions
function displayPendingSignups() {
    const signupsList = document.getElementById('signupsList');
    if (!signupsList) return;
    
    const signups = JSON.parse(localStorage.getItem('pendingSignups')) || [];
    const pendingSignups = signups.filter(signup => signup.status === 'pending');
    
    if (pendingSignups.length === 0) {
        signupsList.innerHTML = '<p style="color: #4a7c59; font-style: italic;">No pending account signups.</p>';
        return;
    }
    
    let html = '';
    pendingSignups.forEach(signup => {
        html += `
            <div class="signup-item">
                <div>
                    <h4 style="color: #2d5016;">${signup.fullName}</h4>
                    <p><strong>Email:</strong> ${signup.email}</p>
                    <p><strong>Phone:</strong> ${signup.phone}</p>
                    <p><strong>Desired Username:</strong> ${signup.desiredUsername}</p>
                    <p><strong>Grade:</strong> Grade ${signup.grade}</p>
                    <p><strong>Applied:</strong> ${signup.applicationDate}</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="action-btn approve-btn" onclick="approveSignup('${signup.id}')">Approve</button>
                    <button class="action-btn reject-btn" onclick="rejectSignup('${signup.id}')">Reject</button>
                </div>
            </div>
        `;
    });
    
    signupsList.innerHTML = html;
}

function approveSignup(signupId) {
    const signups = JSON.parse(localStorage.getItem('pendingSignups')) || [];
    const signup = signups.find(s => s.id === signupId);
    
    if (signup) {
        if (confirm(`Approve account for ${signup.fullName}?`)) {
            // Add to student data
            studentData[signup.desiredUsername] = {
                password: signup.password,
                profile: {
                    studentId: 'JS' + Date.now(),
                    name: signup.fullName,
                    class: `Grade ${signup.grade}A`,
                    dob: 'Not provided',
                    parent: 'Not provided',
                    contact: signup.phone,
                    email: signup.email,
                    address: 'Not provided'
                }
            };
            
            // Mark as approved
            signup.status = 'approved';
            localStorage.setItem('pendingSignups', JSON.stringify(signups));
            
            alert(`Account approved for ${signup.fullName}. Login credentials:\nUsername: ${signup.desiredUsername}\nPassword: ${signup.password}`);
            displayPendingSignups();
        }
    }
}

function rejectSignup(signupId) {
    const signups = JSON.parse(localStorage.getItem('pendingSignups')) || [];
    const signup = signups.find(s => s.id === signupId);
    
    if (signup) {
        const reason = prompt(`Reason for rejecting ${signup.fullName}'s application:`);
        if (reason) {
            signup.status = 'rejected';
            signup.rejectionReason = reason;
            localStorage.setItem('pendingSignups', JSON.stringify(signups));
            alert(`Account application rejected for ${signup.fullName}. Reason: ${reason}`);
            displayPendingSignups();
        }
    }
}

// Student management functions
function viewStudent(studentId) {
    alert(`Viewing detailed profile for student ${studentId}`);
}

function viewApplication(applicationId) {
    alert(`Viewing application details for ${applicationId}`);
}

function approveApplication(applicationId) {
    if (confirm(`Are you sure you want to approve application ${applicationId}?`)) {
        alert(`Application ${applicationId} has been approved. Student will be notified.`);
        updateApplicationStatus(applicationId, 'approved');
    }
}

function rejectApplication(applicationId) {
    const reason = prompt(`Please provide a reason for rejecting application ${applicationId}:`);
    if (reason) {
        alert(`Application ${applicationId} has been rejected. Reason: ${reason}. Applicant will be notified.`);
        updateApplicationStatus(applicationId, 'rejected');
    }
}

function updateApplicationStatus(applicationId, status) {
    // Find the row with the application ID and update its status
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
function formatCurrency(amount) {
    return `MK ${amount.toLocaleString()}`;
}

function sendFeeReminder(studentId) {
    if (confirm(`Send fee payment reminder to student ${studentId}?`)) {
        alert(`Fee reminder sent to student ${studentId} via email and SMS`);
    }
}

function exportStudentData(format) {
    alert(`Exporting student data in ${format} format. Download will start shortly.`);
}

function generateReport(reportType) {
    alert(`${reportType} report generated successfully. Download will start shortly.`);
}

// Initialize sample data
function initializeSampleData() {
    // Add some sample pending signups for demonstration with Malawi details
    const sampleSignups = [
        {
            id: 'SIGNUP001',
            fullName: 'Faith Mwale',
            email: 'fm@email.com',
            phone: '+265 999 876 543',
            desiredUsername: 'faith.mwale',
            password: 'faith123',
            grade: '9',
            applicationDate: '26/08/2025',
            status: 'pending'
        },
        {
            id: 'SIGNUP002',
            fullName: 'Bob Wilson',
            email: 'bob.wilson@email.com',
            phone: '+265 888 765 432',
            desiredUsername: 'bob.wilson',
            password: 'bob123',
            grade: '11',
            applicationDate: '25/08/2025',
            status: 'pending'
        }
    ];
    
    // Only initialize if no signups exist
    if (!localStorage.getItem('pendingSignups')) {
        localStorage.setItem('pendingSignups', JSON.stringify(sampleSignups));
    }
}

// Form validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^\+265\s?\d{3}\s?\d{3}\s?\d{3}$/;
    return re.test(phone);
}

// Initialize when document loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('J & J Secondary School Portal initialized');
    initializeSampleData();
    
    // Check if we're on a dashboard page and verify authentication
    const currentPage = window.location.pathname;
    if (currentPage.includes('student-dashboard.html') || currentPage.includes('admindashboard.html')) {
        if (checkAuth()) {
            loadUserProfile();
        }
    }
    
    // Auto-logout functionality (optional security feature)
    let inactivityTimer;
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            if (confirm('You have been inactive for a while. Do you want to stay logged in?')) {
                resetInactivityTimer();
            } else {
                logout();
            }
        }, 30 * 60 * 1000); // 30 minutes
    }
    
    // Reset timer on user activity
    document.addEventListener('click', resetInactivityTimer);
    document.addEventListener('keypress', resetInactivityTimer);
    
    // Initialize timer if on dashboard
    if (currentPage.includes('dashboard.html')) {
        resetInactivityTimer();
    }
});