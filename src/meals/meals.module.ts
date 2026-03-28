import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MealsService } from './meals.service';
import { MealLog, MealLogSchema } from './schemas/meal-log.schema';
import { AiModelsModule } from 'src/ai-models/ai-models.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { ConversationsModule } from 'src/conversations/conversations.module';
import { UsersModule } from 'src/users/users.module';
import { WhatsappModule } from 'src/whatsapp/whatsapp.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: MealLog.name, schema: MealLogSchema }]),
        AiModelsModule,
        CloudinaryModule,
        ConversationsModule,
        UsersModule,
        forwardRef(() => WhatsappModule),
    ],
    providers: [MealsService],
    exports: [MealsService],
})
export class MealsModule {}
