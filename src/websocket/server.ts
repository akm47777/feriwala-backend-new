/**
 * WebSocket Server for Feriwala Platform
 * 
 * Handles real-time features including notifications, order updates, and chat.
 * Uses ws library for WebSocket protocol implementation.
 */

import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { URL } from 'url';

// Types
interface Client {
  userId: string;
  role: 'customer' | 'seller' | 'admin';
  ws: WebSocket;
  lastActivity: Date;
}

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}

// Configuration
const PORT = parseInt(process.env.WS_PORT || '3001', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CLIENT_TIMEOUT = 60000; // 60 seconds

// Store connected clients
const clients = new Map<string, Client>();

// Rate limiting
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 60; // messages per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute

/**
 * Verify JWT token
 */
function verifyToken(token: string): { id: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    return decoded;
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return null;
  }
}

/**
 * Check rate limit
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(userId);

  if (!limit || now > limit.resetTime) {
    rateLimits.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (limit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  limit.count++;
  return true;
}

/**
 * Send message to specific user
 */
function sendToUser(userId: string, message: WebSocketMessage): boolean {
  const client = clients.get(userId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`[Send] Failed to send to user ${userId}:`, error);
      return false;
    }
  }
  return false;
}

/**
 * Broadcast to all users
 */
function broadcast(message: WebSocketMessage, filter?: (client: Client) => boolean): void {
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (!filter || filter(client)) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error(`[Broadcast] Failed to send to user ${client.userId}:`, error);
        }
      }
    }
  });
}

/**
 * Broadcast to users with specific role
 */
function broadcastToRole(role: string, message: WebSocketMessage): void {
  broadcast(message, (client) => client.role === role);
}

/**
 * Handle incoming messages
 */
function handleMessage(client: Client, message: WebSocketMessage): void {
  const { userId } = client;

  // Check rate limit
  if (!checkRateLimit(userId)) {
    sendToUser(userId, {
      type: 'ERROR',
      payload: { message: 'Rate limit exceeded' },
      timestamp: Date.now(),
    });
    return;
  }

  // Update last activity
  client.lastActivity = new Date();

  switch (message.type) {
    case 'PING':
      // Respond with pong
      sendToUser(userId, {
        type: 'PONG',
        payload: { timestamp: Date.now() },
        timestamp: Date.now(),
      });
      break;

    case 'CHAT_MESSAGE':
      handleChatMessage(client, message);
      break;

    case 'CHAT_TYPING':
      handleTypingIndicator(client, message);
      break;

    case 'NOTIFICATION_READ':
      handleNotificationRead(client, message);
      break;

    case 'CHAT_READ':
      handleChatRead(client, message);
      break;

    default:
      console.log(`[Message] Unknown type from ${userId}:`, message.type);
  }
}

/**
 * Handle chat message
 */
function handleChatMessage(client: Client, message: WebSocketMessage): void {
  const { chatId, message: text, recipientId } = message.payload;

  // Validate payload
  if (!chatId || !text) {
    return;
  }

  // Create message object
  const chatMessage: WebSocketMessage = {
    type: 'CHAT_MESSAGE',
    payload: {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chatId,
      senderId: client.userId,
      senderName: message.payload.senderName || 'User',
      senderRole: client.role,
      message: text,
      timestamp: new Date().toISOString(),
      read: false,
    },
    timestamp: Date.now(),
  };

  // Send to recipient if specified
  if (recipientId) {
    sendToUser(recipientId, chatMessage);
  }

  // Also send back to sender for confirmation
  sendToUser(client.userId, chatMessage);

  // Save to database (implement based on your DB)
  // await saveChatMessage(chatMessage.payload);
}

/**
 * Handle typing indicator
 */
function handleTypingIndicator(client: Client, message: WebSocketMessage): void {
  const { chatId, isTyping } = message.payload;

  if (!chatId) {
    return;
  }

  // Broadcast typing indicator to other participants
  // In a real implementation, you'd get chat participants from DB
  broadcast(
    {
      type: 'CHAT_TYPING',
      payload: {
        chatId,
        userId: client.userId,
        userName: message.payload.userName || 'User',
        isTyping,
      },
      timestamp: Date.now(),
    },
    (c) => c.userId !== client.userId
  );
}

/**
 * Handle notification read
 */
function handleNotificationRead(client: Client, message: WebSocketMessage): void {
  const { notificationId } = message.payload;

  if (!notificationId) {
    return;
  }

  // Update notification in database
  // await markNotificationAsRead(notificationId, client.userId);

  console.log(`[Notification] User ${client.userId} read notification ${notificationId}`);
}

/**
 * Handle chat read receipt
 */
function handleChatRead(client: Client, message: WebSocketMessage): void {
  const { chatId, messageId } = message.payload;

  if (!chatId || !messageId) {
    return;
  }

  // Update message in database
  // await markMessageAsRead(messageId, client.userId);

  // Notify sender about read receipt
  broadcast(
    {
      type: 'CHAT_READ',
      payload: {
        chatId,
        messageId,
        readBy: client.userId,
        timestamp: new Date().toISOString(),
      },
      timestamp: Date.now(),
    },
    (c) => c.userId !== client.userId
  );
}

