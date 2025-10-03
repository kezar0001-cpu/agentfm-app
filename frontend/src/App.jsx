import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from './components/AppLayout.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import ClientDashboardPage from './pages/ClientDashboardPage.jsx';
import ServiceRequestsPage from './pages/ServiceRequestsPage.jsx';
import PropertiesPage from './pages/PropertiesPage.jsx';
import PropertyDetailPage from './pages/PropertyDetailPage.jsx';
import PlansPage from './pages/PlansPage.jsx';
import InspectionsPage from './pages/InspectionsPage.jsx';
import JobsPage from './pages/JobsPage.jsx';
import RecommendationsPage from './pages/RecommendationsPage.jsx';
import SubscriptionsPage from './pages/SubscriptionsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  const { t } = useTranslation();

  const adminNavigation = [
    { to: '/admin/dashboard', label: t('navigation.adminDashboard') },
    { to: '/admin/service-requests', label: t('navigation.serviceRequests') },
    { to: '/admin/jobs', label: t('navigation.jobs') },
    { to: '/admin/plans', label: t('navigation.plans') },
    { to: '/admin/subscriptions', label: t('navigation.subscriptions') },
  ];

  const clientNavigation = [
    { to: '/client/dashboard', label: t('navigation.clientDashboard') },
    { to: '/client/properties', label: t('navigation.properties') },
    { to: '/client/inspections', label: t('navigation.inspections') },
    { to: '/client/recommendations', label: t('navigation.recommendations') },
    { to: '/client/reports', label: t('navigation.reports') },
  ];

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

      <Route element={<AppLayout workspace="admin" navigation={adminNavigation} />}>
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/service-requests" element={<ServiceRequestsPage />} />
        <Route path="/admin/jobs" element={<JobsPage />} />
        <Route path="/admin/plans" element={<PlansPage />} />
        <Route path="/admin/subscriptions" element={<SubscriptionsPage />} />
      </Route>

      <Route element={<AppLayout workspace="client" navigation={clientNavigation} />}>
        <Route path="/client/dashboard" element={<ClientDashboardPage />} />
        <Route path="/client/properties" element={<PropertiesPage />} />
        <Route path="/client/properties/:id" element={<PropertyDetailPage />} />
        <Route path="/client/inspections" element={<InspectionsPage />} />
        <Route path="/client/recommendations" element={<RecommendationsPage />} />
        <Route path="/client/reports" element={<ReportsPage />} />
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
