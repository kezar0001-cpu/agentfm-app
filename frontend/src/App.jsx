// frontend/src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/DashboardPage";
import InspectionsPage from "./pages/InspectionsPage";
import JobsPage from "./pages/JobsPage";
import PlansPage from "./pages/PlansPage";
import PropertiesPage from "./pages/PropertiesPage";
import AddPropertyPage from "./pages/AddPropertyPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import ReportsPage from "./pages/ReportsPage";
import ServiceRequestsPage from "./pages/ServiceRequestsPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";

import AuthGate from "./authGate";
import Layout from "./components/Layout";
import GlobalGuard from "./components/GlobalGuard.jsx";

// Simple error boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

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

function App() {
  useEffect(() => {
    console.log('App mounted successfully');

    const errorHandler = (event) => {
      console.error('Global error:', event.error);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  return (
    <BrowserRouter>
      <GlobalGuard />
      <ErrorBoundary>
        <Routes>
          {/* Public routes */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Protected routes */}
          <Route path="/" element={<AuthGate><Layout><Dashboard /></Layout></AuthGate>} />
          <Route path="/dashboard" element={<AuthGate><Layout><Dashboard /></Layout></AuthGate>} />
          <Route path="/properties" element={<AuthGate><Layout><PropertiesPage /></Layout></AuthGate>} />
          <Route path="/properties/add" element={<AuthGate><Layout><AddPropertyPage /></Layout></AuthGate>} />
          <Route path="/properties/:id" element={<AuthGate><Layout><PropertyDetailPage /></Layout></AuthGate>} />
          <Route path="/inspections" element={<AuthGate><Layout><InspectionsPage /></Layout></AuthGate>} />
          <Route path="/jobs" element={<AuthGate><Layout><JobsPage /></Layout></AuthGate>} />
          <Route path="/plans" element={<AuthGate><Layout><PlansPage /></Layout></AuthGate>} />
          <Route path="/service-requests" element={<AuthGate><Layout><ServiceRequestsPage /></Layout></AuthGate>} />
          <Route path="/recommendations" element={<AuthGate><Layout><RecommendationsPage /></Layout></AuthGate>} />
          <Route path="/subscriptions" element={<AuthGate><Layout><SubscriptionsPage /></Layout></AuthGate>} />
          <Route path="/reports" element={<AuthGate><Layout><ReportsPage /></Layout></AuthGate>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
