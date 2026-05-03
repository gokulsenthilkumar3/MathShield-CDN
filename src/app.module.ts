import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
import { ChallengeModule } from './challenge/challenge.module';
import { RiskModule } from './risk/risk.module';
import { VerificationModule } from './verification/verification.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BehaviorModule } from './behavior/behavior.module';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { ApiKeyGuard } from './common/guards/api-key.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get('DB_TYPE') || 'sqlite';
        
        if (dbType === 'sqlite') {
          return {
            type: 'sqlite',
            database: configService.get('DB_NAME') || 'mathshield.sqlite',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            autoLoadEntities: true,
            synchronize: true,
            logging: false,
          };
        }

        return {
          type: 'postgres',
          host: configService.get('DB_HOST') || 'localhost',
          port: parseInt(configService.get('DB_PORT')) || 5432,
          username: configService.get('DB_USERNAME') || 'postgres',
          password: configService.get('DB_PASSWORD') || 'password',
          database: configService.get('DB_DATABASE') || 'verification_platform',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          autoLoadEntities: true,
          synchronize: true, // Set to false in production — use migrations
          logging: false,
        };
      },
      inject: [ConfigService],
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 10 * 1000, // 10 minutes in ms
      max: 1000, // max cached challenge sessions
    }),
    ChallengeModule,
    RiskModule,
    VerificationModule,
    AnalyticsModule,
    BehaviorModule,
  ],
  providers: [
    // Apply API key guard to all routes globally
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply rate limiting to all /api/* routes
    consumer.apply(RateLimitMiddleware).forRoutes('api/*');
  }
}
