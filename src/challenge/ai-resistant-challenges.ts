/**
 * AI-Resistant Challenge Types
 * 
 * These challenges are designed to be difficult for AI/LLMs to solve while remaining
 * accessible to humans. They focus on pattern recognition, spatial reasoning, and
 * semantic understanding rather than pure mathematics.
 */

export type AIResistantChallengeType = 
  | 'pattern'      // Visual/sequence pattern recognition
  | 'spatial'      // Spatial reasoning and mental rotation
  | 'semantic'     // Semantic logic and common sense reasoning
  | 'analogy'      // Analogical reasoning
  | 'completion';  // Pattern completion with gaps

export interface AIResistantChallenge {
  id: string;
  type: AIResistantChallengeType;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[];
  timeLimit: number;
  points: number;
  hint?: string;
  explanation?: string; // Educational explanation after solving
}

/**
 * Pattern Recognition Challenges
 * Humans are excellent at recognizing visual and logical patterns
 */
export function generatePatternChallenge(difficulty: 'easy' | 'medium' | 'hard'): AIResistantChallenge {
  const patterns = {
    easy: [
      { pattern: '🔴🔴🔴⬜⬜⬜🔴🔴🔴⬜⬜⬜?', answer: '🔴', explanation: 'Red circle appears 3 times, then 3 empty spaces' },
      { pattern: '1, 1, 2, 3, 5, 8, ?', answer: '13', explanation: 'Fibonacci sequence: each number is the sum of the two preceding ones' },
      { pattern: '🌑🌒🌓🌔?', answer: '🌕', explanation: 'Moon phases progressing from new moon to full moon' },
      { pattern: 'A, C, E, G, ?', answer: 'I', explanation: 'Every other letter of the alphabet' },
    ],
    medium: [
      { pattern: '2, 3, 5, 7, 11, ?', answer: '13', explanation: 'Prime numbers in sequence' },
      { pattern: '🔺🔺⬜🔺🔺⬜🔺?', answer: '🔺', explanation: 'Two triangles followed by one empty space' },
      { pattern: '1, 4, 9, 16, 25, ?', answer: '36', explanation: 'Perfect squares: 1², 2², 3², 4², 5², 6²' },
      { pattern: 'J, F, M, A, M, ?', answer: 'J', explanation: 'First letters of months: January, February, March, April, May, June' },
    ],
    hard: [
      { pattern: '1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, ?', answer: '1', explanation: 'Count of 1s in binary representation: 1, 10, 11, 100, 101, 110, 111, 1000...' },
      { pattern: '🎵🎶🎵🎶🎵🎶🎵?', answer: '🎶', explanation: 'Alternating musical notes pattern' },
      { pattern: '2, 12, 1112, 3112, 132112, ?', answer: '1113122112', explanation: 'Look-and-say sequence: describe the previous term' },
    ],
  };

  const selected = patterns[difficulty][Math.floor(Math.random() * patterns[difficulty].length)];
  
  return {
    id: crypto.randomUUID(),
    type: 'pattern',
    question: `What comes next in this pattern?\n${selected.pattern}`,
    answer: selected.answer,
    difficulty,
    timeLimit: difficulty === 'easy' ? 30 : difficulty === 'medium' ? 45 : 60,
    points: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 6,
    options: generatePatternOptions(selected.answer, difficulty),
    explanation: selected.explanation,
  };
}

/**
 * Spatial Reasoning Challenges
 * Tests mental rotation and spatial visualization abilities
 */
export function generateSpatialChallenge(difficulty: 'easy' | 'medium' | 'hard'): AIResistantChallenge {
  const challenges = {
    easy: [
      {
        question: 'If you rotate a cube 90° to the right, then 90° forward, which face is now on top?',
        answer: 'front',
        explanation: 'First rotation brings front to top, second rotation keeps it there',
        options: ['top', 'bottom', 'front', 'back'],
      },
      {
        question: '📦 → rotate right → ?',
        answer: '📤',
        explanation: 'Rotating a box to the right shows its side profile',
        options: ['📦', '📤', '📥', '📨'],
      },
    ],
    medium: [
      {
        question: 'A mirror shows your right hand on the left side. If you raise your left hand, which side does the mirror show it on?',
        answer: 'right',
        explanation: 'Mirrors flip horizontally: your left appears on the right',
        options: ['left', 'right', 'center', 'behind'],
      },
      {
        question: '🧊 is a cube. After 3 rotations (90° right, 90° down, 90° left), what face is on top?',
        answer: 'bottom',
        explanation: '3 rotations of 90° = 270°, which is equivalent to -90° (the bottom face)',
        options: ['top', 'bottom', 'front', 'back'],
      },
    ],
    hard: [
      {
        question: 'You have 8 small cubes forming one large cube. How many small cubes have paint on exactly 2 faces if only the exterior is painted?',
        answer: '12',
        explanation: 'Edge cubes (not corners) have exactly 2 painted faces. A cube has 12 edges.',
        options: ['8', '12', '16', '24'],
      },
      {
        question: 'If 🔺 is rotated 120° around its center, how many distinct positions will it look the same?',
        answer: '3',
        explanation: 'An equilateral triangle has 3-fold rotational symmetry',
        options: ['1', '2', '3', '6'],
      },
    ],
  };

  const selected = challenges[difficulty][Math.floor(Math.random() * challenges[difficulty].length)];
  
  return {
    id: crypto.randomUUID(),
    type: 'spatial',
    question: selected.question,
    answer: selected.answer,
    difficulty,
    options: selected.options,
    timeLimit: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : 90,
    points: difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 8,
    explanation: selected.explanation,
  };
}

