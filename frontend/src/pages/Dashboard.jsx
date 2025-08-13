import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Container, Card, CardContent, Typography, Button, Alert, Grid } from '@mui/material';

const Dashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/bookings/user', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBookings(res.data);
      } catch (err) {
        setError(err.response.data.message || 'Failed to fetch bookings');
      }
    };
    fetchBookings();
  }, []);

  const handleCancel = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/bookings/cancel/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(bookings.filter((booking) => booking._id !== id));
    } catch (err) {
      setError(err.response.data.message || 'Failed to cancel booking');
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h2" gutterBottom>
        My Bookings
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={3}>
        {bookings.map((booking) => (
          <Grid item xs={12} sm={6} md={4} key={booking._id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{booking.spotId.address}</Typography>
                <Typography color="text.secondary">
                  Start: {new Date(booking.startTime).toLocaleString()}
                </Typography>
                <Typography color="text.secondary">
                  End: {new Date(booking.endTime).toLocaleString()}
                </Typography>
                <Typography color="text.secondary">Status: {booking.status}</Typography>
                {booking.status === 'active' && (
                  <Button
                    variant="contained"
                    color="secondary"
                    sx={{ mt: 2 }}
                    onClick={() => handleCancel(booking._id)}
                  >
                    Cancel
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Dashboard;