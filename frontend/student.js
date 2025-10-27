// Student Dashboard JavaScript

// This function is now in the global scope to be accessible from the login page.
function loginStudentUser(username, password) {
    // Show loading state
    const submitBtn = document.querySelector('.auth-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    // Send login request to backend API
    fetch(`${API_BASE}/api/login`, {
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
        if (data.message === 'Login successful!' && data.user.role === 'student') {
            // Store user data in localStorage
            localStorage.setItem('userType', 'student');
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('userProfile', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);

            // If first login, force password change
            if (data.user.requiresPasswordReset) {
                showPasswordResetModal(data.user.id);
                return;
            }

            // Redirect to student dashboard
            window.location.href = 'studentdashboard.html';
        } else {
            alert('Invalid student credentials');
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

// All other functions are related to the student dashboard and should be called from there.
document.addEventListener("DOMContentLoaded", async function () {
    // This is for code that should only run once the DOM is fully loaded on the student dashboard page.
    console.log('Student Dashboard scripts initialized');
    
    // Check authentication on dashboard page load
        if (window.location.pathname.includes('studentdashboard.html')) {
            const ok = await checkAuth();
            if (!ok) return;

            // If first-time login (OTP), force password change prompt immediately
            try {
                const profile = JSON.parse(localStorage.getItem('userProfile')) || {};
                if (profile && profile.requiresPasswordReset && profile.id) {
                    showPasswordResetModal(profile.id);
                }
            } catch {}

            initializeStudentDashboard();
            loadUserProfile();
            renderBackendStudentProfile();
            fetchAndRenderStudentProfile();
      
      const paymentForm = document.getElementById("paymentForm");
      if (paymentForm) {
          paymentForm.addEventListener("submit", function (e) {
              e.preventDefault();
              processPayment();
          });
      }
    }
});

// Prevent back button access after logout
window.addEventListener('pageshow', function(event) {
    // Check if page is loaded from cache (back button)
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        // If no valid session, redirect to login
        const token = localStorage.getItem('token');
        if (!token && !window.location.pathname.includes('login.html')) {
            window.location.replace('login.html');
        }
    }
});

// Check session on page visibility change
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && !window.location.pathname.includes('login.html')) {
        // Page became visible, verify session is still valid
        checkAuth();
    }
});

// Authentication check
async function checkAuth() {
    // Only check auth on dashboard pages, not on login page
    if (window.location.pathname.includes('login.html')) {
        return true;
    }
    
    const userType = localStorage.getItem('userType');
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('token');
    
    if (!userType || !username || userType !== 'student') {
        alert('Access denied. Please login as student.');
        window.location.href = 'login.html';
        return false;
    }
    // Verify token with backend
    try {
        const res = await fetch(`${API_BASE}/api/verify`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Invalid');
        return true;
    } catch {
        localStorage.removeItem('userType');
        localStorage.removeItem('username');
        localStorage.removeItem('userProfile');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return false;
    }
}

// Initialize student dashboard
function initializeStudentDashboard() {
    // Set up navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const sectionName = this.textContent.toLowerCase().replace(/\s+/g, '-');
            handleNavigation(sectionName);
        });
    });
}

// Handle navigation between sections
function handleNavigation(sectionName) {
    let targetSection;
    
    switch(sectionName) {
        case 'profile':
            targetSection = 'profile';
            break;
        case 'fees-&-payments':
            targetSection = 'fees';
            break;
        case 'make-payment':
            targetSection = 'payment';
            break;
        case 'payment-info':
            targetSection = 'bank-details';
            break;
        default:
            targetSection = 'profile';
    }
    
    showSection('student', targetSection);
}

