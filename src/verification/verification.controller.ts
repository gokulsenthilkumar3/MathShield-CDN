import { Controller, Post, Body, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { VerificationService, VerificationRequest, VerificationResult } from './verification.service';
import { TokenService, TokenPayload } from '../token/token.service';

@Controller('api/verification')
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly tokenService: TokenService,
  ) {}

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

  /**
   * Verify a JWT token (for backend validation without calling the challenge API)
   */
  @Post('verify-token')
  async verifyToken(@Body() body: { token: string }): Promise<TokenPayload> {
    try {
      return await this.tokenService.verifyToken(body.token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Decode a token without verifying (for inspection purposes)
   */
  @Post('decode-token')
  decodeToken(@Body() body: { token: string }): TokenPayload | null {
    return this.tokenService.decodeToken(body.token);
  }
}
