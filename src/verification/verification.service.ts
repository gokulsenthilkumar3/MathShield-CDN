import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ChallengeService, Challenge } from '../challenge/challenge.service';
import { RiskService, RiskScore } from '../risk/risk.service';
import { TokenService, VerificationToken } from '../token/token.service';

export interface VerificationRequest {
  challengeId: string;
  answer: string | number;
  timeTaken: number; // in milliseconds
  behaviorData?: BehaviorData;
  riskFactors?: any;
}

export interface BehaviorData {
  mouseMovements?: MouseMovement[];
  clickTiming?: ClickTiming[];
  typingPattern?: TypingPattern;
  focusEvents?: FocusEvent[];
}

export interface MouseMovement {
  x: number;
  y: number;
  timestamp: number;
  duration: number;
}

export interface ClickTiming {
  timestamp: number;
  target: string;
  delay: number;
}

export interface TypingPattern {
  keystrokes: Keystroke[];
  averageSpeed: number;
  corrections: number;
}

export interface Keystroke {
  key: string;
  timestamp: number;
  delay: number;
}

export interface FocusEvent {
  type: 'focus' | 'blur';
  timestamp: number;
  element: string;
}

export interface VerificationResult {
  success: boolean;
  confidence: number; // 0-100
  intelligenceScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  feedback: {
    correct: boolean;
    timeBonus: number;
    behaviorBonus: number;
    riskPenalty: number;
  };
  reasoning: string[];
  adaptiveIntelligenceScore: {
    score: number;
    confidence: number;
    riskLevel: string;
    expiresAt: Date;
  };
  token?: VerificationToken;
  explanation?: string;
}

@Injectable()
export class VerificationService {
  constructor(
    private readonly challengeService: ChallengeService,
    private readonly riskService: RiskService,
    private readonly tokenService: TokenService,
  ) {}

  async verifyResponse(request: VerificationRequest): Promise<VerificationResult> {
    const challenge = await this.challengeService.getChallengeById(request.challengeId);
    if (!challenge) {
      throw new Error('Challenge not found or expired');
    }

    if (challenge.signature) {
      const isValidSignature = this.tokenService.verifyChallengeSignature(
        challenge.id,
        challenge.type,
        challenge.difficulty,
        challenge.signature,
      );
      if (!isValidSignature) {
        throw new UnauthorizedException('Challenge signature verification failed - possible tampering detected');
      }
    }

    const isCorrect = this.checkAnswer(challenge, request.answer);
    const timeScore = this.calculateTimeScore(challenge, request.timeTaken);

    // Proper weighted behavior score — collect all signals then average once
    const behaviorScore = this.calculateBehaviorScore(request.behaviorData);

    let riskScore = 0;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (request.riskFactors) {
      const riskAnalysis = this.riskService.calculateRiskScore(request.riskFactors);
      riskScore = riskAnalysis.score;
      riskLevel = riskAnalysis.level;
    }

    const baseConfidence = isCorrect ? 60 : 20;
    const timeBonus = timeScore * 0.2;
    const behaviorBonus = behaviorScore * 0.15;
    const riskPenalty = riskScore * 0.05;

    const confidence = Math.min(100, Math.max(0,
      baseConfidence + timeBonus + behaviorBonus - riskPenalty,
    ));

    const intelligenceScore = this.calculateIntelligenceScore(
      challenge,
      isCorrect,
      request.timeTaken,
      behaviorScore,
      riskScore,
    );

    const reasoning = this.generateReasoning(
      isCorrect,
      timeScore,
      behaviorScore,
      riskScore,
      challenge,
    );

    const adaptiveScore = this.generateAdaptiveIntelligenceScore(
      intelligenceScore,
      confidence,
      riskLevel,
    );

    await this.challengeService.removeChallenge(request.challengeId);

    // Gate token on correctness AND intelligenceScore — prevents fast-but-wrong bots
    let token: VerificationToken | undefined;
    if (isCorrect && intelligenceScore > 50) {
      token = await this.tokenService.generateVerificationToken(
        challenge.id,
        challenge.type,
        challenge.difficulty,
        Math.round(intelligenceScore),
        Math.round(confidence),
        riskLevel,
      );
    }

    return {
      success: isCorrect && confidence > 50,
      confidence: Math.round(confidence),
      intelligenceScore: Math.round(intelligenceScore),
      riskLevel,
      feedback: {
        correct: isCorrect,
        timeBonus: Math.round(timeBonus),
        behaviorBonus: Math.round(behaviorBonus),
        riskPenalty: Math.round(riskPenalty),
      },
      reasoning,
      adaptiveIntelligenceScore: adaptiveScore,
      token,
      explanation: challenge.explanation,
    };
  }

  private checkAnswer(challenge: Challenge, answer: string | number): boolean {
    const correctAnswer = challenge.answer.toString().toLowerCase().trim();
    const userAnswer = answer.toString().toLowerCase().trim();
    if (!isNaN(Number(correctAnswer)) && !isNaN(Number(userAnswer))) {
      return Math.abs(parseFloat(correctAnswer) - parseFloat(userAnswer)) < 0.01;
    }
    return correctAnswer === userAnswer;
  }

  private calculateTimeScore(challenge: Challenge, timeTaken: number): number {
    const timeLimit = challenge.timeLimit * 1000;
    const optimalTime = timeLimit * 0.6;
    if (timeTaken <= optimalTime) return 100;
    if (timeTaken <= timeLimit) {
      const ratio = (timeTaken - optimalTime) / (timeLimit - optimalTime);
      return 100 - ratio * 50;
    }
    const overTime = timeTaken - timeLimit;
    const ratio = overTime / timeLimit;
    return Math.max(0, 50 - ratio * 50);
  }

