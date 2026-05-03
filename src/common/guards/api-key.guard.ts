import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * API key guard.
 * Reads the expected key from the API_KEY environment variable.
 * Clients must send the key in the `x-api-key` request header.
 *
 * Usage:
 *   @UseGuards(ApiKeyGuard)
 *   @Get('protected')
 *   getProtectedData() { ... }
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];
    const expectedKey = this.configService.get<string>('API_KEY');

    if (!expectedKey) {
      // If no API_KEY is configured, skip the guard in development
      if (this.configService.get('NODE_ENV') !== 'production') return true;
      throw new UnauthorizedException('API key not configured on the server');
    }

    if (!apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}
