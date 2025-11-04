import '@testing-library/jest-dom';
import i18n from './i18n';

// Initialize i18next for tests
i18n.init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'reports.title': 'Reports Dashboard',
        'reports.new_report': 'New Report',
        'reports.financial.title': 'Financial Reports',
        'reports.financial.description': 'Generate reports on income, expenses, and profitability.',
        'reports.occupancy.title': 'Occupancy Reports',
        'reports.occupancy.description': 'Track vacancy rates, lease expirations, and more.',
        'reports.maintenance.title': 'Maintenance Reports',
        'reports.maintenance.description': 'View maintenance history, costs, and response times.',
        'reports.tenant.title': 'Tenant Reports',
        'reports.tenant.description': 'Get insights into tenant demographics and payment history.',
      },
    },
  },
});
