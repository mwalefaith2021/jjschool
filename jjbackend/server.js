const mongoose = require('mongoose');
const mongoURL ='mongodb+srv://mwalefaith:Faith200203@jjsec.jyx5jvn.mongodb.net/?retryWrites=true&w=majority&appName=JJSEC';

async function connectToDatabase() {
  try {require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const applicationRouter = require('./routes/application'); // Import the new router
const cors = require('cors'); // Import cors to handle cross-origin requests

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // For parsing application/json
app.use(cors()); // Allow cross-origin requests from your frontend

// Connect to MongoDB
const mongoURL = process.env.MONGODB_URL;

async function connectToDatabase() {
    try {
        await mongoose.connect(mongoURL);
        console.log('Successfully connected to MongoDB!');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }
}

// Connect and then start the server
connectToDatabase().then(() => {
    // Routes
    app.use('/api', applicationRouter); // Use the new application router for /api routes

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});
  
    await mongoose.connect(mongoURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Successfully connected to MongoDB!');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1); // Exit with a non-zero status code to indicate an error
  }
}

connectToDatabase() ;