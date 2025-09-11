//
// =================================================================
// ADMIN DASHBOARD LOGIC
// This file contains all functions and data related to the admin portal.
// =================================================================
//

// --- Sample Data (for demonstration) ---
const adminData = {
    'admin': {
        password: '1'
    }
};

// --- Authentication and Navigation Functions ---

/**
 * Handles admin login and redirects to the admin dashboard.
 * @param {string} username The admin's username.
 * @param {string} password The admin's password.
 * @returns {boolean} True on success, false on failure.
 */
function loginAdmin(username, password) {
    try {
        if (adminData[username] && adminData[username].password === password) {
            localStorage.setItem('userType', 'admin');
            localStorage.setItem('username', username);
            console.log('Admin login successful. Redirecting to admin dashboard.');
            // window.location.href = 'admindashboard.html';
            return true;
        } else {
            throw new Error('Invalid admin credentials. Please check your username and password.');
        }
    } catch (error) {
        console.error('Admin Login Error:', error.message);
        // NOTE: In a real app, a custom error message would be displayed here.
        return false;
    }
}

/**
 * Checks if a user is authenticated and is an admin.
 * If not, it redirects to the login page.
 */
function checkAuth() {
    const userType = localStorage.getItem('userType');
    const username = localStorage.getItem('username');

    if (userType !== 'admin' || !username) {
        console.log('Authentication failed. Redirecting to login page.');
        // window.location.href = 'login.html';
        return false;
    }
    return true;
}

/**
 * Logs out the current admin.
 */
function logout() {
    localStorage.removeItem('userType');
    localStorage.removeItem('username');
    console.log('Admin logged out successfully. Redirecting to login page.');
    // window.location.href = 'login.html';
}

// --- Signup Management Functions ---

/**
 * Handles the student registration process by saving a new signup request.
 * @param {object} formData The form data submitted by the student.
 */
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
    
    let existingSignups = JSON.parse(localStorage.getItem('pendingSignups')) || [];
    existingSignups.push(signup);
    localStorage.setItem('pendingSignups', JSON.stringify(existingSignups));
    
    console.log('Account application submitted successfully! It will be reviewed by the administrator.');
    // NOTE: Replace with a custom success modal.
}

/**
 * Displays all pending student signups on the admin dashboard.
 */
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
            <div class="signup-item" style="border: 1px solid #ccc; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="color: #2d5016;">${signup.fullName}</h4>
                    <p><strong>Email:</strong> ${signup.email}</p>
                    <p><strong>Desired Username:</strong> ${signup.desiredUsername}</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="action-btn approve-btn" style="background-color: #4a7c59; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer;" onclick="approveSignup('${signup.id}')">Approve</button>
                    <button class="action-btn reject-btn" style="background-color: #d9534f; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer;" onclick="rejectSignup('${signup.id}')">Reject</button>
                </div>
            </div>
        `;
    });
    
    signupsList.innerHTML = html;
}

/**
 * Approves a student's signup application.
 * @param {string} signupId The ID of the signup to approve.
 */
function approveSignup(signupId) {
    const signups = JSON.parse(localStorage.getItem('pendingSignups')) || [];
    const signup = signups.find(s => s.id === signupId);
    
    if (signup) {
        // NOTE: In a real app, a custom modal would be used here.
        console.log(`Approving account for ${signup.fullName}.`);
        signup.status = 'approved';
        localStorage.setItem('pendingSignups', JSON.stringify(signups));
        
        console.log(`Account approved for ${signup.fullName}. Login credentials: Username: ${signup.desiredUsername}, Password: ${signup.password}`);
        displayPendingSignups();
    }
}

/**
 * Rejects a student's signup application.
 * @param {string} signupId The ID of the signup to reject.
 */
function rejectSignup(signupId) {
    const signups = JSON.parse(localStorage.getItem('pendingSignups')) || [];
    const signup = signups.find(s => s.id === signupId);
    
    if (signup) {
        // NOTE: In a real app, a custom input modal would be used to get the reason.
        const reason = 'Application incomplete'; // Sample reason
        console.log(`Rejecting application for ${signup.fullName}. Reason: ${reason}`);
        
        signup.status = 'rejected';
        signup.rejectionReason = reason;
        localStorage.setItem('pendingSignups', JSON.stringify(signups));
        
        console.log(`Application rejected for ${signup.fullName}. Reason: ${reason}`);
        displayPendingSignups();
    }
}

/**
 * Initializes some sample data for demonstration purposes if it doesn't already exist.
 */
function initializeSampleData() {
    const sampleSignups = [
        {
            id: 'SIGNUP001',
            fullName: 'Faith Mwale',
            email: 'fm@gmail.com',
            phone: '+265 999 876 543',
            desiredUsername: 'faith.mwale',
            password: 'faith123',
            grade: '9',
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
            grade: '2',
            applicationDate: '25/08/2025',
            status: 'pending'
        }
    ];
    
    // Only initialize if no signups exist
    if (!localStorage.getItem('pendingSignups')) {
        localStorage.setItem('pendingSignups', JSON.stringify(sampleSignups));
    }
}

// --- Event Listeners ---
// This ensures that the code runs only after the page has loaded.
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin dashboard script loaded');
    initializeSampleData();
    // Check authentication on dashboard pages.
    if (window.location.pathname.includes('admindashboard.html')) {
        if (checkAuth()) {
            displayPendingSignups();
        }
    }
});
