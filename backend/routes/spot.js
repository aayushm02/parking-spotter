const express = require('express');
const { body, query } = require('express-validator');
const spotController = require('../controllers/spotController');
const { authenticateToken, authorizeRoles, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const createSpotValidation = [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('location.coordinates').isArray({ min: 2, max: 2 }).withMessage('Coordinates must be [longitude, latitude]'),
  body('location.coordinates.*').isFloat().withMessage('Coordinates must be valid numbers'),
  body('address.fullAddress').notEmpty().withMessage('Full address is required'),
  body('pricing.hourlyRate').isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
  body('vehicleTypes').isArray({ min: 1 }).withMessage('At least one vehicle type must be selected'),
  body('features').optional().isArray().withMessage('Features must be an array')
];

const updateSpotValidation = [
  body('title').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('pricing.hourlyRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
  body('features').optional().isArray().withMessage('Features must be an array')
];

const searchValidation = [
  query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  query('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  query('radius').optional().isInt({ min: 1, max: 50 }).withMessage('Radius must be between 1 and 50 km'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

// Public routes
router.get('/', searchValidation, optionalAuth, spotController.getAllSpots);
router.get('/search', searchValidation, optionalAuth, spotController.searchSpots);
router.get('/nearby', searchValidation, optionalAuth, spotController.getNearbySpots);

// Owner routes
router.get('/owner/my-spots', authenticateToken, authorizeRoles('spot_owner', 'admin'), spotController.getMySpots);
router.put('/:id/availability', authenticateToken, authorizeRoles('spot_owner', 'admin'), spotController.updateAvailability);

// Favorite routes
router.get('/user/favorites', authenticateToken, spotController.getFavorites);

// Protected routes
router.post('/', authenticateToken, authorizeRoles('spot_owner', 'admin'), createSpotValidation, spotController.createSpot);
router.put('/:id', authenticateToken, updateSpotValidation, spotController.updateSpot);
router.delete('/:id', authenticateToken, spotController.deleteSpot);

// Rating routes
router.post('/:id/rating', authenticateToken, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
], spotController.addRating);

// Favorite modification routes
router.post('/:id/favorite', authenticateToken, spotController.addToFavorites);
router.delete('/:id/favorite', authenticateToken, spotController.removeFromFavorites);

// Report routes
router.post('/:id/report', authenticateToken, [
  body('reason').notEmpty().withMessage('Reason is required'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
], spotController.reportSpot);

// Dynamic route last
router.get('/:id', optionalAuth, spotController.getSpotById);

module.exports = router;
