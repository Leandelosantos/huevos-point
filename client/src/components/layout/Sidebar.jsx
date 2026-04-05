import { useState, useEffect } from 'react';
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
  Button,
  Menu,
  MenuItem,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { THEMES, DEFAULT_THEME_ID } from '../../theme/themes';
import api from '../../services/api';
import logo from '../../assets/logo.png';

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 80;

const Sidebar = ({ mobileOpen, onMobileClose, desktopOpen, onDrawerToggle, topOffset = 0 }) => {
  const { user, isAdmin, isSuperAdmin, isDemo, activeTenant, switchTenant, logout } = useAuth();
  const { themeId } = useAppTheme();
  const sidebarConfig = THEMES[themeId]?.sidebar || THEMES[DEFAULT_THEME_ID].sidebar;
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  // Tenants disponibles para el superadmin (cargados desde la API)
  const [allTenants, setAllTenants] = useState([]);

  useEffect(() => {
    if (isSuperAdmin) {
      api.get('/tenants')
        .then(({ data }) => setAllTenants(data.data || []))
        .catch((err) => console.warn('[Sidebar] No se pudieron cargar las sucursales:', err.message));
    }
  }, [isSuperAdmin]);

  // La lista de tenants que se muestra en el menú de sucursales
  const tenantList = isSuperAdmin ? allTenants : (user?.tenants || []);

  // Anchor para el menu de cambio de sucursal
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleClickMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleSwitchTenant = async (tenant) => {
    try {
      await api.post('/audit-logs/action', {
        actionType: 'CAMBIAR_SUCURSAL',
        description: `El usuario ingresó a la sucursal: ${tenant.name}`,
        entity: 'tenant',
        entityId: tenant.id
      });
    } catch (err) {
      console.warn('No se pudo registrar en auditoría el cambio de sucursal', err);
    }
    switchTenant(tenant);
    handleCloseMenu();
    // Recargar vista para refetch con nuevo header
    window.location.reload();
  };
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // ... menuItems, handleNavigate, handleLogout logic remains identical
  const menuItems = [
    { label: 'Inicio', icon: <DashboardRoundedIcon />, path: '/' },
    ...(isAdmin || isSuperAdmin || isDemo
      ? [
          { label: 'Stock', icon: <InventoryRoundedIcon />, path: '/stock' },
          { label: 'Compras', icon: <ShoppingCartRoundedIcon />, path: '/purchases' },
          { label: 'Auditoría', icon: <HistoryRoundedIcon />, path: '/audit' },
          { label: 'Métricas', icon: <BarChartRoundedIcon />, path: '/metrics' },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          { label: 'Usuarios', icon: <PeopleRoundedIcon />, path: '/users' },
        ]
      : []),
    ...(isAdmin || isSuperAdmin
      ? [
          { label: 'Configuración', icon: <SettingsRoundedIcon />, path: '/config' },
        ]
      : []),
  ];

  const superadminItems = [
    { label: 'Dashboard Superadmin', icon: <AdminPanelSettingsRoundedIcon />, path: '/superadmin' },
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
        background: sidebarConfig.bg,
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
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, mb: 0.5 }}>
                Huevos Point
              </Typography>
              <Chip 
                label={activeTenant?.name || 'Cargando...'} 
                size="small" 
                sx={{ 
                  backgroundColor: sidebarConfig.chip.bg,
                  color: sidebarConfig.chip.color,
                  fontWeight: 800, 
                  fontSize: '0.65rem',
                  height: 20
                }}
              />
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
                <ListItemIcon sx={{ color: isActive ? sidebarConfig.accent : 'rgba(255,255,255,0.6)', minWidth: (!isMobile && !desktopOpen) ? 0 : 40, justifyContent: 'center' }}>
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
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: sidebarConfig.accent }} />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Superadmin section */}
      {isSuperAdmin && (
        <>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />
          {(!isMobile ? desktopOpen : true) && (
            <Typography
              variant="caption"
              sx={{
                px: 3, pt: 2, pb: 1, color: 'rgba(255,255,255,0.4)',
                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                display: 'block',
              }}
            >
              Panel Superadmin
            </Typography>
          )}
          <List sx={{ px: 1.5, pt: (!isMobile && !desktopOpen) ? 1 : 0 }}>
            {superadminItems.map((item) => {
              const isActive = location.pathname.startsWith('/superadmin') && item.path === '/superadmin';
              return (
                <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
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
                    <ListItemIcon sx={{ color: isActive ? sidebarConfig.accent : 'rgba(255,255,255,0.6)', minWidth: (!isMobile && !desktopOpen) ? 0 : 40, justifyContent: 'center' }}>
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
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: sidebarConfig.accent }} />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </>
      )}

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
          <Avatar sx={{ width: 36, height: 36, bgcolor: sidebarConfig.avatar, fontSize: '0.875rem', fontWeight: 700 }}>
            {user?.fullName?.charAt(0) || 'U'}
          </Avatar>
          {(!isMobile ? desktopOpen : true) && (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 600, lineHeight: 1.2 }} noWrap>
                {user?.fullName || 'Usuario'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                {user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'admin' ? 'Administrador' : user?.role === 'demo' ? 'Modo Demo' : 'Empleado'}
              </Typography>
            </Box>
          )}
        </Box>

        {/* M:N Menu Cambio de Sucursal */}
        {(isSuperAdmin || (user?.tenants?.length ?? 0) > 1) && (
          <Box sx={{ p: 1, pt: 0 }}>
            {(!isMobile ? desktopOpen : true) && (
              <Button
                fullWidth
                onClick={handleClickMenu}
                endIcon={<ExpandMoreIcon />}
                startIcon={<StorefrontIcon />}
                sx={{
                  justifyContent: 'space-between',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  mb: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                  }
                }}
              >
                Cambiar Sucursal
              </Button>
            )}

            <Menu
              anchorEl={anchorEl}
              open={openMenu}
              onClose={handleCloseMenu}
              PaperProps={{
                sx: {
                  bgcolor: sidebarConfig.chip.color,
                  color: '#fff',
                  mt: -1,
                  minWidth: 200,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }
              }}
              transformOrigin={{ horizontal: 'center', vertical: 'bottom' }}
              anchorOrigin={{ horizontal: 'center', vertical: 'top' }}
            >
              {tenantList.map((t) => (
                <MenuItem 
                  key={t.id} 
                  onClick={() => handleSwitchTenant(t)}
                  selected={activeTenant?.id === t.id}
                  sx={{
                    fontSize: '0.85rem',
                    '&.Mui-selected': { bgcolor: 'rgba(82, 183, 136, 0.3)' },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  {t.name}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        )}

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
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, top: topOffset, height: `calc(100% - ${topOffset}px)` },
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
            top: topOffset,
            height: `calc(100% - ${topOffset}px)`,
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
