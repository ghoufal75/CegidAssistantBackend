import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AppGateway } from './app.gateway';
import { GatewayService } from './gateway.service';
import { GatewayController } from './gateway.controller';

@Module({
  imports: [JwtModule, ConfigModule],
  controllers: [GatewayController],
  providers: [AppGateway, GatewayService],
  exports: [AppGateway, GatewayService],
})
export class GatewayModule {}
