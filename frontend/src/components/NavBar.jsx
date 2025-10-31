import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LogoutButton from './LogoutButton';
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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);

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

  // Helper to mark active links (works with nested paths)
  const isActive = (href) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

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
          <LogoutButton
            variant="outlined"
            color="error"
            size="small"
            sx={{ textTransform: 'none' }}
          />
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
    </AppBar>
  );
}

export default NavBar;
