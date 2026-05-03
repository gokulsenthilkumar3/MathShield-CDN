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

interface RequestWindow {
  timestamps: number[]; // rolling list of request timestamps
  lastRequest: number;
}

@Injectable()
export class RiskService {
  private ipReputationCache = new Map<string, number>();
  private requestWindows = new Map<string, RequestWindow>();

  // --- Public API ---

  calculateRiskScore(factors: RiskFactors): RiskScore {
    const scores = {
      ip:        this.calculateIpRisk(factors.ip),
      frequency: this.calculateFrequencyRisk(factors.ip),
      behavior:  this.calculateBehaviorRisk(factors.behaviorScore),
      history:   this.calculateHistoryRisk(factors.pastSuccessRate),
      device:    this.calculateDeviceRisk(factors.userAgent, factors.deviceFingerprint),
    };

    // Weighted composite: IP 25 | Frequency 25 | Behavior 20 | History 15 | Device 15
    const totalScore = Math.round(
      scores.ip        * 0.25 +
      scores.frequency * 0.25 +
      scores.behavior  * 0.20 +
      scores.history   * 0.15 +
      scores.device    * 0.15,
    );

    return {
      score:   Math.min(100, Math.max(0, totalScore)),
      level:   this.getRiskLevel(totalScore),
      factors: scores,
      reasoning: this.generateReasoning(scores, factors),
    };
  }

  /** Record one request for the given IP using a 60-second sliding window. */
  trackRequest(ip: string): void {
    const now = Date.now();
    const WINDOW_MS = 60_000;

    let window = this.requestWindows.get(ip);
    if (!window) {
      window = { timestamps: [], lastRequest: now };
      this.requestWindows.set(ip, window);
    }

    // Keep only timestamps within the sliding window
    window.timestamps = window.timestamps.filter(ts => now - ts < WINDOW_MS);
    window.timestamps.push(now);
    window.lastRequest = now;

    // Periodic cleanup of stale entries (older than 1 hour)
    if (Math.random() < 0.01) {
      this.cleanupStaleWindows(now - 3_600_000);
    }
  }

  /** Returns how many requests the given IP made in the last `windowMs` ms. */
  getRequestCount(ip: string, windowMs = 60_000): number {
    const now = Date.now();
    const window = this.requestWindows.get(ip);
    if (!window) return 0;
    return window.timestamps.filter(ts => now - ts < windowMs).length;
  }

  // --- Private helpers ---

  private calculateIpRisk(ip?: string): number {
    if (!ip) return 50;

    // Normalise IPv6-mapped IPv4 (::ffff:192.168.1.1 → 192.168.1.1)
    const normalised = this.normaliseIp(ip);

    if (this.ipReputationCache.has(normalised)) {
      return this.ipReputationCache.get(normalised)!;
    }

    let risk: number;
    if (this.isPrivateIp(normalised))    { risk = 10; }
    else if (this.isTorExitNode(normalised))    { risk = 95; }  // check Tor before datacenter
    else if (this.isDataCenterIp(normalised))   { risk = 80; }
    else                                         { risk = 30; }

    this.ipReputationCache.set(normalised, risk);
    return risk;
  }

  private calculateFrequencyRisk(ip?: string): number {
    if (!ip) return 50;

    const per60s  = this.getRequestCount(ip, 60_000);
    const per300s = this.getRequestCount(ip, 300_000);

    if (per60s > 10)  return 90; // >10 requests in 1 min
    if (per300s > 20) return 70; // >20 requests in 5 min
    if (per300s > 10) return 45; // >10 requests in 5 min
    return 10;
  }

  private calculateBehaviorRisk(behaviorScore?: number): number {
    if (behaviorScore === undefined || behaviorScore === null) return 50;
    // behaviorScore: 0-100 where 100 = very human-like → invert to risk
    return Math.max(0, Math.min(100, 100 - behaviorScore));
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

    if (!userAgent || userAgent.trim().length < 10) {
      risk += 30; // missing / stub UA
    } else if (this.isSuspiciousUserAgent(userAgent)) {
      risk += 40;
    }

    if (!fingerprint) risk += 20;

    return Math.min(100, risk);
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score < 30) return 'low';
    if (score < 70) return 'medium';
    return 'high';
  }

  private generateReasoning(scores: RiskScore['factors'], _factors: RiskFactors): string[] {
    const out: string[] = [];

    if (scores.ip > 70)        out.push('High-risk IP address detected');
    else if (scores.ip > 40)   out.push('Unusual IP address pattern');

    if (scores.frequency > 70)       out.push('Unusually high request frequency');
    else if (scores.frequency > 40)  out.push('Elevated request frequency');

    if (scores.behavior > 70)        out.push('Bot-like behavior detected');
    else if (scores.behavior > 40)   out.push('Suspicious behavior patterns');

    if (scores.history > 70)   out.push('Poor verification history');
    if (scores.device > 60)    out.push('Suspicious device characteristics');

    if (out.length === 0) out.push('Normal activity patterns');
    return out;
  }

  // --- IP classification helpers ---

  private normaliseIp(ip: string): string {
    // Strip IPv6-mapped IPv4 prefix
    if (ip.startsWith('::ffff:')) return ip.slice(7);
    return ip;
  }

  private isPrivateIp(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,         // IPv6 loopback
      /^fc00:/i,       // IPv6 ULA
      /^fd[0-9a-f]{2}:/i,
      /^localhost$/i,
    ];
    return privateRanges.some(r => r.test(ip));
  }

  private isDataCenterIp(ip: string): boolean {
    // Known datacenter/resolver ranges — extend with a real IP-intelligence DB in production
    const ranges = [
      /^208\.67\./,  // OpenDNS
      /^8\.8\./,     // Google Public DNS
      /^1\.1\.1\./,  // Cloudflare DNS
      /^1\.0\.0\./,  // Cloudflare DNS alt
    ];
    return ranges.some(r => r.test(ip));
  }

  private isTorExitNode(_ip: string): boolean {
    // TODO: integrate a live Tor-exit-node list (e.g. dan.me.uk/torlist)
    return false;
  }

  private isSuspiciousUserAgent(ua: string): boolean {
    const patterns = [
      /\bbot\b/i, /\bcrawler\b/i, /\bspider\b/i, /\bscraper\b/i,
      /\bcurl\b/i, /\bwget\b/i, /\bpython[-\/]/i,
      /java\/[\d.]+/i, /go-http-client/i, /axios\/[\d.]+/i,
      /node-fetch/i, /node\.js/i, /php\/[\d.]+/i,
      /libwww-perl/i, /Scrapy/i, /headless/i,
    ];
    return patterns.some(p => p.test(ua));
  }

  private cleanupStaleWindows(cutoffTime: number): void {
    for (const [ip, window] of this.requestWindows.entries()) {
      if (window.lastRequest < cutoffTime) {
        this.requestWindows.delete(ip);
      }
    }
  }
}
