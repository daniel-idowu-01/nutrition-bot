import { Module } from '@nestjs/common';
import { ClaudeService } from './clause.service';

@Module({
  providers: [ClaudeService],
  exports: [ClaudeService],
})
export class ClaudeModule {}
