/**
 * Socket.IO Service
 * Singleton pattern for managing WebSocket connection
 * 
 * Why Singleton?
 * - Only one socket connection per user
 * - Prevents multiple connections on re-renders
 * - Centralized event management
 */

import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  /**
   * Initialize socket connection
   * @param {string} token - JWT auth token
   */
  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const SOCKET_URL = API_URL.replace('/api', '');

    console.log('🔌 Connecting to Socket.IO:', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.connected = false;
      
      // Auto-reconnect unless manually disconnected
      if (reason === 'io server disconnect') {
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.connected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      console.log('Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Get socket instance
   */
  getSocket() {
    if (!this.socket) {
      console.warn('Socket not initialized. Call connect() first.');
    }
    return this.socket;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected && this.socket?.connected;
  }

  // ============================================
  // GAME EVENTS
  // ============================================

  /**
   * Join a game room
   */
  joinGame(gameId) {
    if (!this.socket) return;
    console.log('🎮 Joining game:', gameId);
    this.socket.emit('game:join', gameId);
  }

  /**
   * Leave a game room
   */
  leaveGame(gameId) {
    if (!this.socket) return;
    console.log('👋 Leaving game:', gameId);
    this.socket.emit('game:leave', gameId);
  }

  /**
   * Notify move made (actual validation happens via REST API)
   */
  notifyMove(gameId, move) {
    if (!this.socket) return;
    this.socket.emit('game:move', { gameId, move });
  }

  /**
   * Listen for opponent moves
   */
  onMoveMade(callback) {
    if (!this.socket) return;
    this.socket.on('game:move-made', callback);
  }

  /**
   * Listen for game state updates (from REST API broadcasts)
   */
  onGameStateUpdate(callback) {
    if (!this.socket) return;
    this.socket.on('game:state-update', callback);
  }

  /**
   * Listen for player joined
   */
  onPlayerJoined(callback) {
    if (!this.socket) return;
    this.socket.on('game:player-joined', callback);
  }

  /**
   * Listen for player left
   */
  onPlayerLeft(callback) {
    if (!this.socket) return;
    this.socket.on('game:player-left', callback);
  }

  /**
   * Listen for player disconnected
   */
  onPlayerDisconnected(callback) {
    if (!this.socket) return;
    this.socket.on('game:player-disconnected', callback);
  }

  // ============================================
  // CHAT EVENTS
  // ============================================

  /**
   * Send a chat message
   */
  sendMessage(gameId, message) {
    if (!this.socket) return;
    this.socket.emit('chat:message', { gameId, message });
  }

  /**
   * Listen for incoming messages
   */
  onMessage(callback) {
    if (!this.socket) return;
    this.socket.on('chat:message', callback);
  }

  /**
   * Send typing indicator
   */
  sendTyping(gameId, isTyping) {
    if (!this.socket) return;
    this.socket.emit('chat:typing', { gameId, isTyping });
  }

  /**
   * Listen for typing indicator
   */
  onUserTyping(callback) {
    if (!this.socket) return;
    this.socket.on('chat:user-typing', callback);
  }

  /**
   * Listen for message deletion
   */
  onMessageDeleted(callback) {
    if (!this.socket) return;
    this.socket.on('chat:message-deleted', callback);
  }

  // ============================================
  // USER EVENTS
  // ============================================

  /**
   * Listen for online users count
   */
  onUsersCount(callback) {
    if (!this.socket) return;
    this.socket.on('users:count', callback);
  }

  // ============================================
  // CLEANUP
  // ============================================

  /**
   * Remove all listeners (call on component unmount)
   */
  removeAllListeners() {
    if (!this.socket) return;
    this.socket.removeAllListeners();
  }

  /**
   * Remove specific listener
   */
  removeListener(event) {
    if (!this.socket) return;
    this.socket.off(event);
  }
}

// Export singleton instance
export default new SocketService();