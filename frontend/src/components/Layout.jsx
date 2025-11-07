import { Box } from '@mui/material';
import NavBar from './NavBar';
import TrialBanner from './TrialBanner';

function Layout({ children }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <TrialBanner />
      <NavBar />
      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          py: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Box sx={{ maxWidth: 1240, mx: 'auto', width: '100%' }}>{children}</Box>
      </Box>
    </Box>
  );
}

export default Layout;