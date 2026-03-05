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

      {/* Mobile/Tablet Top AppBar */}
      {isMobile && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            zIndex: theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 56 }, px: { xs: 1.5 } }}>
            <IconButton
              color="inherit"
              aria-label="abrir menú"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 1.5 }}
            >
              <MenuRoundedIcon />
            </IconButton>
            <Box
              sx={{
                width: 30, height: 30, borderRadius: '8px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mr: 1,
              }}
            >
              <EggRoundedIcon sx={{ fontSize: 18, color: '#B7E4C7' }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
              Huevos Point
            </Typography>
          </Toolbar>
        </AppBar>
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
        {/* Spacer for mobile AppBar */}
        {isMobile && <Toolbar sx={{ minHeight: { xs: 56 } }} />}
        <Box
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3, md: 4 },
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
