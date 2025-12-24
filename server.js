const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const nodemailer = require('nodemailer'); // Added
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3130;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/shop_db?authSource=admin';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- EMAIL TRANSPORTER ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

// 1. MongoDB Connection
const connectWithRetry = () => {
    mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
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
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 } 
}));

app.use(express.static(path.join(__dirname, 'Public')));

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phone: String,
    address: String,
    password: { type: String, required: true },
    cart: [{ name: String, price: Number, quantity: Number, image: String }],
    purchaseHistory: [{ productId: String, quantity: Number, amount: Number, date: { type: Date, default: Date.now } }]
});
const User = mongoose.model('User', userSchema);

const requireAuth = (req, res, next) => {
    if (req.session.userId) next();
    else res.status(401).json({ success: false, message: "Unauthorized" });
};

// --- ROUTES ---

app.post('/register', async (req, res) => {
    const { name, email, phone, address, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, phone, address, password: hashedPassword });
        await user.save();
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: 'Email already registered' });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.json({ success: false, message: 'Invalid credentials' });
        }
        req.session.userId = user._id;
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false });
    }
});

app.post('/purchase', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user || user.cart.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }

        // 1. Prepare data for History and Email
        const itemsToEmail = [...user.cart];
        const history = user.cart.map(i => ({ 
            productId: i.name, 
            quantity: i.quantity, 
            amount: i.price * i.quantity 
        }));
        const totalAmount = history.reduce((sum, item) => sum + item.amount, 0);

        // 2. Update Database
        user.purchaseHistory.push(...history);
        user.cart = []; 
        await user.save();

        // 3. SEND THE EMAIL
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Order Confirmation - RetailApp',
            html: `
                <h2>Hello ${user.name},</h2>
                <p>Your order has been placed successfully!</p>
                <hr>
                <ul>
                    ${itemsToEmail.map(item => `<li>${item.name} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>`).join('')}
                </ul>
                <h3>Total Paid: $${totalAmount.toFixed(2)}</h3>
                <p><strong>Delivery Address:</strong> ${user.address}</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.log("❌ Email Error:", error);
            else console.log("📧 Order Email Sent:", info.response);
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Purchase Error:", error);
        res.status(500).json({ success: false });
    }
});

app.get('/index', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'login.html')));
app.get('/home.html', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'Public', 'home.html')));

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
