//create a route for the login that will fetch data from mongodb, that will fetch info
//

// ======================================
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // Check if both username and password are provided
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        // Find the user by username
        const user = await User.findOne({ username });

        // If user is not found, return an error
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        // Compare the provided password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            // Passwords match, login successful
            res.status(200).json({ message: 'Login successful!', user: { id: user._id, username: user.username } });
        } else {
            // Passwords do not match
            res.status(401).json({ message: 'Invalid username or password.' });
        }

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// ======================================
// EXAMPLE REGISTRATION ROUTE (Optional but helpful)
// ======================================
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Hash the password before saving it to the database
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = new User({
            username,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 11000) { // Mongoose error code for duplicate key
            return res.status(400).json({ message: 'Username already exists.' });
        }
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// Execute the connection function
connectToDatabase();
