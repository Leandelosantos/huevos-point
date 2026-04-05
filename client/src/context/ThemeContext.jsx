import { createContext, useContext, useState, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material';
import { buildTheme } from '../theme/buildTheme';
import { DEFAULT_THEME_ID } from '../theme/themes';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);

  const applyTheme = useCallback((id) => {
    setThemeId(id || DEFAULT_THEME_ID);
  }, []);

  const theme = buildTheme(themeId);

  return (
    <ThemeContext.Provider value={{ themeId, applyTheme }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx;
};
