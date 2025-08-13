const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/booking');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const locationRoutes = require('./routes/location');

dotenv.config();

// Fallback environment variables if .env doesn't load
if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://localhost:27017/parking_spot_finder';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'mishra';
}
if (!process.env.PORT) {
  process.env.PORT = process.env.NODE_ENV === 'production' ? '80' : '5000';
}

console.log('Environment variables loaded:');
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');
console.log('PORT:', process.env.PORT);

const app = express();

// In production, allow the deployed frontend domain
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];

// Add your production domain when deployed
if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/location', locationRoutes);

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  // Any route that doesn't match API routes will serve the React app
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