/**
 * Semantic Logic Challenges
 * Common sense reasoning that AI often struggles with
 */
export function generateSemanticChallenge(difficulty: 'easy' | 'medium' | 'hard'): AIResistantChallenge {
  const challenges = {
    easy: [
      {
        question: 'A man is looking at a photograph. Someone asks him, "Whose photograph is this?" He replies, "Brothers and sisters I have none, but this man\'s father is my father\'s son." Whose photograph is it?',
        answer: 'son',
        explanation: 'My father\'s son = me (since no brothers), so this man\'s father = me, meaning it\'s my son',
        options: ['his father', 'his son', 'himself', 'his brother'],
      },
      {
        question: 'If a yellow house is made of yellow bricks, and a blue house is made of blue bricks, what is a greenhouse made of?',
        answer: 'glass',
        explanation: 'A greenhouse is a structure for plants, not colored green bricks',
        options: ['green bricks', 'glass', 'plants', 'yellow bricks'],
      },
    ],
    medium: [
      {
        question: 'A bat and a ball cost $1.10 total. The bat costs $1.00 more than the ball. How much does the ball cost?',
        answer: '0.05',
        explanation: 'If ball = $0.05, bat = $1.05, total = $1.10. The bat is $1.00 more than the ball.',
        options: ['0.10', '0.05', '0.15', '1.00'],
      },
      {
        question: 'If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?',
        answer: '5',
        explanation: 'Each machine takes 5 minutes to make 1 widget. 100 machines make 100 widgets in 5 minutes.',
        options: ['5', '10', '100', '500'],
      },
    ],
    hard: [
      {
        question: 'You are in a room with 3 switches controlling 3 bulbs in another room. You can only enter the bulb room once. How do you determine which switch controls which bulb?',
        answer: 'heat',
        explanation: 'Turn on switch 1 for 5 minutes, turn off. Turn on switch 2. Enter room: on=switch2, hot=switch1, cold=switch3',
        options: ['color', 'heat', 'sound', 'impossible'],
      },
      {
        question: 'A farmer has 17 sheep and all but 9 die. How many are left?',
        answer: '9',
        explanation: '"All but 9" means 9 survived, 8 died',
        options: ['8', '9', '17', '0'],
      },
    ],
  };

  const selected = challenges[difficulty][Math.floor(Math.random() * challenges[difficulty].length)];
  
  return {
    id: crypto.randomUUID(),
    type: 'semantic',
    question: selected.question,
    answer: selected.answer,
    difficulty,
    options: selected.options,
    timeLimit: difficulty === 'easy' ? 60 : difficulty === 'medium' ? 90 : 120,
    points: difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 8,
    explanation: selected.explanation,
  };
}

/**
 * Analogical Reasoning Challenges
 * Pattern matching across different domains
 */
