import { Injectable, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TokenService } from '../token/token.service';
import {
  generatePatternChallenge,
  generateSpatialChallenge,
  generateSemanticChallenge,
  generateAnalogyChallenge,
  generateCompletionChallenge,
  AIResistantChallenge,
  AIResistantChallengeType,
} from './ai-resistant-challenges';

export interface Challenge {
  id: string;
  type: 'arithmetic' | 'algebra' | 'logic' | 'sequence' | AIResistantChallengeType;
  question: string;
  answer: string | number;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[];
  timeLimit: number;
  points: number;
  signature?: string;
  explanation?: string;
}

export interface ChallengeRequest {
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: 'arithmetic' | 'algebra' | 'logic' | 'sequence' | AIResistantChallengeType | 'ai-resistant';
  riskScore?: number;
  useAIResistant?: boolean;
}

@Injectable()
export class ChallengeService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly tokenService: TokenService,
  ) {}

  async generateChallenge(request: ChallengeRequest = {}): Promise<Challenge> {
    const {
      difficulty = this.getDifficultyByRisk(request.riskScore),
      type = request.useAIResistant ? 'ai-resistant' : (request.type || this.getRandomType()),
      useAIResistant = false,
    } = request;

    const preferAIResistant = request.riskScore && request.riskScore > 50;
    const finalUseAIResistant = useAIResistant || preferAIResistant;

    const challenge = this.createChallengeByType(type, difficulty, !!finalUseAIResistant);
    await this.cacheManager.set(`challenge:${challenge.id}`, challenge, 600000);
    return challenge;
  }

  async getChallengeById(id: string): Promise<Challenge | null> {
    return await this.cacheManager.get<Challenge>(`challenge:${id}`);
  }

  async removeChallenge(id: string): Promise<boolean> {
    await this.cacheManager.del(`challenge:${id}`);
    return true;
  }

  private getDifficultyByRisk(riskScore?: number): 'easy' | 'medium' | 'hard' {
    if (!riskScore) return 'easy';
    if (riskScore < 30) return 'easy';
    if (riskScore < 70) return 'medium';
    return 'hard';
  }

  private getRandomType(): 'arithmetic' | 'algebra' | 'logic' | 'sequence' | AIResistantChallengeType {
    const types: ('arithmetic' | 'algebra' | 'logic' | 'sequence' | AIResistantChallengeType)[] = [
      'arithmetic', 'algebra', 'logic', 'sequence',
      'pattern', 'spatial', 'semantic', 'analogy', 'completion',
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  private createChallengeByType(
    type: 'arithmetic' | 'algebra' | 'logic' | 'sequence' | AIResistantChallengeType | 'ai-resistant',
    difficulty: 'easy' | 'medium' | 'hard',
    useAIResistant?: boolean,
  ): Challenge {
    if (type === 'ai-resistant' || useAIResistant) {
      const aiTypes: AIResistantChallengeType[] = ['pattern', 'spatial', 'semantic', 'analogy', 'completion'];
      type = aiTypes[Math.floor(Math.random() * aiTypes.length)];
    }

    let challenge: Challenge;

    switch (type) {
      case 'arithmetic': challenge = this.createArithmeticChallenge(uuidv4(), difficulty); break;
      case 'algebra':    challenge = this.createAlgebraChallenge(uuidv4(), difficulty); break;
      case 'logic':      challenge = this.createLogicChallenge(uuidv4(), difficulty); break;
      case 'sequence':   challenge = this.createSequenceChallenge(uuidv4(), difficulty); break;
      case 'pattern':    challenge = this.convertAIResistantToChallenge(generatePatternChallenge(difficulty)); break;
      case 'spatial':    challenge = this.convertAIResistantToChallenge(generateSpatialChallenge(difficulty)); break;
      case 'semantic':   challenge = this.convertAIResistantToChallenge(generateSemanticChallenge(difficulty)); break;
      case 'analogy':    challenge = this.convertAIResistantToChallenge(generateAnalogyChallenge(difficulty)); break;
      case 'completion': challenge = this.convertAIResistantToChallenge(generateCompletionChallenge(difficulty)); break;
      default:           challenge = this.createArithmeticChallenge(uuidv4(), difficulty);
    }

    challenge.signature = this.tokenService.createChallengeSignature(
      challenge.id,
      challenge.type,
      challenge.difficulty,
    );

    return challenge;
  }

  private convertAIResistantToChallenge(aiChallenge: AIResistantChallenge): Challenge {
    return {
      id: aiChallenge.id,
      type: aiChallenge.type,
      question: aiChallenge.question,
      answer: aiChallenge.answer,
      difficulty: aiChallenge.difficulty,
      options: aiChallenge.options,
      timeLimit: aiChallenge.timeLimit,
      points: aiChallenge.points,
      explanation: aiChallenge.explanation,
    };
  }

  private createArithmeticChallenge(id: string, difficulty: 'easy' | 'medium' | 'hard'): Challenge {
    let question: string;
    let answer: number;
    let options: string[] | undefined;

    switch (difficulty) {
      case 'easy': {
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        question = `${a} + ${b} = ?`;
        answer = a + b;
        break;
      }
      case 'medium': {
        const c = Math.floor(Math.random() * 20) + 10;
        const d = Math.floor(Math.random() * 15) + 5;
        question = `${c} - ${d} = ?`;
        answer = c - d;
        break;
      }
      case 'hard': {
        const e = Math.floor(Math.random() * 12) + 2;
        const f = Math.floor(Math.random() * 12) + 2;
        question = `${e} × ${f} = ?`;
        answer = e * f;
        break;
      }
    }

    if (difficulty !== 'hard') {
      options = this.generateMultipleChoice(answer!, difficulty);
    }

    return {
      id,
      type: 'arithmetic',
      question: question!,
      answer: answer!,
      difficulty,
      options,
      timeLimit: difficulty === 'easy' ? 30 : difficulty === 'medium' ? 45 : 60,
      points: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 3 : 5,
    };
  }

  private createAlgebraChallenge(id: string, difficulty: 'easy' | 'medium' | 'hard'): Challenge {
    let question: string;
    let answer: number;

    switch (difficulty) {
      case 'easy': {
        const x = Math.floor(Math.random() * 15) + 1;
        const a1 = Math.floor(Math.random() * 10) + 1;
        const b1 = x + a1;
        question = `x + ${a1} = ${b1}. What is x?`;
        answer = x;
        break;
      }
      case 'medium': {
        // Fix: construct integer answer, then derive equation — avoids float answers
        const x = Math.floor(Math.random() * 15) + 1;
        const a2 = Math.floor(Math.random() * 5) + 2;
        const b2 = a2 * x;
        question = `${a2}x = ${b2}. What is x?`;
        answer = x;
        break;
      }
      case 'hard': {
        // Fix: construct integer answer first
        const x = Math.floor(Math.random() * 10) + 1;
        const a3 = Math.floor(Math.random() * 5) + 2;
        const b3 = Math.floor(Math.random() * 20) + 5;
        const c3 = a3 * x + b3;
        question = `${a3}x + ${b3} = ${c3}. What is x?`;
        answer = x;
        break;
      }
    }

    return {
      id,
      type: 'algebra',
      question: question!,
      answer: answer!,
      difficulty,
      timeLimit: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : 90,
      points: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 6,
    };
  }

  private createLogicChallenge(id: string, difficulty: 'easy' | 'medium' | 'hard'): Challenge {
    let question: string;
    let answer: string;

    switch (difficulty) {
      case 'easy': {
        const easyLogic = [
          { q: 'If all cats are animals and some animals are pets, are all cats pets?', a: 'no' },
          { q: 'If today is Tuesday, what day will it be in 3 days?', a: 'friday' },
          { q: 'If you have 5 apples and give away 2, how many do you have left?', a: '3' },
        ];
        const sel = easyLogic[Math.floor(Math.random() * easyLogic.length)];
        question = sel.q; answer = sel.a;
        break;
      }
      case 'medium': {
        const mediumLogic = [
          { q: 'A bat and a ball cost $1.10. The bat costs $1 more than the ball. How much does the ball cost?', a: '0.05' },
          { q: 'If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?', a: '5' },
        ];
        const sel = mediumLogic[Math.floor(Math.random() * mediumLogic.length)];
        question = sel.q; answer = sel.a;
        break;
      }
      case 'hard': {
        const hardLogic = [
          { q: 'You are in a race and pass the person in second place. What place are you in now?', a: 'second' },
          { q: "A man looks at a portrait and says 'Brothers and sisters I have none, but that man's father is my father's son.' Who is in the portrait?", a: 'son' },
        ];
        const sel = hardLogic[Math.floor(Math.random() * hardLogic.length)];
        question = sel.q; answer = sel.a;
        break;
      }
    }

    return {
      id,
      type: 'logic',
      question: question!,
      answer: answer!,
      difficulty,
      timeLimit: difficulty === 'easy' ? 60 : difficulty === 'medium' ? 90 : 120,
      points: difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 8,
    };
  }

  private createSequenceChallenge(id: string, difficulty: 'easy' | 'medium' | 'hard'): Challenge {
    let question: string;
    let answer: number;

    switch (difficulty) {
      case 'easy': {
        const start = Math.floor(Math.random() * 5) + 1;
        const step = Math.floor(Math.random() * 4) + 2;
        const seq = [start, start + step, start + 2 * step, start + 3 * step];
        answer = start + 4 * step;
        question = `What comes next? ${seq.join(', ')}, ?`;
        break;
      }
      case 'medium': {
        const start = Math.floor(Math.random() * 3) + 2;
        const ratio = Math.floor(Math.random() * 2) + 2;
        const seq = [start, start * ratio, start * ratio ** 2, start * ratio ** 3];
        answer = start * ratio ** 4;
        question = `What comes next? ${seq.join(', ')}, ?`;
        break;
      }
      case 'hard': {
        // Fix: generate Fibonacci-like sequence dynamically from random seeds
        const a = Math.floor(Math.random() * 3) + 1;
        const b = Math.floor(Math.random() * 3) + 1;
        const seq: number[] = [a, b];
        for (let i = 2; i < 6; i++) seq.push(seq[i - 1] + seq[i - 2]);
        answer = seq[5];
        question = `What comes next in this Fibonacci-like sequence? ${seq.slice(0, 5).join(', ')}, ?`;
        break;
      }
    }

    return {
      id,
      type: 'sequence',
      question: question!,
      answer: answer!,
      difficulty,
      timeLimit: difficulty === 'easy' ? 30 : difficulty === 'medium' ? 45 : 60,
      points: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 6,
    };
  }

  /**
   * Generate multiple choice options.
   * Fix: clamp distractors to >= 0 to avoid negative option values.
   */
  private generateMultipleChoice(answer: number, difficulty: 'easy' | 'medium' | 'hard'): string[] {
    const range = difficulty === 'easy' ? 3 : 5;
    const options = new Set<number>([answer]);

    while (options.size < 4) {
      const offset = Math.floor(Math.random() * range * 2) - range;
      const distractor = Math.max(0, answer + offset);
      if (distractor !== answer) options.add(distractor);
    }

    return Array.from(options)
      .sort(() => Math.random() - 0.5)
      .map(String);
  }
}
