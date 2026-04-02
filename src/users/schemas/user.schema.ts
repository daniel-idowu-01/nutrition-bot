import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop()
  name?: string;

  @Prop({ default: false })
  onboarded: boolean;

  @Prop({ min: 800, max: 6000 })
  dailyCalorieTarget?: number;

  // Optional profile for better AI personalisation
  @Prop({ type: Object, default: {} })
  profile: {
    age?: number;
    weightKg?: number;
    heightCm?: number;
    goals?: string;        // e.g. "lose weight", "build muscle"
    conditions?: string[]; // e.g. ["diabetes", "hypertension"]
  };
}

export const UserSchema = SchemaFactory.createForClass(User);
