const express = require('express');
const User = require('../models/user');
const ParkingSpot = require('../models/ParkingSpot');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');

const isAdminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

// Middleware to ensure all routes are admin-only
router.use(authenticateToken);
router.use(isAdminMiddleware);
// Basic admin routes
router.get('/dashboard', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const spotCount = await ParkingSpot.countDocuments();
    
    res.json({
      message: 'Admin dashboard',
      stats: {
        users: userCount,
        spots: spotCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// User management
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Parking spot management
router.get('/spots', async (req, res) => {
  try {
    const spots = await ParkingSpot.find();
    res.json({ spots });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/spots/:id', async (req, res) => {
  try {
    const spot = await ParkingSpot.findById(req.params.id);
    if (!spot) {
      return res.status(404).json({ message: 'Spot not found' });
    }
    res.json({ spot });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;