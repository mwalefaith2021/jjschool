const mongoose = require('mongoose');

const pendingSignupSchema = new mongoose.Schema({
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true },
    email: { type: String, required: true, index: true },
    fullName: { type: String, required: true },
    desiredUsername: { type: String, required: true },
    otp: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('PendingSignup', pendingSignupSchema);


