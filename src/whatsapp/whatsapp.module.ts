import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { ConversationsModule } from 'src/conversations/conversations.module';
import { MealsModule } from 'src/meals/meals.module';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [ConversationsModule, UsersModule, forwardRef(() => MealsModule)],
    controllers: [WhatsAppController],
    providers: [WhatsAppService],
    exports: [WhatsAppService],
})
export class WhatsappModule {}
