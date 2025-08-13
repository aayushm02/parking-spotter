const mongoose = require('mongoose');
const ParkingSpot = require('./models/ParkingSpot');
const User = require('./models/user');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/parking_spot_finder')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function createSampleData() {
  try {
    // Create a sample user (spot owner) if one doesn't exist
    let sampleUser = await User.findOne({ email: 'owner@example.com' });
    if (!sampleUser) {
      sampleUser = new User({
        name: 'Spot Owner',
        email: 'owner@example.com',
        passwordHash: 'hashedpassword123',
        role: 'user'
      });
      await sampleUser.save();
      console.log('✅ Sample user created');
    }

    // Clear existing spots
    await ParkingSpot.deleteMany({});
    console.log('🗑️ Cleared existing parking spots');

    // Sample parking spots with different locations
    const sampleSpots = [
      {
        ownerId: sampleUser._id,
        location: { lat: 28.6139, lng: 77.2090 }, // New Delhi, India
        address: "Connaught Place, New Delhi",
        pricePerHour: 50,
        features: ["Covered", "Security", "Electric Charging"],
        isAvailable: true
      },
      {
        ownerId: sampleUser._id,
        location: { lat: 28.6289, lng: 77.2065 }, // Karol Bagh, New Delhi
        address: "Karol Bagh Market, New Delhi",
        pricePerHour: 40,
        features: ["Open Air", "CCTV"],
        isAvailable: true
      },
      {
        ownerId: sampleUser._id,
        location: { lat: 28.5355, lng: 77.3910 }, // Noida
        address: "Sector 18, Noida",
        pricePerHour: 35,
        features: ["Mall Parking", "Security"],
        isAvailable: true
      },
      {
        ownerId: sampleUser._id,
        location: { lat: 28.4595, lng: 77.0266 }, // Gurgaon
        address: "Cyber City, Gurgaon",
        pricePerHour: 60,
        features: ["Corporate Area", "Valet Service"],
        isAvailable: true
      },
      {
        ownerId: sampleUser._id,
        location: { lat: 28.6328, lng: 77.2197 }, // Paharganj
        address: "Paharganj, New Delhi",
        pricePerHour: 30,
        features: ["Budget Friendly", "24/7"],
        isAvailable: true
      }
    ];

    // Insert sample spots
    await ParkingSpot.insertMany(sampleSpots);
    console.log(`🅿️ Created ${sampleSpots.length} sample parking spots`);

    // Display created spots
    const spots = await ParkingSpot.find().populate('ownerId', 'name email');
    console.log('\n📍 Created Parking Spots:');
    spots.forEach((spot, index) => {
      console.log(`${index + 1}. ${spot.address}`);
      console.log(`   Location: ${spot.location.lat}, ${spot.location.lng}`);
      console.log(`   Price: ₹${spot.pricePerHour}/hour`);
      console.log(`   Features: ${spot.features.join(', ')}`);
      console.log('');
    });

    console.log('✅ Sample data creation completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    process.exit(1);
  }
}

createSampleData();
