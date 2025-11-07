import { Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  useMediaQuery,
  useTheme,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';

function PublicNavBar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);

  const handleOpenMobileMenu = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleCloseMobileMenu = () => {
    setMobileMenuAnchor(null);
  };

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Blog', to: '/blog' },
  ];

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        bgcolor: 'rgba(255, 255, 255, 0.95)',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          sx={{
            minHeight: { xs: 64, sm: 72 },
            px: { xs: 0, sm: 2 },
          }}
        >
          {/* Logo */}
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              fontWeight: 800,
              textDecoration: 'none',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #b91c1c 0%, #f97316 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'scale(1.02)',
              },
            }}
          >
            BuildState FM
          </Typography>

          {/* Desktop Navigation */}
          {!isMobile ? (
            <>
              <Box
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                {navLinks.map((link) => (
                  <Button
                    key={link.label}
                    component={Link}
                    to={link.to}
                    color="inherit"
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      px: 2,
                      '&:hover': {
                        bgcolor: 'rgba(185, 28, 28, 0.08)',
                      },
                    }}
                  >
                    {link.label}
                  </Button>
                ))}
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  component={Link}
                  to="/signin"
                  color="inherit"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 2,
                  }}
                >
                  Sign in
                </Button>
                <Button
                  component={Link}
                  to="/signup"
                  variant="contained"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                    background: 'linear-gradient(135deg, #b91c1c 0%, #f97316 100%)',
                    boxShadow: '0 4px 14px 0 rgb(185 28 28 / 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #991b1b 0%, #ea580c 100%)',
                      boxShadow: '0 6px 20px 0 rgb(185 28 28 / 0.4)',
                    },
                  }}
                >
                  Start free trial
                </Button>
              </Box>
            </>
          ) : (
            <>
              {/* Mobile Menu Button */}
              <Box sx={{ flexGrow: 1 }} />
              <IconButton
                size="large"
                aria-label="open navigation menu"
                onClick={handleOpenMobileMenu}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>

              {/* Mobile Menu */}
              <Menu
                anchorEl={mobileMenuAnchor}
                open={Boolean(mobileMenuAnchor)}
                onClose={handleCloseMobileMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                  elevation: 3,
                  sx: {
                    minWidth: 200,
                    mt: 1.5,
                  },
                }}
              >
                {navLinks.map((link) => (
                  <MenuItem
                    key={link.label}
                    component={Link}
                    to={link.to}
                    onClick={handleCloseMobileMenu}
                  >
                    {link.label}
                  </MenuItem>
                ))}
                <MenuItem
                  component={Link}
                  to="/signin"
                  onClick={handleCloseMobileMenu}
                >
                  Sign in
                </MenuItem>
                <MenuItem
                  component={Link}
                  to="/signup"
                  onClick={handleCloseMobileMenu}
                  sx={{ fontWeight: 600, color: 'primary.main' }}
                >
                  Start free trial
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default PublicNavBar;
