import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

export const PUBLIC_KEY = 'isPublic';
export const Public = () => {
  const decorator = (target: any, key?: string, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(PUBLIC_KEY, true, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(PUBLIC_KEY, true, target);
    return target;
  };
  return decorator;
};

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly validApiKeys: Set<string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    // Support multiple API keys (comma-separated) for multi-tenant use
    const keySecret = this.configService.get<string>('API_KEY_SECRET') || 'demo-key';
    this.validApiKeys = new Set(
      keySecret.split(',').map((k) => k.trim()).filter(Boolean),
    );
    // Always allow the demo key in non-production
    if (this.configService.get('NODE_ENV') !== 'production') {
      this.validApiKeys.add('demo-key');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.get<boolean>(PUBLIC_KEY, context.getHandler());
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader: string = request.headers['authorization'] || '';
    const xApiKey: string = request.headers['x-api-key'] || '';

    // Support both "Bearer <key>" and "X-Api-Key: <key>"
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : xApiKey.trim();

    if (!token || !this.validApiKeys.has(token)) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}
