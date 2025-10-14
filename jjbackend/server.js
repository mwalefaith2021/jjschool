
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
const { verifyTransporter, getMailerInfo } = require('./modules/mailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Configure CORS to allow Netlify frontend and local dev.
const allowedOriginsList = (process.env.ALLOWED_ORIGINS || 'http://localhost:8000,http://127.0.0.1:8000,http://172.20.10.2:8000,https://jjsecondaryschool.netlify.app')
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
        // Allow local network IPs (192.168.x.x, 172.x.x.x, 10.x.x.x)
        if (/^https?:\/\/(192\.168\.|172\.|10\.)\d+\.\d+\.\d+:\d+$/i.test(origin)) return callback(null, true);
        // Allow custom domain via wildcard env VAR ALLOW_REGEX (optional)
        try {
            if (process.env.ALLOW_ORIGIN_REGEX) {
                const re = new RegExp(process.env.ALLOW_ORIGIN_REGEX, 'i');
                if (re.test(origin)) return callback(null, true);
            }
        } catch {}
        console.log('CORS blocked origin:', origin);
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
const mongoURL = process.env.MONGODB_URL || 'mongodb+srv://mwalefaith:Faith200203@jjsec.jyx5jvn.mongodb.net/JJSEC?retryWrites=true&w=majority&appName=JJSEC';

async function connectToDatabase() {
    try {
        await mongoose.connect(mongoURL);
        console.log('✅ Successfully connected to MongoDB!');
        console.log('   DB name:', mongoose.connection.name);
        console.log('   Host:', mongoose.connection.host);
        console.log('   Connection string DB:', mongoURL.split('/').pop().split('?')[0]);
    } catch (err) {
        console.error('❌ Error connecting to MongoDB:', err);
        process.exit(1);
    }
}

// Health check endpoint
app.get('/health', async (req, res) => {
    const mailOk = await verifyTransporter();
    res.status(200).json({ 
        status: 'OK', 
        message: 'J & J Secondary School API is running',
        timestamp: new Date().toISOString(),
        db: { name: mongoose.connection?.name, readyState: mongoose.connection?.readyState },
        mail: { configured: mailOk }
    });
});

// Email health endpoint
app.get('/email-health', async (req, res) => {
    try {
        const ok = await verifyTransporter();
        res.status(ok ? 200 : 500).json({ ok, info: getMailerInfo() });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message, info: getMailerInfo() });
    }
});

