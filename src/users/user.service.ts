import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findOrCreate(phoneNumber: string): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ phoneNumber });
    if (existing) return existing;
    return this.userModel.create({ phoneNumber });
  }

  async findByPhone(phoneNumber: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phoneNumber });
  }

  async updateDailyCalorieTarget(
    userId: string,
    dailyCalorieTarget: number | null,
  ): Promise<UserDocument | null> {
    const update =
      dailyCalorieTarget === null
        ? { $unset: { dailyCalorieTarget: '' } }
        : { $set: { dailyCalorieTarget } };

    return this.userModel.findByIdAndUpdate(userId, update, { new: true });
  }
}
