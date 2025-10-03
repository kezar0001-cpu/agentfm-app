import { useEffect } from 'react';
import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container, Box, Stack, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import WorkspaceToggle from './WorkspaceToggle.jsx';

const ACTIVE_VARIANT = {
  variant: 'contained',
  color: 'primary',
};

const INACTIVE_VARIANT = {
  variant: 'text',
  color: 'inherit',
};

function Navigation({ items }) {
  const location = useLocation();

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
      {items.map((item) => {
        const isRoot = item.to === '/';
        const isActive = isRoot
          ? location.pathname === '/'
          : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
        const buttonProps = isActive ? ACTIVE_VARIANT : INACTIVE_VARIANT;

        return (
          <Button
            key={item.to}
            component={RouterLink}
            to={item.to}
            {...buttonProps}
            sx={{ textTransform: 'none', fontWeight: isActive ? 600 : 400 }}
          >
            {item.label}
          </Button>
        );
      })}
    </Stack>
  );
}

export default function AppLayout({ navigation, workspace }) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.body.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const handleToggleLanguage = () => {
    const next = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(next);
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: (theme) => theme.palette.background.default }}>
      <AppBar position="sticky" color="default" elevation={1} sx={{ mb: 4, backdropFilter: 'blur(12px)' }}>
        <Toolbar sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t('brand')}
          </Typography>
          <WorkspaceToggle activeWorkspace={workspace} />
          <Divider flexItem orientation="vertical" sx={{ mx: 1, display: { xs: 'none', md: 'block' } }} />
          <Box sx={{ flexGrow: 1 }}>
            <Navigation items={navigation} />
          </Box>
          <Button variant="outlined" color="secondary" onClick={handleToggleLanguage} sx={{ textTransform: 'none' }}>
            {i18n.language === 'en' ? 'العربية' : 'English'}
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ pb: 6 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
