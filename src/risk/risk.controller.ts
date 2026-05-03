import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { RiskService, RiskFactors, RiskScore } from './risk.service';

@Controller('api/risk')
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Post('calculate')
  calculateRiskScore(@Body() factors: RiskFactors): RiskScore {
    // Track the request for frequency analysis
    this.riskService.trackRequest(factors.ip);
    
    return this.riskService.calculateRiskScore(factors);
  }

  @Get('score')
  getRiskScore(@Query('ip') ip: string): { score: number; level: string } {
    const riskScore = this.riskService.calculateRiskScore({ ip });
    return {
      score: riskScore.score,
      level: riskScore.level,
    };
  }
}
