import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import EggRoundedIcon from '@mui/icons-material/EggRounded';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';

const COLLAPSED_WIDTH = 80;

const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [desktopOpen, setDesktopOpen] = useState(true);

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopOpen(!desktopOpen);
    }
  };

  const actualDrawerWidth = isMobile ? 0 : (desktopOpen ? DRAWER_WIDTH : COLLAPSED_WIDTH);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        desktopOpen={desktopOpen}
        onDrawerToggle={handleDrawerToggle}
      />

      {/* Floating Hamburger Button for Mobile */}
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="abrir menú"
          onClick={handleDrawerToggle}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: theme.zIndex.drawer - 1, // Below the drawer but above other content
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(8px)',
            color: '#1B4332',
            '&:hover': {
              backgroundColor: '#FFFFFF',
            }
          }}
        >
          <MenuRoundedIcon />
        </IconButton>
      )}

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${actualDrawerWidth}px)` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Box
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3, md: 4 },
            pt: { xs: 8, sm: 3, md: 4 }, // Extra top padding on mobile to accommodate the floating button
            maxWidth: 1400,
            mx: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
