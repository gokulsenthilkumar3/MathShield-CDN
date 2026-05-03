import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
      challengeId: 'temp', // Will be updated in actual implementation
      challengeType: data.challengeType,
      difficulty: 'medium', // Default
      confidence: data.confidence || 0,
      intelligenceScore: data.intelligenceScore || 0,
      riskLevel: data.riskLevel || 'low',
      behaviorData: data.behaviorData,
    });

    await this.verificationRepository.save(verification);
  }

  async getAnalytics(): Promise<AnalyticsData> {
    const totalVerifications = await this.verificationRepository.count();
    if (totalVerifications === 0) {
      return this.getEmptyAnalytics();
    }

    const successes = await this.verificationRepository.count({ where: { success: true } });
    const successRate = (successes / totalVerifications) * 100;
    
    const avgTimeResult = await this.verificationRepository
      .createQueryBuilder('verification')
      .select('AVG(verification.timeTaken)', 'avg')
      .getRawOne();
    const averageSolveTime = parseFloat(avgTimeResult.avg) || 0;
    
    // Calculate bot traffic percentage (high risk scores)
    const highRiskCount = await this.verificationRepository.count({ where: { riskScore: 70 } });
    const botTrafficPercentage = (highRiskCount / totalVerifications) * 100;

    // Risk distribution
    const [lowRisk, mediumRisk, highRisk] = await Promise.all([
      this.verificationRepository.count({ where: { riskLevel: 'low' } }),
      this.verificationRepository.count({ where: { riskLevel: 'medium' } }),
      this.verificationRepository.count({ where: { riskLevel: 'high' } }),
    ]);

    // Challenge type statistics
    const [arithmetic, algebra, logic, sequence] = await Promise.all([
      this.verificationRepository.count({ where: { challengeType: 'arithmetic' } }),
      this.verificationRepository.count({ where: { challengeType: 'algebra' } }),
      this.verificationRepository.count({ where: { challengeType: 'logic' } }),
      this.verificationRepository.count({ where: { challengeType: 'sequence' } }),
    ]);

    // Attack patterns
    const attackPatterns = await this.analyzeAttackPatterns();

    return {
      totalVerifications,
      successRate: Math.round(successRate * 100) / 100,
      averageSolveTime: Math.round(averageSolveTime),
      botTrafficPercentage: Math.round(botTrafficPercentage * 100) / 100,
      riskDistribution: { low: lowRisk, medium: mediumRisk, high: highRisk },
      challengeTypeStats: { arithmetic, algebra, logic, sequence },
      attackPatterns,
    };
  }

  async getTimeSeriesData(hours: number = 24): Promise<TimeSeriesData[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    const recentVerifications = await this.verificationRepository
      .createQueryBuilder('verification')
      .where('verification.createdAt >= :cutoff', { cutoff })
      .getMany();
    
    // Group by hour
    const hourlyData = new Map<number, TimeSeriesData>();
    
    for (let i = 0; i < hours; i++) {
      const hourTimestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourKey = hourTimestamp.getHours();
      
      hourlyData.set(hourKey, {
        timestamp: hourTimestamp,
        verifications: 0,
        successes: 0,
        failures: 0,
        averageTime: 0,
      });
    }

    recentVerifications.forEach(verification => {
      const hourKey = verification.createdAt.getHours();
      const hourData = hourlyData.get(hourKey);
      
      if (hourData) {
        hourData.verifications++;
        if (verification.success) {
          hourData.successes++;
        } else {
          hourData.failures++;
        }
      }
    });

    // Calculate average times per hour
    hourlyData.forEach(hourData => {
      const hourVerifications = recentVerifications.filter(v => 
        v.createdAt.getHours() === hourData.timestamp.getHours()
      );
      
      if (hourVerifications.length > 0) {
        hourData.averageTime = hourVerifications.reduce((sum, v) => sum + v.timeTaken, 0) / hourVerifications.length;
      }
    });

    return Array.from(hourlyData.values()).reverse();
  }

  private getEmptyAnalytics(): AnalyticsData {
    return {
      totalVerifications: 0,
      successRate: 0,
      averageSolveTime: 0,
      botTrafficPercentage: 0,
      riskDistribution: { low: 0, medium: 0, high: 0 },
      challengeTypeStats: { arithmetic: 0, algebra: 0, logic: 0, sequence: 0 },
      attackPatterns: {
        highFrequencyIps: [],
        suspiciousUserAgents: [],
        commonFailureReasons: [],
      },
    };
  }

  private async analyzeAttackPatterns() {
    // High frequency IPs
    const ipCounts = await this.verificationRepository
      .createQueryBuilder('verification')
      .select('verification.ip', 'ip')
      .addSelect('COUNT(*)', 'count')
      .where('verification.ip IS NOT NULL')
      .groupBy('verification.ip')
      .having('COUNT(*) > 10')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    const highFrequencyIps = ipCounts.map(item => item.ip);

    // Suspicious user agents
    const userAgentCounts = await this.verificationRepository
      .createQueryBuilder('verification')
      .select('verification.userAgent', 'userAgent')
      .addSelect('COUNT(*)', 'count')
      .where('verification.userAgent IS NOT NULL')
      .groupBy('verification.userAgent')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany();

    const suspiciousUserAgents = userAgentCounts
      .filter(item => this.isSuspiciousUserAgent(item.userAgent))
      .map(item => item.userAgent);

    // Common failure reasons (simplified)
    const commonFailureReasons = [
      'Incorrect answer',
      'Timeout',
      'Suspicious behavior',
      'High risk score',
    ];

    return {
      highFrequencyIps,
      suspiciousUserAgents,
      commonFailureReasons,
    };
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
}
