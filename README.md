# 🛡️ Human Verification Shield

A math-driven human verification and bot protection platform that provides intelligent, adaptive security for web applications.

## 🚀 Features

- **Dynamic Math Challenges**: Arithmetic, algebra, logic, and sequence problems
- **Behavioral Analysis**: Mouse tracking, typing patterns, and interaction timing
- **Risk Scoring Engine**: IP reputation, request frequency, and device fingerprinting
- **Adaptive Intelligence**: Difficulty adjusts based on risk assessment
- **Drop-in Integration**: Simple JavaScript widget for easy deployment
- **Real-time Analytics**: Attack pattern detection and traffic analysis
- **Multiple Themes**: Light and dark mode support

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Layer  │───▶│  API Gateway    │───▶│ Challenge Engine│
│   (JS Widget)   │    │  (Rate Limit)   │    │  (Math Gen)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Behavior Engine │    │  Risk Scoring   │    │ Verification    │
│ (Mouse/Typing)  │    │  (IP Analysis)  │    │   Engine        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Layer    │    │   Analytics     │    │   Dashboard     │
│ (Redis/Postgres)│    │   (Reports)     │    │   (UI)          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

- **Backend**: Node.js with NestJS
- **Database**: PostgreSQL (analytics) + Redis (sessions)
- **Frontend**: Vanilla JavaScript widget
- **Security**: Helmet, Rate Limiting, Input Validation

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Development Server
```bash
npm run start:dev
```

### 4. Test the Demo
Open `public/demo.html` in your browser to test the verification widget.

## 🔧 Integration

### Basic Integration
```html
<script src="https://yourdomain.com/shield.js"></script>
<script>
  const shield = new HumanShield({
    apiKey: 'your-api-key',
    theme: 'light',
    onVerified: (result) => {
      console.log('Verified!', result);
      // Allow user to proceed
    }
  });
  
  shield.init();
  shield.start();
</script>
```

### Advanced Configuration
```javascript
const shield = new HumanShield({
  apiKey: 'your-api-key',
  theme: 'dark',
  invisible: false,
  language: 'en',
  onVerified: (result) => {
    // Handle successful verification
    console.log('Intelligence Score:', result.intelligenceScore);
    console.log('Confidence:', result.confidence);
    console.log('Risk Level:', result.riskLevel);
  },
  onError: (error) => {
    // Handle errors
    console.error('Verification failed:', error);
  }
});
```

## 📊 API Endpoints

### Generate Challenge
```http
POST /api/challenge/generate
Content-Type: application/json

{
  "difficulty": "medium",
  "type": "arithmetic",
  "riskScore": 45
}
```

### Verify Response
```http
POST /api/verification/verify
Content-Type: application/json

{
  "challengeId": "abc123",
  "answer": "42",
  "timeTaken": 15000,
  "behaviorData": {
    "mouseMovements": [...],
    "typingPattern": {...}
  },
  "riskFactors": {
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### Get Analytics
```http
GET /api/analytics
```

### Calculate Risk Score
```http
POST /api/risk/calculate
Content-Type: application/json

{
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "requestFrequency": 5
}
```

## 🎯 Challenge Types

### Arithmetic
- **Easy**: Simple addition/subtraction (10 + 5 = ?)
- **Medium**: Multi-step calculations (25 - 8 = ?)
- **Hard**: Multiplication/division (12 × 8 = ?)

### Algebra
- **Easy**: Basic equations (x + 5 = 12)
- **Medium**: Variable coefficients (3x = 21)
- **Hard**: Complex equations (2x + 7 = 19)

### Logic
- **Easy**: Simple reasoning problems
- **Medium**: Classic logic puzzles
- **Hard**: Complex logical deductions

### Sequences
- **Easy**: Arithmetic progressions
- **Medium**: Geometric progressions
- **Hard**: Fibonacci and custom patterns

## 🧠 Risk Scoring

The risk engine analyzes multiple factors:

### IP Analysis (25% weight)
- Private IP ranges: Low risk
- Data center IPs: High risk
- Tor exit nodes: Very high risk
- Request frequency patterns

### Behavior Analysis (20% weight)
- Mouse movement patterns
- Click timing consistency
- Typing rhythm
- Focus/blur events

### Historical Data (15% weight)
- Past verification success rate
- Known bot patterns
- Reputation scores

### Device Fingerprinting (15% weight)
- User agent analysis
- Screen resolution
- Browser characteristics

## 📈 Intelligence Scoring

Instead of simple pass/fail, the system provides:

- **Intelligence Score** (0-100): Based on correctness, speed, and behavior
- **Confidence Level** (0-100): How certain we are about the result
- **Risk Assessment**: Low/Medium/High risk categorization
- **Adaptive Score**: Reusable identity signal across applications

## 🔒 Security Features

- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Sanitizes all user inputs
- **Challenge Expiration**: Time-limited verification windows
- **Behavior Fingerprinting**: Detects automated interactions
- **IP Reputation**: Blocks known malicious sources
- **Encryption**: Secure data transmission

## 📊 Analytics Dashboard

Monitor:
- Total verification attempts
- Success/failure rates
- Average solve times
- Bot traffic percentage
- Risk distribution
- Attack patterns
- Geographic data

## 🚀 Deployment

### Production Setup
```bash
# Build for production
npm run build

# Start production server
npm run start:prod
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
COPY public/ ./public/
EXPOSE 3000
CMD ["node", "dist/main"]
```

### Environment Variables
```env
PORT=3000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_DATABASE=verification_platform
REDIS_HOST=localhost
REDIS_PORT=6379
API_KEY_SECRET=your-secret-key
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:e2e

# Test with coverage
npm run test:cov
```

## 📝 License

MIT License - feel free to use in commercial projects!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 🆘 Support

- 📧 Email: support@human-shield.com
- 💬 Discord: [Join our community](https://discord.gg/human-shield)
- 📖 Documentation: [docs.human-shield.com](https://docs.human-shield.com)

---

**Built with ❤️ for a safer internet**
