
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import routes
const applicationRouter = require('./routes/application');
const loginRouter = require('./routes/login');
const studentsRouter = require('./routes/students');
const feesRouter = require('./routes/fees');
const signupsRouter = require('./routes/signups');
const paymentsRouter = require('./routes/payments');
const usersRouter = require('./routes/users');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: ['http://localhost:8000', 'http://127.0.0.1:8000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// Connect to MongoDB
const mongoURL = process.env.MONGODB_URL || 'mongodb+srv://mwalefaith:Faith200203@jjsec.jyx5jvn.mongodb.net/?retryWrites=true&w=majority&appName=JJSEC';

async function connectToDatabase() {
    try {
        await mongoose.connect(mongoURL);
        console.log('✅ Successfully connected to MongoDB!');
    } catch (err) {
        console.error('❌ Error connecting to MongoDB:', err);
        process.exit(1);
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'J & J Secondary School API is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api', applicationRouter);
app.use('/api', loginRouter);
app.use('/api', studentsRouter);
app.use('/api', feesRouter);
app.use('/api', signupsRouter);
app.use('/api', paymentsRouter);
app.use('/api', usersRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        message: 'API endpoint not found',
        availableEndpoints: [
            'GET /health',
            'POST /api/submit-application',
            'GET /api/applications',
            'POST /api/login',
            'POST /api/register',
            'GET /api/students',
            'GET /api/fees'
        ]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        message: 'Internal server error',
        error: err.message
    });
});

// Connect to database and start server
connectToDatabase().then(async () => {
    // Remove sample student if exists
    try {
        const result = await User.deleteOne({ username: 'josh.doe' });
        if (result.deletedCount) {
            console.log('🧹 Removed sample student user josh.doe');
        }
    } catch (e) {
        console.warn('Could not remove sample student:', e.message);
    }
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`📝 API Documentation: http://localhost:${PORT}/api`);
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await mongoose.connection.close();
    process.exit(0);
});
