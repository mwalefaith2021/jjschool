const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Define the Admission Application Schema
const applicationSchema = new mongoose.Schema({
    personalInfo: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        dateOfBirth: { type: Date, required: true },
        gender: { type: String, required: true },
        nationality: { type: String, required: true }
    },
    contactInfo: {
        address: { type: String, required: true },
        phone: { type: String },
        email: { type: String, required: true }
    },
    academicInfo: {
        applyingFor: { type: String, required: true },
        academicYear: { type: String, required: true },
        previousSchool: { type: String, required: true }
    },
    parentInfo: {
        guardianName: { type: String, required: true },
        relationship: { type: String, required: true },
        guardianPhone: { type: String, required: true },
        guardianEmail: { type: String }
    },
    medicalInfo: {
        allergies: { type: String },
        emergencyContact: { type: String, required: true }
    },
    paymentInfo: {
        paymentMethod: { type: [String] },
        reference: { type: String, required: true }
    },
    dateSubmitted: {
        type: Date,
        default: Date.now
    }
});

const Application = mongoose.model('Application', applicationSchema);

// POST route to handle application form submission
router.post('/submit-application', async (req, res) => {
    try {
        const newApplication = new Application({
            personalInfo: {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                dateOfBirth: req.body.dateOfBirth,
                gender: req.body.gender,
                nationality: req.body.nationality
            },
            contactInfo: {
                address: req.body.address,
                phone: req.body.phone,
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
                guardianEmail: req.body.guardianEmail
            },
            medicalInfo: {
                allergies: req.body.allergies,
                emergencyContact: req.body.emergencyContact
            },
            paymentInfo: {
                paymentMethod: req.body.paymentMethod,
                reference: req.body.reference
            }
        });

        await newApplication.save();
        res.status(201).json({ message: 'Application submitted successfully!' });
    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});



module.exports = router;