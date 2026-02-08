import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GatewayService } from './gateway.service';
import { OpenAIService } from './openai.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private gatewayService: GatewayService,
    private openAIService: OpenAIService,
  ) {}

  /**
   * Handle client connection
   */
  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];
console.log(token);

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;

      // Store the connection
      this.gatewayService.addConnection(userId, client.id);

      // Store userId in socket data for later use
      client.data.userId = userId;
      client.data.email = payload.email;
      client.data.username = payload.username;

      this.logger.log(
        `Client connected: ${client.id} | User: ${payload.username} (${userId})`,
      );

      // Emit connection success to the client
      client.emit('connected', {
        message: 'Successfully connected to WebSocket',
        userId,
        socketId: client.id,
      });
    } catch (error) {
      console.log("error token : ",error);
      
      this.logger.warn(
        `Client ${client.id} connection rejected: Invalid token`,
      );
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const username = client.data.username;

    this.gatewayService.removeConnection(client.id);

    this.logger.log(
      `Client disconnected: ${client.id} | User: ${username} (${userId})`,
    );
  }

  /**
   * Listen for messages from clients
   */
  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody() data: { content: string; [key: string]: any },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const username = client.data.username;

    this.logger.log(`Message received from ${username} (${userId}): ${data.content}`);

    // Echo back to the sender with acknowledgment (user message)
    client.emit('messageReceived', {
        ...data,
        id: data.timestamp,
        type: 'user',
    });

    try {
      // Get response from OpenAI
      const aiResponse = await this.openAIService.getChatCompletion(data.content);

      // Send AI response back to the user
      client.emit('messageReceived', {
        content: aiResponse,
        timestamp: new Date().toISOString(),
        id: Date.now(),
        type: 'bot',
      });

      this.logger.log(`AI response sent to ${username} (${userId})`);
    } catch (error) {
      this.logger.error(`Error getting AI response: ${error.message}`);

      // Send error message to user
      client.emit('messageReceived', {
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date().toISOString(),
        id: Date.now(),
        type: 'bot',
        error: true,
      });
    }
  }

  /**
   * Send a message to a specific user by their MongoDB _id
   */
  sendMessageToUser(userId: string, event: string, data: any): boolean {
    const socketId = this.gatewayService.getSocketId(userId);

    if (!socketId) {
      this.logger.warn(`Cannot send message: User ${userId} is not connected`);
      return false;
    }

    this.server.to(socketId).emit(event, data);
    this.logger.log(`Message sent to user ${userId} (socket: ${socketId})`);
    return true;
  }

  /**
   * Send a message to multiple users
   */
  sendMessageToUsers(userIds: string[], event: string, data: any): void {
    userIds.forEach((userId) => {
      this.sendMessageToUser(userId, event, data);
    });
  }

  /**
   * Check if a user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.gatewayService.isUserConnected(userId);
  }

  /**
   * Get all connected users
   */
  getConnectedUsers(): string[] {
    return this.gatewayService.getConnectedUsers();
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      connectedUsers: this.gatewayService.getConnectionCount(),
      userIds: this.gatewayService.getConnectedUsers(),
    };
  }
}
