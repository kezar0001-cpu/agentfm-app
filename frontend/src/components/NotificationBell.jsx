import { useState, useEffect, useRef } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  Stack,
  Chip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { format } from 'date-fns';
import ensureArray from '../utils/ensureArray';
import { queryKeys } from '../utils/queryKeys.js';
import io from 'socket.io-client';
import { getAuthToken } from '../lib/auth';

const NOTIFICATION_TYPE_COLORS = {
  INSPECTION_SCHEDULED: 'info',
  INSPECTION_REMINDER: 'warning',
  JOB_ASSIGNED: 'primary',
  JOB_COMPLETED: 'success',
  SERVICE_REQUEST_UPDATE: 'info',
  SUBSCRIPTION_EXPIRING: 'warning',
  PAYMENT_DUE: 'error',
  SYSTEM: 'default',
};

export default function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  // Fetch unread count
  const { data: countData } = useQuery({
    queryKey: queryKeys.notifications.count(),
    queryFn: async () => {
      const response = await apiClient.get('/notifications/unread-count');
      return response.data;
    },
    // Use longer polling interval when WebSocket is connected (fallback only)
    // Use shorter interval when WebSocket is not available
    refetchInterval: isWebSocketConnected ? 120000 : 30000, // 2 minutes vs 30 seconds
    initialData: { count: 0 },
    retry: 1,
  });

  // WebSocket connection setup
  useEffect(() => {
    const token = getAuthToken();

    if (!token) {
      console.warn('[NotificationBell] No auth token available for WebSocket connection');
      return;
    }

    // Get the WebSocket URL from environment or construct it
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || window.location.origin;
    const wsUrl = apiBaseUrl.replace(/^http/, 'ws').replace(/\/$/, '');

    console.log('[NotificationBell] Connecting to WebSocket:', wsUrl);

    // Initialize Socket.IO client
    const socket = io(wsUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'], // Try WebSocket first, fall back to polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[NotificationBell] WebSocket connected:', socket.id);
      setIsWebSocketConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[NotificationBell] WebSocket disconnected:', reason);
      setIsWebSocketConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[NotificationBell] WebSocket connection error:', error.message);
      setIsWebSocketConnected(false);
    });

    // Listen for new notifications
    socket.on('notification:new', (notification) => {
      console.log('[NotificationBell] Received new notification:', notification);

      // Invalidate and refetch notification queries to update the UI
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.count() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
    });

    // Listen for notification count updates
    socket.on('notification:count', ({ count }) => {
      console.log('[NotificationBell] Received notification count update:', count);

      // Update the count in the query cache
      queryClient.setQueryData(queryKeys.notifications.count(), { count });
    });

    // Cleanup on unmount
    return () => {
      console.log('[NotificationBell] Cleaning up WebSocket connection');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('notification:new');
      socket.off('notification:count');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: async () => {
      const response = await apiClient.get('/notifications?limit=10');
      return ensureArray(response.data, ['notifications', 'items', 'data.items']);
    },
    enabled: Boolean(anchorEl), // Only fetch when menu is open
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.count() });
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.count() });
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.count() });
    },
  });

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkRead = (id, event) => {
    event.stopPropagation();
    markReadMutation.mutate(id);
  };

  const handleDelete = (id, event) => {
    event.stopPropagation();
    deleteMutation.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const unreadCount = (countData && typeof countData === 'object' && 'count' in countData) ? countData.count : 0;

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
            >
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />

        {isLoading && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Loading...
            </Typography>
          </Box>
        )}

        {!isLoading && notifications.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        )}

        {!isLoading && notifications.map((notification) => (
          <MenuItem
            key={notification.id}
            sx={{
              py: 1.5,
              px: 2,
              bgcolor: notification.isRead ? 'transparent' : 'action.hover',
              '&:hover': {
                bgcolor: 'action.selected',
              },
            }}
            onClick={() => {
              if (!notification.isRead) {
                markReadMutation.mutate(notification.id);
              }
            }}
          >
            <Stack spacing={1} sx={{ width: '100%' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {notification.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {notification.message}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={notification.type.replace(/_/g, ' ')}
                      size="small"
                      color={NOTIFICATION_TYPE_COLORS[notification.type]}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
                    </Typography>
                  </Stack>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  {!notification.isRead && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleMarkRead(notification.id, e)}
                      title="Mark as read"
                    >
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={(e) => handleDelete(notification.id, e)}
                    title="Delete"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Stack>
          </MenuItem>
        ))}

        {!isLoading && notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1, textAlign: 'center' }}>
              <Button size="small" fullWidth onClick={handleClose}>
                Close
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
}
