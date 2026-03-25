import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MealLogDocument = MealLog & Document;

@Schema({ timestamps: true })
export class MealLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  cloudinaryUrl: string;

  @Prop({ required: true })
  cloudinaryPublicId: string;

  @Prop({ type: [String], default: [] })
  detectedFoods: string[];

  @Prop({ type: Object })
  nutrients: {
    estimatedCalories?: number;
    proteinG?: number;
    carbsG?: number;
    sugarG?: number;
    fatG?: number;
    fibreG?: number;
  };

  @Prop({ type: [String], default: [] })
  concerns: string[];      // e.g. ["high sugar", "low protein"]

  @Prop()
  aiAdvice: string;

  @Prop()
  mealTime: Date;
}

export const MealLogSchema = SchemaFactory.createForClass(MealLog);