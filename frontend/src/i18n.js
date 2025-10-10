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
