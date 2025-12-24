const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3130;

// Docker-compatible MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/shop_db?authSource=admin';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. MongoDB Connection with Retry Logic
const connectWithRetry = () => {
    mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        console.log('Retrying in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
    });
};
connectWithRetry();

// 2. Session Management
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGODB_URI }),
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 1000 * 60 * 60 * 24 // 1 day session
    } 
}));

app.use(express.static(path.join(__dirname, 'Public')));

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phone: String,
    address: String,
    password: { type: String, required: true },
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
    }]
});
const User = mongoose.model('User', userSchema);

// --- AUTHENTICATION MIDDLEWARE ---
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ success: false, message: "Unauthorized" });
    }
};

// --- ROUTES ---

// Registration Route
app.post('/register', async (req, res) => {
    const { name, email, phone, address, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, phone, address, password: hashedPassword });
        await user.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Registration error:', error);
        res.json({ success: false, message: 'Email already registered' });
    }
});

// Simplified Login Route (No OTP)
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.json({ success: false, message: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.json({ success: false, message: 'Invalid password' });

        // Create Session immediately
        req.session.userId = user._id;
        res.json({ success: true, message: 'Login successful' });
    } catch (error) {
        res.json({ success: false, message: 'Login error' });
    }
});

// Page Serving
app.get('/index', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'login.html')));
app.get('/home.html', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'Public', 'home.html')));

// Cart & Shop Functionality
app.get('/cart', requireAuth, async (req, res) => {
    const user = await User.findById(req.session.userId);
    res.json(user.cart);
});

app.post('/cart/add', requireAuth, async (req, res) => {
    const { name, price, quantity, image } = req.body;
    const user = await User.findById(req.session.userId);
    const item = user.cart.find(i => i.name === name);
    if (item) item.quantity += quantity;
    else user.cart.push({ name, price, quantity, image });
    await user.save();
    res.json({ success: true });
});

app.post('/purchase', requireAuth, async (req, res) => {
    const user = await User.findById(req.session.userId);
    const history = user.cart.map(i => ({ productId: i.name, quantity: i.quantity, amount: i.price * i.quantity }));
    user.purchaseHistory.push(...history);
    user.cart = [];
    await user.save();
    res.json({ success: true });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

app.get('/', (req, res) => {
    req.session.userId ? res.redirect('/home.html') : res.redirect('/index');
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
