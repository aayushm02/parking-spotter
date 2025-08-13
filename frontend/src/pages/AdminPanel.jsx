import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Card, CardContent, Typography, Button, Alert, Grid } from '@mui/material';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [spots, setSpots] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [usersRes, spotsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5000/api/admin/spots', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setUsers(usersRes.data);
        setSpots(spotsRes.data);
      } catch (err) {
        setError(err.response.data.message || 'Failed to fetch data');
      }
    };
    fetchData();
  }, []);

  const handleDeleteUser = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter((user) => user._id !== id));
    } catch (err) {
      setError(err.response.data.message || 'Failed to delete user');
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h2" gutterBottom>
        Admin Panel
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Typography variant="h4" gutterBottom>
        Users
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {users.map((user) => (
          <Grid item xs={12} sm={6} md={4} key={user._id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{user.name}</Typography>
                <Typography color="text.secondary">Email: {user.email}</Typography>
                <Typography color="text.secondary">Role: {user.role}</Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  sx={{ mt: 2 }}
                  onClick={() => handleDeleteUser(user._id)}
                >
                  Delete
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Typography variant="h4" gutterBottom>
        Parking Spots
      </Typography>
      <Grid container spacing={3}>
        {spots.map((spot) => (
          <Grid item xs={12} sm={6} md={4} key={spot._id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{spot.address}</Typography>
                <Typography color="text.secondary">Owner: {spot.ownerId.name}</Typography>
                <Typography color="text.secondary">Price: ${spot.pricePerHour}/hour</Typography>
                <Typography color="text.secondary">
                  Available: {spot.isAvailable ? 'Yes' : 'No'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default AdminPanel;