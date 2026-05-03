# 🚀 Deployment Guide

## Production Setup

### Environment Variables
```env
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-secure-password
DB_DATABASE=verification_platform

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# API Security
API_KEY_SECRET=your-super-secret-api-key
JWT_SECRET=your-jwt-secret-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Risk Scoring Thresholds
RISK_THRESHOLD_LOW=30
RISK_THRESHOLD_MEDIUM=70
```

### Database Setup

#### PostgreSQL
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb verification_platform

# Create user
sudo -u postgres createuser --interactive

# Grant privileges
sudo -u postgres psql -d verification_platform -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;"
```

#### Redis
```bash
# Install Redis
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: requirepass your-redis-password

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=verification_platform
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=your-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass your-redis-password
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./public:/usr/share/nginx/html
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Nginx Configuration

#### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        # Serve static files
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }

        # Proxy API requests
        location /api/ {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### SSL Setup with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Monitoring and Logging

#### PM2 Process Manager
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs
```

#### ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'human-shield',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Health Checks

#### Health Endpoint
```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
```

### Performance Optimization

#### Enable Caching
```typescript
// Cache configuration
CacheModule.register({
  ttl: 60 * 60, // 1 hour
  max: 100,
  isGlobal: true,
});
```

#### Rate Limiting
```typescript
// app.module.ts
import * as rateLimit from 'express-rate-limit';

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
}));
```

### Security Hardening

#### Helmet.js
```typescript
// main.ts
import helmet from 'helmet';
app.use(helmet());
```

#### CORS Configuration
```typescript
// main.ts
app.enableCors({
  origin: ['https://your-domain.com'],
  credentials: true,
});
```

### Backup Strategy

#### Database Backup
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Create backup
pg_dump -h localhost -U postgres verification_platform > $BACKUP_DIR/backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/backup_$DATE.sql

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

#### Cron Job
```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

### Scaling

#### Horizontal Scaling
```bash
# Multiple instances
pm2 start ecosystem.config.js -i max

# Load balancer configuration
upstream app {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}
```

#### Database Scaling
- Read replicas for analytics queries
- Connection pooling
- Database indexing

### Troubleshooting

#### Common Issues
1. **Database Connection Failed**
   - Check PostgreSQL service status
   - Verify connection parameters
   - Check firewall rules

2. **Redis Connection Failed**
   - Verify Redis is running
   - Check authentication
   - Review network connectivity

3. **High Memory Usage**
   - Monitor with PM2
   - Check for memory leaks
   - Optimize caching strategy

#### Log Analysis
```bash
# View application logs
pm2 logs

# System logs
sudo journalctl -u nginx
sudo journalctl -u postgresql
sudo journalctl -u redis
```

### Environment-Specific Configurations

#### Development
```env
NODE_ENV=development
DB_HOST=localhost
REDIS_HOST=localhost
LOG_LEVEL=debug
```

#### Staging
```env
NODE_ENV=staging
DB_HOST=staging-db.example.com
REDIS_HOST=staging-redis.example.com
LOG_LEVEL=info
```

#### Production
```env
NODE_ENV=production
DB_HOST=prod-db.example.com
REDIS_HOST=prod-redis.example.com
LOG_LEVEL=warn
```

### Migration and Rollback

#### Database Migrations
```bash
# Create migration
npm run migration:create -- -n AddNewTable

# Run migrations
npm run migration:run

# Rollback
npm run migration:revert
```

#### Zero-Downtime Deployment
```bash
# Blue-green deployment
# 1. Deploy to green environment
# 2. Test thoroughly
# 3. Switch traffic to green
# 4. Monitor for issues
# 5. Keep blue as rollback
```

This deployment guide provides comprehensive instructions for deploying the Human Verification Shield platform in production environments with proper security, monitoring, and scalability considerations.
