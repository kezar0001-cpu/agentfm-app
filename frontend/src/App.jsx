import React from 'react';
import { Routes, Route } from 'react-router-dom';
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
import { useEffect } from 'react';

// Simple error boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
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

function App() {
  useEffect(() => {
    console.log('App mounted successfully');
    
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });
    
    return () => {
      window.removeEventListener('error', () => {});
    };
  }, []);
  
  return (
    <ErrorBoundary>
      {/* ... rest of the code */}
    </ErrorBoundary>
  );
}

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#1f2937' }}>404</h1>
        <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>The page you are looking for could not be found.</p>
        <button 
          onClick={() => window.location.href = '/signin'}
          style={{ marginTop: '1rem', color: '#2563eb', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer' }}
        >
          Go to Sign In
        </button>
      </div>
    </div>
  );
}

export default App;