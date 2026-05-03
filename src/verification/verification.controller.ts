import {
  Controller, Post, Body, Req, HttpException, HttpStatus, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { VerificationService, VerificationRequest, VerificationResult } from './verification.service';
import { TokenService, TokenPayload } from '../token/token.service';

@ApiTags('Verification')
@Controller('api/verification')
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Submit a challenge response for verification.
   * Rate-limited to 10 requests per minute per IP.
   */
  @Post('verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify a challenge response' })
  @ApiResponse({ status: 200, description: 'Verification result returned' })
  @ApiResponse({ status: 404, description: 'Challenge not found or expired' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async verifyResponse(
    @Body() request: VerificationRequest,
    @Req() req: Request,
  ): Promise<VerificationResult> {
    try {
      // Extract real IP from X-Forwarded-For (set by reverse proxies) or fall back to socket
      const forwarded = req.headers['x-forwarded-for'];
      const realIp = Array.isArray(forwarded)
        ? forwarded[0]
        : (forwarded?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown');

      // Inject real IP and user-agent into riskFactors automatically
      const enrichedRequest: VerificationRequest = {
        ...request,
        riskFactors: {
          ip: realIp,
          userAgent: req.headers['user-agent'] ?? '',
          ...(request.riskFactors ?? {}),
        },
      };

      return await this.verificationService.verifyResponse(enrichedRequest);
    } catch (error) {
      if (error?.message === 'Challenge not found or expired') {
        throw new HttpException('Challenge not found or expired', HttpStatus.NOT_FOUND);
      }
      if (error?.status) throw error;
      throw new HttpException('Verification failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Verify a JWT token for backend validation.
   */
  @Post('verify-token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a MathShield JWT token' })
  @ApiResponse({ status: 200, description: 'Token payload returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async verifyToken(@Body() body: { token: string }): Promise<TokenPayload> {
    try {
      return await this.tokenService.verifyToken(body.token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Decode a token without verifying (inspection only).
   */
  @Post('decode-token')
  @ApiOperation({ summary: 'Decode a MathShield token without signature verification' })
  decodeToken(@Body() body: { token: string }): TokenPayload | null {
    return this.tokenService.decodeToken(body.token);
  }
}
