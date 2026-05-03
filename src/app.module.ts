import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ChallengeModule } from './challenge/challenge.module';
import { RiskModule } from './risk/risk.module';
import { VerificationModule } from './verification/verification.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TokenModule } from './token/token.module';
import { HealthController } from './health.controller';

/**
 * Parse a Fly.io / Railway style DATABASE_URL into individual TypeORM options.
 * Falls back to DB_HOST / DB_PORT / etc. env vars if DATABASE_URL is not set.
 */
function parseDatabaseUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '5432', 10),
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
    ssl: parsed.searchParams.get('sslmode') !== 'disable'
      ? { rejectUnauthorized: false }
      : false,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        const dbConfig = databaseUrl
          ? parseDatabaseUrl(databaseUrl)
          : {
              host: configService.get('DB_HOST') || 'localhost',
              port: parseInt(configService.get('DB_PORT') || '5432', 10),
              username: configService.get('DB_USERNAME') || 'postgres',
              password: configService.get('DB_PASSWORD') || 'password',
              database: configService.get('DB_DATABASE') || 'mathshield',
              ssl: false,
            };

        return {
          type: 'postgres',
          ...dbConfig,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          autoLoadEntities: true,
          synchronize: configService.get('NODE_ENV') !== 'production',
          logging: configService.get('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ttl: 60 * 60,
        max: 1000,
        store: configService.get('REDIS_URL') ? 'redis' : 'memory',
        ...(configService.get('REDIS_URL') ? { url: configService.get('REDIS_URL') } : {}),
      }),
      inject: [ConfigService],
    }),
    TokenModule,
    ChallengeModule,
    RiskModule,
    VerificationModule,
    AnalyticsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
