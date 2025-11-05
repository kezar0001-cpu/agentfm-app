import { Server } from 'socket.io';
import logger from './utils/logger.js';
import { verifyAccessToken } from './utils/jwt.js';
import prisma from './config/prismaClient.js';

let io = null;

/**
 * Initialize Socket.IO server
 * @param {http.Server} server - HTTP server instance
 */
export function initializeWebSocket(server) {
  const allowlist = new Set(
    (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
      .map((s) => s && s.trim())
      .filter(Boolean)
  );
  if (process.env.FRONTEND_URL) allowlist.add(process.env.FRONTEND_URL.trim());
  [
    'https://www.buildstate.com.au',
    'https://buildstate.com.au',
    'https://api.buildstate.com.au',
    'https://agentfm.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ].forEach((o) => allowlist.add(o));
  const dynamicOriginMatchers = [
    /https:\/\/.+\.vercel\.app$/,
  ];

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // No origin (same-origin requests, Postman, etc.)
        if (!origin) {
          logger.debug('WebSocket CORS: No origin header, allowing connection');
          return callback(null, true);
        }

        // Check allowlist
        if (allowlist.has(origin)) {
          logger.debug(`WebSocket CORS: Origin ${origin} found in allowlist`);
          return callback(null, true);
        }

        // Check dynamic matchers (e.g., *.vercel.app)
        if (dynamicOriginMatchers.some((regex) => regex.test(origin))) {
          logger.debug(`WebSocket CORS: Origin ${origin} matched dynamic pattern`);
          return callback(null, true);
        }

        // Reject origin
        logger.warn(`WebSocket CORS: Blocked origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'], // Support both WebSocket and polling for fallback
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        logger.warn('WebSocket connection attempt without token');
        return next(new Error('Authentication token required'));
      }

      // Verify the JWT token
      const decoded = verifyAccessToken(token);

      if (!decoded || !decoded.id) {
        logger.warn('WebSocket connection attempt with invalid token');
        return next(new Error('Invalid authentication token'));
      }

      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true, isActive: true },
      });

      if (!user) {
        logger.warn(`WebSocket connection attempt for non-existent user: ${decoded.id}`);
        return next(new Error('User not found'));
      }

      if (!user.isActive) {
        logger.warn(`WebSocket connection attempt for inactive user: ${decoded.id}`);
        return next(new Error('Account is inactive'));
      }

      // Attach user info to socket
      socket.userId = user.id;
      socket.userRole = user.role;

      logger.info(`User ${user.id} authenticated for WebSocket connection`);
      next();
    } catch (error) {
      logger.error(`WebSocket authentication error: ${error.message}`);
      next(new Error('Authentication failed'));
    }
  });

  // Connection event handler
  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id} (User: ${socket.userId})`);

    // Join user-specific room for targeted notifications
    socket.join(`user:${socket.userId}`);
    logger.debug(`Socket ${socket.id} joined room: user:${socket.userId}`);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket client disconnected: ${socket.id} (User: ${socket.userId}, Reason: ${reason})`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`WebSocket error for socket ${socket.id}: ${error.message}`);
    });

    // Optionally handle ping-pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  logger.info('✅ WebSocket server initialized successfully');
  return io;
}

/**
 * Get the Socket.IO instance
 * @returns {Server|null} Socket.IO server instance
 */
export function getIO() {
  if (!io) {
    logger.warn('Socket.IO not initialized. Call initializeWebSocket first.');
  }
  return io;
}

/**
 * Emit a notification to a specific user
 * @param {string} userId - User ID to send notification to
 * @param {object} notification - Notification object to send
 */
export function emitNotificationToUser(userId, notification) {
  if (!io) {
    logger.warn('Cannot emit notification: Socket.IO not initialized');
    return;
  }

  try {
    // Emit to user-specific room
    io.to(`user:${userId}`).emit('notification:new', notification);
    logger.debug(`Emitted notification to user ${userId}:`, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
    });
  } catch (error) {
    logger.error(`Failed to emit notification to user ${userId}: ${error.message}`);
  }
}

/**
 * Emit a notification count update to a specific user
 * @param {string} userId - User ID to send count update to
 * @param {number} count - New unread notification count
 */
export function emitNotificationCountToUser(userId, count) {
  if (!io) {
    logger.warn('Cannot emit notification count: Socket.IO not initialized');
    return;
  }

  try {
    // Emit to user-specific room
    io.to(`user:${userId}`).emit('notification:count', { count });
    logger.debug(`Emitted notification count to user ${userId}: ${count}`);
  } catch (error) {
    logger.error(`Failed to emit notification count to user ${userId}: ${error.message}`);
  }
}

export default {
  initializeWebSocket,
  getIO,
  emitNotificationToUser,
  emitNotificationCountToUser,
};
