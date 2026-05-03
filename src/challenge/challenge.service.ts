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
  timeLimit: number; // in seconds
  points: number;
  signature?: string; // HMAC signature for integrity
  explanation?: string; // Educational explanation
}

export interface ChallengeRequest {
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: 'arithmetic' | 'algebra' | 'logic' | 'sequence' | AIResistantChallengeType | 'ai-resistant';
  riskScore?: number;
  useAIResistant?: boolean; // Flag to prefer AI-resistant challenges
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

    // For high risk scores, prefer AI-resistant challenges
    const preferAIResistant = request.riskScore && request.riskScore > 50;
    const finalUseAIResistant = useAIResistant || preferAIResistant;

    const challenge = this.createChallengeByType(type, difficulty, finalUseAIResistant);
    
    // Cache challenge for 10 minutes (600 seconds)
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
      'pattern', 'spatial', 'semantic', 'analogy', 'completion'
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  private createChallengeByType(
    type: 'arithmetic' | 'algebra' | 'logic' | 'sequence' | AIResistantChallengeType | 'ai-resistant',
    difficulty: 'easy' | 'medium' | 'hard',
    useAIResistant?: boolean
  ): Challenge {
    // If AI-resistant is requested, pick a random AI-resistant type
    if (type === 'ai-resistant' || useAIResistant) {
      const aiTypes: AIResistantChallengeType[] = ['pattern', 'spatial', 'semantic', 'analogy', 'completion'];
      type = aiTypes[Math.floor(Math.random() * aiTypes.length)];
    }

    let challenge: Challenge;
    
    switch (type) {
      case 'arithmetic':
        challenge = this.createArithmeticChallenge(uuidv4(), difficulty);
        break;
      case 'algebra':
        challenge = this.createAlgebraChallenge(uuidv4(), difficulty);
        break;
      case 'logic':
        challenge = this.createLogicChallenge(uuidv4(), difficulty);
        break;
      case 'sequence':
        challenge = this.createSequenceChallenge(uuidv4(), difficulty);
        break;
      case 'pattern':
        challenge = this.convertAIResistantToChallenge(generatePatternChallenge(difficulty));
        break;
      case 'spatial':
        challenge = this.convertAIResistantToChallenge(generateSpatialChallenge(difficulty));
        break;
      case 'semantic':
        challenge = this.convertAIResistantToChallenge(generateSemanticChallenge(difficulty));
        break;
      case 'analogy':
        challenge = this.convertAIResistantToChallenge(generateAnalogyChallenge(difficulty));
        break;
      case 'completion':
        challenge = this.convertAIResistantToChallenge(generateCompletionChallenge(difficulty));
        break;
      default:
        challenge = this.createArithmeticChallenge(uuidv4(), difficulty);
    }

    // Add HMAC signature to prevent tampering
    challenge.signature = this.tokenService.createChallengeSignature(
      challenge.id,
      challenge.type,
      challenge.difficulty
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
      case 'easy':
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        question = `${a} + ${b} = ?`;
        answer = a + b;
        break;
      
      case 'medium':
        const c = Math.floor(Math.random() * 20) + 10;
        const d = Math.floor(Math.random() * 15) + 5;
        question = `${c} - ${d} = ?`;
        answer = c - d;
        break;
      
      case 'hard':
        const e = Math.floor(Math.random() * 12) + 2;
        const f = Math.floor(Math.random() * 12) + 2;
        question = `${e} × ${f} = ?`;
        answer = e * f;
        break;
    }

    // Generate multiple choice options for easy and medium
    if (difficulty !== 'hard') {
      options = this.generateMultipleChoice(answer, difficulty);
    }

    return {
      id,
      type: 'arithmetic',
      question,
      answer,
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
      case 'easy':
        const a1 = Math.floor(Math.random() * 10) + 1;
        const b1 = Math.floor(Math.random() * 20) + 1;
        question = `x + ${a1} = ${b1}. What is x?`;
        answer = b1 - a1;
        break;
      
      case 'medium':
        const a2 = Math.floor(Math.random() * 5) + 2;
        const b2 = Math.floor(Math.random() * 30) + 10;
        question = `${a2}x = ${b2}. What is x?`;
        answer = b2 / a2;
        break;
      
      case 'hard':
        const a3 = Math.floor(Math.random() * 5) + 2;
        const b3 = Math.floor(Math.random() * 20) + 5;
        const c3 = Math.floor(Math.random() * 30) + 10;
        question = `${a3}x + ${b3} = ${c3}. What is x?`;
        answer = (c3 - b3) / a3;
        break;
    }

    return {
      id,
      type: 'algebra',
      question,
      answer,
      difficulty,
      timeLimit: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : 90,
      points: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 6,
    };
  }

