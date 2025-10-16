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
      position="static"
      sx={{
        backgroundColor: 'white',
        color: 'black',
        boxShadow: 2,
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          py: { xs: 1, md: 0 },
        }}
      >
        <Typography
          variant="h6"
          sx={{
            flexGrow: 0,
            fontWeight: 'bold',
            cursor: 'pointer',
            mr: { xs: 0, md: 4 },
          }}
          onClick={() => navigate('/dashboard')}
        >
          AgentFM
        </Typography>

        <Box
          sx={{
            flexGrow: 1,
            display: { xs: 'none', md: 'flex' },
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
                fontSize: '0.875rem',
                fontWeight: isActive(item.href) ? 'bold' : 'normal',
                borderBottom: isActive(item.href) ? '2px solid #1976d2' : 'none',
                borderRadius: 0,
                minWidth: 'auto',
                px: 2,
              }}
            >
              {item.name}
            </Button>
          ))}
        </Box>

        {/* Mobile menu button */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, marginLeft: 'auto' }}>
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
                minWidth: 220,
              },
            }}
          >
            {navigation.map((item) => (
              <MenuItem
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                selected={isActive(item.href)}
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
                size="small"
                sx={{ textTransform: 'none' }}
              />
            </Box>
          </Menu>
        </Box>

        {/* Desktop logout button */}
        <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
          <LogoutButton
            variant="outlined"
            color="error"
            size="small"
            sx={{ textTransform: 'none' }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;
