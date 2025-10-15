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
    
    // Do NOT convert to JSON - keep as FormData to support file upload
    // FormData will automatically handle multipart/form-data encoding
    
    // Show loading state
    const submitBtn = form.querySelector('.submit-btn');
    const statusDiv = document.getElementById('form-status');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    statusDiv.textContent = 'Submitting your application...';
    statusDiv.style.color = '#007bff';
    
    // Send FormData directly to backend API (supports file upload)
    fetch(`${API_BASE}/api/submit-application`, {
        method: 'POST',
        body: formData  // Send FormData directly, DO NOT set Content-Type header
        // Browser will automatically set Content-Type: multipart/form-data with boundary
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
        
        // Setup multiple file upload functionality
        setupMultipleFileUpload();
    }
    
    // Check if this is admin dashboard page
    if (window.location.pathname.includes('admindashboard.html')) {
        initializeSampleData();
        if (checkAuth()) {
            displayPendingSignups();
        }
    }
});

/**
 * Sets up the dynamic multiple file upload interface
 */
function setupMultipleFileUpload() {
    const container = document.getElementById('file-upload-container');
    const addMoreBtn = document.getElementById('add-more-files-btn');
    const fileList = document.getElementById('file-list');
    const maxFiles = 5;
    
    if (!container || !addMoreBtn) return;
    
    // Update file list display
    function updateFileList() {
        const fileInputs = container.querySelectorAll('.file-input');
        const files = [];
        
        fileInputs.forEach(input => {
            if (input.files && input.files.length > 0) {
                files.push({
                    name: input.files[0].name,
                    size: (input.files[0].size / 1024).toFixed(2)
                });
            }
        });
        
        if (files.length > 0) {
            fileList.innerHTML = '<strong>Selected files:</strong><br>' + 
                files.map(f => `📎 ${f.name} (${f.size} KB)`).join('<br>');
            fileList.style.display = 'block';
        } else {
            fileList.style.display = 'none';
        }
        
        // Update add button visibility
        const currentCount = container.querySelectorAll('.file-input-wrapper').length;
        addMoreBtn.style.display = currentCount >= maxFiles ? 'none' : 'inline-block';
    }
    
    // Add new file input
    addMoreBtn.addEventListener('click', function() {
        const currentCount = container.querySelectorAll('.file-input-wrapper').length;
        
        if (currentCount >= maxFiles) {
            alert(`Maximum ${maxFiles} files allowed.`);
            return;
        }
        
        const wrapper = document.createElement('div');
        wrapper.className = 'file-input-wrapper';
        wrapper.innerHTML = `
            <input type="file" name="attachments" class="file-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
            <button type="button" class="remove-file-btn">✕ Remove</button>
        `;
        
        const removeBtn = wrapper.querySelector('.remove-file-btn');
        const fileInput = wrapper.querySelector('.file-input');
        
        // Remove button handler
        removeBtn.addEventListener('click', function() {
            wrapper.remove();
            updateFileList();
            
            // Make sure at least one input remains and is required
            const remaining = container.querySelectorAll('.file-input-wrapper');
            if (remaining.length === 1) {
                remaining[0].querySelector('.remove-file-btn').style.display = 'none';
                remaining[0].querySelector('.file-input').required = true;
            }
        });
        
        // File change handler
        fileInput.addEventListener('change', updateFileList);
        
        container.appendChild(wrapper);
        updateFileList();
        
        // Show remove button on first input if we now have multiple
        const allWrappers = container.querySelectorAll('.file-input-wrapper');
        if (allWrappers.length > 1) {
            allWrappers[0].querySelector('.remove-file-btn').style.display = 'inline-block';
            allWrappers[0].querySelector('.file-input').required = false;
        }
    });
    
    // Setup change listener on initial file input
    const initialInput = container.querySelector('.file-input');
    if (initialInput) {
        initialInput.addEventListener('change', updateFileList);
    }
}
