import { Controller, Get } from '@nestjs/common';

/**
 * Lightweight health check endpoint used by Fly.io machine checks.
 * GET /health → 200 OK { status: 'ok' }
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
