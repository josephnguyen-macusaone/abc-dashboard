/**
 * Socket.IO server setup with JWT auth for license real-time events.
 * Attaches to the existing HTTP server (same port as Express).
 */
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';
import { config } from '../config/config.js';

/**
 * Initialize Socket.IO server attached to HTTP server.
 * Validates JWT on connection (auth_token query param or Authorization header).
 *
 * @param {import('http').Server} httpServer - HTTP server from Express
 * @returns {import('socket.io').Server}
 */
export function initSocketIO(httpServer) {
  const corsOrigins = config.CLIENT_URL ? [config.CLIENT_URL] : true;

  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.auth_token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      logger.debug('Socket connection rejected: no auth token');
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      socket.userId = decoded.sub || decoded.userId;
      socket.userEmail = decoded.email;
      next();
    } catch (err) {
      logger.debug('Socket connection rejected: invalid token', { error: err.message });
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug('Socket connected', {
      id: socket.id,
      userId: socket.userId,
    });

    socket.on('disconnect', (reason) => {
      logger.debug('Socket disconnected', { id: socket.id, reason });
    });
  });

  logger.info('Socket.IO server initialized', { path: '/socket.io' });
  return io;
}
