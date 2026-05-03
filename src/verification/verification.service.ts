import { Injectable } from '@nestjs/common';
import { ChallengeService, Challenge } from '../challenge/challenge.service';
import { RiskService, RiskScore } from '../risk/risk.service';

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
  delay: number; // time from previous action
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
}

@Injectable()
export class VerificationService {
  constructor(
    private readonly challengeService: ChallengeService,
    private readonly riskService: RiskService,
  ) {}

  async verifyResponse(request: VerificationRequest): Promise<VerificationResult> {
    // Get the challenge
    const challenge = await this.challengeService.getChallengeById(request.challengeId);
    if (!challenge) {
      throw new Error('Challenge not found or expired');
    }

    // Calculate base correctness
    const isCorrect = this.checkAnswer(challenge, request.answer);
    
    // Calculate time-based scoring
    const timeScore = this.calculateTimeScore(challenge, request.timeTaken);
    
    // Calculate behavior-based scoring
    const behaviorScore = this.calculateBehaviorScore(request.behaviorData);
    
    // Calculate risk-based adjustment
    let riskScore = 0;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (request.riskFactors) {
      const riskAnalysis = this.riskService.calculateRiskScore(request.riskFactors);
      riskScore = riskAnalysis.score;
      riskLevel = riskAnalysis.level;
    }

    // Calculate overall confidence and intelligence scores
    const baseConfidence = isCorrect ? 60 : 20;
    const timeBonus = timeScore * 0.2;
    const behaviorBonus = behaviorScore * 0.15;
    const riskPenalty = riskScore * 0.05;

    const confidence = Math.min(100, Math.max(0, 
      baseConfidence + timeBonus + behaviorBonus - riskPenalty
    ));

    const intelligenceScore = this.calculateIntelligenceScore(
      challenge,
      isCorrect,
      request.timeTaken,
      behaviorScore,
      riskScore
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(
      isCorrect,
      timeScore,
      behaviorScore,
      riskScore,
      challenge
    );

    // Generate adaptive intelligence score
    const adaptiveScore = this.generateAdaptiveIntelligenceScore(
      intelligenceScore,
      confidence,
      riskLevel
    );

    // Clean up challenge
    await this.challengeService.removeChallenge(request.challengeId);

    return {
      success: confidence > 50, // Threshold for passing
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
    };
  }

  private checkAnswer(challenge: Challenge, answer: string | number): boolean {
    const correctAnswer = challenge.answer.toString().toLowerCase().trim();
    const userAnswer = answer.toString().toLowerCase().trim();
    
    // Exact match for numbers
    if (!isNaN(Number(correctAnswer)) && !isNaN(Number(userAnswer))) {
      return Math.abs(parseFloat(correctAnswer) - parseFloat(userAnswer)) < 0.01;
    }
    
    // String match with tolerance
    return correctAnswer === userAnswer;
  }

  private calculateTimeScore(challenge: Challenge, timeTaken: number): number {
    const timeLimit = challenge.timeLimit * 1000; // Convert to milliseconds
    const optimalTime = timeLimit * 0.6; // 60% of time limit is optimal
    
    if (timeTaken <= optimalTime) {
      return 100; // Perfect timing
    } else if (timeTaken <= timeLimit) {
      // Linear decrease from optimal to time limit
      const ratio = (timeTaken - optimalTime) / (timeLimit - optimalTime);
      return 100 - (ratio * 50); // Down to 50
    } else {
      // Over time limit - exponential decrease
      const overTime = timeTaken - timeLimit;
      const ratio = overTime / timeLimit;
      return Math.max(0, 50 - (ratio * 50));
    }
  }

  private calculateBehaviorScore(behaviorData?: BehaviorData): number {
    if (!behaviorData) return 50; // No behavior data = medium score

    let score = 50; // Base score

    // Mouse movement analysis
    if (behaviorData.mouseMovements && behaviorData.mouseMovements.length > 0) {
      const mouseScore = this.analyzeMouseMovements(behaviorData.mouseMovements);
      score = (score + mouseScore) / 2;
    }

    // Click timing analysis
    if (behaviorData.clickTiming && behaviorData.clickTiming.length > 0) {
      const clickScore = this.analyzeClickTiming(behaviorData.clickTiming);
      score = (score + clickScore) / 2;
    }

    // Typing pattern analysis
    if (behaviorData.typingPattern) {
      const typingScore = this.analyzeTypingPattern(behaviorData.typingPattern);
      score = (score + typingScore) / 2;
    }

    // Focus events analysis
    if (behaviorData.focusEvents && behaviorData.focusEvents.length > 0) {
      const focusScore = this.analyzeFocusEvents(behaviorData.focusEvents);
      score = (score + focusScore) / 2;
    }

    return Math.min(100, Math.max(0, score));
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
      
      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      totalDistance += distance;
      totalDuration += curr.duration;

      // Calculate direction change
      const direction = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      if (i > 1 && Math.abs(direction - lastDirection) > Math.PI / 4) {
        directionChanges++;
      }
      lastDirection = direction;
    }

    // Human-like patterns
    const avgSpeed = totalDistance / totalDuration;
    const directionChangeRatio = directionChanges / movements.length;

    // Perfect straight lines = bot-like
    const straightness = directionChangeRatio < 0.1 ? 20 : 80;
    
    // Too fast or too slow = bot-like
    const speedScore = avgSpeed < 0.1 || avgSpeed > 10 ? 30 : 70;

    return (straightness + speedScore) / 2;
  }