// Test email endpoint - sends a real test email
app.post('/test-email', async (req, res) => {
    try {
        const { sendEmailAsync } = require('./modules/mailer');
        const testEmail = req.body.to || process.env.EMAIL_USER || 'test@example.com';
        const ok = await verifyTransporter();
        if (!ok) {
            return res.status(500).json({ 
                ok: false, 
                message: 'Email transport verification failed', 
                info: getMailerInfo() 
            });
        }
        const sent = await sendEmailAsync(
            testEmail,
            'Test Email from J & J School API',
            `<h3>Test Email</h3>
             <p>This is a test email sent at ${new Date().toISOString()}</p>
             <p>If you received this, your email configuration is working correctly!</p>`
        );
        res.status(sent ? 200 : 500).json({ 
            ok: sent, 
            message: sent ? 'Test email sent successfully' : 'Failed to send test email',
            to: testEmail,
            info: getMailerInfo()
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Admin seed status (diagnostic)
app.get('/admin-seed-status', async (req, res) => {
    try {
        const count = await User.countDocuments({ role: 'admin' });
        const sample = await User.findOne({ role: 'admin' }).select('username email isActive createdAt');
        res.status(200).json({ db: mongoose.connection?.name, admins: { count, sample } });
    } catch (e) {
        res.status(500).json({ message: 'Error checking admin status' });
    }
});

// API Routes
app.use('/api', applicationRouter);
app.use('/api', loginRouter);
app.use('/api', studentsRouter);
app.use('/api', feesRouter);
app.use('/api', signupsRouter);
app.use('/api', paymentsRouter);
app.use('/api', usersRouter);

// Simple API index for human-friendly discovery
app.get('/api', (req, res) => {
    res.status(200).json({
        message: 'J & J Secondary School API',
        timestamp: new Date().toISOString(),
        health: ['/health', '/email-health', '/admin-seed-status'],
        endpoints: [
            // Auth
            'POST /api/login',
            'POST /api/register',
            'POST /api/logout',
            'GET /api/verify',
            'POST /api/change-password',
            // Admissions / Applications
            'POST /api/submit-application',
            'GET /api/applications',
            'GET /api/applications/:id',
            'PUT /api/applications/:id/status',
            'GET /api/applications-stats',
            // Students
            'GET /api/students',
            'GET /api/students/:id',
            'GET /api/students/:id/application',
            'PUT /api/students/:id',
            'DELETE /api/students/:id',
            'GET /api/students-stats',
            // Fees
            'GET /api/fees',
            'GET /api/fees/student/:studentId',
            'POST /api/fees',
            'PUT /api/fees/:id/payment',
            'GET /api/fees-stats',
            // Payments
            'POST /api/payments',
            'GET /api/payments',
            'PUT /api/payments/:id/status',
            // Pending signups
            'GET /api/pending-signups',
            'POST /api/pending-signups/:id/approve',
            'POST /api/pending-signups/:id/reject',
            // Users (admin)
            'POST /api/users/:id/reset-password'
        ]
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        message: 'API endpoint not found',
        hint: 'Visit GET /api for a full list of endpoints',
        availableEndpoints: [
            // Health
            'GET /health',
            'GET /email-health',
            'GET /admin-seed-status',
            // Auth
            'POST /api/login',
            'POST /api/register',
            'POST /api/logout',
            'GET /api/verify',
            'POST /api/change-password',
            // Admissions / Applications
            'POST /api/submit-application',
            'GET /api/applications',
            'GET /api/applications/:id',
            'PUT /api/applications/:id/status',
            'GET /api/applications-stats',
            // Students
            'GET /api/students',
            'GET /api/students/:id',
            'GET /api/students/:id/application',
            'PUT /api/students/:id',
            'DELETE /api/students/:id',
            'GET /api/students-stats',
            // Fees
            'GET /api/fees',
            'GET /api/fees/student/:studentId',
            'POST /api/fees',
            'PUT /api/fees/:id/payment',
            'GET /api/fees-stats',
            // Payments
            'POST /api/payments',
            'GET /api/payments',
            'PUT /api/payments/:id/status',
            // Pending Signups
            'GET /api/pending-signups',
            'POST /api/pending-signups/:id/approve',
            'POST /api/pending-signups/:id/reject',
            // Users (admin)
            'POST /api/users/:id/reset-password'
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

    // Ensure specific default admin exists
    try {
        const defaultUsername = process.env.ADMIN_USERNAME || 'admin@jjmw';
        const defaultPassword = process.env.ADMIN_PASSWORD || 'adminPass1';
        const defaultEmail = process.env.ADMIN_EMAIL || 'admin@jjmw.local';
        const defaultFullName = process.env.ADMIN_FULLNAME || 'System Administrator';

        console.log(`🔍 Checking for admin in database: ${mongoose.connection.name}`);
        let existing = await User.findOne({ username: defaultUsername });
        if (!existing) {
            console.log(`📝 Creating admin user in database: ${mongoose.connection.name}`);
            const defaultAdmin = new User({
                username: defaultUsername,
                password: defaultPassword,
                email: defaultEmail,
                fullName: defaultFullName,
                role: 'admin',
                isActive: true,
                requiresPasswordReset: false
            });
            await defaultAdmin.save();
            console.log('👑 Default admin user created');
            console.log('   Username:', defaultUsername);
            console.log('   Password:', process.env.ADMIN_PASSWORD ? '[from ENV]' : defaultPassword);
            console.log('   Email:', defaultEmail);
            console.log('   Database:', mongoose.connection.name);
        } else {
            console.log('✅ Default admin already exists:', existing.username);
            console.log('   In database:', mongoose.connection.name);
        }
        
        // Verify admin count
        const adminCount = await User.countDocuments({ role: 'admin' });
        console.log(`📊 Total admin users in ${mongoose.connection.name}: ${adminCount}`);
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