export function generateAnalogyChallenge(difficulty: 'easy' | 'medium' | 'hard'): AIResistantChallenge {
  const analogies = {
    easy: [
      { pair: '🐕 : 🐕‍🦺', completion: '🐈 : ?', answer: '🐈‍⬛', explanation: 'Regular to service animal' },
      { pair: '🔥 : 🌡️', completion: '❄️ : ?', answer: '🧊', explanation: 'Heat to temperature, cold to frozen' },
      { pair: '👨 : 👦', completion: '👩 : ?', answer: '👧', explanation: 'Adult to child (male then female)' },
    ],
    medium: [
      { pair: '🏃 : 🏃‍♂️', completion: '🚶 : ?', answer: '🚶‍♂️', explanation: 'Generic to gender-specific' },
      { pair: '📖 : 📚', completion: '💧 : ?', answer: '🌊', explanation: 'Single to multiple/collection' },
      { pair: '🌱 : 🌳', completion: '👶 : ?', answer: '👴', explanation: 'Young to mature version' },
    ],
    hard: [
      { pair: '🎭 : 😃😢', completion: '🎪 : ?', answer: '🤹🦁', explanation: 'Theater arts to expressions, circus to acts' },
      { pair: '🔬 : 🔭', completion: '🦠 : ?', answer: '🪐', explanation: 'Microscope to telescope (small to large), microbe to planet' },
    ],
  };

  const selected = analogies[difficulty][Math.floor(Math.random() * analogies[difficulty].length)];
  
  return {
    id: crypto.randomUUID(),
    type: 'analogy',
    question: `Complete the analogy:\n${selected.pair} :: ${selected.completion}`,
    answer: selected.answer,
    difficulty,
    options: generateAnalogyOptions(selected.answer, difficulty),
    timeLimit: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : 90,
    points: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 7,
    explanation: selected.explanation,
  };
}

/**
 * Pattern Completion with Gaps
 * Fill in missing elements of a sequence
 */
export function generateCompletionChallenge(difficulty: 'easy' | 'medium' | 'hard'): AIResistantChallenge {
  const completions = {
    easy: [
      { sequence: '🔴🔴⬜🔴🔴⬜🔴🔴?', answer: '⬜', explanation: 'Two red circles, one empty space, repeat' },
      { sequence: '1, 3, 5, _, 9', answer: '7', explanation: 'Odd numbers sequence' },
      { sequence: 'A, B, C, _, E', answer: 'D', explanation: 'Alphabetical order' },
    ],
    medium: [
      { sequence: '2, 4, 8, 16, _', answer: '32', explanation: 'Powers of 2' },
      { sequence: '🌑🌒🌓🌔🌕_', answer: '🌖', explanation: 'Moon phases progressing' },
      { sequence: '1, 1, 2, 3, 5, _', answer: '8', explanation: 'Fibonacci sequence' },
    ],
    hard: [
      { sequence: '2, 6, 12, 20, 30, _', answer: '42', explanation: 'n×(n+1): 1×2, 2×3, 3×4, 4×5, 5×6, 6×7' },
      { sequence: '1, 11, 21, 1211, 111221, _', answer: '312211', explanation: 'Look-and-say sequence' },
    ],
  };

  const selected = completions[difficulty][Math.floor(Math.random() * completions[difficulty].length)];
  
  return {
    id: crypto.randomUUID(),
    type: 'completion',
    question: `Fill in the blank:\n${selected.sequence}`,
    answer: selected.answer,
    difficulty,
    options: generateCompletionOptions(selected.answer, difficulty),
    timeLimit: difficulty === 'easy' ? 30 : difficulty === 'medium' ? 45 : 60,
    points: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 6,
    explanation: selected.explanation,
  };
}

// Helper functions to generate plausible wrong answers
function generatePatternOptions(correct: string, difficulty: string): string[] {
  const options = [correct];
  const wrongAnswers = difficulty === 'easy' 
    ? ['🔵', '🟢', '⬛', '⚪']
    : difficulty === 'medium'
      ? ['17', '15', '19', '21']
      : ['1112122112', '13112221', '3113112221', '1113213211'];
  
  while (options.length < 4) {
    const wrong = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
    if (!options.includes(wrong)) {
      options.push(wrong);
    }
  }
  
  return shuffleArray(options);
}

function generateAnalogyOptions(correct: string, difficulty: string): string[] {
  const emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'];
  const options = [correct];
  
  while (options.length < 4) {
    const random = emojis[Math.floor(Math.random() * emojis.length)];
    if (!options.includes(random) && random !== correct) {
      options.push(random);
    }
  }
  
  return shuffleArray(options);
}

function generateCompletionOptions(correct: string, difficulty: string): string[] {
  let wrongAnswers: string[];
  
  if (difficulty === 'easy') {
    wrongAnswers = ['🔴', '🔵', '🟢'];
  } else if (difficulty === 'medium') {
    const num = parseInt(correct);
    wrongAnswers = [num + 2, num - 2, num * 2].map(String);
  } else {
    const num = parseInt(correct);
    wrongAnswers = [num + 10, num - 10, num + 1].map(String);
  }
  
  const options = [correct];
  for (const wrong of wrongAnswers) {
    if (!options.includes(wrong)) {
      options.push(wrong);
    }
  }
  
  return shuffleArray(options.slice(0, 4));
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
