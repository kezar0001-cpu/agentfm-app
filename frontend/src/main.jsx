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

// ✅ MUI Theme - Modern & Refined
let theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#b91c1c', // Bold crimson red
      light: '#f87171',
      dark: '#7f1d1d',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f97316', // Warm amber accent
      light: '#fb923c',
      dark: '#c2410c',
      contrastText: '#0f172a',
    },
    error: {
      main: '#dc2626',
      light: '#fca5a5',
      dark: '#991b1b',
    },
    warning: {
      main: '#ea580c',
      light: '#f97316',
      dark: '#c2410c',
    },
    info: {
      main: '#ef4444',
      light: '#fca5a5',
      dark: '#b91c1c',
    },
    success: {
      main: '#16a34a',
      light: '#4ade80',
      dark: '#166534',
    },
    background: {
      default: '#fff5f5', // Soft blush background
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937',
      secondary: '#4b5563',
    },
    divider: '#fecaca',
  },
  shape: {
    borderRadius: 16, // More modern rounded corners
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  ],
});

theme = createTheme(theme, {
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
      [theme.breakpoints.down('sm')]: {
        fontSize: '2.2rem',
      },
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
      [theme.breakpoints.down('sm')]: {
        fontSize: '1.9rem',
      },
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.005em',
      [theme.breakpoints.down('sm')]: {
        fontSize: '1.6rem',
      },
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.005em',
      [theme.breakpoints.down('sm')]: {
        fontSize: '1.35rem',
      },
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '0em',
    },
    body1: {
      lineHeight: 1.7,
      fontSize: '1rem',
    },
    body2: {
      lineHeight: 1.6,
      fontSize: '0.875rem',
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f5f9',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#cbd5e1',
            borderRadius: '4px',
            '&:hover': {
              background: '#94a3b8',
            },
          },
        },
      },
    },
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
          borderRadius: theme.shape.borderRadius,
          backgroundImage: 'none',
          transition: 'box-shadow 0.3s ease-in-out, transform 0.2s ease-in-out',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
        elevation3: {
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: theme.shape.borderRadius,
          border: '1px solid',
          borderColor: theme.palette.divider,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: theme.spacing(3),
          [theme.breakpoints.down('sm')]: {
            padding: theme.spacing(2.5),
          },
          '&:last-child': {
            paddingBottom: theme.spacing(3),
            [theme.breakpoints.down('sm')]: {
              paddingBottom: theme.spacing(2.5),
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          margin: theme.spacing(2),
          borderRadius: theme.shape.borderRadius,
          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          [theme.breakpoints.down('sm')]: {
            margin: theme.spacing(1.5),
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: theme.shape.borderRadius,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          },
        },
        sizeSmall: {
          padding: '6px 16px',
          fontSize: '0.875rem',
        },
        sizeLarge: {
          padding: '12px 28px',
          fontSize: '1rem',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.1)',
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: theme.shape.borderRadius / 2,
          transition: 'all 0.2s ease-in-out',
        },
        filled: {
          '&:hover': {
            transform: 'scale(1.05)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: theme.shape.borderRadius / 1.5,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              '& > fieldset': {
                borderColor: theme.palette.primary.main,
              },
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${theme.palette.primary.main}15`,
            },
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: theme.spacing(6),
        },
        flexContainer: {
          gap: theme.spacing(1),
        },
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          paddingLeft: theme.spacing(3),
          paddingRight: theme.spacing(3),
          minHeight: theme.spacing(6),
          fontWeight: 600,
          textTransform: 'none',
          transition: 'all 0.2s ease-in-out',
          borderRadius: `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          [theme.breakpoints.down('sm')]: {
            paddingLeft: theme.spacing(2),
            paddingRight: theme.spacing(2),
            minHeight: theme.spacing(5),
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          paddingTop: theme.spacing(2),
          paddingBottom: theme.spacing(2),
          [theme.breakpoints.down('sm')]: {
            paddingTop: theme.spacing(1.5),
            paddingBottom: theme.spacing(1.5),
          },
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#f8fafc',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: '#f8fafc',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 6,
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          animationDuration: '1s',
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
