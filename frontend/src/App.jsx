import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from './components/AppLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
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

  const navigation = [
    { to: '/', label: t('navigation.dashboard') },
    { to: '/properties', label: t('navigation.properties') },
    { to: '/plans', label: t('navigation.plans') },
    { to: '/inspections', label: t('navigation.inspections') },
    { to: '/jobs', label: t('navigation.jobs') },
    { to: '/recommendations', label: t('navigation.recommendations') },
    { to: '/subscriptions', label: t('navigation.subscriptions') },
    { to: '/reports', label: t('navigation.reports') },
  ];

  return (
    <Routes>
      <Route element={<AppLayout navigation={navigation} />}>
        <Route index element={<DashboardPage />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="properties/:id" element={<PropertyDetailPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="inspections" element={<InspectionsPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}
