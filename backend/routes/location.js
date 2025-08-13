const express = require('express');
const ParkingSpot = require('../models/ParkingSpot');
const router = express.Router();

// Store user locations temporarily (in production, use Redis or database)
const userLocations = new Map();

// POST - Receive user location and return map data with current location + nearby spots
router.post('/', async (req, res) => {
  try {
    const { latitude, longitude, userId, address } = req.body;
    console.log(`✅ Location received: Latitude ${latitude}, Longitude ${longitude}, User: ${userId || 'Anonymous'}`);

    // Validate coordinates
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude are required'
      });
    }

    // Store user location
    const locationData = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: address || `Location (${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude).toFixed(4)})`,
      timestamp: new Date().toISOString(),
      userId: userId || 'anonymous'
    };
    
    if (userId) {
      userLocations.set(userId, locationData);
    }

    // Find all available parking spots
    const allSpots = await ParkingSpot.find({ isAvailable: true })
      .populate('ownerId', 'name email');

    // Calculate distances and create parking spot data
    const parkingSpots = allSpots.map(spot => {
      const distance = calculateDistance(latitude, longitude, spot.location.lat, spot.location.lng);
      return {
        id: spot._id.toString(),
        position: {
          lat: spot.location.lat,
          lng: spot.location.lng
        },
        title: spot.address,
        address: spot.address,
        pricePerHour: spot.pricePerHour,
        features: spot.features || [],
        distance: distance,
        distanceText: distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`,
        type: 'parking_spot',
        isAvailable: spot.isAvailable,
        owner: spot.ownerId ? {
          name: spot.ownerId.name,
          email: spot.ownerId.email
        } : null
      };
    }).filter(spot => spot.distance <= 25) // Only spots within 25km
      .sort((a, b) => a.distance - b.distance); // Sort by distance

    // Create response with map data
    const responseData = {
      success: true,
      message: 'Location processed successfully',
      mapData: {
        center: {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude)
        },
        zoom: 13,
        userLocation: {
          position: {
            lat: parseFloat(latitude),
            lng: parseFloat(longitude)
          },
          title: "Your Current Location",
          address: locationData.address,
          type: 'user_location',
          timestamp: locationData.timestamp,
          isCurrentLocation: true
        },
        parkingSpots: parkingSpots,
        summary: {
          totalNearbySpots: parkingSpots.length,
          searchRadius: '25km',
          userCoordinates: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
          }
        }
      }
    };

    console.log(`📍 Processed location for ${userId || 'anonymous'}: Found ${parkingSpots.length} nearby spots`);
    console.log(`📍 User location: ${locationData.address} (${latitude}, ${longitude})`);

    res.status(200).json(responseData);
    
  } catch (error) {
    console.error('❌ Error processing location:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while processing location',
      mapData: {
        center: { lat: latitude || 0, lng: longitude || 0 },
        userLocation: null,
        parkingSpots: [],
        summary: { totalNearbySpots: 0, error: error.message }
      }
    });
  }
});

// GET - Get all parking spots for testing
router.get('/spots', async (req, res) => {
  try {
    const spots = await ParkingSpot.find({ isAvailable: true })
      .populate('ownerId', 'name email');
    
    console.log(`📍 Returning ${spots.length} total available parking spots`);
    
    const spotsData = spots.map(spot => ({
      id: spot._id.toString(),
      position: {
        lat: spot.location.lat,
        lng: spot.location.lng
      },
      title: spot.address,
      address: spot.address,
      pricePerHour: spot.pricePerHour,
      features: spot.features || [],
      type: 'parking_spot',
      isAvailable: spot.isAvailable,
      owner: spot.ownerId ? {
        name: spot.ownerId.name,
        email: spot.ownerId.email
      } : null
    }));
    
    res.status(200).json({
      success: true,
      totalSpots: spotsData.length,
      spots: spotsData
    });
  } catch (error) {
    console.error('❌ Error fetching spots:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching spots' 
    });
  }
});

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

module.exports = router;

