const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');
const PendingSignup = require('../models/PendingSignup');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { sendEmailAsync, verifyTransporter, createEmailTemplate } = require('../modules/mailer');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Validation middleware for admission form
const validateAdmission = [
    body('firstName').notEmpty().withMessage('First name is required.'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
    body('gender').isIn(['male', 'female']).withMessage('Valid gender is required'),
    body('nationality').notEmpty().withMessage('Nationality is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('applyingFor').isIn(['form1', 'form2', 'form3', 'form4']).withMessage('Valid form selection is required'),
    body('academicYear').notEmpty().withMessage('Academic year is required'),
    body('previousSchool').notEmpty().withMessage('Previous school is required'),
    body('guardianName').notEmpty().withMessage('Guardian name is required'),
    body('relationship').isIn(['father', 'mother', 'guardian', 'other']).withMessage('Valid relationship is required'),
    body('guardianPhone').notEmpty().withMessage('Guardian phone is required'),
    body('emergencyContact').notEmpty().withMessage('Emergency contact is required'),
    body('reference').notEmpty().withMessage('Payment reference is required')
];

// POST route to handle application form submission
router.post('/submit-application', upload.single('attachment'), validateAdmission, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: 'Validation failed', 
                errors: errors.array() 
            });
        }

        // Create new admission application
        const newAdmission = new Admission({
            personalInfo: {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                dateOfBirth: req.body.dateOfBirth,
                gender: req.body.gender,
                nationality: req.body.nationality
            },
            contactInfo: {
                address: req.body.address,
                phone: req.body.phone || '',
                email: req.body.email
            },
            academicInfo: {
                applyingFor: req.body.applyingFor,
                academicYear: req.body.academicYear,
                previousSchool: req.body.previousSchool
            },
            parentInfo: {
                guardianName: req.body.guardianName,
                relationship: req.body.relationship,
                guardianPhone: req.body.guardianPhone,
                guardianEmail: req.body.guardianEmail || '',
                occupation: req.body.occupation || ''
            },
            medicalInfo: {
                allergies: req.body.allergies || '',
                emergencyContact: req.body.emergencyContact
            },
            paymentInfo: {
                paymentMethod: req.body.paymentMethod || [],
                reference: req.body.reference
            }
        });

    const savedAdmission = await newAdmission.save();

        // Send confirmation email to applicant with enhanced template
        const emailContent = `
            <h2>Application Received Successfully!</h2>
            <p>Dear <strong>${req.body.firstName} ${req.body.lastName}</strong>,</p>
            <p>Thank you for applying to J & J Secondary School. We have successfully received your application.</p>
            <div class="highlight">
                <p><strong>Application Number:</strong> ${savedAdmission.applicationNumber}</p>
                <p><strong>Submitted on:</strong> ${new Date(savedAdmission.dateSubmitted).toLocaleString()}</p>
                <p><strong>Applying for:</strong> ${req.body.applyingFor}</p>
            </div>
            <p>Your application is now under review by our admissions team. We will notify you via this email address (<strong>${req.body.email}</strong>) once a decision has been made.</p>
            <p><strong>Important:</strong> Please keep your application number for future reference and correspondence.</p>
            <p>If you have any questions, please don't hesitate to contact our admissions office.</p>
            <p>Best regards,<br/><strong>Admissions Office</strong><br/>J & J Secondary School</p>
        `;
        
        sendEmailAsync(
            req.body.email,
            `Application Received - ${savedAdmission.applicationNumber}`,
            createEmailTemplate(emailContent)
        );

        // If an attachment was uploaded, forward it to the school inbox with a short notice
        if (req.file) {
            const schoolInbox = process.env.GMAIL_SENDER || 'jandjschool.developer@gmail.com';
            const notifyHtml = createEmailTemplate(`
                <h2>New Application Submitted</h2>
                <p>An applicant has uploaded a document with their application.</p>
                <div class="highlight">
                    <p><strong>Applicant:</strong> ${req.body.firstName} ${req.body.lastName}</p>
                    <p><strong>Application Number:</strong> ${savedAdmission.applicationNumber}</p>
                    <p><strong>Email:</strong> ${req.body.email}</p>
                    <p><strong>Uploaded file:</strong> ${req.file.originalname}</p>
                </div>
                <p>The uploaded file is attached to this email.</p>
            `);
            await sendEmailAsync(
                schoolInbox,
                `New Application Attachment - ${savedAdmission.applicationNumber}`,
                notifyHtml,
                {
                    attachments: [
                        {
                            filename: req.file.originalname || 'attachment',
                            content: req.file.buffer,
                            contentType: req.file.mimetype
                        }
                    ]
                }
            );
        }

        res.status(201).json({ 
            message: 'Application submitted successfully!',
            applicationNumber: savedAdmission.applicationNumber,
            data: {
                id: savedAdmission._id,
                applicationNumber: savedAdmission.applicationNumber,
                status: savedAdmission.status,
                dateSubmitted: savedAdmission.dateSubmitted
            }
        });
    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// GET route to fetch all applications (for admin)