// Show specific section
function showSection(userType, sectionName) {
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Add active class to clicked nav item
    const activeNavItem = Array.from(navItems).find(item => {
        const itemText = item.textContent.toLowerCase().replace(/\s+/g, '-');
        return itemText === sectionName || 
                (sectionName === 'fees' && itemText === 'fees-&-payments') ||
                (sectionName === 'payment' && itemText === 'make-payment') ||
                (sectionName === 'bank-details' && itemText === 'payment-info');
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

// Load user profile data
function loadUserProfile() {
    const username = localStorage.getItem('username');
    const profile = JSON.parse(localStorage.getItem('userProfile'));
    
    if (profile) {
        updateStudentProfile(profile);
    } else {
        // Try to get from student data
        const studentData = JSON.parse(localStorage.getItem('studentData')) || {};
        if (studentData[username]) {
            updateStudentProfile(studentData[username].profile);
            localStorage.setItem('userProfile', JSON.stringify(studentData[username].profile));
        }
    }
}

// Render logged-in user's info (from backend auth data)
function renderBackendStudentProfile() {
    const profile = JSON.parse(localStorage.getItem('userProfile'));
    if (!profile) return;
    const mappings = [
        ['studentId', profile.studentId || '-'],
        ['studentName', profile.fullName || profile.name || '-'],
        ['studentClass', profile.class || '-'],
        ['studentDob', profile.dob || '-'],
        ['parentName', profile.parent || '-'],
        ['contactNumber', profile.contact || '-'],
        ['studentEmail', profile.email || '-'],
        ['studentAddress', profile.address || '-']
    ];
    mappings.forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });
}

// Fetch profile details from backend application record and render
async function fetchAndRenderStudentProfile() {
    try {
        const profile = JSON.parse(localStorage.getItem('userProfile'));
        if (!profile || !profile.id) return;
        const res = await fetch(`${API_BASE}/api/students/${profile.id}/application`);
        if (!res.ok) return; // fallback already rendered
        const { data } = await res.json();
        if (!data) return;
        const fullName = `${data.personalInfo.firstName} ${data.personalInfo.lastName}`;
        const dob = data.personalInfo.dateOfBirth ? new Date(data.personalInfo.dateOfBirth).toLocaleDateString() : '-';
        const klass = data.academicInfo?.applyingFor || '-';
        const classDisplay = klass && klass.startsWith('form') ? `Form ${klass.replace('form','')}` : (klass || '-');
        const mappings = [
            ['studentId', data.applicationNumber || '-'],
            ['studentName', fullName || '-'],
            ['studentClass', classDisplay],
            ['studentDob', dob],
            ['parentName', data.parentInfo?.guardianName || '-'],
            ['contactNumber', data.contactInfo?.phone || '-'],
            ['studentEmail', data.contactInfo?.email || '-'],
            ['studentAddress', data.contactInfo?.address || '-']
        ];
        mappings.forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        });
    } catch (e) {
        // Silent fallback
    }
}

// Update student profile display
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

