// Combined Express API + Frontend Server
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: false }));
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'YOUR_MONGODB_URI_HERE';
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_env';

mongoose.connect(MONGO_URI, { dbName: 'healthguard', serverSelectionTimeoutMS: 10000 })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

function signToken(user) {
  return jwt.sign({ sub: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Email and 6+ char password required' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email, passwordHash });
    const token = signToken(user);
    return res.json({ token, user: { name: user.name, email: user.email } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    return res.json({ token, user: { name: user.name, email: user.email } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.sub).select('name email');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ user });
});

// Simple health check to verify server reachability
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static frontend files
app.use(express.static('.'));

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 HealthGuard AI Server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend will be available at the same URL`);
  console.log(`🔌 API endpoints available at http://localhost:${PORT}/api/*`);
});