  private analyzeClickTiming(clicks: ClickTiming[]): number {
    if (clicks.length < 2) return 40;

    const delays = clicks.slice(1).map((click, i) => 
      click.timestamp - clicks[i].timestamp
    );

    const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
    const variance = delays.reduce((sum, delay) => 
      sum + Math.pow(delay - avgDelay, 2), 0
    ) / delays.length;

    // Consistent timing = bot-like
    const consistencyScore = variance < 100 ? 30 : 70;
    
    // Too fast = bot-like
    const speedScore = avgDelay < 100 ? 25 : 75;

    return (consistencyScore + speedScore) / 2;
  }

  private analyzeTypingPattern(pattern: TypingPattern): number {
    const { keystrokes, averageSpeed, corrections } = pattern;

    if (keystrokes.length < 3) return 40;

    // Too fast = bot-like
    const speedScore = averageSpeed < 50 || averageSpeed > 500 ? 30 : 70;
    
    // No corrections = bot-like
    const correctionScore = corrections === 0 ? 40 : 80;
    
    // Perfect intervals = bot-like
    const delays = keystrokes.slice(1).map((key, i) => 
      key.delay
    );
    const variance = delays.reduce((sum, delay) => 
      sum + Math.pow(delay - averageSpeed, 2), 0
    ) / delays.length;
    const rhythmScore = variance < 50 ? 30 : 70;

    return (speedScore + correctionScore + rhythmScore) / 3;
  }

  private analyzeFocusEvents(events: FocusEvent[]): number {
    const focusCount = events.filter(e => e.type === 'focus').length;
    const blurCount = events.filter(e => e.type === 'blur').length;

    // Normal human behavior: some focus/blur events
    if (focusCount === 0 && blurCount === 0) return 60;
    if (focusCount > 0 && blurCount > 0) return 80;
    return 50;
  }

  private calculateIntelligenceScore(
    challenge: Challenge,
    isCorrect: boolean,
    timeTaken: number,
    behaviorScore: number,
    riskScore: number
  ): number {
    let score = 0;

    // Base points for difficulty
    score += challenge.points * 10;

    // Correctness bonus
    if (isCorrect) {
      score += 30;
    }

    // Time bonus (faster = smarter)
    const timeRatio = timeTaken / (challenge.timeLimit * 1000);
    if (timeRatio < 0.5) score += 20;
    else if (timeRatio < 0.8) score += 10;

    // Behavior bonus
    score += (behaviorScore / 100) * 15;

    // Risk penalty
    score -= (riskScore / 100) * 10;

    return Math.min(100, Math.max(0, score));
  }

  private generateReasoning(
    isCorrect: boolean,
    timeScore: number,
    behaviorScore: number,
    riskScore: number,
    challenge: Challenge
  ): string[] {
    const reasoning: string[] = [];

    if (isCorrect) {
      reasoning.push('Answer is correct');
    } else {
      reasoning.push('Answer is incorrect');
    }

    if (timeScore > 80) {
      reasoning.push('Excellent timing');
    } else if (timeScore > 60) {
      reasoning.push('Good timing');
    } else if (timeScore < 30) {
      reasoning.push('Unusual timing pattern');
    }

    if (behaviorScore > 80) {
      reasoning.push('Natural human behavior');
    } else if (behaviorScore > 60) {
      reasoning.push('Mostly natural behavior');
    } else if (behaviorScore < 40) {
      reasoning.push('Suspicious behavior patterns');
    }

    if (riskScore > 70) {
      reasoning.push('High risk factors detected');
    } else if (riskScore > 40) {
      reasoning.push('Moderate risk factors');
    }

    return reasoning;
  }

  private generateAdaptiveIntelligenceScore(
    intelligenceScore: number,
    confidence: number,
    riskLevel: 'low' | 'medium' | 'high'
  ) {
    // Score valid for 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return {
      score: intelligenceScore,
      confidence: confidence,
      riskLevel: riskLevel,
      expiresAt: expiresAt,
    };
  }
}
