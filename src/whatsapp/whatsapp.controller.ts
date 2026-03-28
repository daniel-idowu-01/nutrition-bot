import { Controller, Get, Post, Body, Query, Res, HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import type { IncomingWebhookDto } from './dto/incoming-message.dto';

@Controller('whatsapp/webhook')
export class WhatsAppController {
  constructor(
    private readonly service: WhatsAppService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.config.get('META_WEBHOOK_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === verifyToken) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  @Post()
  @HttpCode(200)
  async receiveMessage(@Body() body: IncomingWebhookDto) {
    await this.service.handleIncoming(body);
    return { status: 'ok' };
  }
}