/ Admissions Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('admissionForm');
    const submitBtn = document.querySelector('.submit-btn');
    
    // Form submission handler
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            submitForm();
        }
    });
    
    // Form validation
    function validateForm() {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                showFieldError(field, 'This field is required');
                isValid = false;
            } else {
                clearFieldError(field);
            }
        });
        
        // Validate email format
        const emailFields = form.querySelectorAll('input[type="email"]');
        emailFields.forEach(field => {
            if (field.value && !isValidEmail(field.value)) {
                showFieldError(field, 'Please enter a valid email address');
                isValid = false;
            }
        });
        
        // Validate phone numbers
        const phoneFields = form.querySelectorAll('input[type="tel"]');
        phoneFields.forEach(field => {
            if (field.value && !isValidPhone(field.value)) {
                showFieldError(field, 'Please enter a valid phone number');
                isValid = false;
            }
        });
        
        // Validate date of birth
        const dobField = document.getElementById('dateOfBirth');
        if (dobField.value) {
            const age = calculateAge(new Date(dobField.value));
            if (age < 12 || age > 25) {
                showFieldError(dobField, 'Age must be between 12 and 25 years');
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    // Show field error
    function showFieldError(field, message) {
        clearFieldError(field);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.color = '#dc3545';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '5px';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
        field.style.borderColor = '#dc3545';
    }
    
    // Clear field error
    function clearFieldError(field) {
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        field.style.borderColor = '#e0e0e0';
    }
    
    // Email validation
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Phone validation
    function isValidPhone(phone) {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }
    
    // Calculate age
    function calculateAge(birthDate) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }
    
    // Submit form
    function submitForm() {
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'Submitting...';
        
        // Collect form data
        const formData = new FormData(form);
        const applicationData = {};
        
        // Convert FormData to object
        for (let [key, value] of formData.entries()) {
            if (applicationData[key]) {
                // Handle multiple values (like checkboxes)
                if (Array.isArray(applicationData[key])) {
                    applicationData[key].push(value);
                } else {
                    applicationData[key] = [applicationData[key], value];
                }
            } else {
                applicationData[key] = value;
            }
        }
        
        // Simulate form submission (replace with actual API call)
        setTimeout(() => {
            console.log('Application Data:', applicationData);
            
            // Show success message
            showSuccessMessage();
            
            // Reset form
            form.reset();
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.textContent = 'Submit Application';
            
        }, 2000);
    }
    
    // Show success message
    function showSuccessMessage() {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <h3>Application Submitted Successfully!</h3>
            <p>Thank you for your application to J & J Secondary School. We have received your information and will contact you within 7 days.</p>
            <p><strong>Reference Number:</strong> JJ${Date.now()}</p>
            <p>Please save this reference number for your records.</p>
        `;
        
        // Insert after form header
        const formHeader = document.querySelector('.form-header');
        formHeader.parentNode.insertBefore(successDiv, formHeader.nextSibling);
        
        // Scroll to success message
        successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Remove success message after 10 seconds
        setTimeout(() => {
            successDiv.remove();
        }, 10000);
    }
    
    // Real-time validation
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.hasAttribute('required') && !this.value.trim()) {
                showFieldError(this, 'This field is required');
            } else {
                clearFieldError(this);
            }
        });
        
        input.addEventListener('input', function() {
            clearFieldError(this);
        });
    });
    
    // Form progress indicator
    function updateProgress() {
        const requiredFields = form.querySelectorAll('[required]');
        const filledFields = Array.from(requiredFields).filter(field => field.value.trim());
        const progress = (filledFields.length / requiredFields.length) * 100;
        
        // Update progress bar if it exists
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
    }
    
    // Listen for input changes to update progress
    inputs.forEach(input => {
        input.addEventListener('input', updateProgress);
    });
    
    // Initialize progress
    updateProgress();
    
    // Smooth section transitions
    const formSections = document.querySelectorAll('.form-section');
    const observerOptions = {
        threshold: 0.3,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    formSections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        sectionObserver.observe(section);
    });
    
    // Auto-save form data to localStorage
    function saveFormData() {
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        localStorage.setItem('admissionFormData', JSON.stringify(data));
    }
    
    // Load saved form data
    function loadFormData() {
        const savedData = localStorage.getItem('admissionFormData');
        if (savedData) {
            const data = JSON.parse(savedData);
            Object.keys(data).forEach(key => {
                const field = form.querySelector(`[name="${key}"]`);
                if (field) {
                    field.value = data[key];
                }
            });
        }
    }
    
    // Save data on input
    inputs.forEach(input => {
        input.addEventListener('input', debounce(saveFormData, 1000));
    });
    
    // Load data on page load
    loadFormData();
    
    // Clear saved data on successful submission
    function clearSavedData() {
        localStorage.removeItem('admissionFormData');
    }
    
    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Form field dependencies
    const applyingForField = document.getElementById('applyingFor');
    const preferredTrackField = document.getElementById('preferredTrack');
    
    applyingForField.addEventListener('change', function() {
        if (this.value === 'form1' || this.value === 'form2') {
            preferredTrackField.disabled = true;
            preferredTrackField.value = '';
            preferredTrackField.parentNode.style.opacity = '0.5';
        } else {
            preferredTrackField.disabled = false;
            preferredTrackField.parentNode.style.opacity = '1';
        }
    });
    
    // Initialize field dependencies
    if (applyingForField.value === 'form1' || applyingForField.value === 'form2') {
        preferredTrackField.disabled = true;
        preferredTrackField.parentNode.style.opacity = '0.5';
    }
});

// Counter animation for stats
function animateCounters() {
    const counters = document.querySelectorAll('.stat h3');
    counters.forEach(counter => {
        const target = parseInt(counter.textContent);
        let current = 0;
        const increment = target / 50;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                counter.textContent = target + (counter.textContent.includes('%') ? '%' : '+');
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(current) + (counter.textContent.includes('%') ? '%' : '+');
            }
        }, 40);
    });
}

// Trigger counter animation when stats come into view
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounters();
            statsObserver.unobserve(entry.target);
        }
    });
});

const statsSection = document.querySelector('.hero-stats');
if (statsSection) {
    statsObserver.observe(statsSection);
}