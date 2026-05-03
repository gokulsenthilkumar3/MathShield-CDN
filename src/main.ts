import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security middleware (disable CSP in dev so static pages load properly)
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
    }),
  );

  // Global validation pipe — allow unknown fields so partial payloads work
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // allow extra fields from clients
      transform: true,
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Serve static files — use process.cwd() so it works in both ts-node and compiled modes
  const publicPath = join(process.cwd(), 'public');
  app.useStaticAssets(publicPath);
  console.log(`📁 Serving static files from: ${publicPath}`);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`\n🚀 MathShield API running on port ${port}`);
  console.log(`📱 Demo:       http://localhost:${port}/demo.html`);
  console.log(`📊 Dashboard:  http://localhost:${port}/dashboard.html`);
  console.log(`🔌 API Base:   http://localhost:${port}/api\n`);
}
bootstrap();
