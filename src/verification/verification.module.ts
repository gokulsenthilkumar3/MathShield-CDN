import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { ChallengeModule } from '../challenge/challenge.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [ChallengeModule, RiskModule],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
