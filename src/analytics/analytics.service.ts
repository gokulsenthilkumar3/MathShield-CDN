import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { VerificationEntity } from '../entities/verification.entity';

export interface AnalyticsData {
  totalVerifications: number;
  successRate: number;
  averageSolveTime: number;
  botTrafficPercentage: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  challengeTypeStats: {
    arithmetic: number;
    algebra: number;
    logic: number;
    sequence: number;
    pattern: number;
    spatial: number;
    semantic: number;
    analogy: number;
    completion: number;
  };
  attackPatterns: {
    highFrequencyIps: string[];
    suspiciousUserAgents: string[];
    commonFailureReasons: string[];
  };
}

export interface TimeSeriesData {
  timestamp: Date;
  verifications: number;
  successes: number;
  failures: number;
  averageTime: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(VerificationEntity)
    private verificationRepository: Repository<VerificationEntity>,
  ) {}

  async recordVerification(data: {
    success: boolean;
    timeTaken: number;
    riskScore: number;
    challengeType: string;
    ip?: string;
    userAgent?: string;
    confidence?: number;
    intelligenceScore?: number;
    riskLevel?: string;
    behaviorData?: any;
  }): Promise<void> {
    const verification = this.verificationRepository.create({
      ...data,
      challengeId: 'temp',
      challengeType: data.challengeType,
      difficulty: 'medium',
      confidence: data.confidence || 0,
      intelligenceScore: data.intelligenceScore || 0,
      riskLevel: data.riskLevel || 'low',
      behaviorData: data.behaviorData,
    });
    await this.verificationRepository.save(verification);
  }

  async getAnalytics(): Promise<AnalyticsData> {
    const totalVerifications = await this.verificationRepository.count();
    if (totalVerifications === 0) return this.getEmptyAnalytics();

    const successes = await this.verificationRepository.count({ where: { success: true } });
    const successRate = (successes / totalVerifications) * 100;

    const avgTimeResult = await this.verificationRepository
      .createQueryBuilder('v')
      .select('AVG(v.timeTaken)', 'avg')
      .getRawOne();
    const averageSolveTime = parseFloat(avgTimeResult.avg) || 0;

    // Fix: use MoreThanOrEqual instead of exact-match 70
    const highRiskCount = await this.verificationRepository.count({
      where: { riskScore: MoreThanOrEqual(70) },
    });
    const botTrafficPercentage = (highRiskCount / totalVerifications) * 100;

    const [lowRisk, mediumRisk, highRisk] = await Promise.all([
      this.verificationRepository.count({ where: { riskLevel: 'low' } }),
      this.verificationRepository.count({ where: { riskLevel: 'medium' } }),
      this.verificationRepository.count({ where: { riskLevel: 'high' } }),
    ]);

    // All challenge types including AI-resistant ones
    const [arithmetic, algebra, logic, sequence, pattern, spatial, semantic, analogy, completion] =
      await Promise.all([
        'arithmetic', 'algebra', 'logic', 'sequence',
        'pattern', 'spatial', 'semantic', 'analogy', 'completion',
      ].map(type => this.verificationRepository.count({ where: { challengeType: type } })));

    const attackPatterns = await this.analyzeAttackPatterns();

    return {
      totalVerifications,
      successRate: Math.round(successRate * 100) / 100,
      averageSolveTime: Math.round(averageSolveTime),
      botTrafficPercentage: Math.round(botTrafficPercentage * 100) / 100,
      riskDistribution: { low: lowRisk, medium: mediumRisk, high: highRisk },
      challengeTypeStats: { arithmetic, algebra, logic, sequence, pattern, spatial, semantic, analogy, completion },
      attackPatterns,
    };
  }

  async getTimeSeriesData(hours: number = 24): Promise<TimeSeriesData[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);

    const recentVerifications = await this.verificationRepository
      .createQueryBuilder('v')
      .where('v.createdAt >= :cutoff', { cutoff })
      .getMany();

    // Fix: key by date+hour string to prevent cross-day collisions
    const hourlyData = new Map<string, TimeSeriesData>();

    for (let i = 0; i < hours; i++) {
      const hourTimestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = this.toHourKey(hourTimestamp);
      hourlyData.set(key, {
        timestamp: new Date(hourTimestamp.getFullYear(), hourTimestamp.getMonth(), hourTimestamp.getDate(), hourTimestamp.getHours()),
        verifications: 0,
        successes: 0,
        failures: 0,
        averageTime: 0,
      });
    }

    for (const v of recentVerifications) {
      const key = this.toHourKey(v.createdAt);
      const slot = hourlyData.get(key);
      if (slot) {
        slot.verifications++;
        if (v.success) slot.successes++;
        else slot.failures++;
      }
    }

    // Calculate average times per bucket
    for (const [key, slot] of hourlyData.entries()) {
      const bucket = recentVerifications.filter(v => this.toHourKey(v.createdAt) === key);
      if (bucket.length > 0) {
        slot.averageTime = bucket.reduce((sum, v) => sum + v.timeTaken, 0) / bucket.length;
      }
    }

    return Array.from(hourlyData.values()).reverse();
  }

  private toHourKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
  }

  private getEmptyAnalytics(): AnalyticsData {
    return {
      totalVerifications: 0,
      successRate: 0,
      averageSolveTime: 0,
      botTrafficPercentage: 0,
      riskDistribution: { low: 0, medium: 0, high: 0 },
      challengeTypeStats: { arithmetic: 0, algebra: 0, logic: 0, sequence: 0, pattern: 0, spatial: 0, semantic: 0, analogy: 0, completion: 0 },
      attackPatterns: { highFrequencyIps: [], suspiciousUserAgents: [], commonFailureReasons: [] },
    };
  }

  private async analyzeAttackPatterns() {
    const ipCounts = await this.verificationRepository
      .createQueryBuilder('v')
      .select('v.ip', 'ip')
      .addSelect('COUNT(*)', 'count')
      .where('v.ip IS NOT NULL')
      .groupBy('v.ip')
      .having('COUNT(*) > 10')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    const highFrequencyIps = ipCounts.map(item => item.ip);

    const userAgentCounts = await this.verificationRepository
      .createQueryBuilder('v')
      .select('v.userAgent', 'userAgent')
      .addSelect('COUNT(*)', 'count')
      .where('v.userAgent IS NOT NULL')
      .groupBy('v.userAgent')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany();

    const suspiciousUserAgents = userAgentCounts
      .filter(item => this.isSuspiciousUserAgent(item.userAgent))
      .map(item => item.userAgent);

    const commonFailureReasons = [
      'Incorrect answer',
      'Timeout',
      'Suspicious behavior',
      'High risk score',
    ];

    return { highFrequencyIps, suspiciousUserAgents, commonFailureReasons };
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /java/i, /go-http/i,
    ];
    return suspiciousPatterns.some(p => p.test(userAgent));
  }
}
