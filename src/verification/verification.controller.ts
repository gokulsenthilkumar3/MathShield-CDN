import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { VerificationService, VerificationRequest, VerificationResult } from './verification.service';

@Controller('api/verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('verify')
  async verifyResponse(@Body() request: VerificationRequest): Promise<VerificationResult> {
    try {
      return await this.verificationService.verifyResponse(request);
    } catch (error) {
      if (error.message === 'Challenge not found or expired') {
        throw new HttpException('Challenge not found or expired', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Verification failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
