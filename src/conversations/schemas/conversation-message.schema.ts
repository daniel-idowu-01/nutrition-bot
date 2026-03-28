import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationMessageDocument = ConversationMessage & Document;

@Schema({ timestamps: true })
export class ConversationMessage {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['user', 'assistant'] })
  role: 'user' | 'assistant';

  @Prop({ required: true, enum: ['text', 'image', 'audio', 'document'] })
  messageType: 'text' | 'image' | 'audio' | 'document';

  @Prop({ required: true })
  text: string;

  @Prop()
  externalMessageId?: string;
}

export const ConversationMessageSchema =
  SchemaFactory.createForClass(ConversationMessage);
