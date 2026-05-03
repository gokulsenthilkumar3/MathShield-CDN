# MathShield CDN

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![NestJS](https://img.shields.io/badge/NestJS-v10-red.svg)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)

> A math-based human verification CDN — stop bots with intelligent challenges, not friction.

## Overview

**MathShield** is a drop-in CAPTCHA alternative that uses adaptive math and logic challenges combined with real-time risk scoring to distinguish humans from bots. It generates a signed JWT token on success that your backend can verify independently.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   MathShield CDN                    │
│                                                     │
│  ┌────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Challenge │  │    Risk     │  │  Analytics  │  │
│  │  Service   │  │   Service   │  │   Service   │  │
│  └─────┬──────┘  └──────┬──────┘  └─────────────┘  │
│        │                │                           │
│  ┌─────▼────────────────▼──────┐                    │
│  │      Verification Service   │                    │
│  └─────────────┬───────────────┘                    │
│                │                                    │
│  ┌─────────────▼───────────────┐                    │
│  │       Token Service         │                    │
│  │  (signs & verifies JWTs)    │                    │
│  └─────────────────────────────┘                    │
└─────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start development server
npm run start:dev
```

The server starts on port 3000 by default.
- **Demo:** `http://localhost:3000/demo.html`
- **Swagger UI:** `http://localhost:3000/api`

---

## Widget Integration

Add MathShield to your frontend with a single script tag:

```html
<script src="https://your-cdn-domain.com/mathshield.js"></script>

<div class="mathshield-widget" data-site-key="YOUR_SITE_KEY"></div>
```

Listen for the verification result:

```javascript
document.querySelector('.mathshield-widget').addEventListener('mathshield:verified', (e) => {
  const { token, success, intelligenceScore } = e.detail;
  if (success) {
    // Send token to your backend for verification
    submitForm({ token });
  }
});
```

---

## Token Verification Flow

```
Frontend                  MathShield CDN               Your Backend
   │                            │                            │
   │──── POST /api/challenge ──►│                            │
   │◄─── { challengeId, ... } ──│                            │
   │                            │                            │
   │──── POST /api/verification/verify ──►│                  │
   │◄─── { success, token, ... } ─────────│                  │
   │                            │                            │
   │──────────────── POST /your-endpoint { token } ─────────►│
   │                            │  POST /api/verification/    │
   │                            │◄── verify-token { token } ─│
   │                            │──── { valid, payload } ───►│
   │                            │                            │
   │◄──────────────── 200 OK ───────────────────────────────│
```

---

## API Reference

### Generate a Challenge
`POST /api/challenge/generate`

```json
{
  "difficulty": "medium",
  "type": "algebra",
  "riskScore": 45
}
```

### Submit an Answer
`POST /api/verification/verify`

```json
{
  "challengeId": "<uuid>",
  "answer": "7",
  "timeTaken": 12500,
  "behaviorData": { ... }
}
```

### Verify a Token (Backend)
`POST /api/verification/verify-token`

```json
{ "token": "<jwt>" }
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | DB username | `postgres` |
| `DB_PASSWORD` | DB password | — |
| `DB_DATABASE` | DB name | `mathshield` |
| `JWT_SECRET` | JWT signing secret | — |
| `API_KEY` | API key for protected endpoints | — |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | *(all in dev)* |
| `REDIS_URL` | Redis URL for cache (optional) | *(in-memory)* |
| `NODE_ENV` | `development` \| `production` | `development` |

---

## License

MIT © MathShield
