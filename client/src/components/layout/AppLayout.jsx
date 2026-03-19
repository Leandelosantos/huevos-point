import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, IconButton, useMediaQuery, useTheme } from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';
import DemoBanner from './DemoBanner';
import { useAuth } from '../../context/AuthContext';

const COLLAPSED_WIDTH = 80;

const DEMO_BANNER_HEIGHT = 36;

const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [desktopOpen, setDesktopOpen] = useState(true);
  const { isDemo } = useAuth();

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopOpen(!desktopOpen);
    }
  };

  const actualDrawerWidth = isMobile ? 0 : (desktopOpen ? DRAWER_WIDTH : COLLAPSED_WIDTH);

  const topOffset = isDemo ? DEMO_BANNER_HEIGHT : 0;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', maxWidth: '100vw', overflowX: 'hidden', bgcolor: 'background.default' }}>
      {isDemo && <DemoBanner />}

      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        desktopOpen={desktopOpen}
        onDrawerToggle={handleDrawerToggle}
        topOffset={topOffset}
      />

      {/* Floating Hamburger Button for Mobile */}
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="abrir menú"
          onClick={handleDrawerToggle}
          sx={{
            position: 'fixed',
            top: 16 + topOffset,
            left: 16,
            zIndex: theme.zIndex.drawer - 1,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(8px)',
            color: '#1B4332',
            '&:hover': { backgroundColor: '#FFFFFF' },
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
          width: { xs: '100%', md: `calc(100% - ${actualDrawerWidth}px)` },
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
            pt: { xs: `${8 * 8 + topOffset}px`, sm: `${3 * 8 + topOffset}px`, md: `${4 * 8 + topOffset}px` },
            maxWidth: '100%',
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
