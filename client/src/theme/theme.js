import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2D6A4F',
      light: '#40916C',
      dark: '#1B4332',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#52B788',
      light: '#74C69D',
      dark: '#40916C',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#2D6A4F',
      light: '#74C69D',
      dark: '#1B4332',
    },
    error: {
      main: '#D32F2F',
      light: '#EF5350',
      dark: '#C62828',
    },
    warning: {
      main: '#ED6C02',
      light: '#FF9800',
      dark: '#E65100',
    },
    info: {
      main: '#0288D1',
      light: '#03A9F4',
      dark: '#01579B',
    },
    background: {
      default: '#F0F4F0',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A2E',
      secondary: '#5A5A7A',
    },
    divider: 'rgba(45, 106, 79, 0.12)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      fontSize: '2.25rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '1.875rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.5rem',
      lineHeight: 1.3,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.1rem',
      lineHeight: 1.5,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '0.938rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.813rem',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      color: '#5A5A7A',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 1px 3px rgba(0,0,0,0.04), 0px 1px 2px rgba(0,0,0,0.06)',
    '0px 2px 6px rgba(0,0,0,0.06), 0px 1px 3px rgba(0,0,0,0.08)',
    '0px 4px 12px rgba(0,0,0,0.08), 0px 2px 4px rgba(0,0,0,0.06)',
    '0px 6px 16px rgba(0,0,0,0.10), 0px 3px 6px rgba(0,0,0,0.06)',
    '0px 8px 24px rgba(0,0,0,0.12), 0px 4px 8px rgba(0,0,0,0.06)',
    ...Array(19).fill('0px 10px 30px rgba(0,0,0,0.14), 0px 5px 10px rgba(0,0,0,0.06)'),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(45, 106, 79, 0.3)',
            transform: 'translateY(-1px)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid rgba(45, 106, 79, 0.08)',
          transition: 'all 0.25s ease-in-out',
          '&:hover': {
            boxShadow: '0px 8px 24px rgba(45, 106, 79, 0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '&.Mui-focused fieldset': {
              borderColor: '#2D6A4F',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          padding: '8px',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#F0F4F0',
            fontWeight: 700,
            color: '#1B4332',
            fontSize: '0.813rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
          boxShadow: '2px 0 12px rgba(0,0,0,0.06)',
        },
      },
    },
  },
});

export default theme;
