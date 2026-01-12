/**
 * Socket Service
 * Centralized Socket.IO connection management
 */

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.init();
  }

  init() {
    if (this.socket) return this.socket;

    this.socket = io();

    this.socket.on("connect", () => {
      this.connected = true;
      console.log("✅ Connected to server");
    });

    this.socket.on("disconnect", () => {
      this.connected = false;
      console.log("❌ Disconnected from server");
    });

    return this.socket;
  }

  emit(event, data) {
    if (!this.socket) this.init();
    this.socket.emit(event, data);
  }

  on(event, callback) {
    if (!this.socket) this.init();
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
const socketService = new SocketService();
