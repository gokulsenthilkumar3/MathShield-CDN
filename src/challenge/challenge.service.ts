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
  timeLimit: number; // seconds
  points: number;
  signature?: string; // HMAC integrity
  explanation?: string;
}

export interface ChallengeRequest {
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: 'arithmetic' | 'algebra' | 'logic' | 'sequence' | AIResistantChallengeType | 'ai-resistant';
  riskScore?: number;
  useAIResistant?: boolean;
}

// All AI-resistant types in one constant
const AI_RESISTANT_TYPES: AIResistantChallengeType[] = [
  'pattern', 'spatial', 'semantic', 'analogy', 'completion',
];

const ALL_TYPES: ChallengeRequest['type'][] = [
  'arithmetic', 'algebra', 'logic', 'sequence',
  ...AI_RESISTANT_TYPES,
];

@Injectable()
export class ChallengeService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly tokenService: TokenService,
  ) {}

  async generateChallenge(request: ChallengeRequest = {}): Promise<Challenge> {
    const riskScore = request.riskScore ?? 0;
    const difficulty = request.difficulty ?? this.getDifficultyByRisk(riskScore);

    // High-risk sessions always get AI-resistant challenges
    const forceAIResistant = riskScore > 50 || request.useAIResistant === true;
    const rawType = request.type ?? (forceAIResistant ? 'ai-resistant' : this.pickRandomType());

    const challenge = this.buildChallenge(rawType, difficulty, forceAIResistant);

    // Cache for 10 minutes
    await this.cacheManager.set(`challenge:${challenge.id}`, challenge, 600_000);
    return challenge;
  }

  async getChallengeById(id: string): Promise<Challenge | null> {
    return this.cacheManager.get<Challenge>(`challenge:${id}`);
  }

  async removeChallenge(id: string): Promise<void> {
    await this.cacheManager.del(`challenge:${id}`);
  }

  // ---------------------------------------------------------------------------
  // Difficulty
  // ---------------------------------------------------------------------------

  private getDifficultyByRisk(riskScore: number): 'easy' | 'medium' | 'hard' {
    if (riskScore < 30) return 'easy';
    if (riskScore < 70) return 'medium';
    return 'hard';
  }

  // ---------------------------------------------------------------------------
  // Type selection
  // ---------------------------------------------------------------------------

  private pickRandomType(): ChallengeRequest['type'] {
    return ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
  }

  // ---------------------------------------------------------------------------
  // Challenge builder
  // ---------------------------------------------------------------------------

  private buildChallenge(
    type: ChallengeRequest['type'],
    difficulty: 'easy' | 'medium' | 'hard',
    useAIResistant: boolean,
  ): Challenge {
    // Resolve 'ai-resistant' meta-type to a concrete type
    if (type === 'ai-resistant' || useAIResistant) {
      type = AI_RESISTANT_TYPES[Math.floor(Math.random() * AI_RESISTANT_TYPES.length)];
    }

    let challenge: Challenge;

    switch (type) {
      case 'arithmetic': challenge = this.createArithmetic(uuidv4(), difficulty); break;
      case 'algebra':    challenge = this.createAlgebra(uuidv4(), difficulty);    break;
      case 'logic':      challenge = this.createLogic(uuidv4(), difficulty);      break;
      case 'sequence':   challenge = this.createSequence(uuidv4(), difficulty);   break;
      case 'pattern':    challenge = this.fromAI(generatePatternChallenge(difficulty));    break;
      case 'spatial':    challenge = this.fromAI(generateSpatialChallenge(difficulty));    break;
      case 'semantic':   challenge = this.fromAI(generateSemanticChallenge(difficulty));   break;
      case 'analogy':    challenge = this.fromAI(generateAnalogyChallenge(difficulty));    break;
      case 'completion': challenge = this.fromAI(generateCompletionChallenge(difficulty)); break;
      default:           challenge = this.createArithmetic(uuidv4(), difficulty);
    }

    challenge.signature = this.tokenService.createChallengeSignature(
      challenge.id,
      challenge.type,
      challenge.difficulty,
    );

    return challenge;
  }

  // ---------------------------------------------------------------------------
  // AI-resistant adapter
  // ---------------------------------------------------------------------------

  private fromAI(ai: AIResistantChallenge): Challenge {
    return {
      id:          ai.id,
      type:        ai.type,
      question:    ai.question,
      answer:      ai.answer,
      difficulty:  ai.difficulty,
      options:     ai.options,
      timeLimit:   ai.timeLimit,
      points:      ai.points,
      explanation: ai.explanation,
    };
  }

  // ---------------------------------------------------------------------------
  // Arithmetic
  // ---------------------------------------------------------------------------

  private createArithmetic(id: string, difficulty: 'easy' | 'medium' | 'hard'): Challenge {
    let question: string;
    let answer: number;
    let options: string[] | undefined;

    switch (difficulty) {
      case 'easy': {
        const a = rand(1, 10), b = rand(1, 10);
        question = `${a} + ${b} = ?`;
        answer = a + b;
        break;
      }
      case 'medium': {
        const a = rand(10, 30), b = rand(5, 20);
        // Ensure positive result
        const [big, small] = a >= b ? [a, b] : [b, a];
        question = `${big} - ${small} = ?`;
        answer = big - small;
        break;
      }
      case 'hard': {
        const a = rand(2, 12), b = rand(2, 12);
        question = `${a} × ${b} = ?`;
        answer = a * b;
        break;
      }
    }

    if (difficulty !== 'hard') {
      options = this.multipleChoice(answer, difficulty);
    }

    return {
      id, type: 'arithmetic', question, answer, difficulty, options,
      timeLimit: difficulty === 'easy' ? 30 : difficulty === 'medium' ? 45 : 60,
      points:    difficulty === 'easy' ? 1  : difficulty === 'medium' ? 3  : 5,
    };
  }

  // ---------------------------------------------------------------------------
  // Algebra  — guarantees integer answers
  // ---------------------------------------------------------------------------

  private createAlgebra(id: string, difficulty: 'easy' | 'medium' | 'hard'): Challenge {
    let question: string;
    let answer: number;

    switch (difficulty) {
      case 'easy': {
        const x = rand(1, 15);
        const b = rand(1, 10);
        question = `x + ${b} = ${x + b}. What is x?`;
        answer = x;
        break;
      }
      case 'medium': {
        // Ensure b is a divisor of product so answer is always integer
        const x = rand(2, 10);
        const a = rand(2, 6);
        question = `${a}x = ${a * x}. What is x?`;
        answer = x;
        break;
      }
      case 'hard': {
        // ax + b = c  →  x = integer guaranteed
        const x = rand(1, 10);
        const a = rand(2, 5);
        const b = rand(1, 20);
        question = `${a}x + ${b} = ${a * x + b}. What is x?`;
        answer = x;
        break;
      }
    }

    return {
      id, type: 'algebra', question, answer, difficulty,
      timeLimit: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : 90,
      points:    difficulty === 'easy' ? 2  : difficulty === 'medium' ? 4  : 6,
    };
  }

  // ---------------------------------------------------------------------------
  // Logic
  // ---------------------------------------------------------------------------

  private createLogic(id: string, difficulty: 'easy' | 'medium' | 'hard'): Challenge {
    const banks: Record<string, { q: string; a: string }[]> = {
      easy: [
        { q: 'If all cats are animals and some animals are pets, are all cats pets?', a: 'no' },
        { q: 'If today is Tuesday, what day will it be in 3 days?', a: 'friday' },
        { q: 'You have 5 apples and give away 2. How many do you have left?', a: '3' },
        { q: 'All roses are flowers. Some flowers fade quickly. Do all roses fade quickly?', a: 'no' },
      ],
      medium: [
        { q: 'A bat and a ball cost $1.10. The bat costs $1 more than the ball. How much does the ball cost in dollars?', a: '0.05' },
        { q: 'If it takes 5 machines 5 minutes to make 5 widgets, how many minutes would it take 100 machines to make 100 widgets?', a: '5' },
        { q: 'A farmer has 17 sheep. All but 9 die. How many sheep are left?', a: '9' },
      ],
      hard: [
        { q: "In a race you pass the person in 2nd place. What place are you now?", a: 'second' },
        { q: "A man looks at a portrait and says: 'Brothers and sisters I have none, but that man's father is my father's son.' Who is in the portrait?", a: 'son' },
        { q: 'There are 3 switches outside a room, one controls a bulb inside. You can enter only once. How do you find which switch controls the bulb?', a: 'turn one on for a while then off, turn another on, enter - warm bulb is first switch, lit bulb is second, cold off bulb is third' },
      ],
    };

    const pool = banks[difficulty];
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    return {
      id, type: 'logic',
      question: chosen.q,
      answer:   chosen.a,
      difficulty,
      timeLimit: difficulty === 'easy' ? 60 : difficulty === 'medium' ? 90 : 120,
      points:    difficulty === 'easy' ? 3  : difficulty === 'medium' ? 5  : 8,
    };
  }

  // ---------------------------------------------------------------------------
  // Sequence  — dynamic Fibonacci range, no static array
  // ---------------------------------------------------------------------------

  private createSequence(id: string, difficulty: 'easy' | 'medium' | 'hard'): Challenge {
    let question: string;
    let answer: number;

    switch (difficulty) {
      case 'easy': {
        const start = rand(1, 5), step = rand(1, 3);
        question = `${start}, ${start+step}, ${start+2*step}, ${start+3*step}, ?`;
        answer = start + 4 * step;
        break;
      }
      case 'medium': {
        const base = rand(2, 4);
        question = `${base}, ${base*2}, ${base*4}, ${base*8}, ?`;
        answer = base * 16;
        break;
      }
      case 'hard': {
        // Generate Fibonacci segment starting at a random offset (0-5)
        const offset = rand(0, 5);
        const fib = this.fibSegment(offset, 5); // 5 terms starting at offset
        question = `${fib[0]}, ${fib[1]}, ${fib[2]}, ${fib[3]}, ?`;
        answer = fib[4];
        break;
      }
    }

    return {
      id, type: 'sequence', question, answer, difficulty,
      timeLimit: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : 90,
      points:    difficulty === 'easy' ? 2  : difficulty === 'medium' ? 4  : 7,
    };
  }

  /** Compute `count` Fibonacci numbers starting from index `startIndex`. */
  private fibSegment(startIndex: number, count: number): number[] {
    // Build from scratch up to startIndex + count
    const full: number[] = [1, 1];
    for (let i = 2; i < startIndex + count; i++) {
      full.push(full[i - 1] + full[i - 2]);
    }
    return full.slice(startIndex, startIndex + count);
  }

  // ---------------------------------------------------------------------------
  // Multiple-choice generator  — guards against negatives & duplicates
  // ---------------------------------------------------------------------------

  private multipleChoice(correct: number, difficulty: 'easy' | 'medium' | 'hard'): string[] {
    const variance = difficulty === 'easy' ? 5 : 10;
    const options = new Set<number>([correct]);
    let attempts = 0;

    while (options.size < 4 && attempts < 40) {
      attempts++;
      const delta = rand(-variance, variance);
      const candidate = correct + delta;
      // Reject: same as correct, negative, or already present
      if (candidate !== correct && candidate > 0) {
        options.add(candidate);
      }
    }

    // If we still don't have 4, pad with sequential values
    let pad = correct + variance + 1;
    while (options.size < 4) {
      options.add(pad++);
    }

    return shuffle([...options].map(String));
  }
}

// ---------------------------------------------------------------------------
// Pure utility helpers (module-level, no state)
// ---------------------------------------------------------------------------

/** Inclusive random integer in [min, max]. */
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Fisher-Yates shuffle (returns new array). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
