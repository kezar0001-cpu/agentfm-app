import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LogoutButton from './LogoutButton';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import SearchIcon from '@mui/icons-material/Search';
import { useCurrentUser } from '../context/UserContext';

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Keyboard shortcut for search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Properties', href: '/properties' },
    { name: 'Inspections', href: '/inspections' },
    { name: 'Jobs', href: '/jobs' },
    { name: 'Reports', href: '/reports' },
    { name: 'Plans', href: '/plans' },
    { name: 'Service Requests', href: '/service-requests' },
    { name: 'Recommendations', href: '/recommendations' },
    { name: 'Subscriptions', href: '/subscriptions' },
  ];
  
  // Add Team link for Property Managers
  if (user?.role === 'PROPERTY_MANAGER') {
    navigation.push({ name: 'Team', href: '/team' });
  }

  const handleNavigation = (path) => {
    navigate(path);
    handleCloseMobileMenu();
  };

  const handleOpenMobileMenu = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleCloseMobileMenu = () => {
    setMobileMenuAnchor(null);
  };

  const handleOpenUserMenu = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setUserMenuAnchor(null);
  };

  const handleUserMenuNavigation = (path) => {
    navigate(path);
    handleCloseUserMenu();
  };

  // Helper to mark active links (works with nested paths)
  const isActive = (href) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return '?';
    const firstInitial = user.firstName?.[0] || '';
    const lastInitial = user.lastName?.[0] || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backdropFilter: 'blur(6px)',
      }}
    >
      <Toolbar
        sx={{
          minHeight: { xs: 64, sm: 72 },
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1.5, md: 2 },
          flexWrap: 'wrap',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: { xs: '100%', md: 'auto' },
            gap: 1.5,
          }}
        >
          <Typography
            variant="h6"
            onClick={() => navigate('/dashboard')}
            sx={{
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: 0.4,
            }}
          >
            AgentFM
          </Typography>

          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="open navigation menu"
              aria-controls="mobile-menu"
              aria-haspopup="true"
              onClick={handleOpenMobileMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {navigation.map((item) => (
            <Button
              key={item.name}
              color="inherit"
              onClick={() => handleNavigation(item.href)}
              sx={{
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: isActive(item.href) ? 700 : 500,
                borderBottom: isActive(item.href) ? '2px solid' : '2px solid transparent',
                borderColor: isActive(item.href) ? 'primary.main' : 'transparent',
                borderRadius: 999,
                px: 2,
                py: 0.5,
              }}
            >
              {item.name}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
          <Tooltip title="Search (Ctrl+K)">
            <IconButton
              color="inherit"
              onClick={() => setSearchOpen(true)}
              size="medium"
            >
              <SearchIcon />
            </IconButton>
          </Tooltip>

          <NotificationBell />

          <Tooltip title="Account">
            <IconButton
              onClick={handleOpenUserMenu}
              size="small"
              sx={{ ml: 1 }}
              aria-label="account menu"
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: 'primary.main',
                  fontSize: '0.875rem'
                }}
              >
                {getUserInitials()}
              </Avatar>
            </IconButton>
          </Tooltip>
          
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleCloseUserMenu}
            onClick={handleCloseUserMenu}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              elevation: 3,
              sx: {
                minWidth: 200,
                mt: 1.5,
                '& .MuiMenuItem-root': {
                  px: 2,
                  py: 1,
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            
            <MenuItem onClick={() => handleUserMenuNavigation('/profile')}>
              <PersonIcon fontSize="small" sx={{ mr: 1.5 }} />
              Profile
            </MenuItem>
            
            {user?.role === 'PROPERTY_MANAGER' && (
              <MenuItem onClick={() => handleUserMenuNavigation('/team')}>
                <GroupIcon fontSize="small" sx={{ mr: 1.5 }} />
                Team Management
              </MenuItem>
            )}
            
            <Divider sx={{ my: 1 }} />
            
            <Box sx={{ px: 2, pb: 1 }}>
              <LogoutButton
                fullWidth
                variant="outlined"
                color="error"
                size="small"
                sx={{ textTransform: 'none' }}
              />
            </Box>
          </Menu>
        </Box>

        <Menu
          id="mobile-menu"
          anchorEl={mobileMenuAnchor}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          open={Boolean(mobileMenuAnchor)}
          onClose={handleCloseMobileMenu}
          keepMounted
          sx={{
            '& .MuiPaper-root': {
              minWidth: 240,
              borderRadius: 2,
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
          
          {navigation.map((item) => (
            <MenuItem
              key={item.name}
              onClick={() => handleNavigation(item.href)}
              selected={isActive(item.href)}
              sx={{ fontWeight: isActive(item.href) ? 600 : 500 }}
            >
              {item.name}
            </MenuItem>
          ))}
          
          <Divider sx={{ my: 1 }} />
          
          <MenuItem onClick={() => handleNavigation('/profile')}>
            <PersonIcon fontSize="small" sx={{ mr: 1.5 }} />
            Profile
          </MenuItem>
          
          {user?.role === 'PROPERTY_MANAGER' && (
            <MenuItem onClick={() => handleNavigation('/team')}>
              <GroupIcon fontSize="small" sx={{ mr: 1.5 }} />
              Team Management
            </MenuItem>
          )}
          
          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ px: 2, pb: 1 }}>
            <LogoutButton
              fullWidth
              variant="outlined"
              color="error"
              size="medium"
              sx={{ textTransform: 'none' }}
            />
          </Box>
        </Menu>
      </Toolbar>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </AppBar>
  );
}

export default NavBar;
