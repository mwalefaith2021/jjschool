// Student Dashboard JavaScript

// This function is now in the global scope to be accessible from the login page.
function loginStudentUser(username, password) {
    // Retrieve student data from localStorage
    const studentData = JSON.parse(localStorage.getItem('studentData')) || {};
    const student = studentData[username];

    // Check if the student exists and the password is correct
    if (student && student.password === password) {
        // Save login info to localStorage
        localStorage.setItem("userType", "student");
        localStorage.setItem("username", username);
        localStorage.setItem("userProfile", JSON.stringify(student.profile));

        // Redirect to dashboard
        window.location.href = "studentdashboard.html";
    } else {
        alert("Invalid student credentials");
    }
}

// All other functions are related to the student dashboard and should be called from there.
document.addEventListener("DOMContentLoaded", function () {
    // This is for code that should only run once the DOM is fully loaded on the student dashboard page.
    console.log('Student Dashboard scripts initialized');
    
    // Check authentication on dashboard page load
    if (document.body.classList.contains('student-dashboard-page')) {
      if (!checkAuth()) {
          return;
      }
      initializeStudentDashboard();
      loadUserProfile();
      
      const paymentForm = document.getElementById("paymentForm");
      if (paymentForm) {
          paymentForm.addEventListener("submit", function (e) {
              e.preventDefault();
              processPayment();
          });
      }
    }
});

// Authentication check
function checkAuth() {
    const userType = localStorage.getItem('userType');
    const username = localStorage.getItem('username');
    
    if (!userType || !username || userType !== 'student') {
        alert('Access denied. Please login as student.');
        window.location.href = 'login.html';
        return false;
    }
    return true;
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

    alert(confirmationMessage);
    
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
        alert('No payment history found.');
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
    
    alert(historyText);
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

// Auto-logout functionality (security feature)
let inactivityTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (confirm('You have been inactive for 30 minutes. Do you want to stay logged in?')) {
            resetInactivityTimer();
        } else {
            logout();
        }
    }, 30 * 60 * 1000); // 30 minutes
}

// Initialize inactivity timer
document.addEventListener('click', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
document.addEventListener('mousemove', resetInactivityTimer);

// Start inactivity timer
resetInactivityTimer();