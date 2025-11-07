import { AppBar, Toolbar, Typography, Button, Box, Container, Divider } from '@mui/material';
import { Link } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

const BlogPublicNav = () => {
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          {/* Logo/Brand */}
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'primary.main',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            AgentFM Blog
          </Typography>

          {/* Navigation Links */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              component={Link}
              to="/"
              startIcon={<HomeIcon />}
              color="inherit"
            >
              Home
            </Button>
            <Button
              component={Link}
              to="/signin"
              startIcon={<LoginIcon />}
              color="inherit"
            >
              Sign In
            </Button>
            <Button
              component={Link}
              to="/signup"
              startIcon={<PersonAddIcon />}
              variant="contained"
              color="primary"
            >
              Sign Up
            </Button>

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

            <Button
              component={Link}
              to="/admin/blog/login"
              startIcon={<AdminPanelSettingsIcon />}
              color="secondary"
              size="small"
              sx={{ textTransform: 'none' }}
            >
              Admin
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default BlogPublicNav;
