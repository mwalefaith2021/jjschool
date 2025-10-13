
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
// Configure CORS to allow Netlify frontend and local dev.
const allowedOriginsList = (process.env.ALLOWED_ORIGINS || 'http://localhost:8000,http://127.0.0.1:8000,https://jjsecondaryschool.netlify.app')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl) or same-origin
        if (!origin) return callback(null, true);
        // Allow exact matches from list
        if (allowedOriginsList.includes(origin)) return callback(null, true);
        // Allow any Netlify app domain
        if (/^https?:\/\/[a-z0-9-]+\.netlify\.app$/i.test(origin)) return callback(null, true);
        // Allow custom domain via wildcard env VAR ALLOW_REGEX (optional)
        try {
            if (process.env.ALLOW_ORIGIN_REGEX) {
                const re = new RegExp(process.env.ALLOW_ORIGIN_REGEX, 'i');
                if (re.test(origin)) return callback(null, true);
            }
        } catch {}
        callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization']
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

    // Ensure there is at least one admin user
    try {
        const admins = await User.countDocuments({ role: 'admin' });
        if (admins === 0) {
            const defaultAdmin = new User({
                username: process.env.ADMIN_USERNAME || 'admin',
                password: process.env.ADMIN_PASSWORD || 'Admin@123',
                email: process.env.ADMIN_EMAIL || 'admin@example.com',
                fullName: process.env.ADMIN_FULLNAME || 'System Administrator',
                role: 'admin',
                requiresPasswordReset: true
            });
            await defaultAdmin.save();
            console.log('👑 Default admin user created');
            console.log('   Username:', defaultAdmin.username);
            console.log('   Temp Password:', process.env.ADMIN_PASSWORD ? '[from ENV]' : 'Admin@123');
            console.log('   Email:', defaultAdmin.email);
            console.log('   Note: requiresPasswordReset=true. Admin will be prompted to set a new password on first login.');
        }
    } catch (e) {
        console.warn('Could not ensure default admin exists:', e.message);
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
