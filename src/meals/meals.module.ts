import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MealsService } from './meals.service';
import { MealLog, MealLogSchema } from './schemas/meal-log.schema';
import { ClaudeModule } from 'src/ai-models/claude/claude.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { UsersModule } from 'src/users/users.module';
import { WhatsappModule } from 'src/whatsapp/whatsapp.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: MealLog.name, schema: MealLogSchema }]),
        ClaudeModule,
        CloudinaryModule,
        UsersModule,
        forwardRef(() => WhatsappModule),
    ],
    providers: [MealsService],
    exports: [MealsService],
})
export class MealsModule {}
