import { Module } from '@nestjs/common';
import { BehaviorService } from './behavior.service';

@Module({
  providers: [BehaviorService],
  exports: [BehaviorService],
})
export class BehaviorModule {}
