const express = require('express');
const Payment = require('../models/Payment');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user payments
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.userId });
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Check if user owns this payment
    if (payment.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    res.json({ payment });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create payment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { bookingId, amount, paymentMethod } = req.body;
    
    const payment = new Payment({
      userId: req.user.userId,
      bookingId,
      amount,
      paymentMethod: paymentMethod || 'card',
      status: 'pending'
    });
    
    await payment.save();
    res.status(201).json({ message: 'Payment created', payment });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;