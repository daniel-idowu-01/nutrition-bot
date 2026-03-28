import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ConversationMessage,
  ConversationMessageDocument,
} from './schemas/conversation-message.schema';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(ConversationMessage.name)
    private readonly conversationModel: Model<ConversationMessageDocument>,
  ) {}

  async logMessage(params: {
    userId: string | Types.ObjectId;
    role: 'user' | 'assistant';
    messageType: 'text' | 'image' | 'audio' | 'document';
    text: string;
    externalMessageId?: string;
  }): Promise<void> {
    const trimmedText = params.text.trim();
    if (!trimmedText) return;

    await this.conversationModel.create({
      userId: params.userId,
      role: params.role,
      messageType: params.messageType,
      text: trimmedText,
      externalMessageId: params.externalMessageId,
    });
  }

  async getRecentConversation(
    userId: string | Types.ObjectId,
    limit = 12,
  ): Promise<ConversationTurn[]> {
    const messages = await this.conversationModel
      .find({ userId: new Types.ObjectId(userId), messageType: 'text' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return messages.reverse().map((message) => ({
      role: message.role,
      text: message.text,
    }));
  }
}
