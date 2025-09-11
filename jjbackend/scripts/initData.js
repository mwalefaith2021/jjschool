const mongoose = require('mongoose');
const User = require('../models/User');
const Admission = require('../models/Admission');

// Connect to MongoDB
const mongoURL = process.env.MONGODB_URL || 'mongodb+srv://mwalefaith:Faith200203@jjsec.jyx5jvn.mongodb.net/?retryWrites=true&w=majority&appName=JJSEC';

async function initData() {
    try {
        await mongoose.connect(mongoURL);
        console.log('Connected to MongoDB');

        console.log('No seed data created.');

    } catch (error) {
        console.error('Error initializing data:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

// Run the initialization
initData();
