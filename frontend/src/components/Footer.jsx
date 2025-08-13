import React from 'react';
import { Box, Typography } from '@mui/material';

const Footer = () => {
  return (
    <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2, textAlign: 'center', mt: 'auto' }}>
      <Typography variant="body2">
        © 2025 Parking Spot Finder. All rights reserved.
      </Typography>
    </Box>
  );
};

export default Footer;
