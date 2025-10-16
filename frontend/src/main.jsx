import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App.jsx';
import './index.css';  // Tailwind entry point
import './i18n.js';

// ✅ Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 mins
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error?.response?.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

// ✅ MUI Theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1e88e5',
    },
    secondary: {
      main: '#00a76f',
    },
    background: {
      default: '#f5f7fb',
    },
  },
  shape: {
    borderRadius: 10,
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
     <ThemeProvider theme={theme}>
+        <BrowserRouter>
+          <App />
+        </BrowserRouter>
+      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
