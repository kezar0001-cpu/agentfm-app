import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Breadcrumbs as MUIBreadcrumbs, Link as MuiLink, Typography } from '@mui/material';

const DEFAULT_LABELS = {
  '': 'Dashboard',
  dashboard: 'Dashboard',
  properties: 'Properties',
  units: 'Units',
  inspections: 'Inspections',
  jobs: 'Jobs',
  plans: 'Plans',
  reports: 'Reports',
  recommendations: 'Recommendations',
  'service-requests': 'Service Requests',
  subscriptions: 'Subscriptions',
  profile: 'Profile',
  team: 'Team',
  owner: 'Owner',
  tenant: 'Tenant',
  technician: 'Technician',
  edit: 'Edit',
  new: 'New',
};

const normalizeOverride = (value) => {
  if (!value) return {};
  if (typeof value === 'string') {
    return { label: value };
  }
  return value;
};

const humanize = (segment) => {
  if (!segment) return '';
  const cleaned = decodeURIComponent(segment)
    .replace(/-/g, ' ')
    .replace(/_/g, ' ');
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const insertExtraCrumbs = (crumbs, extras = []) => {
  if (!extras?.length) {
    return crumbs;
  }

  const nextCrumbs = [...crumbs];

  extras.forEach((extra, index) => {
    if (!extra || !extra.label) {
      return;
    }

    const normalized = {
      ...extra,
      key: extra.key || `extra-${index}`,
    };

    if (extra.before) {
      const targetIndex = nextCrumbs.findIndex(
        (crumb) => crumb.path === extra.before || crumb.to === extra.before || crumb.key === extra.before,
      );
      if (targetIndex !== -1) {
        nextCrumbs.splice(targetIndex, 0, normalized);
        return;
      }
    }

    if (extra.after) {
      const targetIndex = nextCrumbs.findIndex(
        (crumb) => crumb.path === extra.after || crumb.to === extra.after || crumb.key === extra.after,
      );
      if (targetIndex !== -1) {
        nextCrumbs.splice(targetIndex + 1, 0, normalized);
        return;
      }
    }

    nextCrumbs.push(normalized);
  });

  return nextCrumbs;
};

export default function Breadcrumbs({
  labelOverrides = {},
  includeDashboard = true,
  extraCrumbs = [],
  lastItemClickable = false,
  separator = <NavigateNextIcon fontSize="small" />,
  sx,
  ...props
}) {
  const location = useLocation();

  const crumbs = useMemo(() => {
    const pathnames = location.pathname.split('/').filter(Boolean);
    const baseCrumbs = [];

    const resolveOverride = (key) => normalizeOverride(labelOverrides[key]);

    if (includeDashboard) {
      const dashboardOverride = resolveOverride('/dashboard') || resolveOverride('dashboard') || {};
      baseCrumbs.push({
        key: 'dashboard',
        label: dashboardOverride.label || DEFAULT_LABELS.dashboard,
        to: dashboardOverride.to || '/dashboard',
        path: '/dashboard',
      });
    }

    pathnames.forEach((segment, index) => {
      const path = `/${pathnames.slice(0, index + 1).join('/')}`;
      const override =
        resolveOverride(path) || resolveOverride(segment) || {};

      if (override.hidden) {
        return;
      }

      const label =
        override.label ||
        DEFAULT_LABELS[segment] ||
        humanize(segment) ||
        segment;

      const crumb = {
        key: path,
        label,
        to: override.to || path,
        path,
      };

      baseCrumbs.push(crumb);
    });

    const withExtras = insertExtraCrumbs(baseCrumbs, extraCrumbs);

    if (withExtras.length) {
      withExtras[withExtras.length - 1] = {
        ...withExtras[withExtras.length - 1],
        isLast: true,
      };
      for (let i = 0; i < withExtras.length - 1; i += 1) {
        withExtras[i] = { ...withExtras[i], isLast: false };
      }
    }

    return withExtras;
  }, [extraCrumbs, includeDashboard, labelOverrides, location.pathname]);

  if (!crumbs.length) {
    return null;
  }

  return (
    <MUIBreadcrumbs
      aria-label="breadcrumb"
      separator={separator}
      sx={{ mb: 2, ...sx }}
      {...props}
    >
      {crumbs.map((crumb, index) => {
        const isLast = crumb.isLast ?? index === crumbs.length - 1;

        if (isLast && !lastItemClickable) {
          return (
            <Typography key={crumb.key || index} color="text.primary">
              {crumb.label}
            </Typography>
          );
        }

        if (!crumb.to) {
          return (
            <Typography key={crumb.key || index} color={isLast ? 'text.primary' : 'text.secondary'}>
              {crumb.label}
            </Typography>
          );
        }

        return (
          <MuiLink
            key={crumb.key || index}
            component={RouterLink}
            underline="hover"
            color="inherit"
            to={crumb.to}
          >
            {crumb.label}
          </MuiLink>
        );
      })}
    </MUIBreadcrumbs>
  );
}

Breadcrumbs.propTypes = {
  labelOverrides: PropTypes.object,
  includeDashboard: PropTypes.bool,
  extraCrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      label: PropTypes.node.isRequired,
      to: PropTypes.string,
      before: PropTypes.string,
      after: PropTypes.string,
    }),
  ),
  lastItemClickable: PropTypes.bool,
  separator: PropTypes.node,
  sx: PropTypes.object,
};
