const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');
const PendingSignup = require('../models/PendingSignup');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendEmail(to, subject, html) {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('Email creds missing; skipping email send.');
            return;
        }
        await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
    } catch (err) {
        console.error('Email send error:', err.message);
    }
}

// Validation middleware for admission form
const validateAdmission = [
    body('firstName').notEmpty().withMessage('First name is required'),
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
router.post('/submit-application', validateAdmission, async (req, res) => {
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

        // Email confirmation to applicant
        await sendEmail(
            req.body.email,
            'Application Received - J & J Secondary School',
            `<p>Dear ${req.body.firstName} ${req.body.lastName},</p>
             <p>Your application (<b>${savedAdmission.applicationNumber}</b>) has been received and is under review.</p>
             <p>We will notify you once a decision is made.</p>
             <p>Regards,<br/>Admissions Office</p>`
        );

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
        // Notify applicant depending on status
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

            await sendEmail(
                application.contactInfo.email,
                'Application Approved - Next Steps',
                `<p>Congratulations ${application.personalInfo.firstName},</p>
                 <p>Your application (<b>${application.applicationNumber}</b>) has been approved.</p>
                 <p>Temporary login OTP: <b>${otp}</b> (valid for 30 minutes). You will receive access once admin finalizes signup.</p>
                 <p>Regards,<br/>Admissions Office</p>`
            );
        } else if (status === 'rejected') {
            await sendEmail(
                application.contactInfo.email,
                'Application Decision - J & J Secondary School',
                `<p>Dear ${application.personalInfo.firstName},</p>
                 <p>We regret to inform you your application (<b>${application.applicationNumber}</b>) was not successful.</p>
                 <p>${adminNotes ? 'Notes: ' + adminNotes : ''}</p>
                 <p>Regards,<br/>Admissions Office</p>`
            );
        } else {
            await sendEmail(
                application.contactInfo.email,
                'Application Update - J & J Secondary School',
                `<p>Your application (<b>${application.applicationNumber}</b>) status changed to <b>${status}</b>.</p>`
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