/**
 * Handle client disconnection
 */
function handleDisconnect(userId: string): void {
  const client = clients.get(userId);
  if (!client) return;

  // Broadcast offline status
  broadcast({
    type: 'CHAT_OFFLINE',
    payload: {
      userId,
      lastSeen: new Date().toISOString(),
    },
    timestamp: Date.now(),
  });

  clients.delete(userId);
  console.log(`[Disconnect] User ${userId} disconnected. Total clients: ${clients.size}`);
}

/**
 * Clean up inactive connections
 */
function cleanupInactiveConnections(): void {
  const now = new Date();
  const timeout = CLIENT_TIMEOUT;

  clients.forEach((client, userId) => {
    const inactiveTime = now.getTime() - client.lastActivity.getTime();

    if (inactiveTime > timeout) {
      console.log(`[Cleanup] Removing inactive client ${userId}`);
      client.ws.close(1000, 'Inactive connection');
      clients.delete(userId);
    }
  });
}

/**
 * Create WebSocket server
 */
export function createWebSocketServer(): WebSocketServer {
  const wss = new WebSocketServer({ port: PORT });

  console.log(`[Server] WebSocket server started on port ${PORT}`);

  // Handle new connections
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    try {
      // Parse URL for authentication
      const url = new URL(req.url || '', 'http://localhost');
      const userId = url.searchParams.get('userId');
      const token = url.searchParams.get('token');

      // Validate parameters
      if (!userId || !token) {
        ws.close(1008, 'Missing authentication parameters');
        return;
      }

      // Verify JWT token
      const decoded = verifyToken(token);
      if (!decoded || decoded.id !== userId) {
        ws.close(1008, 'Invalid authentication');
        return;
      }

      // Check if user already connected (close old connection)
      const existingClient = clients.get(userId);
      if (existingClient) {
        existingClient.ws.close(1000, 'New connection established');
      }

      // Store client
      const client: Client = {
        userId,
        role: decoded.role as any,
        ws,
        lastActivity: new Date(),
      };
      clients.set(userId, client);

      console.log(`[Connect] User ${userId} (${client.role}) connected. Total clients: ${clients.size}`);

      // Send connection confirmation
      sendToUser(userId, {
        type: 'CONNECT',
        payload: { userId, role: client.role },
        timestamp: Date.now(),
      });

      // Broadcast online status
      broadcast({
        type: 'CHAT_ONLINE',
        payload: {
          userId,
          status: 'online',
        },
        timestamp: Date.now(),
      });

      // Handle incoming messages
      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          handleMessage(client, message);
        } catch (error) {
          console.error(`[Message] Failed to parse from ${userId}:`, error);
        }
      });

      // Handle disconnection
      ws.on('close', (code, reason) => {
        console.log(`[Close] User ${userId} disconnected:`, code, reason.toString());
        handleDisconnect(userId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[Error] WebSocket error for ${userId}:`, error);
      });

      // Start heartbeat
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          sendToUser(userId, {
            type: 'PING',
            payload: { timestamp: Date.now() },
            timestamp: Date.now(),
          });
        } else {
          clearInterval(pingInterval);
        }
      }, HEARTBEAT_INTERVAL);

      ws.on('close', () => clearInterval(pingInterval));
    } catch (error) {
      console.error('[Connection] Error handling new connection:', error);
      ws.close(1011, 'Internal server error');
    }
  });

  // Cleanup inactive connections periodically
  setInterval(cleanupInactiveConnections, 60000); // Every minute

  return wss;
}

/**
 * Public API for sending messages (can be called from other parts of backend)
 */
export const WebSocketAPI = {
  /**
   * Send notification to user
   */
  sendNotification(userId: string, notification: any): boolean {
    return sendToUser(userId, {
      type: 'NOTIFICATION',
      payload: notification,
      timestamp: Date.now(),
    });
  },

  /**
   * Broadcast order update
   */
  broadcastOrderUpdate(orderId: string, status: string, userId?: string): void {
    const message: WebSocketMessage = {
      type: 'ORDER_UPDATED',
      payload: {
        orderId,
        status,
        timestamp: new Date().toISOString(),
      },
      timestamp: Date.now(),
    };

    if (userId) {
      sendToUser(userId, message);
    } else {
      broadcast(message);
    }
  },

  /**
   * Send system alert to admins
   */
  sendSystemAlert(alert: any): void {
    broadcastToRole('admin', {
      type: 'SYSTEM_ALERT',
      payload: alert,
      timestamp: Date.now(),
    });
  },

  /**
   * Notify seller of new order
   */
  notifySellerNewOrder(sellerId: string, order: any): boolean {
    return sendToUser(sellerId, {
      type: 'NEW_ORDER',
      payload: order,
      timestamp: Date.now(),
    });
  },

  /**
   * Send low stock alert to seller
   */
  sendLowStockAlert(sellerId: string, product: any): boolean {
    return sendToUser(sellerId, {
      type: 'LOW_STOCK_ALERT',
      payload: product,
      timestamp: Date.now(),
    });
  },

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return clients.size;
  },

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return clients.has(userId);
  },
};

// Start server if running directly
if (require.main === module) {
  createWebSocketServer();
}
