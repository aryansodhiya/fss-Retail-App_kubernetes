const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const nodemailer = require('nodemailer');
require('dotenv').config();
const path = require('path');
const fs = require('fs'); // ADD THIS LINE if not already there

const app = express();
app.use(express.json());

const secretFilePath = path.join('/etc/secrets/mongo', 'uri'); // Path where the secret will be mounted
let mongoURI;

try {
    // Read the URI from the mounted file
    mongoURI = fs.readFileSync(secretFilePath, 'utf8').trim();
    console.log('MongoDB URI successfully loaded from file system.');
} catch (error) {
    console.error('Error loading MongoDB URI from file system:', error);
    // Fallback to environment variable or exit if file is essential
    mongoURI = process.env.MONGODB_URI; // Fallback, but expect it to be problematic
    if (mongoURI) {
        mongoURI = mongoURI.trim(); // Trim any leading/trailing whitespace
        console.log('MongoDB URI loaded from environment variable and trimmed.');
    } else {
        console.error('CRITICAL: MONGODB_URI environment variable and file not found. Cannot connect to MongoDB.');
        process.exit(1); // Exit if no URI found
    }
}
// Set up session management
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { secure: false } // Change to true if using HTTPS
}));

// Serve static files from the Public directory
app.use(express.static(path.join(__dirname, 'Public')));

// MongoDB connection
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    address: String,
    password: String,
    cart: [{
        name: String,
        price: Number,
        quantity: Number,
        image: String
    }],
    purchaseHistory: [{
        productId: String,
        quantity: Number,
        amount: Number,
        date: { type: Date, default: Date.now }
    }],
    otp: String,
    otpExpiry: Date
});

const User = mongoose.model('User', userSchema);

// Contact Message Schema
const contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String,
    issues: String,
    createdAt: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);

// Function to send OTP
const sendOtp = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}. It is valid for 5 minutes.`
    };

    await transporter.sendMail(mailOptions);
};

// Register Route
app.post('/register', async (req, res) => {
    const { name, email, phone, address, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, phone, address, password: hashedPassword });
        await user.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Registration error:', error);
        res.json({ success: false, message: 'Registration failed' });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }console.log("Password from form:", password);
console.log("Hashed password from DB:", user.password);
const validPassword = await bcrypt.compare(password, user.password);

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.json({ success: false, message: 'Invalid password' });
        }

        // Generate and send OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpiry = Date.now() + 5 * 60 * 1000; // Set expiry to 5 minutes
        await user.save();

        await sendOtp(email, otp);
        req.session.userId = user._id; // Store user ID in session
        res.json({ success: true });
    } catch (error) {
        console.error('Login error:', error);
        res.json({ success: false, message: 'Login failed' });
    }
});

// OTP Verification Route
app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        // Check if OTP is valid and not expired
        if (user.otp === otp && Date.now() < user.otpExpiry) {
            req.session.userId = user._id; // Store user ID in session
            user.otp = undefined; // Clear OTP after verification
            user.otpExpiry = undefined; // Clear expiry
            await user.save();
            return res.json({ success: true });
        } else {
            return res.json({ success: false, message: 'Invalid or expired OTP' });
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        res.json({ success: false, message: 'OTP verification failed' });
    }
});

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/index');
    }
};

// Routes for pages
app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'login.html'));
});

app.get('/home.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'home.html'));
});

// Route to get user cart items
app.get('/cart', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json(user.cart);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ message: 'Failed to retrieve cart' });
    }
});

// Route to add an item to the cart
app.post('/cart/add', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    const { name, price, quantity, image } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const existingItem = user.cart.find(item => item.name === name);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            user.cart.push({ name, price, quantity, image });
        }

        await user.save();
        res.json({ success: true, message: 'Item added to cart' });
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ message: 'Failed to add item to cart' });
    }
});

// Route to complete a purchase
app.post('/purchase', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    const { cartItems } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Save the cart items to purchase history
        const purchaseHistory = cartItems.map(item => ({
            productId: item.name, // Assuming productId is the name for simplicity
            quantity: item.quantity,
            amount: item.price * item.quantity,
        }));

        user.purchaseHistory.push(...purchaseHistory);
        user.cart = []; // Clear cart after purchase

        await user.save();
        res.json({ success: true, message: 'Purchase completed' });
    } catch (error) {
        console.error('Error completing purchase:', error);
        res.status(500).json({ message: 'Failed to complete purchase' });
    }
});

// Contact Route
app.post('/contactus', async (req, res) => {
    const { name, email, message, issues } = req.body;

    try {
        const contactMessage = new Contact({ name, email, message, issues });
        await contactMessage.save(); // Save the contact message to the database
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: 'Failed to send message' });
    }
});

// Redirect root to register page if not authenticated
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/home.html'); // Redirect to home.html if authenticated
    } else {
        res.redirect('/index'); // Redirect to register.html if not authenticated
    }
});

// Catch-all route to serve 404 for other paths if needed
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            res.redirect('/home.html'); // Redirect to home if error occurs
        } else {
            res.redirect('/login'); // Redirect to login page after logout
        }
    });
});

// Port & Server
const PORT = 3130; // Change from process.env.PORT to 3130
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
