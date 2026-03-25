import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IncomingWebhookDto, WhatsAppMessage } from './dto/incoming-message.dto';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly config: ConfigService) {}

  async handleIncoming(body: IncomingWebhookDto): Promise<void> {
    const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages?.length) return;

    for (const message of messages) {
      await this.routeMessage(message);
    }
  }

  private async routeMessage(message: WhatsAppMessage): Promise<void> {
    this.logger.log(`Message from ${message.from}, type: ${message.type}`);

    if (message.type === 'image') {
      // await this.mealsService.analyseImage(message);
      await this.sendMessage(message.from, '📸 Got your meal photo! Analysing it now...');
    } else if (message.type === 'text') {
      await this.sendMessage(message.from, 'Send me a photo of your meal and I\'ll give you nutritional feedback!');
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

    await axios.post(
      `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }
}