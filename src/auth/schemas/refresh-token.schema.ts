import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type RefreshTokenDocument = RefreshToken & Document;

@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ required: true, unique: true, select: false })
  token: string; // hashed token

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ default: false })
  isRevoked: boolean;

  createdAt?: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// TTL index to auto-delete expired tokens
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save hook to hash token
RefreshTokenSchema.pre('save', async function () {
  const refreshToken = this as RefreshTokenDocument;

  if (!refreshToken.isModified('token')) {
    return;
  }

  const saltRounds = 10;
  refreshToken.token = await bcrypt.hash(refreshToken.token, saltRounds);
});
