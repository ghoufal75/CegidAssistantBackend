import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { AppGateway } from './app.gateway';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('gateway')
@UseGuards(JwtAuthGuard)
export class GatewayController {
  constructor(private readonly appGateway: AppGateway) {}

  /**
   * Send a message to a specific user via WebSocket
   * POST /api/gateway/send
   */
  @Post('send')
  sendMessage(
    @Body()
    body: {
      userId: string;
      event: string;
      message: any;
    },
  ) {
    const { userId, event, message } = body;

    if (!userId || !event || !message) {
      throw new BadRequestException(
        'userId, event, and message are required',
      );
    }

    const sent = this.appGateway.sendMessageToUser(userId, event, message);

    if (!sent) {
      return {
        success: false,
        message: `User ${userId} is not connected`,
      };
    }

    return {
      success: true,
      message: `Message sent to user ${userId}`,
    };
  }

  /**
   * Send a message to multiple users via WebSocket
   * POST /api/gateway/send-many
   */
  @Post('send-many')
  sendMessageToMany(
    @Body()
    body: {
      userIds: string[];
      event: string;
      message: any;
    },
  ) {
    const { userIds, event, message } = body;

    if (!userIds || !Array.isArray(userIds) || !event || !message) {
      throw new BadRequestException(
        'userIds (array), event, and message are required',
      );
    }

    this.appGateway.sendMessageToUsers(userIds, event, message);

    return {
      success: true,
      message: `Message sent to ${userIds.length} users`,
      userIds,
    };
  }

  /**
   * Check if a user is connected
   * GET /api/gateway/status/:userId
   */
  @Get('status/:userId')
  checkUserStatus(@Param('userId') userId: string) {
    const isConnected = this.appGateway.isUserConnected(userId);

    return {
      userId,
      connected: isConnected,
    };
  }

  /**
   * Get all connected users
   * GET /api/gateway/connected
   */
  @Get('connected')
  getConnectedUsers() {
    return {
      connectedUsers: this.appGateway.getConnectedUsers(),
      count: this.appGateway.getConnectionStats().connectedUsers,
    };
  }

  /**
   * Get connection statistics
   * GET /api/gateway/stats
   */
  @Get('stats')
  getStats() {
    return this.appGateway.getConnectionStats();
  }
}
