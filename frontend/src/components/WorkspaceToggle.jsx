import { Button, ButtonGroup } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function WorkspaceToggle({ activeWorkspace }) {
  const { t } = useTranslation();

  return (
    <ButtonGroup size="small" color="primary" sx={{ borderRadius: 999, overflow: 'hidden' }}>
      <Button
        component={RouterLink}
        to="/admin/dashboard"
        variant={activeWorkspace === 'admin' ? 'contained' : 'outlined'}
        sx={{ textTransform: 'none', fontWeight: 600 }}
      >
        {t('workspaces.admin')}
      </Button>
      <Button
        component={RouterLink}
        to="/client/dashboard"
        variant={activeWorkspace === 'client' ? 'contained' : 'outlined'}
        sx={{ textTransform: 'none', fontWeight: 600 }}
      >
        {t('workspaces.client')}
      </Button>
    </ButtonGroup>
  );
}
