import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material';
import App from './App.jsx';
import './index.css';  // Tailwind entry point
import './i18n.js';
import { UserProvider } from './context/UserContext.jsx';

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
let theme = createTheme({
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
    borderRadius: 12,
  },
});

theme = createTheme(theme, {
  typography: {
    h2: {
      fontWeight: 700,
      [theme.breakpoints.down('sm')]: {
        fontSize: '2.2rem',
      },
    },
    h3: {
      fontWeight: 700,
      [theme.breakpoints.down('sm')]: {
        fontSize: '1.9rem',
      },
    },
    h4: {
      fontWeight: 700,
      [theme.breakpoints.down('sm')]: {
        fontSize: '1.6rem',
      },
    },
    h5: {
      fontWeight: 600,
      [theme.breakpoints.down('sm')]: {
        fontSize: '1.35rem',
      },
    },
    h6: {
      fontWeight: 600,
    },
    body1: {
      lineHeight: 1.6,
    },
    body2: {
      lineHeight: 1.6,
    },
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: theme.spacing(3),
          paddingRight: theme.spacing(3),
          [theme.breakpoints.down('sm')]: {
            paddingLeft: theme.spacing(2),
            paddingRight: theme.spacing(2),
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: theme.shape.borderRadius * 1.2,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: theme.shape.borderRadius * 1.2,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: theme.spacing(3),
          [theme.breakpoints.down('sm')]: {
            padding: theme.spacing(2.25),
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          margin: theme.spacing(2),
          [theme.breakpoints.down('sm')]: {
            margin: theme.spacing(1.5),
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: theme.spacing(5),
        },
        flexContainer: {
          gap: theme.spacing(1),
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          paddingLeft: theme.spacing(2.5),
          paddingRight: theme.spacing(2.5),
          [theme.breakpoints.down('sm')]: {
            paddingLeft: theme.spacing(1.5),
            paddingRight: theme.spacing(1.5),
            minHeight: theme.spacing(5),
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          paddingTop: theme.spacing(1.5),
          paddingBottom: theme.spacing(1.5),
          [theme.breakpoints.down('sm')]: {
            paddingTop: theme.spacing(1),
            paddingBottom: theme.spacing(1),
          },
        },
      },
    },
  },
});

theme = responsiveFontSizes(theme);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <UserProvider>
            <App />
          </UserProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
