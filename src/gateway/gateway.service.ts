import { Injectable } from '@nestjs/common';

@Injectable()
export class GatewayService {
  // Map to store userId -> socketId mappings
  private userConnections = new Map<string, string>();

  // Store a socket to userId reverse mapping for quick lookups
  private socketToUser = new Map<string, string>();

  /**
   * Register a user connection
   */
  addConnection(userId: string, socketId: string): void {
    this.userConnections.set(userId, socketId);
    this.socketToUser.set(socketId, userId);
  }

  /**
   * Remove a user connection
   */
  removeConnection(socketId: string): void {
    const userId = this.socketToUser.get(socketId);
    if (userId) {
      this.userConnections.delete(userId);
      this.socketToUser.delete(socketId);
    }
  }

  /**
   * Get socket ID for a specific user
   */
  getSocketId(userId: string): string | undefined {
    return this.userConnections.get(userId);
  }

  /**
   * Get user ID for a specific socket
   */
  getUserId(socketId: string): string | undefined {
    return this.socketToUser.get(socketId);
  }

  /**
   * Check if a user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.userConnections.has(userId);
  }

  /**
   * Get all connected user IDs
   */
  getConnectedUsers(): string[] {
    return Array.from(this.userConnections.keys());
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.userConnections.size;
  }
}
