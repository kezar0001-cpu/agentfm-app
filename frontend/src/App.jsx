// frontend/src/App.jsx
import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import GlobalGuard from './components/GlobalGuard.jsx';
import AuthGate from './authGate';
import Layout from './components/Layout';

// Simple fallback
function RouteFallback() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Loading…</div>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#1f2937' }}>404</h1>
        <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>The page you are looking for could not be found.</p>
        <button
          onClick={() => (window.location.href = '/signin')}
          style={{ marginTop: '1rem', color: '#2563eb', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer' }}
        >
          Go to Sign In
        </button>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error('App Error:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px' }}>
          <h1>Something went wrong.</h1>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---- Lazy pages (Vite will code-split these) ----
const SignIn = lazy(() => import('./pages/SignIn.jsx'));
const SignUp = lazy(() => import('./pages/SignUp.jsx'));
const AuthCallback = lazy(() => import('./pages/AuthCallback.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.tsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.tsx'));
const Dashboard = lazy(() => import('./pages/DashboardPage.jsx'));
const PropertiesPage = lazy(() => import('./pages/PropertiesPage.jsx')); // wizard inside
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage.jsx'));
const EditPropertyPage = lazy(() => import('./pages/EditPropertyPage.jsx'));
const InspectionsPage = lazy(() => import('./pages/InspectionsPage.jsx'));
const JobsPage = lazy(() => import('./pages/JobsPage.jsx'));
const PlansPage = lazy(() => import('./pages/PlansPage.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage.jsx'));
const ServiceRequestsPage = lazy(() => import('./pages/ServiceRequestsPage.jsx'));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage.jsx'));
const TechnicianDashboard = lazy(() => import('./pages/TechnicianDashboard.jsx'));
const TechnicianJobDetail = lazy(() => import('./pages/TechnicianJobDetail.jsx'));
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard.jsx'));
const TenantDashboard = lazy(() => import('./pages/TenantDashboard.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const TeamManagementPage = lazy(() => import('./pages/TeamManagementPage.jsx'));

// NOTE: AddPropertyPage intentionally removed (wizard is in PropertiesPage)

export default function App() {
  useEffect(() => {
    console.log('App mounted successfully');
    const errorHandler = (event) => console.error('Global error:', event.error);
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  return (
    <ErrorBoundary>
      <CssBaseline />
      <GlobalGuard />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4caf50',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#f44336',
              secondary: '#fff',
            },
          },
        }}
      />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected */}
          <Route path="/" element={<AuthGate><Layout><Dashboard /></Layout></AuthGate>} />
          <Route path="/dashboard" element={<AuthGate><Layout><Dashboard /></Layout></AuthGate>} />

          {/* Properties (no /properties/add route) */}
          <Route path="/properties" element={<AuthGate><Layout><PropertiesPage /></Layout></AuthGate>} />
          <Route path="/properties/:id" element={<AuthGate><Layout><PropertyDetailPage /></Layout></AuthGate>} />
          <Route path="/properties/:id/edit" element={<AuthGate><Layout><EditPropertyPage /></Layout></AuthGate>} />

          {/* Other feature pages */}
          <Route path="/inspections" element={<AuthGate><Layout><InspectionsPage /></Layout></AuthGate>} />
          <Route path="/jobs" element={<AuthGate><Layout><JobsPage /></Layout></AuthGate>} />
          <Route path="/plans" element={<AuthGate><Layout><PlansPage /></Layout></AuthGate>} />
          <Route path="/service-requests" element={<AuthGate><Layout><ServiceRequestsPage /></Layout></AuthGate>} />
          <Route path="/recommendations" element={<AuthGate><Layout><RecommendationsPage /></Layout></AuthGate>} />
          <Route path="/subscriptions" element={<AuthGate><Layout><SubscriptionsPage /></Layout></AuthGate>} />
          <Route path="/reports" element={<AuthGate><Layout><ReportsPage /></Layout></AuthGate>} />
          <Route path="/profile" element={<AuthGate><Layout><ProfilePage /></Layout></AuthGate>} />

          {/* Role-specific dashboards */}
          <Route path="/technician/dashboard" element={<AuthGate><Layout><TechnicianDashboard /></Layout></AuthGate>} />
          <Route path="/technician/jobs/:id" element={<AuthGate><Layout><TechnicianJobDetail /></Layout></AuthGate>} />
          <Route path="/owner/dashboard" element={<AuthGate><Layout><OwnerDashboard /></Layout></AuthGate>} />
          <Route path="/tenant/dashboard" element={<AuthGate><Layout><TenantDashboard /></Layout></AuthGate>} />
          
          {/* Team Management (Property Manager only) */}
          <Route path="/team" element={<AuthGate><Layout><TeamManagementPage /></Layout></AuthGate>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
