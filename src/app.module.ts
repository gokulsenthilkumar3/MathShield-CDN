import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ChallengeModule } from './challenge/challenge.module';
import { RiskModule } from './risk/risk.module';
import { VerificationModule } from './verification/verification.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST') || 'localhost',
        port: parseInt(configService.get('DB_PORT')) || 5432,
        username: configService.get('DB_USERNAME') || 'postgres',
        password: configService.get('DB_PASSWORD') || 'password',
        database: configService.get('DB_DATABASE') || 'verification_platform',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        autoLoadEntities: true,
        synchronize: true, // Set to false in production
        logging: false, // Set to true for SQL debugging
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ttl: 60 * 60, // 1 hour
        max: 100, // maximum number of items in cache
        isGlobal: true,
      }),
      inject: [ConfigService],
    }),
    ChallengeModule,
    RiskModule,
    VerificationModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
