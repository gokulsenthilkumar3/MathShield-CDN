import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'crypto';

export interface VerificationToken {
  token: string;
  expiresAt: Date;
  challengeSignature: string;
}

export interface TokenPayload {
  sub: string; // challenge ID
  challengeType: string;
  difficulty: string;
  humanScore: number;
  confidence: number;
  riskLevel: string;
  iat: number;
  exp: number;
  jti: string; // unique token ID for replay prevention
}

@Injectable()
export class TokenService {
  private readonly secret: string;
  private readonly tokenExpiry: number;
  private readonly usedTokenIds: Set<string> = new Set();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.secret = this.configService.get('JWT_SECRET') || 'default-secret-change-in-production';
    this.tokenExpiry = parseInt(this.configService.get('TOKEN_EXPIRY_SECONDS')) || 3600; // 1 hour
  }

  /**
   * Generate a signed verification token after successful challenge completion
   */
  async generateVerificationToken(
    challengeId: string,
    challengeType: string,
    difficulty: string,
    humanScore: number,
    confidence: number,
    riskLevel: string,
  ): Promise<VerificationToken> {
    const jti = randomBytes(16).toString('hex'); // Unique token ID
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.tokenExpiry;

    const payload: TokenPayload = {
      sub: challengeId,
      challengeType,
      difficulty,
      humanScore,
      confidence,
      riskLevel,
      iat: now,
      exp,
      jti,
    };

    const token = this.jwtService.sign(payload, {
      secret: this.secret,
      expiresIn: this.tokenExpiry,
    });

    // Create challenge signature for integrity verification
    const challengeSignature = this.createChallengeSignature(challengeId, challengeType, difficulty);

    return {
      token,
      expiresAt: new Date(exp * 1000),
      challengeSignature,
    };
  }

  /**
   * Verify a token and check for replay attacks
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.secret,
      });

      // Check for replay attacks
      if (this.usedTokenIds.has(payload.jti)) {
        throw new UnauthorizedException('Token has already been used (replay attack detected)');
      }

      // Mark token as used
      this.usedTokenIds.add(payload.jti);

      // Clean up old token IDs periodically (keep last 10000)
      if (this.usedTokenIds.size > 10000) {
        const iterator = this.usedTokenIds.values();
        for (let i = 0; i < 1000; i++) {
          const oldToken = iterator.next().value;
          this.usedTokenIds.delete(oldToken);
        }
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Create HMAC signature for challenge integrity
   */
  createChallengeSignature(challengeId: string, challengeType: string, difficulty: string): string {
    const data = `${challengeId}:${challengeType}:${difficulty}:${Math.floor(Date.now() / 1000 / 60)}`; // Changes every minute
    return createHmac('sha256', this.secret).update(data).digest('hex');
  }

  /**
   * Verify challenge signature to prevent tampering
   */
  verifyChallengeSignature(
    challengeId: string,
    challengeType: string,
    difficulty: string,
    signature: string,
  ): boolean {
    // Check current and previous minute signatures (for time drift)
    const now = Math.floor(Date.now() / 1000 / 60);
    
    for (let minute = now; minute >= now - 1; minute--) {
      const data = `${challengeId}:${challengeType}:${difficulty}:${minute}`;
      const expectedSignature = createHmac('sha256', this.secret).update(data).digest('hex');
      
      if (signature === expectedSignature) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Decode token without verification (for inspection)
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return this.jwtService.decode<TokenPayload>(token);
    } catch {
      return null;
    }
  }
}