// Payment functions
function initiatePayment(feeType, amount) {
  // Navigate to payment section
    showSection('student', 'payment');
    
    // Update navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const paymentNavItem = Array.from(navItems).find(item => 
        item.textContent.toLowerCase().includes('make payment')
    );
    if (paymentNavItem) {
        paymentNavItem.classList.add('active');
    }
    
    // Pre-fill payment form
    const amountInput = document.getElementById('paymentAmount');
    const typeSelect = document.getElementById('paymentType');
    
    if (amountInput) {
        amountInput.value = amount;
    }
    
    if (typeSelect) {
        const feeTypeMap = {
            'tuition-term1': 'Tuition Fees',
            'lab-fees': 'Laboratory Fees',
            'sports-fees': 'Sports & Activities'
        };
        
        const mappedType = feeTypeMap[feeType] || 'Other';
        typeSelect.value = mappedType;
    }
    
    // Scroll to payment form
    const paymentSection = document.getElementById('student-payment');
    if (paymentSection) {
        paymentSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Process payment
function processPayment() {
    const amount = document.getElementById('paymentAmount')?.value;
    const type = document.getElementById('paymentType')?.value;
    const method = document.getElementById('paymentMethod')?.value;
    const reference = document.getElementById('referenceNumber')?.value;
    
    // Validate input
    if (!amount || parseFloat(amount) <= 0) {
        alert('Please enter a valid payment amount');
        return;
    }
    
    if (!type || !method) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Generate payment reference if not provided
    const paymentRef = reference || `PAY${Date.now()}`;
    const studentId = localStorage.getItem('userProfile') ? 
        JSON.parse(localStorage.getItem('userProfile')).studentId : 'Unknown';
    
    // Show payment confirmation
    showPaymentConfirmation(amount, type, method, paymentRef, studentId);

    // Send to backend for admin visibility
    const profile = JSON.parse(localStorage.getItem('userProfile'));
    if (profile && profile.id) {
        fetch(`${API_BASE}/api/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId: profile.id,
                amount: Number(amount),
                type,
                method,
                reference: paymentRef
            })
        }).catch(() => {});
    }
}

// Show payment confirmation with instructions
function showPaymentConfirmation(amount, type, method, paymentRef, studentId) {
    let paymentInstructions = generatePaymentInstructions(method, amount, paymentRef, studentId);
    
    const confirmationMessage = `PAYMENT CONFIRMATION
    
Amount: MK ${parseFloat(amount).toLocaleString()}
Type: ${type}
Method: ${method}
Reference: ${paymentRef}
Student ID: ${studentId}

${paymentInstructions}

IMPORTANT: Keep this reference number safe for your records.
Payment processing may take 24-48 hours to reflect in your account.`;

    showInAppAlert('Payment Confirmation', confirmationMessage);
    
    // Clear the form after successful submission
    clearPaymentForm();
    
    // Record payment attempt in localStorage (for demo purposes)
    recordPaymentAttempt({
        amount: amount,
        type: type,
        method: method,
        reference: paymentRef,
        studentId: studentId,
        timestamp: new Date().toISOString(),
        status: 'pending'
    });
}

// Generate payment instructions based on method
function generatePaymentInstructions(method, amount, paymentRef, studentId) {
    switch(method) {
        case 'Airtel Money':
            return `AIRTEL MONEY PAYMENT INSTRUCTIONS:
1. Dial *150*01# from your Airtel line
2. Select "Pay Bills"
3. Enter Merchant Code: JSS001
4. Enter Amount: MK ${amount}
5. Use Reference: ${paymentRef}
6. Confirm with your PIN`;
            
        case 'TNM Mpamba':
            return `TNM MPAMBA PAYMENT INSTRUCTIONS:
1. Dial *444*1# from your TNM line
2. Select "Pay Bills"
3. Enter Paybill: 150150
4. Enter Amount: MK ${amount}
5. Use Reference: ${studentId}
6. Confirm with your PIN`;
            
        case 'Bank Transfer':
            return `BANK TRANSFER INSTRUCTIONS:
Bank: Standard Bank Malawi
Account Name: J & J Secondary School
Account Number: 9100012345
Branch: Lilongwe City Centre
Reference: ${paymentRef}
Student ID: ${studentId}

Please include your Student ID in the transfer description.`;
            
        case 'Visa Card':
        case 'Mastercard':
            return `CARD PAYMENT INSTRUCTIONS:
You will be redirected to a secure payment gateway.
Have your card details ready:
- Card number
- Expiry date
- CVV code
- Cardholder name

Transaction Reference: ${paymentRef}`;
            
        default:
            return `Please proceed with your payment using the selected method.
Reference: ${paymentRef}`;
    }
}

// Clear payment form
function clearPaymentForm() {
    const form = document.querySelector('.payment-form');
    if (form) {
        const inputs = form.querySelectorAll('input');
        const selects = form.querySelectorAll('select');
        
        inputs.forEach(input => {
            if (input.id !== 'paymentType' && input.id !== 'paymentMethod') {
                input.value = '';
            }
        });
        
        // Reset reference number
        const refInput = document.getElementById('referenceNumber');
        if (refInput) refInput.value = '';
    }
}

// Record payment attempt
function recordPaymentAttempt(paymentData) {
    let payments = JSON.parse(localStorage.getItem('paymentHistory')) || [];
    payments.push(paymentData);
    
    // Keep only last 50 payments
    if (payments.length > 50) {
        payments = payments.slice(-50);
    }
    
    localStorage.setItem('paymentHistory', JSON.stringify(payments));
}

// Get payment history
function getPaymentHistory() {
    const studentId = localStorage.getItem('userProfile') ? 
        JSON.parse(localStorage.getItem('userProfile')).studentId : null;
    
    if (!studentId) return [];
    // Future: fetch from backend if needed
    const allPayments = JSON.parse(localStorage.getItem('paymentHistory')) || [];
    return allPayments.filter(payment => payment.studentId === studentId);
}

// Update fee status after payment
function updateFeeStatus(feeType) {
    const feeItems = document.querySelectorAll('.fee-item');
    feeItems.forEach(item => {
        const title = item.querySelector('h4').textContent;
        if (title.toLowerCase().includes(feeType.toLowerCase())) {
            item.classList.remove('overdue');
            item.style.opacity = '0.7';
            
            const payButton = item.querySelector('.pay-btn');
            if (payButton) {
                payButton.textContent = 'Processing...';
                payButton.disabled = true;
            }
        }
    });
}

// Format currency
function formatCurrency(amount) {
    return `MK ${parseFloat(amount).toLocaleString()}`;
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate phone number (Malawi format)
function validatePhone(phone) {
    const re = /^\+265\s?\d{3}\s?\d{3}\s?\d{3}$/;
    return re.test(phone);
}

// Show payment history (if implementing this feature)
function showPaymentHistory() {
    const history = getPaymentHistory();
    
    if (history.length === 0) {
        showInAppAlert('Payment History', 'No payment history found.');
        return;
    }
    
    let historyText = 'PAYMENT HISTORY:\n\n';
    
    history.slice(-10).forEach((payment, index) => {
        const date = new Date(payment.timestamp).toLocaleDateString();
        historyText += `${index + 1}. ${date} - ${payment.type}\n`;
        historyText += `    Amount: MK ${parseFloat(payment.amount).toLocaleString()}\n`;
        historyText += `    Method: ${payment.method}\n`;
        historyText += `    Reference: ${payment.reference}\n`;
        historyText += `    Status: ${payment.status.toUpperCase()}\n\n`;
    });
    
    showInAppAlert('Payment History', `<pre style="white-space:pre-wrap;">${historyText}</pre>`);
}

// Logout function
function logout() {
    showStudentConfirm('Logout', 'Are you sure you want to logout?').then(ok => {
        if (!ok) return;
        
        // Clear all session data
        localStorage.removeItem('userType');
        localStorage.removeItem('username');
        localStorage.removeItem('userProfile');
        localStorage.removeItem('token');
        
        // Clear session storage as well
        sessionStorage.clear();
        
        // Redirect and prevent back button access
        window.location.replace('login.html');
        
        // Additional security: reload to ensure clean state
        setTimeout(() => {
            window.location.reload();
        }, 100);
    });
}

// Auto-logout functionality (security feature)
let inactivityTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        showStudentConfirm('Stay Logged In', 'You have been inactive for 30 minutes. Stay logged in?').then(ok => {
            if (ok) resetInactivityTimer(); else logout();
        });
    }, 30 * 60 * 1000); // 30 minutes
}

// Initialize inactivity timer
document.addEventListener('click', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
document.addEventListener('mousemove', resetInactivityTimer);

// Start inactivity timer
resetInactivityTimer();

// -------- In-app modals for student --------
function ensureStudentModal() {
    if (document.getElementById('studentModal')) return;
    const modal = document.createElement('div');
    modal.id = 'studentModal';
    modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); align-items:center; justify-content:center; z-index:1000;';
    modal.innerHTML = `
      <div style="background:#fff; max-width:480px; width:92%; border-radius:10px; padding:18px; position:relative;">
        <h3 id="studentModalTitle" style="margin:0 0 8px 0; color:#1e5631;">Modal</h3>
        <div id="studentModalBody" style="margin-bottom:12px;"></div>
        <div id="studentModalActions" style="display:flex; gap:10px; justify-content:flex-end;"></div>
      </div>`;
    document.body.appendChild(modal);
}

function showInAppAlert(title, body) {
    ensureStudentModal();
    const modal = document.getElementById('studentModal');
    document.getElementById('studentModalTitle').textContent = title;
    document.getElementById('studentModalBody').innerHTML = body.replace(/\n/g, '<br>');
    const actions = document.getElementById('studentModalActions');
    actions.innerHTML = '';
    const ok = document.createElement('button'); ok.textContent = 'OK'; ok.className = 'approve-btn';
    ok.onclick = () => { modal.style.display = 'none'; };
    actions.appendChild(ok);
    modal.style.display = 'flex';
}

function showStudentConfirm(title, message) {
    ensureStudentModal();
    return new Promise(resolve => {
        const modal = document.getElementById('studentModal');
        document.getElementById('studentModalTitle').textContent = title;
        document.getElementById('studentModalBody').innerHTML = `<p>${message}</p>`;
        const actions = document.getElementById('studentModalActions');
        actions.innerHTML = '';
        const cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.className = 'reject-btn';
        cancel.onclick = () => { modal.style.display = 'none'; resolve(false); };
        const ok = document.createElement('button'); ok.textContent = 'OK'; ok.className = 'approve-btn';
        ok.onclick = () => { modal.style.display = 'none'; resolve(true); };
        actions.appendChild(cancel); actions.appendChild(ok);
        modal.style.display = 'flex';
    });
}

function showPasswordResetModal(userId) {
    ensureStudentModal();
    const modal = document.getElementById('studentModal');
    document.getElementById('studentModalTitle').textContent = 'Set New Password';
    document.getElementById('studentModalBody').innerHTML = `
      <label style="display:block; margin-bottom:6px;">Enter a new password (min 6 chars)</label>
      <input id="studentNewPassword" type="password" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;" />`;
    const actions = document.getElementById('studentModalActions');
    actions.innerHTML = '';
    const submit = document.createElement('button'); submit.textContent = 'Submit'; submit.className = 'approve-btn';
    submit.onclick = () => {
        const newPass = document.getElementById('studentNewPassword').value;
        if (!newPass || newPass.length < 6) {
            showInAppAlert('Error', 'Password must be at least 6 characters.');
            return;
        }
        fetch(`${API_BASE}/api/change-password`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId, newPassword: newPass })
        })
        .then(r => { if (!r.ok) throw new Error('Failed to set new password'); return r.json(); })
        .then(() => {
            modal.style.display = 'none';
            showInAppAlert('Success', 'Password updated. Please login again with your new password.');
        })
        .catch(err => showInAppAlert('Error', err.message));
    };
    const cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.className = 'reject-btn';
    cancel.onclick = () => { modal.style.display = 'none'; };
    actions.appendChild(cancel); actions.appendChild(submit);
    modal.style.display = 'flex';
}