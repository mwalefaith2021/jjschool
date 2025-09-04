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

        // Show/Hide forms
        function showSignupForm() {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('signupForm').classList.add('active');
        }

        function showLoginForm() {
            document.getElementById('signupForm').classList.remove('active');
            document.getElementById('loginForm').classList.remove('hidden');
        }

        // Login functionality
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const userType = document.getElementById('userType').value;
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (!userType) {
                alert('Please select a user type');
                return;
            }
            
            if (userType === 'student') {
                if (studentData[username] && studentData[username].password === password) {
                    showDashboard('student');
                    loadStudentData(username);
                } else {
                    alert('Invalid credentials. Please check your username and password.');
                }
            } else if (userType === 'admin') {
                if (adminData[username] && adminData[username].password === password) {
                    showDashboard('admin');
                    displayPendingSignups();
                } else {
                    alert('Invalid admin credentials. Please check your username and password.');
                }
            }
        });

        // Signup functionality
        document.getElementById('signupForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const username = document.getElementById('desiredUsername').value;
            const password = document.getElementById('signupPassword').value;
            const grade = document.getElementById('grade').value;
            
            // Create signup object
            const signup = {
                id: 'SIGNUP' + Date.now(),
                fullName: fullName,
                email: email,
                phone: phone,
                desiredUsername: username,
                password: password,
                grade: grade,
                applicationDate: new Date().toLocaleDateString(),
                status: 'pending'
            };
            
            // Add to pending signups
            pendingSignups.push(signup);
            
            // Reset form and show success message
            document.getElementById('signupForm').reset();
            alert('Account application submitted successfully! Your application will be reviewed by the administrator. You will be notified once approved.');
            
            // Switch back to login form
            showLoginForm();
        });

        function showDashboard(userType) {
            document.getElementById('authPage').style.display = 'none';
            if (userType === 'student') {
                document.getElementById('studentDashboard').classList.add('active');
            } else if (userType === 'admin') {
                document.getElementById('adminDashboard').classList.add('active');
            }
        }

        function loadStudentData(username) {
            const student = studentData[username];
            if (student) {
                document.getElementById('studentId').textContent = student.profile.studentId;
                document.getElementById('studentName').textContent = student.profile.name;
                document.getElementById('studentClass').textContent = student.profile.class;
                document.getElementById('studentDob').textContent = student.profile.dob;
                document.getElementById('parentName').textContent = student.profile.parent;
                document.getElementById('contactNumber').textContent = student.profile.contact;
                document.getElementById('studentEmail').textContent = student.profile.email;
                document.getElementById('studentAddress').textContent = student.profile.address;
            }
        }

        function displayPendingSignups() {
            const signupsList = document.getElementById('signupsList');
            
            if (pendingSignups.length === 0) {
                signupsList.innerHTML = '<p style="color: #4a7c59; font-style: italic;">No pending account signups.</p>';
                return;
            }
            
            let html = '';
            pendingSignups.forEach(signup => {
                if (signup.status === 'pending') {
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
                }
            });
            
            signupsList.innerHTML = html;
        }

        function approveSignup(signupId) {
            const signup = pendingSignups.find(s => s.id === signupId);
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
                    
                    alert(`Account approved for ${signup.fullName}. Login credentials:\nUsername: ${signup.desiredUsername}\nPassword: ${signup.password}`);
                    displayPendingSignups();
                }
            }
        }

        function rejectSignup(signupId) {
            const signup = pendingSignups.find(s => s.id === signupId);
            if (signup) {
                const reason = prompt(`Reason for rejecting ${signup.fullName}'s application:`);
                if (reason) {
                    signup.status = 'rejected';
                    signup.rejectionReason = reason;
                    alert(`Account application rejected for ${signup.fullName}. Reason: ${reason}`);
                    displayPendingSignups();
                }
            }
        }

        function logout() {
            document.getElementById('authPage').style.display = 'flex';
            document.getElementById('studentDashboard').classList.remove('active');
            document.getElementById('adminDashboard').classList.remove('active');
            document.getElementById('loginForm').reset();
            showLoginForm();
        }

        function showSection(userType, sectionName) {
            // Remove active class from all nav items
            const navItems = document.querySelectorAll(`#${userType}Dashboard .nav-item`);
            navItems.forEach(item => item.classList.remove('active'));
            
            // Add active class to clicked nav item
            event.target.classList.add('active');
            
            // Hide all content sections
            const sections = document.querySelectorAll(`#${userType}Dashboard .content-section`);
            sections.forEach(section => section.classList.remove('active'));
            
            // Show selected section
            document.getElementById(`${userType}-${sectionName}`).classList.add('active');
            
            // If showing signups section, refresh the list
            if (sectionName === 'signups') {
                displayPendingSignups();
            }
        }

        function initiatePayment(feeType, amount) {
            const paymentSection = document.getElementById('student-payment');
            paymentSection.classList.add('active');
            
            // Hide other sections
            document.querySelectorAll('#studentDashboard .content-section').forEach(section => {
                if (section.id !== 'student-payment') {
                    section.classList.remove('active');
                }
            });
            
            // Update nav
            document.querySelectorAll('#studentDashboard .nav-item').forEach(item => item.classList.remove('active'));
            document.querySelectorAll('#studentDashboard .nav-item')[2].classList.add('active');
            
            // Pre-fill payment form
            document.getElementById('paymentAmount').value = amount;
        }

        function processPayment() {
            const amount = document.getElementById('paymentAmount').value;
            const type = document.getElementById('paymentType').value;
            const method = document.getElementById('paymentMethod').value;
            const reference = document.getElementById('referenceNumber').value;
            
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
            
            alert(`Payment Details:
Amount: P ${amount}
Type: ${type}
Method: ${method}
Reference: ${paymentRef}

Payment submitted successfully! You will receive a confirmation email shortly.`);
            
            // Clear the form
            document.getElementById('paymentAmount').value = '';
            document.getElementById('referenceNumber').value = '';
        }

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
                if (idCell.textContent === applicationId) {
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

        // Add some sample pending signups for demonstration with Malawi details
        setTimeout(() => {
            pendingSignups.push({
                id: 'SIGNUP001',
                fullName: 'Alice Johnson',
                email: 'alice.johnson@email.com',
                phone: '+265 999 876 543',
                desiredUsername: 'alice.johnson',
                password: 'alice123',
                grade: '9',
                applicationDate: '26/08/2025',
                status: 'pending'
            });
            
            pendingSignups.push({
                id: 'SIGNUP002',
                fullName: 'Bob Wilson',
                email: 'bob.wilson@email.com',
                phone: '+265 888 765 432',
                desiredUsername: 'bob.wilson',
                password: 'bob123',
                grade: '11',
                applicationDate: '25/08/2025',
                status: 'pending'
            });
        }, 1000);

        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
            console.log('J Secondary School Portal initialized');
        });

        // Utility functions
        function formatCurrency(amount) {
            return `P ${amount.toLocaleString()}`;
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

        // Update contact information to reflect Malawi
        function loadStudentData(username) {
            const student = studentData[username];
            if (student) {
                document.getElementById('studentId').textContent = student.profile.studentId;
                document.getElementById('studentName').textContent = student.profile.name;
                document.getElementById('studentClass').textContent = student.profile.class;
                document.getElementById('studentDob').textContent = student.profile.dob;
                document.getElementById('parentName').textContent = student.profile.parent;
                document.getElementById('contactNumber').textContent = student.profile.contact;
                document.getElementById('studentEmail').textContent = student.profile.email;
                document.getElementById('studentAddress').textContent = student.profile.address;
            }
        }