  /**
   * Properly weighted behavior score.
   * Each signal contributes with equal weight; only available signals are counted.
   */
  private calculateBehaviorScore(behaviorData?: BehaviorData): number {
    if (!behaviorData) return 50;

    const signals: number[] = [];

    if (behaviorData.mouseMovements && behaviorData.mouseMovements.length > 0) {
      signals.push(this.analyzeMouseMovements(behaviorData.mouseMovements));
    }
    if (behaviorData.clickTiming && behaviorData.clickTiming.length > 0) {
      signals.push(this.analyzeClickTiming(behaviorData.clickTiming));
    }
    if (behaviorData.typingPattern) {
      signals.push(this.analyzeTypingPattern(behaviorData.typingPattern));
    }
    if (behaviorData.focusEvents && behaviorData.focusEvents.length > 0) {
      signals.push(this.analyzeFocusEvents(behaviorData.focusEvents));
    }

    if (signals.length === 0) return 50;
    return Math.min(100, Math.max(0,
      signals.reduce((sum, s) => sum + s, 0) / signals.length,
    ));
  }

  private analyzeMouseMovements(movements: MouseMovement[]): number {
    if (movements.length < 2) return 30;
    let totalDistance = 0;
    let totalDuration = 0;
    let directionChanges = 0;
    let lastDirection = 0;
    for (let i = 1; i < movements.length; i++) {
      const prev = movements[i - 1];
      const curr = movements[i];
      const distance = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
      totalDistance += distance;
      totalDuration += curr.duration;
      const direction = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      if (i > 1 && Math.abs(direction - lastDirection) > Math.PI / 4) directionChanges++;
      lastDirection = direction;
    }
    const avgSpeed = totalDuration > 0 ? totalDistance / totalDuration : 0;
    const directionChangeRatio = directionChanges / movements.length;
    const straightness = directionChangeRatio < 0.1 ? 20 : 80;
    const speedScore = avgSpeed < 0.1 || avgSpeed > 10 ? 30 : 70;
    return (straightness + speedScore) / 2;
  }

  private analyzeClickTiming(clicks: ClickTiming[]): number {
    if (clicks.length < 2) return 40;
    const delays = clicks.slice(1).map((click, i) => click.timestamp - clicks[i].timestamp);
    const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
    const variance = delays.reduce((sum, d) => sum + Math.pow(d - avgDelay, 2), 0) / delays.length;
    const consistencyScore = variance < 100 ? 30 : 70;
    const speedScore = avgDelay < 100 ? 25 : 75;
    return (consistencyScore + speedScore) / 2;
  }

  private analyzeTypingPattern(pattern: TypingPattern): number {
    const { keystrokes, averageSpeed, corrections } = pattern;
    if (keystrokes.length < 3) return 40;
    const speedScore = averageSpeed < 50 || averageSpeed > 500 ? 30 : 70;
    const correctionScore = corrections === 0 ? 40 : 80;
    const delays = keystrokes.slice(1).map(k => k.delay);
    const variance = delays.reduce((sum, d) => sum + Math.pow(d - averageSpeed, 2), 0) / delays.length;
    const varianceScore = variance < 100 ? 30 : 70;
    return (speedScore + correctionScore + varianceScore) / 3;
  }

  private analyzeFocusEvents(events: FocusEvent[]): number {
    if (events.length < 2) return 50;
    const blurEvents = events.filter(e => e.type === 'blur').length;
    const focusEvents = events.filter(e => e.type === 'focus').length;
    // Too many focus/blur = tab switching or automation
    if (blurEvents > 3 || focusEvents > 3) return 30;
    return 70;
  }

  private calculateIntelligenceScore(
    challenge: Challenge,
    isCorrect: boolean,
    timeTaken: number,
    behaviorScore: number,
    riskScore: number,
  ): number {
    if (!isCorrect) return Math.max(0, 20 - riskScore * 0.1);
    const difficultyMultiplier = { easy: 1.0, medium: 1.3, hard: 1.6 }[challenge.difficulty];
    const timeScore = this.calculateTimeScore(challenge, timeTaken);
    const base = 50 * difficultyMultiplier;
    const timeBonus = timeScore * 0.25;
    const behaviorBonus = behaviorScore * 0.15;
    const riskPenalty = riskScore * 0.1;
    return Math.min(100, Math.max(0, base + timeBonus + behaviorBonus - riskPenalty));
  }

  private generateReasoning(
    isCorrect: boolean,
    timeScore: number,
    behaviorScore: number,
    riskScore: number,
    challenge: Challenge,
  ): string[] {
    const reasoning: string[] = [];
    if (isCorrect) {
      reasoning.push(`Correct answer provided for ${challenge.difficulty} ${challenge.type} challenge`);
    } else {
      reasoning.push('Incorrect answer provided');
    }
    if (timeScore > 80) reasoning.push('Excellent response time');
    else if (timeScore > 50) reasoning.push('Acceptable response time');
    else reasoning.push('Slow or overtime response');
    if (behaviorScore > 70) reasoning.push('Human-like interaction patterns detected');
    else if (behaviorScore > 40) reasoning.push('Moderate behavior signals');
    else reasoning.push('Suspicious interaction patterns');
    if (riskScore > 70) reasoning.push('High-risk request profile');
    else if (riskScore > 40) reasoning.push('Elevated risk indicators');
    return reasoning;
  }

  private generateAdaptiveIntelligenceScore(
    score: number,
    confidence: number,
    riskLevel: string,
  ): { score: number; confidence: number; riskLevel: string; expiresAt: Date } {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    return { score: Math.round(score), confidence: Math.round(confidence), riskLevel, expiresAt };
  }
}
