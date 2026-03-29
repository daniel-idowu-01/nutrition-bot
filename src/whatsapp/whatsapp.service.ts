import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IncomingWebhookDto, WhatsAppMessage } from './dto/incoming-message.dto';
import { ConversationsService } from 'src/conversations/conversations.service';
import { MealsService } from 'src/meals/meals.service';
import { UserService } from 'src/users/user.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly processingMessageIds = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    private readonly conversationsService: ConversationsService,
    private readonly usersService: UserService,
    @Inject(forwardRef(() => MealsService))
    private readonly mealsService: MealsService,
  ) {}

  async handleIncoming(body: IncomingWebhookDto): Promise<void> {
    const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages?.length) return;

    for (const message of messages) {
      await this.routeMessage(message);
    }
  }

  private async routeMessage(message: WhatsAppMessage): Promise<void> {
    this.logger.log(`Message from ${message.from}, type: ${message.type}`);
    const externalMessageId = message.id?.trim();

    if (externalMessageId && this.processingMessageIds.has(externalMessageId)) {
      this.logger.warn(`Skipping in-flight duplicate message ${externalMessageId}`);
      return;
    }

    if (
      externalMessageId &&
      (await this.conversationsService.hasExternalMessageId(externalMessageId))
    ) {
      this.logger.warn(`Skipping duplicate message ${externalMessageId}`);
      return;
    }

    if (externalMessageId) {
      this.processingMessageIds.add(externalMessageId);
    }

    try {
      if (message.type === 'image') {
        const user = await this.usersService.findOrCreate(message.from);
        await this.conversationsService.logMessage({
          userId: user._id,
          role: 'user',
          messageType: 'image',
          text: '[image upload]',
          externalMessageId,
        });

        await this.sendMessage(
          message.from,
          'Got your product photo. I am reading the label and ingredients now...',
        );
        await this.mealsService.analyseImage(message);
      } else if (message.type === 'text') {
        const user = await this.usersService.findOrCreate(message.from);
        await this.conversationsService.logMessage({
          userId: user._id,
          role: 'user',
          messageType: 'text',
          text: message.text?.body ?? '',
          externalMessageId,
        });
        await this.mealsService.respondToText(message);
      }
    } finally {
      if (externalMessageId) {
        this.processingMessageIds.delete(externalMessageId);
      }
    }
  }

  async downloadMedia(mediaId: string): Promise<Buffer> {
    const version = this.config.get('META_API_VERSION');
    const token = this.config.get('META_ACCESS_TOKEN');

    const { data } = await axios.get(
      `https://graph.facebook.com/${version}/${mediaId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const response = await axios.get(data.url, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
  }

  async sendMessage(to: string, text: string): Promise<void> {
    const version = this.config.get('META_API_VERSION');
    const phoneNumberId = this.config.get('META_PHONE_NUMBER_ID');
    const token = this.config.get('META_ACCESS_TOKEN');

    const response = await axios.post(
      `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const user = await this.usersService.findOrCreate(to);
    await this.conversationsService.logMessage({
      userId: user._id,
      role: 'assistant',
      messageType: 'text',
      text,
      externalMessageId: response.data?.messages?.[0]?.id,
    });
  }
}
