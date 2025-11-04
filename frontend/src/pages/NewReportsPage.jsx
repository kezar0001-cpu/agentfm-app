import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  Assessment,
  Add,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const ReportCard = ({ title, description, icon, onClick }) => (
  <Paper
    onClick={onClick}
    sx={{
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: 200,
      cursor: 'pointer',
      '&:hover': {
        boxShadow: 6,
      },
    }}
  >
    {icon}
    <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
      {description}
    </Typography>
  </Paper>
);

export default function NewReportsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const reports = [
    {
      title: t('reports.financial.title'),
      description: t('reports.financial.description'),
      icon: <Assessment sx={{ fontSize: 40 }} />,
      reportType: 'Financial',
    },
    {
      title: t('reports.occupancy.title'),
      description: t('reports.occupancy.description'),
      icon: <Assessment sx={{ fontSize: 40 }} />,
      reportType: 'Occupancy',
    },
    {
      title: t('reports.maintenance.title'),
      description: t('reports.maintenance.description'),
      icon: <Assessment sx={{ fontSize: 40 }} />,
      reportType: 'Maintenance',
    },
    {
      title: t('reports.tenant.title'),
      description: t('reports.tenant.description'),
      icon: <Assessment sx={{ fontSize: 40 }} />,
      reportType: 'Tenant',
    },
  ];

  const handleReportCardClick = (reportType) => {
    navigate(`/reports/${reportType}`);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('reports.title')}
          </Typography>
          <Button variant="contained" startIcon={<Add />}>
            {t('reports.new_report')}
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {reports.map((report, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <ReportCard
                {...report}
                onClick={() => handleReportCardClick(report.reportType)}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
