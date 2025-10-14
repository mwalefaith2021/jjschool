//
// =================================================================
// ADMISSIONS FORM LOGIC
// This file contains all functions related to the admissions form submission.
// =================================================================

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

/**
 * Enhanced fetch wrapper with better error handling
 */
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            // Try to get error details from response
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
            }
            
            throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
        }
        throw error;
    }
}

// ==============================================
// FORM VALIDATION FUNCTIONS
// ==============================================

/**
 * Validates a form field and displays error message if invalid
 */
function validateField(fieldName, value, validator, errorMessage) {
    const field = document.querySelector(`[name="${fieldName}"]`);
    const errorElement = document.querySelector(`#${fieldName}-error`);
    
    if (!validator(value)) {
        if (field) field.classList.add('error');
        if (errorElement) errorElement.textContent = errorMessage;
        return false;
    } else {
        if (field) field.classList.remove('error');
        if (errorElement) errorElement.textContent = '';
        return true;
    }
}

/**
 * Validates all required fields in the admissions form
 */
function validateAdmissionForm(formData) {
    let isValid = true;
    
    // Clear all previous errors
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    
    // Validate required fields
    const requiredFields = {
        firstName: (val) => val && val.trim().length > 0,
        lastName: (val) => val && val.trim().length > 0,
        dateOfBirth: (val) => val && new Date(val) < new Date(),
        gender: (val) => ['male', 'female'].includes(val),
        nationality: (val) => val && val.trim().length > 0,
        address: (val) => val && val.trim().length > 0,
        email: (val) => val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        applyingFor: (val) => ['form1', 'form2', 'form3', 'form4'].includes(val),
        academicYear: (val) => val && val.trim().length > 0,
        previousSchool: (val) => val && val.trim().length > 0,
        guardianName: (val) => val && val.trim().length > 0,
        relationship: (val) => ['father', 'mother', 'guardian', 'other'].includes(val),
        guardianPhone: (val) => val && val.trim().length > 0,
        emergencyContact: (val) => val && val.trim().length > 0,
        reference: (val) => val && val.trim().length > 0
    };
    
    for (const [field, validator] of Object.entries(requiredFields)) {
        const value = formData.get(field);
        if (!validateField(field, value, validator, `${field} is required and must be valid`)) {
            isValid = false;
        }
    }
    
    return isValid;
}

// ==============================================
// FORM SUBMISSION HANDLER
// ==============================================

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
        occupation: formData.get('occupation'),
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
    statusDiv.innerHTML = `
        <div style="color: #007bff; text-align: center;">
            <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 10px;">Submitting your application...</p>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    // Send data to backend API using enhanced API call
    console.log('Submitting to:', `${API_BASE}/api/submit-application`);
    console.log('Application data:', applicationData);
    
    apiCall(`${API_BASE}/api/submit-application`, {
        method: 'POST',
        body: JSON.stringify(applicationData)
    })
    .then(data => {
        console.log('Success response:', data);
        
        if (data.message && data.applicationNumber) {
            statusDiv.innerHTML = `
                <div style="color: #28a745; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #d4edda;">
                    <h4>✅ Application Submitted Successfully!</h4>
                    <p><strong>Application Number:</strong> <span style="font-family: monospace; background: #e9ecef; padding: 2px 6px; border-radius: 4px;">${data.applicationNumber}</span></p>
                    <p>We will review your application and get back to you soon.</p>
                    <p>Please keep your application number for future reference.</p>
                    <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
                        <small><strong>Next Steps:</strong> You will receive an email confirmation shortly. Check your spam folder if you don't see it within a few minutes.</small>
                    </div>
                </div>
            `;
            form.reset();
            
            // Scroll to status message
            statusDiv.scrollIntoView({ behavior: 'smooth' });
        } else {
            console.error('Unexpected response format:', data);
            throw new Error('Unexpected response format from server');
        }
    })
    .catch(error => {
        console.error('Error submitting application:', error);
        let errorMessage = 'Error submitting application. Please try again or contact us directly.';
        
        if (error.message.includes('Network error')) {
            errorMessage = error.message + ' Please check if you are connected to the internet and try again.';
        } else if (error.message.includes('validation')) {
            errorMessage = error.message;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        statusDiv.innerHTML = `
            <div style="color: #dc3545; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #f5c6cb;">
                <h4>❌ Submission Failed</h4>
                <p>${errorMessage}</p>
                <div style="margin-top: 15px; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
                    <small><strong>API Base:</strong> ${API_BASE}</small><br/>
                    <small><strong>Timestamp:</strong> ${new Date().toLocaleString()}</small>
                </div>
                <div style="margin-top: 10px;">
                    <button onclick="location.reload()" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page & Retry</button>
                </div>
            </div>
        `;
        
        // Scroll to status message
        statusDiv.scrollIntoView({ behavior: 'smooth' });
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Application';
    });
}

// ==============================================
// EVENT LISTENERS
// ==============================================

// This ensures that the code runs only after the page has loaded.
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admissions script loaded');
    console.log('API Base:', window.API_BASE);
    
    // Handle admissions form submission
    const admissionForm = document.getElementById('admissionForm');
    if (admissionForm) {
        console.log('Admissions form found, attaching event listener');
        admissionForm.addEventListener('submit', handleAdmissionFormSubmit);
    } else {
        console.log('Admissions form not found on this page');
    }
    
    // Add CSS for form validation errors
    if (!document.getElementById('admissions-validation-styles')) {
        const style = document.createElement('style');
        style.id = 'admissions-validation-styles';
        style.textContent = `
            .error { border: 2px solid #dc3545 !important; background-color: #fff5f5 !important; }
            .error-message { color: #dc3545; font-size: 0.875em; margin-top: 5px; }
        `;
        document.head.appendChild(style);
    }
});

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
    console.log('Submitting to:', `${API_BASE}/api/submit-application`);
    console.log('Application data:', applicationData);
    
    fetch(`${API_BASE}/api/submit-application`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData)
    })
    .then(response => {
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            return response.json().then(err => {
                console.error('API Error Response:', err);
                return Promise.reject(err);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Success response:', data);
        
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
            
            // Scroll to status message
            statusDiv.scrollIntoView({ behavior: 'smooth' });
        } else {
            console.error('Unexpected response format:', data);
            throw new Error('Unexpected response format');
        }
    })
    .catch(error => {
        console.error('Error submitting application:', error);
        let errorMessage = 'Error submitting application. Please try again or contact us directly.';
        
        if (error.errors && Array.isArray(error.errors)) {
            errorMessage = 'Please fix the following errors:<br/>' + 
                error.errors.map(err => `• ${err.msg}`).join('<br/>');
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        statusDiv.innerHTML = `
            <div style="color: #dc3545; text-align: center;">
                <h4>❌ Submission Failed</h4>
                <p>${errorMessage}</p>
                <p><small>API Base: ${API_BASE}</small></p>
            </div>
        `;
        
        // Scroll to status message
        statusDiv.scrollIntoView({ behavior: 'smooth' });
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
