import { createTheme, PaletteMode } from '@mui/material';

export const getTheme = (mode: PaletteMode) => createTheme({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#1976d2' : '#90caf9',
    },
    secondary: {
      main: mode === 'light' ? '#dc004e' : '#f48fb1',
    },
    success: {
      main: mode === 'light' ? '#2e7d32' : '#66bb6a',
    },
    warning: {
      main: mode === 'light' ? '#ed6c02' : '#ffa726',
    },
    error: {
      main: mode === 'light' ? '#d32f2f' : '#f44336',
    },
    background: {
      default: mode === 'light' ? '#f5f5f5' : '#121212',
      paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
          padding: '8px 16px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          transition: 'box-shadow 0.3s ease-in-out',
          '&:hover': {
            boxShadow: mode === 'light' 
              ? '0 8px 24px rgba(0,0,0,0.12)' 
              : '0 8px 24px rgba(255,255,255,0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: mode === 'light'
            ? '0 2px 8px rgba(0,0,0,0.08)'
            : '0 2px 8px rgba(255,255,255,0.05)',
        },
      },
    },
  },
});