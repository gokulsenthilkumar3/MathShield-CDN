import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private store = new Map<string, RateLimitStore>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(private readonly configService: ConfigService) {
    this.windowMs =
      parseInt(this.configService.get('RATE_LIMIT_WINDOW_MS')) || 900000; // 15 min
    this.maxRequests =
      parseInt(this.configService.get('RATE_LIMIT_MAX_REQUESTS')) || 100;

    // Periodic cleanup every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.ip ||
      'unknown';

    const now = Date.now();
    const entry = this.store.get(ip);

    if (!entry || now > entry.resetTime) {
      // New window
      this.store.set(ip, { count: 1, resetTime: now + this.windowMs });
      this.setHeaders(res, this.maxRequests - 1, now + this.windowMs);
      return next();
    }

    if (entry.count >= this.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
      res.status(429).json({
        statusCode: 429,
        message: `Too many requests. Retry after ${retryAfter}s.`,
        error: 'Too Many Requests',
      });
      return;
    }

    entry.count++;
    this.setHeaders(res, this.maxRequests - entry.count, entry.resetTime);
    next();
  }

  private setHeaders(res: Response, remaining: number, resetTime: number): void {
    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [ip, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(ip);
      }
    }
  }
}
