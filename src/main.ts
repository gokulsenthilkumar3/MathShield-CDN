import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  // Security middleware
  app.use(helmet());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter for consistent JSON error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS — use explicit whitelist in production, permissive in dev
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : null;

  app.enableCors({
    origin: allowedOrigins ?? (process.env.NODE_ENV === 'production' ? false : true),
    credentials: true,
  });

  // Swagger / OpenAPI setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MathShield CDN API')
    .setDescription('Math-based human verification platform — challenge generation, risk scoring, token verification')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  // Serve static files from public directory
  app.useStaticAssets(join(__dirname, '..', 'public'));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 MathShield CDN running on port ${port}`);
  console.log(`📱 Demo page: http://localhost:${port}/demo.html`);
  console.log(`📊 Swagger UI: http://localhost:${port}/api`);
}
bootstrap();
