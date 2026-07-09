// ============================================
// DI TOKENS (used with @Inject in providers/consumers)
// ============================================
export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
export const NOTIFICATION_SETTINGS_REPOSITORY = Symbol('NOTIFICATION_SETTINGS_REPOSITORY');
export const DEVICE_TOKEN_REPOSITORY = Symbol('DEVICE_TOKEN_REPOSITORY');

// ============================================
// SOCKET.IO EVENT NAMES
// Server -> Client: NEW, READ, UNREAD_COUNT
// Client -> Server: MARK_READ
// ============================================
export const NOTIFICATION_EVENTS = {
  NEW: 'notification:new',
  READ: 'notification:read',
  UNREAD_COUNT: 'notification:unread_count',
  MARK_READ: 'notification:markRead',
} as const;
