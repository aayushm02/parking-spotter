import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { Card, CardContent, Typography, Button, CircularProgress, Box, Chip, IconButton, Slider, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { AddCircleOutline, RemoveCircleOutline, MyLocation, ZoomIn, ZoomOut, LocalParking } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Fix Leaflet marker icon missing issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icon for the user\'s current location marker (blue)
const userLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for parking spot markers (green)
const parkingSpotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for user-added parking spot markers (orange)
const userAddedParkingSpotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// MapUpdater component to programmatically update the Leaflet map\'s view
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    // Only set view if the center or zoom actually changes to avoid unnecessary updates
    if (center && (map.getCenter().lat !== center[0] || map.getCenter().lng !== center[1] || map.getZoom() !== zoom)) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
};

const Map = () => {
  // State management
  const [mapData, setMapData] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [searchRadius, setSearchRadius] = useState(5); // in km
  const [searchRadiusMeters, setSearchRadiusMeters] = useState(5000); // in meters
  const [zoomMeters, setZoomMeters] = useState(1000); // Default 1000 meters
  const [leafletZoom, setLeafletZoom] = useState(15); // Default zoom level
  const [isLocationActive, setIsLocationActive] = useState(false); // Track if location is active
  const [showNearbyOnly, setShowNearbyOnly] = useState(true); // Show only nearby spots
  const [userAddedSpots, setUserAddedSpots] = useState([]); // User-added parking spots
  const [isAddingSpot, setIsAddingSpot] = useState(false); // Flag for adding a new spot
  const [tempMarkerPosition, setTempMarkerPosition] = useState(null); // Temporary marker position
  const [addSpotDialogOpen, setAddSpotDialogOpen] = useState(false); // Dialog for adding spot
  const [newSpotInfo, setNewSpotInfo] = useState({ // New spot information
    title: '',
    address: '',
    pricePerHour: '',
    features: ''
  });

  // Default map center (Delhi, India) used as a fallback
  const defaultCenter = [31.2527066, 75.7036626]; 
  const navigate = useNavigate();
  const mapRef = useRef();

  // Enhanced location handler with better state management
  const handleGetLocation = useCallback(async (currentRadius = searchRadius, currentRadiusMeters = searchRadiusMeters) => {
    if (loadingLocation) return; // Prevent multiple simultaneous requests
    
    setLoadingLocation(true);
    setLocationError(null);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log(' Got user location:', { latitude, longitude });

          try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL || '/api'}/location`, {
              latitude,
              longitude,
              userId: 'user123',
              address: 'Current Location',
              radius: currentRadius,
              radiusMeters: currentRadiusMeters
            });

            if (response.data.success) {
              const { mapData: newMapData } = response.data;
              setMapData(newMapData);
              setIsLocationActive(true);
              
              // Use the current leafletZoom state for map zoom, not backend zoom
              if (mapRef.current) {
                mapRef.current.setView([latitude, longitude], leafletZoom);
              }

              // Optionally update mapData.zoom for MapUpdater
              setMapData((prev) => prev ? { ...prev, zoom: leafletZoom } : prev);

              console.log(` Found ${newMapData.summary.totalNearbySpots} nearby spots`);
            }
          } catch (err) {
            console.error(' Error processing location:', err);
            setLocationError('Error processing location data from server. Please try again.');
          } finally {
            setLoadingLocation(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          let errorMessage = 'Unable to get your location.';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }
          
          setLocationError(errorMessage);
          setLoadingLocation(false);
          setIsLocationActive(false);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 60000 // Allow 1-minute cache
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
      setLoadingLocation(false);
      setIsLocationActive(false);
    }
  }, [searchRadius, searchRadiusMeters, leafletZoom, loadingLocation]);

  // Effect to automatically get user\'s location on component mount
  useEffect(() => {
    handleGetLocation();
    
    // Fallback: If geolocation fails, load spots around the default center
    const fetchInitialSpotsFallback = async () => {
      if (!mapData) { 
        try {
          const res = await axios.get(`${process.env.REACT_APP_API_URL || '/api'}/location/spots`);
          if (res.data.success) {
            setMapData({
              center: defaultCenter,
              zoom: 10,
              userLocation: null,
              parkingSpots: res.data.spots,
              summary: { totalNearbySpots: res.data.totalSpots }
            });
          }
        } catch (err) {
          console.error('Error fetching initial spots:', err);
          if (!locationError) {
            setLocationError('Could not load initial parking spots.');
          }
        }
      }
    };

    const fallbackTimer = setTimeout(fetchInitialSpotsFallback, 3000);
    return () => clearTimeout(fallbackTimer);
  }, [handleGetLocation, mapData, locationError]);

  // Effect to re-fetch location data when the searchRadius changes
  useEffect(() => {
    if (mapData?.userLocation && !loadingLocation && isLocationActive) {
      const debounceTimer = setTimeout(() => {
        handleGetLocation(searchRadius, searchRadiusMeters);
      }, 1000); // Debounce to avoid too many requests

      return () => clearTimeout(debounceTimer);
    }
  }, [searchRadius, searchRadiusMeters, mapData?.userLocation, loadingLocation, handleGetLocation, isLocationActive]);

  // Zoom control handlers
  const handleZoomChange = useCallback((event, newZoom) => {
    setLeafletZoom(newZoom);
    if (mapRef.current) {
      mapRef.current.setZoom(newZoom);
    }
  }, []);

  const handleZoomIn = () => {
    const newZoom = Math.min(18, leafletZoom + 1);
    setLeafletZoom(newZoom);
    if (mapRef.current) {
      mapRef.current.setZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(3, leafletZoom - 1);
    setLeafletZoom(newZoom);
    if (mapRef.current) {
      mapRef.current.setZoom(newZoom);
    }
  };

  // Handler for zoom slider (in meters)
  const handleZoomMetersChange = (event, newValue) => {
    setZoomMeters(newValue);
    
    // Map zoom meters to Leaflet zoom levels
    const zoomMapping = [
      { meters: 5000, zoom: 10 },
      { meters: 2500, zoom: 12 },
      { meters: 1000, zoom: 15 },
      { meters: 500, zoom: 16 },
      { meters: 250, zoom: 17 },
      { meters: 100, zoom: 18 },
      { meters: 50, zoom: 19 },
    ];
    
    let matchedZoom = 15;
    for (let i = 0; i < zoomMapping.length; i++) {
      if (newValue >= zoomMapping[i].meters) {
        matchedZoom = zoomMapping[i].zoom;
        break;
      }
    }
    
    setLeafletZoom(matchedZoom);
    if (mapRef.current && mapData?.center) {
      mapRef.current.setView(mapData.center, matchedZoom);
    }
    // Update mapData.zoom for MapUpdater
    setMapData((prev) => prev ? { ...prev, zoom: matchedZoom } : prev);
  };

  // Handler for when the radius slider\'s value changes
  const handleRadiusChange = (event, newValue) => {
    setSearchRadius(newValue);
    // Also update the radius in meters (1 km = 1000 m)
    setSearchRadiusMeters(newValue * 1000);
  };

  // Handler for toggling show nearby only
  const toggleShowNearbyOnly = () => {
    setShowNearbyOnly(!showNearbyOnly);
  };

  // Handler for starting to add a new parking spot
  const startAddingSpot = () => {
    setIsAddingSpot(true);
    alert("Click on the map to place your new parking spot");
  };

  // Handler for map click when adding a new spot
  const handleMapClick = useCallback((e) => {
    if (!isAddingSpot) return;
    
    setTempMarkerPosition({
      lat: e.latlng.lat,
      lng: e.latlng.lng
    });
    setAddSpotDialogOpen(true);
    setIsAddingSpot(false);
  }, [isAddingSpot]);

  // Effect to add map click listener when adding spot
  useEffect(() => {
    if (mapRef.current && isAddingSpot) {
      mapRef.current.on('click', handleMapClick);
      
      return () => {
        if (mapRef.current) {
          mapRef.current.off('click', handleMapClick);
        }
      };
    }
  }, [isAddingSpot, handleMapClick]);

  // Handler for confirming new spot
  const handleConfirmNewSpot = () => {
    if (!tempMarkerPosition) return;
    
    const newSpot = {
      id: `user-${Date.now()}`,
      position: tempMarkerPosition,
      title: newSpotInfo.title || "My Parking Spot",
      address: newSpotInfo.address || "Custom location",
      pricePerHour: newSpotInfo.pricePerHour || "50",
      distanceText: "Added by you",
      features: newSpotInfo.features.length ? newSpotInfo.features.split(",").map(f => f.trim()) : ["User added"],
      owner: { name: "Me (You)" },
      isUserAdded: true
    };
    
    setUserAddedSpots(prev => [...prev, newSpot]);
    setTempMarkerPosition(null);
    setAddSpotDialogOpen(false);
    setNewSpotInfo({
      title: '',
      address: '',
      pricePerHour: '',
      features: ''
    });
    
    // Send to backend
    try {
      axios.post(`${process.env.REACT_APP_API_URL || '/api'}/location/addParkingSpot`, newSpot)
        .then(response => {
          console.log('Added new parking spot to backend:', response.data);
        })
        .catch(err => {
          console.error('Error adding spot to backend:', err);
          // Keep the spot in local state even if backend fails
        });
    } catch (error) {
      console.error('Error adding spot:', error);
    }
  };

  // Handler for cancelling new spot
  const handleCancelNewSpot = () => {
    setTempMarkerPosition(null);
    setAddSpotDialogOpen(false);
    setNewSpotInfo({
      title: '',
      address: '',
      pricePerHour: '',
      features: ''
    });
  };

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      overflow: 'hidden'
    }}>
      {/* Main Map Container */}
      <MapContainer
        center={mapData?.center || defaultCenter}
        zoom={mapData?.zoom || leafletZoom}
        style={{ 
          height: 'calc(100% - 160px)', 
          width: 'calc(100% - 32px)', 
          maxWidth: '1400px', 
          borderRadius: '20px', 
          boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 8px 25px rgba(0,0,0,0.2)',
          border: '2px solid rgba(255,255,255,0.2)',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance;
        }}
        zoomControl={false} // Disable default zoom controls
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <MapUpdater center={mapData?.center || defaultCenter} zoom={leafletZoom} />
        
        {/* Temporary marker when adding a new parking spot */}
        {tempMarkerPosition && (
          <Marker
            position={[tempMarkerPosition.lat, tempMarkerPosition.lng]}
            icon={userAddedParkingSpotIcon}
          >
            <Popup>
              <Typography variant="body2">New parking spot location</Typography>
              <Typography variant="caption">Complete the form to add this spot</Typography>
            </Popup>
          </Marker>
        )}

        {/* User\'s Current Location Marker */}
        {mapData?.userLocation && (
          <Marker 
            position={[mapData.userLocation.position.lat, mapData.userLocation.position.lng]}
            icon={userLocationIcon}
          >
            <Popup>
              <Card sx={{ minWidth: 220, borderRadius: '16px', boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" color="primary" sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    fontWeight: 700,
                    fontSize: '1.1rem'
                  }}>
                     {mapData.userLocation.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 1.5, fontSize: '0.9rem', lineHeight: 1.4 }}>
                    {mapData.userLocation.address}
                  </Typography>
                  <Chip 
                    label="Your Current Location" 
                    color="primary" 
                    size="small"
                    sx={{ 
                      fontSize: '0.75rem', 
                      borderRadius: '8px', 
                      px: 1.5,
                      fontWeight: 600,
                      background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
                    }}
                  />
                  <Typography variant="caption" display="block" sx={{ 
                    mt: 1.5, 
                    fontSize: '0.7rem', 
                    color: 'text.disabled',
                    fontStyle: 'italic'
                  }}>
                    Updated: {new Date(mapData.userLocation.timestamp).toLocaleTimeString()}
                  </Typography>
                </CardContent>
              </Card>
            </Popup>
          </Marker>
        )}

        {/* Parking Spots Markers - Only show nearby if that option is selected */}
        {mapData?.parkingSpots?.filter(spot => !showNearbyOnly || (spot.distanceValue && spot.distanceValue <= searchRadiusMeters)).map((spot) => (
          <Marker 
            key={spot.id}
            position={[spot.position.lat, spot.position.lng]}
            icon={parkingSpotIcon}
          >
            <Popup>
              <Card sx={{ minWidth: 280, borderRadius: '16px', boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" color="success.main" sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    mb: 1
                  }}>
                     {spot.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 2, fontSize: '0.9rem', lineHeight: 1.4 }}>
                    {spot.address}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={`?${spot.pricePerHour}/hr`} 
                      color="success" 
                      size="small"
                      sx={{ 
                        borderRadius: '8px', 
                        px: 1.5, 
                        fontWeight: 700,
                        background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)'
                      }}
                    />
                    <Chip 
                      label={spot.distanceText} 
                      variant="outlined" 
                      size="small"
                      sx={{ borderRadius: '8px', px: 1.5, fontWeight: 600 }}
                    />
                  </Box>

                  {spot.features && spot.features.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                        Features:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {spot.features.map((feature, index) => (
                          <Chip 
                            key={index}
                            label={feature} 
                            variant="outlined" 
                            size="small"
                            sx={{ 
                              fontSize: '0.7rem', 
                              height: '26px', 
                              borderRadius: '6px',
                              fontWeight: 500
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {spot.owner && (
                    <Typography variant="caption" display="block" sx={{ 
                      mb: 2, 
                      color: 'text.disabled',
                      fontStyle: 'italic'
                    }}>
                      Owner: {spot.owner.name}
                    </Typography>
                  )}

                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    sx={{ 
                      mt: 1, 
                      borderRadius: '10px', 
                      py: 1.5, 
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                      boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
                      }
                    }}
                    onClick={() => navigate(`/booking/${spot.id}`)}
                  >
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            </Popup>
          </Marker>
        ))}
        
        {/* User Added Parking Spots */}
        {userAddedSpots.map((spot) => (
          <Marker 
            key={spot.id}
            position={[spot.position.lat, spot.position.lng]}
            icon={userAddedParkingSpotIcon}
          >
            <Popup>
              <Card sx={{ minWidth: 280, borderRadius: '16px', boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" color="warning.main" sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    mb: 1
                  }}>
                     {spot.title} <Chip size="small" label="Added by you" color="warning" />
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 2, fontSize: '0.9rem', lineHeight: 1.4 }}>
                    {spot.address}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={`?${spot.pricePerHour}/hr`} 
                      color="warning" 
                      size="small"
                      sx={{ 
                        borderRadius: '8px', 
                        px: 1.5, 
                        fontWeight: 700,
                        background: 'linear-gradient(45deg, #FF9800 30%, #FFC107 90%)'
                      }}
                    />
                    <Chip 
                      label="Your spot" 
                      variant="outlined" 
                      size="small"
                      sx={{ borderRadius: '8px', px: 1.5, fontWeight: 600 }}
                    />
                  </Box>

                  {spot.features && spot.features.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                        Features:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {spot.features.map((feature, index) => (
                          <Chip 
                            key={index}
                            label={feature} 
                            variant="outlined" 
                            size="small"
                            sx={{ 
                              fontSize: '0.7rem', 
                              height: '26px', 
                              borderRadius: '6px',
                              fontWeight: 500
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Button
                    variant="outlined"
                    color="error"
                    fullWidth
                    sx={{ 
                      mt: 1, 
                      borderRadius: '10px', 
                      py: 1, 
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}
                    onClick={() => {
                      setUserAddedSpots(prev => prev.filter(s => s.id !== spot.id));
                    }}
                  >
                    Remove Spot
                  </Button>
                </CardContent>
              </Card>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Summary Information Box */}
      {mapData?.summary && (
        <Box
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
            borderRadius: '16px',
            p: 3,
            minWidth: 240,
            zIndex: 1000,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15), 0 4px 15px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.2), 0 6px 20px rgba(0,0,0,0.15)',
            }
          }}
        >
          <Typography variant="h6" sx={{ 
            mb: 2, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            fontWeight: 700,
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '1.1rem'
          }}>
             Search Results
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, color: '#333', fontSize: '0.95rem' }}>
            Found: <strong style={{color: '#4CAF50', fontSize: '1.1rem'}}>{
              showNearbyOnly 
                ? mapData.parkingSpots.filter(spot => spot.distanceValue && spot.distanceValue <= searchRadiusMeters).length
                : mapData.summary.totalNearbySpots
            }</strong> parking spots
            {userAddedSpots.length > 0 && (
              <span> + <strong style={{color: '#FF9800'}}>{userAddedSpots.length}</strong> added by you</span>
            )}
          </Typography>
          <Typography variant="body2" sx={{ color: '#333', fontSize: '0.95rem', mb: 1 }}>
            Radius: <strong style={{color: '#2196F3', fontSize: '1.1rem'}}>{searchRadius} km</strong>
          </Typography>
          <Typography variant="body2" sx={{ color: '#333', fontSize: '0.95rem', mb: 1 }}>
            Distance: <strong style={{color: '#2196F3', fontSize: '1.1rem'}}>{searchRadiusMeters} m</strong>
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
            <Chip 
              label={showNearbyOnly ? "Nearby spots only" : "All spots"} 
              color={showNearbyOnly ? "primary" : "default"}
              size="small"
              onClick={toggleShowNearbyOnly}
              sx={{ fontWeight: 600 }}
            />
          </Box>
          {isLocationActive && (
            <Chip 
              label=" Location Active" 
              color="success" 
              size="small"
              sx={{ 
                mt: 2, 
                borderRadius: '8px', 
                px: 1.5, 
                fontWeight: 700,
                background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)'
              }}
            />
          )}
        </Box>
      )}

      {/* Zoom Control Slider on the Right */}
      <Box
        sx={{
          position: 'absolute',
          right: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
          borderRadius: '16px',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          zIndex: 1000,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.3)',
          minHeight: '200px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-50%) translateX(-4px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
          }
        }}
      >
        <Typography variant="body2" sx={{ 
          fontWeight: 700, 
          color: '#333',
          fontSize: '0.8rem',
          textAlign: 'center',
          mb: 1
        }}>
          ZOOM
        </Typography>
        
        <IconButton 
          onClick={handleZoomIn}
          disabled={leafletZoom >= 18}
          sx={{ 
            color: '#2196F3',
            background: 'rgba(33, 150, 243, 0.1)',
            '&:hover': { 
              background: 'rgba(33, 150, 243, 0.2)',
              transform: 'scale(1.1)'
            },
            '&:disabled': {
              color: '#ccc',
              background: 'rgba(0,0,0,0.05)'
            },
            transition: 'all 0.2s ease'
          }}
        >
          <ZoomIn />
        </IconButton>
        
        <Slider
          value={leafletZoom}
          onChange={handleZoomChange}
          aria-label="Map Zoom"
          orientation="vertical"
          min={3}
          max={18}
          step={1}
          sx={{ 
            height: 120,
            color: '#2196F3',
            '& .MuiSlider-thumb': {
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 4px 15px rgba(33, 150, 243, 0.3)',
              width: 18,
              height: 18,
              '&:hover': {
                boxShadow: '0 6px 20px rgba(33, 150, 243, 0.4)',
              }
            },
            '& .MuiSlider-track': {
              background: 'linear-gradient(to bottom, #2196F3, #21CBF3)',
            }
          }}
        />
        
        <IconButton 
          onClick={handleZoomOut}
          disabled={leafletZoom <= 3}
          sx={{ 
            color: '#2196F3',
            background: 'rgba(33, 150, 243, 0.1)',
            '&:hover': { 
              background: 'rgba(33, 150, 243, 0.2)',
              transform: 'scale(1.1)'
            },
            '&:disabled': {
              color: '#ccc',
              background: 'rgba(0,0,0,0.05)'
            },
            transition: 'all 0.2s ease'
          }}
        >
          <ZoomOut />
        </IconButton>
        
        <Typography variant="caption" sx={{ 
          color: '#666',
          fontWeight: 600,
          fontSize: '0.75rem',
          mt: 1
        }}>
          {leafletZoom}x
        </Typography>
      </Box>

      {/* Bottom Control Panel */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)',
          borderRadius: '20px',
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2.5,
          zIndex: 1000,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25), 0 6px 20px rgba(0,0,0,0.15)',
          border: '2px solid rgba(255,255,255,0.3)',
          minWidth: '380px',
          maxWidth: '90%',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateX(-50%) translateY(-6px)',
            boxShadow: '0 16px 50px rgba(0,0,0,0.3), 0 8px 25px rgba(0,0,0,0.2)',
          }
        }}
      >
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', width: '100%', gap: 2 }}>
          {/* Current Location Button */}
          <Button
            variant="contained"
            onClick={() => handleGetLocation(searchRadius, searchRadiusMeters)}
            disabled={loadingLocation || isAddingSpot}
            startIcon={loadingLocation ? null : <MyLocation />}
            sx={{ 
              flexGrow: 1,
              py: 2,
              minWidth: '180px',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 700,
              background: isLocationActive 
                ? 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)'
                : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: `0 6px 20px ${isLocationActive ? 'rgba(76, 175, 80, 0.3)' : 'rgba(33, 150, 243, 0.3)'}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: `0 8px 25px ${isLocationActive ? 'rgba(76, 175, 80, 0.4)' : 'rgba(33, 150, 243, 0.4)'}`,
              },
              '&:active': {
                transform: 'translateY(-1px)',
              },
              '&:disabled': {
                background: 'linear-gradient(45deg, #ccc 30%, #ddd 90%)',
                color: '#666',
              }
            }}
          >
            {loadingLocation ? (
              <>
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                Finding Location...
              </>
            ) : isLocationActive ? (
              'Update My Location'
            ) : (
              'Find My Location'
            )}
          </Button>
          
          {/* Add Parking Spot Button */}
          <Tooltip title="Add a new parking spot on the map">
            <Button
              variant="contained"
              color="warning"
              onClick={startAddingSpot}
              disabled={loadingLocation || isAddingSpot}
              startIcon={<LocalParking />}
              sx={{ 
                flexGrow: 0.5,
                py: 2,
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 700,
                background: 'linear-gradient(45deg, #FF9800 30%, #FFC107 90%)',
                boxShadow: '0 6px 20px rgba(255, 152, 0, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #FF9800 10%, #FFC107 70%)',
                  boxShadow: '0 8px 25px rgba(255, 152, 0, 0.4)',
                  transform: 'translateY(-3px)',
                },
                '&:active': {
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  background: 'linear-gradient(45deg, #ccc 30%, #ddd 90%)',
                  color: '#666',
                }
              }}
            >
              Add Spot
            </Button>
          </Tooltip>
        </Box>

        {/* Radius Control */}
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton 
            onClick={() => setSearchRadius(prev => Math.max(1, prev - 1))}
            disabled={searchRadius <= 1 || loadingLocation}
            sx={{ 
              color: '#FF6B6B',
              background: 'rgba(255, 107, 107, 0.1)',
              '&:hover': { 
                background: 'rgba(255, 107, 107, 0.2)',
                transform: 'scale(1.1)'
              },
              '&:disabled': {
                color: '#ccc',
                background: 'rgba(0,0,0,0.05)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            <RemoveCircleOutline />
          </IconButton>
          
          <Box sx={{ flexGrow: 1, px: 2 }}>
            <Typography variant="body2" sx={{ 
              textAlign: 'center', 
              mb: 1, 
              fontWeight: 600, 
              color: '#333',
              fontSize: '0.9rem'
            }}>
              Search Radius: <strong style={{color: '#4CAF50'}}>{searchRadius} km</strong>
            </Typography>
            <Slider
              value={searchRadius}
              onChange={handleRadiusChange}
              aria-label="Search Radius"
              min={1}
              max={50}
              step={1}
              disabled={loadingLocation}
              sx={{ 
                color: '#4CAF50',
                '& .MuiSlider-thumb': {
                  background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                  width: 20,
                  height: 20,
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
                  }
                },
                '& .MuiSlider-track': {
                  background: 'linear-gradient(to right, #4CAF50, #8BC34A)',
                  height: 6,
                },
                '& .MuiSlider-rail': {
                  height: 6,
                  background: '#e8f5e8',
                }
              }}
            />
          </Box>
          
          <IconButton 
            onClick={() => setSearchRadius(prev => Math.min(50, prev + 1))}
            disabled={searchRadius >= 50 || loadingLocation}
            sx={{ 
              color: '#4CAF50',
              background: 'rgba(76, 175, 80, 0.1)',
              '&:hover': { 
                background: 'rgba(76, 175, 80, 0.2)',
                transform: 'scale(1.1)'
              },
              '&:disabled': {
                color: '#ccc',
                background: 'rgba(0,0,0,0.05)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            <AddCircleOutline />
          </IconButton>
        </Box>
      </Box>

      {/* Error Message */}
      {locationError && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 220,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.95) 0%, rgba(229, 57, 53, 0.95) 100%)',
            color: 'white',
            borderRadius: '12px',
            p: 3,
            zIndex: 1000,
            maxWidth: '420px',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(244, 67, 54, 0.3)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            animation: 'slideUp 0.5s ease-out',
            '@keyframes slideUp': {
              from: { opacity: 0, transform: 'translateX(-50%) translateY(20px)' },
              to: { opacity: 1, transform: 'translateX(-50%) translateY(0)' }
            }
          }}
        >
          <Typography variant="body1" sx={{ 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            fontSize: '0.95rem'
          }}>
             {locationError}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setLocationError(null)}
            sx={{
              mt: 2,
              color: 'white',
              borderColor: 'rgba(255,255,255,0.5)',
              '&:hover': {
                borderColor: 'white',
                background: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            Dismiss
          </Button>
        </Box>
      )}
      
      {/* Dialog for adding a new parking spot */}
      <Dialog
        open={addSpotDialogOpen}
        onClose={handleCancelNewSpot}
        aria-labelledby="add-spot-dialog-title"
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
            minWidth: '350px'
          }
        }}
      >
        <DialogTitle id="add-spot-dialog-title" sx={{ 
          pb: 1, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          background: 'linear-gradient(90deg, #FF9800, #FFC107)',
          color: 'white',
          fontWeight: 700
        }}>
          <LocalParking /> Add New Parking Spot
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Spot Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newSpotInfo.title}
            onChange={(e) => setNewSpotInfo({...newSpotInfo, title: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Address"
            type="text"
            fullWidth
            variant="outlined"
            value={newSpotInfo.address}
            onChange={(e) => setNewSpotInfo({...newSpotInfo, address: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Price per Hour (?)"
            type="number"
            fullWidth
            variant="outlined"
            value={newSpotInfo.pricePerHour}
            onChange={(e) => setNewSpotInfo({...newSpotInfo, pricePerHour: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Features (comma separated)"
            type="text"
            fullWidth
            variant="outlined"
            placeholder="Covered, Security, 24/7"
            value={newSpotInfo.features}
            onChange={(e) => setNewSpotInfo({...newSpotInfo, features: e.target.value})}
            helperText="Example: Covered, 24/7 Access, Security Camera"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={handleCancelNewSpot} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmNewSpot} 
            variant="contained" 
            color="warning"
            sx={{
              background: 'linear-gradient(45deg, #FF9800 30%, #FFC107 90%)',
            }}
          >
            Add Spot
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Map;
