import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      // Common
      welcome: 'Welcome',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      update: 'Update',
      search: 'Search',
      filter: 'Filter',
      
      // Auth
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot Password?',
      
      // Dashboard
      dashboard: 'Dashboard',
      properties: 'Properties',
      tenants: 'Tenants',
      maintenance: 'Maintenance',
      reports: 'Reports',
      'reports.title': 'Reports Dashboard',
      'reports.description': 'Generate and view reports for your properties.',
      'reports.new_report': 'New Report',
      'reports.financial.title': 'Financial Reports',
      'reports.financial.description': 'Generate reports on income, expenses, and profitability.',
      'reports.occupancy.title': 'Occupancy Reports',
      'reports.occupancy.description': 'Track vacancy rates, lease expirations, and more.',
      'reports.maintenance.title': 'Maintenance Reports',
      'reports.maintenance.description': 'View maintenance history, costs, and response times.',
      'reports.tenant.title': 'Tenant Reports',
      'reports.tenant.description': 'Get insights into tenant demographics and payment history.',
      settings: 'Settings',
      
      // Properties
      propertyName: 'Property Name',
      address: 'Address',
      city: 'City',
      postcode: 'Postcode',
      country: 'Country',
      type: 'Type',
      status: 'Status',
      units: 'Units',
      
      // Maintenance
      maintenanceRequest: 'Maintenance Request',
      category: 'Category',
      urgency: 'Urgency',
      title: 'Title',
      description: 'Description',
      submitted: 'Submitted',
      inProgress: 'In Progress',
      completed: 'Completed',
      
      // Tenants
      tenantName: 'Tenant Name',
      phone: 'Phone',
      unit: 'Unit',
      leaseStart: 'Lease Start',
      leaseEnd: 'Lease End',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
