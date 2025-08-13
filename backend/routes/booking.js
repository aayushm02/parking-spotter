const express = require('express');
const Booking = require('../models/Booking');
const ParkingSpot = require('../models/ParkingSpot');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, async (req, res) => {
  const { spotId, startTime, endTime } = req.body;
  try {
    const spot = await ParkingSpot.findById(spotId);
    if (!spot || !spot.isAvailable) return res.status(400).json({ message: 'Spot not available' });

    const booking = new Booking({
      userId: req.user.userId,
      spotId,
      startTime,
      endTime,
    });
    await booking.save();

    spot.isAvailable = false;
    await spot.save();

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/user', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.userId }).populate('spotId');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/cancel/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.userId.toString() !== req.user.userId) return res.status(403).json({ message: 'Unauthorized' });

    booking.status = 'cancelled';
    await booking.save();

    const spot = await ParkingSpot.findById(booking.spotId);
    spot.isAvailable = true;
    await spot.save();

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