router.get('/applications', async (req, res) => {
    try {
        const applications = await Admission.find()
            .sort({ dateSubmitted: -1 })
            .select('-__v');
        
        res.status(200).json({
            message: 'Applications retrieved successfully',
            count: applications.length,
            data: applications
        });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// GET route to fetch a specific application by ID
router.get('/applications/:id', async (req, res) => {
    try {
        const application = await Admission.findById(req.params.id);
        
        if (!application) {
            return res.status(404).json({ 
                message: 'Application not found' 
            });
        }
        
        res.status(200).json({
            message: 'Application retrieved successfully',
            data: application
        });
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// PUT route to update application status (for admin)
router.put('/applications/:id/status', async (req, res) => {
    try {
        const { status, adminNotes, reviewedBy } = req.body;
        
        const validStatuses = ['pending', 'under_review', 'accepted', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
            });
        }
        
        const application = await Admission.findByIdAndUpdate(
            req.params.id,
            { 
                status,
                adminNotes: adminNotes || '',
                reviewedBy: reviewedBy || '',
                reviewedAt: new Date()
            },
            { new: true }
        );
        
        if (!application) {
            return res.status(404).json({ 
                message: 'Application not found' 
            });
        }
    // Notify applicant depending on status (non-blocking)
        if (status === 'accepted') {
            // Create PendingSignup entry
            const desiredUsername = `${application.personalInfo.firstName}.${application.personalInfo.lastName}`.toLowerCase();
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

            await PendingSignup.create({
                applicationId: application._id,
                email: application.contactInfo.email,
                fullName: `${application.personalInfo.firstName} ${application.personalInfo.lastName}`,
                desiredUsername,
                otp,
                otpExpiresAt: expires,
                status: 'pending'
            });

            const acceptedEmailContent = `
                <h2>🎉 Congratulations! Your Application Has Been Approved</h2>
                <p>Dear <strong>${application.personalInfo.firstName} ${application.personalInfo.lastName}</strong>,</p>
                <p>We are delighted to inform you that your application to J & J Secondary School has been <strong>approved</strong>!</p>
                <div class="highlight">
                    <p><strong>Application Number:</strong> ${application.applicationNumber}</p>
                    <p><strong>Status:</strong> Accepted ✅</p>
                    <p><strong>Next Step:</strong> Account Activation</p>
                </div>
                <h3>Your Login Credentials</h3>
                <p>Your student portal account is being prepared. You will receive your final login credentials once the administrator completes the account setup process.</p>
                <p><strong>What happens next?</strong></p>
                <ul>
                    <li>Our administrator will finalize your account setup</li>
                    <li>You will receive an email with your final login credentials</li>
                    <li>You can then access the student portal to view fees, schedules, and more</li>
                </ul>
                <p>Welcome to the J & J Secondary School family! We look forward to your academic journey with us.</p>
                <p>Best regards,<br/><strong>Admissions Office</strong><br/>J & J Secondary School</p>
            `;
            
            sendEmailAsync(
                application.contactInfo.email,
                `🎉 Application Approved - ${application.applicationNumber}`,
                createEmailTemplate(acceptedEmailContent)
            );
        } else if (status === 'rejected') {
            const rejectedEmailContent = `
                <h2>Application Decision Update</h2>
                <p>Dear <strong>${application.personalInfo.firstName} ${application.personalInfo.lastName}</strong>,</p>
                <p>Thank you for your interest in J & J Secondary School and for taking the time to complete the application process.</p>
                <div class="highlight">
                    <p><strong>Application Number:</strong> ${application.applicationNumber}</p>
                    <p><strong>Status:</strong> Not Approved</p>
                </div>
                <p>After careful consideration, we regret to inform you that we are unable to offer you admission at this time.</p>
                ${adminNotes ? `<p><strong>Additional Information:</strong><br/>${adminNotes}</p>` : ''}
                <p>We understand this news may be disappointing. Please know that this decision does not reflect on your potential as a student.</p>
                <p>We wish you all the best in your future academic endeavors and encourage you to consider reapplying in the future.</p>
                <p>If you have any questions, please feel free to contact our admissions office.</p>
                <p>Best regards,<br/><strong>Admissions Office</strong><br/>J & J Secondary School</p>
            `;
            
            sendEmailAsync(
                application.contactInfo.email,
                `Application Decision - ${application.applicationNumber}`,
                createEmailTemplate(rejectedEmailContent)
            );
        } else {
            const updateEmailContent = `
                <h2>Application Status Update</h2>
                <p>Dear <strong>${application.personalInfo.firstName} ${application.personalInfo.lastName}</strong>,</p>
                <p>This is to notify you that your application status has been updated.</p>
                <div class="highlight">
                    <p><strong>Application Number:</strong> ${application.applicationNumber}</p>
                    <p><strong>New Status:</strong> ${status}</p>
                    <p><strong>Updated on:</strong> ${new Date().toLocaleString()}</p>
                </div>
                <p>Your application is still being processed. We will keep you informed of any further updates.</p>
                <p>Best regards,<br/><strong>Admissions Office</strong><br/>J & J Secondary School</p>
            `;
            
            sendEmailAsync(
                application.contactInfo.email,
                `Application Update - ${application.applicationNumber}`,
                createEmailTemplate(updateEmailContent)
            );
        }

        res.status(200).json({
            message: 'Application status updated successfully',
            data: application
        });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// GET route to get application statistics (for admin dashboard)
router.get('/applications-stats', async (req, res) => {
    try {
        const stats = await Admission.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const totalApplications = await Admission.countDocuments();
        
        res.status(200).json({
            message: 'Statistics retrieved successfully',
            data: {
                total: totalApplications,
                byStatus: stats
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

module.exports = router;