import React from 'react';
import { Alert as MuiAlert } from '@mui/material';

const Alert = ({ message, type }) => {
  if (!message) return null;

  return (
    <MuiAlert severity={type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }}>
      {message}
    </MuiAlert>
  );
};

export default Alert;
