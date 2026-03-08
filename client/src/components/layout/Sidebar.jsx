import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Avatar,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 80;

const Sidebar = ({ mobileOpen, onMobileClose, desktopOpen, onDrawerToggle }) => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // ... menuItems, handleNavigate, handleLogout logic remains identical
  const menuItems = [
    { label: 'Inicio', icon: <DashboardRoundedIcon />, path: '/' },
    ...(isAdmin
      ? [
          { label: 'Stock', icon: <InventoryRoundedIcon />, path: '/stock' },
          { label: 'Auditoría', icon: <HistoryRoundedIcon />, path: '/audit' },
          { label: 'Métricas', icon: <BarChartRoundedIcon />, path: '/metrics' },
        ]
      : []),
  ];

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) onMobileClose();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #1B4332 0%, #2D6A4F 100%)',
        color: '#FFFFFF',
        overflowX: 'hidden',
      }}
    >
      {/* Brand & Toggle */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 74, justifyContent: (!isMobile && !desktopOpen) ? 'center' : 'flex-start' }}>
        <IconButton
          color="inherit"
          onClick={onDrawerToggle}
          sx={{ display: { xs: 'block', md: 'block' } }}
        >
          <MenuRoundedIcon sx={{ color: '#FFFFFF' }} />
        </IconButton>
        {(!isMobile ? desktopOpen : true) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32, height: 32, borderRadius: '8px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
            <Box
              component="img"
              src={logo}
              alt="Huevos Point Logo"
              sx={{ width: 24, height: 24 }}
            />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
                Huevos Point
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      {(!isMobile ? desktopOpen : true) && (
        <Typography
          variant="caption"
          sx={{
            px: 3, pt: 2, pb: 1, color: 'rgba(255,255,255,0.4)',
            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
          }}
        >
          Menú
        </Typography>
      )}

      <List sx={{ px: 1.5, flex: 1, pt: (!isMobile && !desktopOpen) ? 2 : 0 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                sx={{
                  borderRadius: '10px', py: 1.2, px: (!isMobile && !desktopOpen) ? 0 : 2,
                  justifyContent: (!isMobile && !desktopOpen) ? 'center' : 'flex-start',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  '&:hover': {
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon sx={{ color: isActive ? '#B7E4C7' : 'rgba(255,255,255,0.6)', minWidth: (!isMobile && !desktopOpen) ? 0 : 40, justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                {(!isMobile ? desktopOpen : true) && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 700 : 500, fontSize: '0.875rem',
                      color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
                    }}
                  />
                )}
                {isActive && (!isMobile ? desktopOpen : true) && (
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#B7E4C7' }} />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      {/* User section */}
      <Box sx={{ p: (!isMobile && !desktopOpen) ? 1 : 2 }}>
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, p: (!isMobile && !desktopOpen) ? 0.5 : 1.5,
            justifyContent: (!isMobile && !desktopOpen) ? 'center' : 'flex-start',
            borderRadius: '10px', backgroundColor: (!isMobile && !desktopOpen) ? 'transparent' : 'rgba(255,255,255,0.08)', mb: 1,
          }}
        >
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#52B788', fontSize: '0.875rem', fontWeight: 700 }}>
            {user?.fullName?.charAt(0) || 'U'}
          </Avatar>
          {(!isMobile ? desktopOpen : true) && (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 600, lineHeight: 1.2 }} noWrap>
                {user?.fullName || 'Usuario'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                {user?.role === 'admin' ? 'Administrador' : 'Empleado'}
              </Typography>
            </Box>
          )}
        </Box>

        <ListItemButton
          onClick={handleLogout}
          sx={{ borderRadius: '10px', py: 1, px: (!isMobile && !desktopOpen) ? 0 : 2, justifyContent: (!isMobile && !desktopOpen) ? 'center' : 'flex-start', '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}
        >
          <ListItemIcon sx={{ color: 'rgba(255,255,255,0.6)', minWidth: (!isMobile && !desktopOpen) ? 0 : 40, justifyContent: 'center' }}>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          {(!isMobile ? desktopOpen : true) && (
            <ListItemText
              primary="Cerrar Sesión"
              primaryTypographyProps={{ fontSize: '0.813rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}
            />
          )}
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{
        width: { md: desktopOpen ? DRAWER_WIDTH : COLLAPSED_WIDTH },
        flexShrink: { md: 0 },
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: desktopOpen ? DRAWER_WIDTH : COLLAPSED_WIDTH,
            boxSizing: 'border-box',
            borderRight: 'none',
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export { DRAWER_WIDTH };
export default Sidebar;
