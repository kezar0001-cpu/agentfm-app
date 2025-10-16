import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import InspectionsPage from './pages/InspectionsPage';
import InspectionDetailPage from './pages/InspectionDetailPage';
import JobsPage from './pages/JobsPage';
import ServiceRequestsPage from './pages/ServiceRequestsPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import LoginPage from './pages/LoginPage';
import { useAuth } from './hooks/useAuth';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Router Configuration
const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      // Properties Routes
      {
        path: 'properties',
        element: <PropertiesPage />,
      },
      {
        path: 'properties/:id',
        element: <PropertyDetailPage />,
      },
      // Inspections Routes
      {
        path: 'inspections',
        element: <InspectionsPage />,
      },
      {
        path: 'inspections/:id',
        element: <InspectionDetailPage />,
      },
      // Jobs Routes
      {
        path: 'jobs',
        element: <JobsPage />,
      },
      // Service Requests Routes
      {
        path: 'service-requests',
        element: <ServiceRequestsPage />,
      },
      // Subscriptions Routes (Property Manager only)
      {
        path: 'subscriptions',
        element: (
          <ProtectedRoute allowedRoles={['PROPERTY_MANAGER']}>
            <SubscriptionsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
