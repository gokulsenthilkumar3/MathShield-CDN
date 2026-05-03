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
  // Sliding window: store array of timestamps per IP
  private requestTracker = new Map<string, number[]>();

  private readonly WINDOW_MS = 60_000; // 1-minute sliding window

  calculateRiskScore(factors: RiskFactors): RiskScore {
    const scores = {
      ip: this.calculateIpRisk(factors.ip),
      frequency: this.calculateFrequencyRisk(factors.ip, factors.requestFrequency),
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
    const timestamps = this.requestTracker.get(ip) ?? [];

    // Add current timestamp and evict entries outside the window
    timestamps.push(now);
    const cutoff = now - this.WINDOW_MS;
    const trimmed = timestamps.filter(t => t >= cutoff);
    this.requestTracker.set(ip, trimmed);

    // Periodic full cleanup of stale IPs
    if (Math.random() < 0.01) {
      this.cleanupOldRequests(cutoff);
    }
  }

  private calculateIpRisk(ip?: string): number {
    if (!ip) return 50;

    if (this.ipReputationCache.has(ip)) {
      return this.ipReputationCache.get(ip)!;
    }

    let risk = 0;

    if (this.isPrivateIp(ip)) {
      risk = 10;
    } else if (this.isDataCenterIp(ip)) {
      risk = 80;
    } else if (this.isTorExitNode(ip)) {
      risk = 95;
    } else {
      risk = 30;
    }

    this.ipReputationCache.set(ip, risk);
    return risk;
  }

  private calculateFrequencyRisk(ip?: string, providedFrequency?: number): number {
    if (!ip) return 50;

    // Use provided frequency as additional signal if available
    if (providedFrequency !== undefined && providedFrequency > 0) {
      if (providedFrequency > 20) return 90;
      if (providedFrequency > 10) return 70;
      if (providedFrequency > 5) return 50;
    }

    const now = Date.now();
    const cutoff = now - this.WINDOW_MS;
    const timestamps = (this.requestTracker.get(ip) ?? []).filter(t => t >= cutoff);
    const windowCount = timestamps.length;

    if (windowCount > 10) return 90;
    if (windowCount > 5) return 60;
    if (windowCount > 2) return 30;
    return 10;
  }

  private calculateBehaviorRisk(behaviorScore?: number): number {
    if (behaviorScore === undefined || behaviorScore === null) return 50;
    return Math.max(0, 100 - behaviorScore);
  }

  private calculateHistoryRisk(pastSuccessRate?: number): number {
    if (pastSuccessRate === undefined || pastSuccessRate === null) return 30;
    if (pastSuccessRate > 0.8) return 10;
    if (pastSuccessRate > 0.6) return 30;
    if (pastSuccessRate > 0.4) return 50;
    if (pastSuccessRate > 0.2) return 70;
    return 90;
  }

  private calculateDeviceRisk(userAgent?: string, fingerprint?: string): number {
    let risk = 0;

    if (userAgent) {
      if (this.isSuspiciousUserAgent(userAgent)) {
        risk += 40;
      } else if (userAgent.length < 10) {
        risk += 20;
      }
    } else {
      risk += 30;
    }

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
      reasoning.push('Unusually high request frequency within sliding window');
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
    // IPv4 private ranges
    const privateV4 = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^localhost$/,
    ];
    if (privateV4.some(r => r.test(ip))) return true;

    // IPv6 private/loopback ranges
    const normalised = ip.toLowerCase();
    if (normalised === '::1') return true;                          // loopback
    if (normalised.startsWith('fc') || normalised.startsWith('fd')) return true; // fc00::/7 ULA
    if (normalised.startsWith('fe80')) return true;                // fe80::/10 link-local

    return false;
  }

  private isDataCenterIp(ip: string): boolean {
    const dataCenterRanges = [
      /^208\.67\./,
      /^8\.8\.8\./,
      /^1\.1\.1\./,
    ];
    return dataCenterRanges.some(r => r.test(ip));
  }

  private isTorExitNode(_ip: string): boolean {
    // In production, query a real Tor exit node list / DNSBL
    return false;
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /java/i, /go-http/i,
    ];
    return suspiciousPatterns.some(p => p.test(userAgent));
  }

  private cleanupOldRequests(cutoffTime: number): void {
    for (const [ip, timestamps] of this.requestTracker.entries()) {
      const trimmed = timestamps.filter(t => t >= cutoffTime);
      if (trimmed.length === 0) {
        this.requestTracker.delete(ip);
      } else {
        this.requestTracker.set(ip, trimmed);
      }
    }
  }
}
