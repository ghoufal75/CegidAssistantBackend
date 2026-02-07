import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    // Create user (validation and duplicate checking handled by UsersService)
    const user = await this.usersService.create(signUpDto);

    // Convert to plain object and remove password
    const { password, ...userObject } = (user as any).toObject();

    return userObject;
  }

  async signIn(signInDto: SignInDto) {
    // Find user by email with password field
    const user = await this.usersService.findByEmail(signInDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare passwords
    const isPasswordValid = await user.comparePassword(signInDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    // Convert to plain object and remove password
    const { password, ...userObject } = (user as any).toObject();

    return {
      accessToken,
      refreshToken,
      user: userObject,
    };
  }

  async refresh(refreshToken: string) {
    try {
      // Verify the refresh token JWT
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Find the hashed token in database
      const storedTokens = await this.refreshTokenModel
        .find({ userId: payload.sub })
        .select('+token')
        .exec();

      // Check if any stored token matches the provided token
      let validToken: RefreshTokenDocument | null = null;
      for (const storedToken of storedTokens) {
        const isMatch = await bcrypt.compare(refreshToken, storedToken.token);
        if (isMatch) {
          validToken = storedToken;
          break;
        }
      }

      if (!validToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is expired or revoked
      if (validToken.isRevoked || new Date() > validToken.expiresAt) {
        throw new UnauthorizedException('Refresh token expired or revoked');
      }

      // Get user
      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new access token
      const accessToken = await this.generateAccessToken(user);

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async signOut(refreshToken: string) {
    try {
      // Verify the refresh token JWT
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Find and revoke the token
      const storedTokens = await this.refreshTokenModel
        .find({ userId: payload.sub })
        .select('+token')
        .exec();

      for (const storedToken of storedTokens) {
        const isMatch = await bcrypt.compare(refreshToken, storedToken.token);
        if (isMatch) {
          storedToken.isRevoked = true;
          await storedToken.save();
          break;
        }
      }

      return { message: 'Signed out successfully' };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async signOutAll(userId: string) {
    // Revoke all refresh tokens for the user
    await this.refreshTokenModel.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true },
    );

    return { message: 'Signed out from all devices successfully' };
  }

  private async generateAccessToken(user: any): Promise<string> {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
    };

    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m';

    return this.jwtService.sign(payload, {
      secret,
      expiresIn: expiresIn as any,
    });
  }

  private async generateRefreshToken(user: any): Promise<string> {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
    };

    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';

    // Generate JWT refresh token
    const refreshToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: expiresIn as any,
    });

    // Calculate expiration date
    const expiresAt = new Date();
    // Parse expiration time (e.g., '7d' -> 7 days)
    const days = parseInt(expiresIn.replace('d', ''));
    expiresAt.setDate(expiresAt.getDate() + days);

    // Store hashed refresh token in database
    const refreshTokenDoc = new this.refreshTokenModel({
      token: refreshToken,
      userId: user._id,
      expiresAt,
    });
    await refreshTokenDoc.save();

    return refreshToken;
  }
}
