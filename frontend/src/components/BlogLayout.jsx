import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Container, Button, Box, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Divider, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';
import PropTypes from 'prop-types';
import { getAuthToken } from '../lib/auth';

const BlogLayout = ({ children }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthenticated = !!getAuthToken();

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Blog', path: '/blog' },
  ];

  const handleDrawerToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2, fontWeight: 700, color: 'primary.main' }}>
        AgentFM
      </Typography>
      <Divider />
      <List>
        {navLinks.map((link) => (
          <ListItem key={link.path} disablePadding>
            <ListItemButton component={Link} to={link.path} sx={{ textAlign: 'center' }}>
              <ListItemText primary={link.label} />
            </ListItemButton>
          </ListItem>
        ))}
        <Divider sx={{ my: 1 }} />
        {isAuthenticated ? (
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/dashboard" sx={{ textAlign: 'center' }}>
              <ListItemText primary="Dashboard" />
            </ListItemButton>
          </ListItem>
        ) : (
          <>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/signin" sx={{ textAlign: 'center' }}>
                <ListItemText primary="Sign In" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/signup" sx={{ textAlign: 'center' }}>
                <ListItemText primary="Sign Up" />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="sticky" sx={{ bgcolor: 'white', boxShadow: 1 }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters>
            {/* Mobile Menu Icon */}
            <IconButton
              color="primary"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            {/* Logo */}
            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{
                mr: 4,
                fontWeight: 700,
                color: 'primary.main',
                textDecoration: 'none',
                display: { xs: 'none', sm: 'block' }
              }}
            >
              AgentFM
            </Typography>

            {/* Desktop Navigation */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
              {navLinks.map((link) => (
                <Button
                  key={link.path}
                  component={Link}
                  to={link.path}
                  sx={{
                    color: 'text.primary',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: 'grey.100'
                    }
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>

            {/* Mobile Logo (centered) */}
            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{
                flexGrow: 1,
                fontWeight: 700,
                color: 'primary.main',
                textDecoration: 'none',
                display: { xs: 'block', sm: 'none' },
                textAlign: 'center'
              }}
            >
              AgentFM
            </Typography>

            {/* Auth Buttons */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
              {isAuthenticated ? (
                <Button
                  variant="contained"
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    variant="text"
                    onClick={() => navigate('/signin')}
                    sx={{ color: 'text.primary' }}
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/signup')}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileMenuOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          bgcolor: 'grey.900',
          color: 'white',
          py: 6,
          mt: 'auto'
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 4
            }}
          >
            {/* Brand */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                AgentFM
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.400' }}>
                Professional Property Management Platform
              </Typography>
            </Box>

            {/* Product */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Product
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link to="/#features" style={{ color: '#9ca3af', textDecoration: 'none' }}>
                  Features
                </Link>
                <Link to="/#workflow" style={{ color: '#9ca3af', textDecoration: 'none' }}>
                  How it Works
                </Link>
                <Link to="/#pricing" style={{ color: '#9ca3af', textDecoration: 'none' }}>
                  Pricing
                </Link>
                <Link to="/blog" style={{ color: '#9ca3af', textDecoration: 'none' }}>
                  Blog
                </Link>
              </Box>
            </Box>

            {/* Company */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Company
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link to="/" style={{ color: '#9ca3af', textDecoration: 'none' }}>
                  About
                </Link>
                <Link to="/#faqs" style={{ color: '#9ca3af', textDecoration: 'none' }}>
                  FAQ
                </Link>
                <Typography variant="body2" sx={{ color: 'grey.400', cursor: 'pointer' }}>
                  Contact
                </Typography>
              </Box>
            </Box>

            {/* Get Started */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Get Started
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {isAuthenticated ? (
                  <Link to="/dashboard" style={{ color: '#9ca3af', textDecoration: 'none' }}>
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link to="/signup" style={{ color: '#9ca3af', textDecoration: 'none' }}>
                      Sign Up
                    </Link>
                    <Link to="/signin" style={{ color: '#9ca3af', textDecoration: 'none' }}>
                      Sign In
                    </Link>
                  </>
                )}
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 4, borderColor: 'grey.700' }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="body2" sx={{ color: 'grey.400' }}>
              © {new Date().getFullYear()} AgentFM. All rights reserved.
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography variant="body2" sx={{ color: 'grey.400', cursor: 'pointer' }}>
                Privacy Policy
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.400', cursor: 'pointer' }}>
                Terms of Service
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

BlogLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default BlogLayout;
