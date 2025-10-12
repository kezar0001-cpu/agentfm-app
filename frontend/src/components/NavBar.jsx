import { useNavigate, useLocation } from 'react-router-dom';
import LogoutButton from './LogoutButton';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

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
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: 'white', color: 'black', boxShadow: 2 }}>
      <Toolbar>
        <Typography
          variant="h6"
          sx={{ flexGrow: 0, mr: 4, fontWeight: 'bold', cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}
        >
          AgentFM
        </Typography>

        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          {navigation.map((item) => (
            <Button
              key={item.name}
              color="inherit"
              onClick={() => handleNavigation(item.href)}
              sx={{
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: location.pathname === item.href ? 'bold' : 'normal',
                borderBottom: location.pathname === item.href ? '2px solid #1976d2' : 'none',
                borderRadius: 0,
                minWidth: 'auto',
                px: 2,
              }}
            >
              {item.name}
            </Button>
          ))}
        </Box>

        <LogoutButton variant="outlined" color="error" size="small" sx={{ textTransform: 'none' }} />
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;