  private createLogicChallenge(id: string, difficulty: 'easy' | 'medium' | 'hard'): Challenge {
    let question: string;
    let answer: string;

    switch (difficulty) {
      case 'easy':
        const easyLogic = [
          { q: "If all cats are animals and some animals are pets, are all cats pets?", a: "no" },
          { q: "If today is Tuesday, what day will it be in 3 days?", a: "friday" },
          { q: "If you have 5 apples and give away 2, how many do you have left?", a: "3" },
        ];
        const selectedEasy = easyLogic[Math.floor(Math.random() * easyLogic.length)];
        question = selectedEasy.q;
        answer = selectedEasy.a;
        break;
      
      case 'medium':
        const mediumLogic = [
          { q: "A bat and a ball cost $1.10. The bat costs $1 more than the ball. How much does the ball cost?", a: "0.05" },
          { q: "If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?", a: "5" },
        ];
        const selectedMedium = mediumLogic[Math.floor(Math.random() * mediumLogic.length)];
        question = selectedMedium.q;
        answer = selectedMedium.a;
        break;
      
      case 'hard':
        const hardLogic = [
          { q: "You are in a race and pass the person in second place. What place are you in now?", a: "second" },
          { q: "A man looks at a portrait and says 'Brothers and sisters I have none, but that man's father is my father's son.' Who is in the portrait?", a: "son" },
        ];
        const selectedHard = hardLogic[Math.floor(Math.random() * hardLogic.length)];
        question = selectedHard.q;
        answer = selectedHard.a;
        break;
    }

    return {
      id,
      type: 'logic',
      question,
      answer,
      difficulty,
      timeLimit: difficulty === 'easy' ? 60 : difficulty === 'medium' ? 90 : 120,
      points: difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 8,
    };
  }

  private createSequenceChallenge(id: string, difficulty: 'easy' | 'medium' | 'hard'): Challenge {
    let question: string;
    let answer: number;

    switch (difficulty) {
      case 'easy':
        const start1 = Math.floor(Math.random() * 5) + 1;
        const step1 = Math.floor(Math.random() * 3) + 1;
        question = `${start1}, ${start1 + step1}, ${start1 + 2*step1}, ${start1 + 3*step1}, ?`;
        answer = start1 + 4*step1;
        break;
      
      case 'medium':
        const start2 = Math.floor(Math.random() * 3) + 2;
        question = `${start2}, ${start2*2}, ${start2*4}, ${start2*8}, ?`;
        answer = start2 * 16;
        break;
      
      case 'hard':
        const fib = [1, 1, 2, 3, 5, 8, 13, 21];
        const startIndex = Math.floor(Math.random() * 3);
        question = `${fib[startIndex]}, ${fib[startIndex+1]}, ${fib[startIndex+2]}, ${fib[startIndex+3]}, ?`;
        answer = fib[startIndex+4];
        break;
    }

    return {
      id,
      type: 'sequence',
      question,
      answer,
      difficulty,
      timeLimit: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : 90,
      points: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 7,
    };
  }

  private generateMultipleChoice(correctAnswer: number, difficulty: 'easy' | 'medium' | 'hard'): string[] {
    const options = [correctAnswer.toString()];
    const variance = difficulty === 'easy' ? 5 : 10;
    
    while (options.length < 4) {
      const wrongAnswer = correctAnswer + Math.floor(Math.random() * variance) - variance/2;
      if (wrongAnswer !== correctAnswer && wrongAnswer > 0 && !options.includes(wrongAnswer.toString())) {
        options.push(wrongAnswer.toString());
      }
    }
    
    return options.sort(() => Math.random() - 0.5);
  }
}
