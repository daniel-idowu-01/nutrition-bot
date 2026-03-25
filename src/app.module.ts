import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { MealsModule } from './meals/meals.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ClaudeModule } from './ai-models/claude/claude.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    UsersModule,
    MealsModule,
    WhatsappModule,
    CloudinaryModule,
    ClaudeModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
