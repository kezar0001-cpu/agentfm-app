import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from './components/AppLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import PropertiesPage from './pages/PropertiesPage.jsx';
import PropertyDetailPage from './pages/PropertyDetailPage.jsx';
import PlansPage from './pages/PlansPage.jsx';
import InspectionsPage from './pages/InspectionsPage.jsx';
import JobsPage from './pages/JobsPage.jsx';
import ServiceRequestsPage from './pages/ServiceRequestsPage.jsx';
import RecommendationsPage from './pages/RecommendationsPage.jsx';
import SubscriptionsPage from './pages/SubscriptionsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import LoginPage from './pages/SignIn.jsx';
import { AuthProvider } from './hooks/useAuth';
import RequireAuth from './components/RequireAuth.jsx';

export default function App() {
  const { t } = useTranslation();

  const navigation = [
    { to: '/', label: t('navigation.dashboard') },
    { to: '/properties', label: t('navigation.properties') },
    { to: '/plans', label: t('navigation.plans') },
    { to: '/inspections', label: t('navigation.inspections') },
    { to: '/jobs', label: t('navigation.jobs') },
    { to: '/service-requests', label: t('navigation.serviceRequests') },
    { to: '/recommendations', label: t('navigation.recommendations') },
    { to: '/subscriptions', label: t('navigation.subscriptions') },
    { to: '/reports', label: t('navigation.reports') },
  ];

  return (
    <AuthProvider>
      <Routes>
        {/* 🔹 Public route: no AppLayout */}
        <Route path="login" element={<LoginPage />} />

        {/* 🔹 Private routes: wrapped in AppLayout */}
        <Route element={<AppLayout navigation={navigation} />}>
          <Route index element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="properties" element={<RequireAuth><PropertiesPage /></RequireAuth>} />
          <Route path="properties/:id" element={<RequireAuth><PropertyDetailPage /></RequireAuth>} />
          <Route path="plans" element={<RequireAuth><PlansPage /></RequireAuth>} />
          <Route path="inspections" element={<RequireAuth><InspectionsPage /></RequireAuth>} />
          <Route path="jobs" element={<RequireAuth><JobsPage /></RequireAuth>} />
          <Route path="service-requests" element={<RequireAuth><ServiceRequestsPage /></RequireAuth>} />
          <Route path="recommendations" element={<RequireAuth><RecommendationsPage /></RequireAuth>} />
          <Route path="subscriptions" element={<RequireAuth><SubscriptionsPage /></RequireAuth>} />
          <Route path="reports" element={<RequireAuth><ReportsPage /></RequireAuth>} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
