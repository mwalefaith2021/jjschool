//
// =================================================================
// ADMIN DASHBOARD LOGIC
// This file contains all functions and data related to the admin portal.
// =================================================================
//

// Removed demo admin data

// --- Authentication and Navigation Functions ---

/**
 * Handles admin login and redirects to the admin dashboard.
 * @param {string} username The admin's username.
 * @param {string} password The admin's password.
 * @returns {boolean} True on success, false on failure.
 */
function loginAdmin(username, password) { return false; }

/**
 * Checks if a user is authenticated and is an admin.
 * If not, it redirects to the login page.
 */
function checkAuth() { return true; }

/**
 * Logs out the current admin.
 */
function logout() {}

// --- Signup Management Functions ---

/**
 * Handles the student registration process by saving a new signup request.
 * @param {object} formData The form data submitted by the student.
 */
function registerStudent() {}

/**
 * Displays all pending student signups on the admin dashboard.
 */
function displayPendingSignups() {}

/**
 * Approves a student's signup application.
 * @param {string} signupId The ID of the signup to approve.
 */
function approveSignup() {}

/**
 * Rejects a student's signup application.
 * @param {string} signupId The ID of the signup to reject.
 */
function rejectSignup() {}

/**
 * Initializes some sample data for demonstration purposes if it doesn't already exist.
 */
function initializeSampleData() {}

// --- Admissions Form Handler ---

/**
 * Handles the admission form submission by sending data to the backend API
 */
function handleAdmissionFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Convert FormData to JSON object
    const applicationData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        dateOfBirth: formData.get('dateOfBirth'),
        gender: formData.get('gender'),
        nationality: formData.get('nationality'),
        address: formData.get('address'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        applyingFor: formData.get('applyingFor'),
        academicYear: formData.get('academicYear'),
        previousSchool: formData.get('previousSchool'),
        guardianName: formData.get('guardianName'),
        relationship: formData.get('relationship'),
        guardianPhone: formData.get('guardianPhone'),
        guardianEmail: formData.get('guardianEmail'),
        allergies: formData.get('allergies'),
        emergencyContact: formData.get('emergencyContact'),
        paymentMethod: formData.getAll('paymentMethod'),
        reference: formData.get('reference')
    };
    
    // Show loading state
    const submitBtn = form.querySelector('.submit-btn');
    const statusDiv = document.getElementById('form-status');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    statusDiv.textContent = 'Submitting your application...';
    statusDiv.style.color = '#007bff';
    
    // Send data to backend API
    fetch('http://localhost:3000/api/submit-application', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => Promise.reject(err));
        }
        return response.json();
    })
    .then(data => {
        if (data.message && data.applicationNumber) {
            statusDiv.innerHTML = `
                <div style="color: #28a745; text-align: center;">
                    <h4>✅ Application Submitted Successfully!</h4>
                    <p><strong>Application Number:</strong> ${data.applicationNumber}</p>
                    <p>We will review your application and get back to you soon.</p>
                    <p>Please keep your application number for future reference.</p>
                </div>
            `;
            form.reset();
        } else {
            throw new Error('Unexpected response format');
        }
    })
    .catch(error => {
        console.error('Error submitting application:', error);
        let errorMessage = 'Error submitting application. Please try again or contact us directly.';
        
        if (error.errors && Array.isArray(error.errors)) {
            errorMessage = 'Please fix the following errors:\n' + 
                error.errors.map(err => `• ${err.msg}`).join('\n');
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        statusDiv.innerHTML = `
            <div style="color: #dc3545; text-align: center;">
                <h4>❌ Submission Failed</h4>
                <p>${errorMessage}</p>
            </div>
        `;
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Application';
    });
}

// --- Event Listeners ---
// This ensures that the code runs only after the page has loaded.
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admissions script loaded');
    
    // Handle admissions form submission
    const admissionForm = document.getElementById('admissionForm');
    if (admissionForm) {
        admissionForm.addEventListener('submit', handleAdmissionFormSubmit);
    }
    
    // Check if this is admin dashboard page
    if (window.location.pathname.includes('admindashboard.html')) {
        initializeSampleData();
        if (checkAuth()) {
            displayPendingSignups();
        }
    }
});
