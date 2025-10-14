const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
    // Personal Information
    personalInfo: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        dateOfBirth: { type: Date, required: true },
        gender: { 
            type: String, 
            required: true,
            enum: ['male', 'female']
        },
        nationality: { type: String, required: true }
    },
    
    // Contact Information
    contactInfo: {
        address: { type: String, required: true },
        phone: { type: String },
        email: { type: String, required: true }
    },
    
    // Academic Information
    academicInfo: {
        applyingFor: { 
            type: String, 
            required: true,
            enum: ['form1', 'form2', 'form3', 'form4']
        },
        academicYear: { type: String, required: true },
        previousSchool: { type: String, required: true }
    },
    
    // Parent/Guardian Information
    parentInfo: {
        guardianName: { type: String, required: true },
        relationship: { 
            type: String, 
            required: true,
            enum: ['father', 'mother', 'guardian', 'other']
        },
        guardianPhone: { type: String, required: true },
        guardianEmail: { type: String },
        occupation: { type: String }
    },
    
    // Medical Information
    medicalInfo: {
        allergies: { type: String },
        emergencyContact: { type: String, required: true }
    },
    
    // Payment Information
    paymentInfo: {
        paymentMethod: [{ type: String }],
        reference: { type: String, required: true }
    },
    
    // Application Status
    status: {
        type: String,
        enum: ['pending', 'under_review', 'accepted', 'rejected'],
        default: 'pending'
    },
    
    // Timestamps
    dateSubmitted: {
        type: Date,
        default: Date.now
    },
    
    // Additional fields
    applicationNumber: {
        type: String
    },
    
    // Admin notes
    adminNotes: { type: String },
    reviewedBy: { type: String },
    reviewedAt: { type: Date }
}, {
    timestamps: true
});

// Generate sequential application number before saving
admissionSchema.pre('save', async function(next) {
    try {
        if (this.applicationNumber) return next();
        const Counter = require('./Counter');
        const year = new Date().getFullYear();
        const key = `application_${year}`;
        const doc = await Counter.findOneAndUpdate(
            { key },
            { $inc: { seq: 1 } },
            { upsert: true, new: true }
        );
        const seq = doc.seq;
        // Pad to at least two digits, e.g., 01, 02, ... 10, 11
        const padded = String(seq).padStart(2, '0');
        // Use a simple numeric reference as requested (e.g., 01, 02). If you prefer to include year, change to `${year}${padded}`.
        this.applicationNumber = padded;
        next();
    } catch (e) {
        next(e);
    }
});

module.exports = mongoose.model('Admission', admissionSchema);
