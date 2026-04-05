import { createTheme } from '@mui/material/styles';
import { THEMES, DEFAULT_THEME_ID } from './themes';

export const buildTheme = (themeId = DEFAULT_THEME_ID) => {
  const config = THEMES[themeId] || THEMES[DEFAULT_THEME_ID];
  const { palette } = config;

  return createTheme({
    palette: {
      mode: 'light',
      primary: palette.primary,
      secondary: palette.secondary,
      success: { main: palette.primary.main, light: palette.secondary.light, dark: palette.primary.dark },
      error: { main: '#D32F2F', light: '#EF5350', dark: '#C62828' },
      warning: { main: '#ED6C02', light: '#FF9800', dark: '#E65100' },
      info: { main: '#0288D1', light: '#03A9F4', dark: '#01579B' },
      background: palette.background,
      text: { primary: '#1A1A2E', secondary: '#5A5A7A' },
      divider: `rgba(${hexToRgb(palette.primary.main)}, 0.12)`,
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 800, fontSize: '2.25rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
      h2: { fontWeight: 700, fontSize: '1.875rem', lineHeight: 1.3, letterSpacing: '-0.01em' },
      h3: { fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.3 },
      h4: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.4 },
      h5: { fontWeight: 600, fontSize: '1.1rem', lineHeight: 1.5 },
      h6: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.5 },
      body1: { fontSize: '0.938rem', lineHeight: 1.6 },
      body2: { fontSize: '0.813rem', lineHeight: 1.5 },
      caption: { fontSize: '0.75rem', lineHeight: 1.5, color: '#5A5A7A' },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.02em' },
    },
    shape: { borderRadius: 12 },
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
              boxShadow: `0px 4px 12px rgba(${hexToRgb(palette.primary.main)}, 0.3)`,
              transform: 'translateY(-1px)',
            },
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${palette.primary.main} 0%, ${palette.primary.light} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${palette.primary.dark} 0%, ${palette.primary.main} 100%)`,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0px 2px 8px rgba(0,0,0,0.06)',
            border: `1px solid rgba(${hexToRgb(palette.primary.main)}, 0.08)`,
            transition: 'all 0.25s ease-in-out',
            '&:hover': {
              boxShadow: `0px 8px 24px rgba(${hexToRgb(palette.primary.main)}, 0.12)`,
            },
          },
        },
      },
      MuiPaper: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              '&.Mui-focused fieldset': { borderColor: palette.primary.main, borderWidth: 2 },
            },
          },
        },
      },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 16, padding: '8px' } } },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: palette.background.default,
              fontWeight: 700,
              color: palette.primary.dark,
              fontSize: '0.813rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            },
          },
        },
      },
      MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 600 } } },
      MuiDrawer: { styleOverrides: { paper: { border: 'none', boxShadow: '2px 0 12px rgba(0,0,0,0.06)' } } },
    },
  });
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0,0,0';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
