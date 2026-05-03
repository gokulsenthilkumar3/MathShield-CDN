import { Injectable } from '@nestjs/common';

export interface RiskFactors {
  ip?: string;
  userAgent?: string;
  requestFrequency?: number;
  behaviorScore?: number;
  pastSuccessRate?: number;
  geoLocation?: string;
  deviceFingerprint?: string;
}

export interface RiskScore {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high';
  factors: {
    ip: number;
    frequency: number;
    behavior: number;
    history: number;
    device: number;
  };
  reasoning: string[];
}

@Injectable()
export class RiskService {
  private ipReputationCache = new Map<string, number>();
  private requestTracker = new Map<string, { count: number; lastRequest: number }>();

  calculateRiskScore(factors: RiskFactors): RiskScore {
    const scores = {
      ip: this.calculateIpRisk(factors.ip),
      frequency: this.calculateFrequencyRisk(factors.ip),
      behavior: this.calculateBehaviorRisk(factors.behaviorScore),
      history: this.calculateHistoryRisk(factors.pastSuccessRate),
      device: this.calculateDeviceRisk(factors.userAgent, factors.deviceFingerprint),
    };

    const totalScore = Math.round(
      scores.ip * 0.25 +
      scores.frequency * 0.25 +
      scores.behavior * 0.20 +
      scores.history * 0.15 +
      scores.device * 0.15
    );

    const reasoning = this.generateReasoning(scores, factors);

    return {
      score: Math.min(100, Math.max(0, totalScore)),
      level: this.getRiskLevel(totalScore),
      factors: scores,
      reasoning,
    };
  }

  trackRequest(ip: string): void {
    const now = Date.now();
    const tracker = this.requestTracker.get(ip);
    
    if (tracker) {
      tracker.count++;
      tracker.lastRequest = now;
    } else {
      this.requestTracker.set(ip, { count: 1, lastRequest: now });
    }

    // Clean up old entries (older than 1 hour)
    this.cleanupOldRequests(now - 3600000);
  }

  private calculateIpRisk(ip?: string): number {
    if (!ip) return 50; // Unknown IP = medium risk

    // Check if IP is in cache
    if (this.ipReputationCache.has(ip)) {
      return this.ipReputationCache.get(ip)!;
    }

    // Simple heuristics for IP reputation
    let risk = 0;

    // Private IP ranges = lower risk
    if (this.isPrivateIp(ip)) {
      risk = 10;
    }
    // Known data centers = higher risk
    else if (this.isDataCenterIp(ip)) {
      risk = 80;
    }
    // Tor exit nodes = very high risk
    else if (this.isTorExitNode(ip)) {
      risk = 95;
    }
    // Public IP = medium risk
    else {
      risk = 30;
    }

    this.ipReputationCache.set(ip, risk);
    return risk;
  }

  private calculateFrequencyRisk(ip?: string): number {
    if (!ip) return 50;

    const tracker = this.requestTracker.get(ip);
    if (!tracker) return 0;

    const now = Date.now();
    const timeSinceLastRequest = now - tracker.lastRequest;
    
    // Very frequent requests = high risk
    if (tracker.count > 10 && timeSinceLastRequest < 60000) { // >10 requests in last minute
      return 90;
    }
    // Moderately frequent = medium risk
    else if (tracker.count > 5 && timeSinceLastRequest < 300000) { // >5 requests in last 5 minutes
      return 60;
    }
    // Normal frequency = low risk
    else {
      return 10;
    }
  }

  private calculateBehaviorRisk(behaviorScore?: number): number {
    if (!behaviorScore) return 50; // Unknown behavior = medium risk
    
    // Behavior score should be 0-100 (100 = very human-like)
    // Convert to risk score (inverse)
    return Math.max(0, 100 - behaviorScore);
  }

  private calculateHistoryRisk(pastSuccessRate?: number): number {
    if (!pastSuccessRate) return 30; // Unknown history = low-medium risk
    
    // High success rate = lower risk
    if (pastSuccessRate > 0.8) return 10;
    if (pastSuccessRate > 0.6) return 30;
    if (pastSuccessRate > 0.4) return 50;
    if (pastSuccessRate > 0.2) return 70;
    return 90;
  }

  private calculateDeviceRisk(userAgent?: string, fingerprint?: string): number {
    let risk = 0;

    // Check user agent
    if (userAgent) {
      // Suspicious user agents
      if (this.isSuspiciousUserAgent(userAgent)) {
        risk += 40;
      }
      // Missing user agent
      else if (userAgent.length < 10) {
        risk += 20;
      }
    } else {
      risk += 30;
    }

    // Check device fingerprint
    if (!fingerprint) {
      risk += 20;
    }

    return Math.min(100, risk);
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score < 30) return 'low';
    if (score < 70) return 'medium';
    return 'high';
  }

  private generateReasoning(scores: any, factors: RiskFactors): string[] {
    const reasoning: string[] = [];

    if (scores.ip > 70) {
      reasoning.push('High-risk IP address detected');
    } else if (scores.ip > 40) {
      reasoning.push('Unusual IP address pattern');
    }

    if (scores.frequency > 70) {
      reasoning.push('Unusually high request frequency');
    } else if (scores.frequency > 40) {
      reasoning.push('Elevated request frequency');
    }

    if (scores.behavior > 70) {
      reasoning.push('Bot-like behavior detected');
    } else if (scores.behavior > 40) {
      reasoning.push('Suspicious behavior patterns');
    }

    if (scores.history > 70) {
      reasoning.push('Poor verification history');
    }

    if (scores.device > 60) {
      reasoning.push('Suspicious device characteristics');
    }

    if (reasoning.length === 0) {
      reasoning.push('Normal activity patterns');
    }

    return reasoning;
  }

  private isPrivateIp(ip: string): boolean {
    // Simple check for private IP ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^localhost$/,
    ];
    
    return privateRanges.some(range => range.test(ip));
  }

  private isDataCenterIp(ip: string): boolean {
    // Simplified check - in production, use a real IP intelligence service
    const dataCenterRanges = [
      /^208\.67\./, // OpenDNS
      /^8\.8\.8\./, // Google DNS
      /^1\.1\.1\./, // Cloudflare DNS
    ];
    
    return dataCenterRanges.some(range => range.test(ip));
  }

  private isTorExitNode(ip: string): boolean {
    // Simplified check - in production, use a real Tor exit node list
    return false;
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /go-http/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private cleanupOldRequests(cutoffTime: number): void {
    for (const [ip, tracker] of this.requestTracker.entries()) {
      if (tracker.lastRequest < cutoffTime) {
        this.requestTracker.delete(ip);
      }
    }
  }
}
