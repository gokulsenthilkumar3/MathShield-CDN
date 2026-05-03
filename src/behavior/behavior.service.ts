import { Injectable } from '@nestjs/common';

export interface BehaviorData {
  mouseMovements?: MouseMovement[];
  clickTiming?: ClickTiming[];
  typingPattern?: TypingPattern;
  focusEvents?: FocusEventData[];
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

export interface FocusEventData {
  type: 'focus' | 'blur';
  timestamp: number;
  element: string;
}

export interface BehaviorScore {
  score: number; // 0–100 (100 = very human)
  signals: {
    mouse: number;
    clicks: number;
    typing: number;
    focus: number;
  };
  isBot: boolean;
  confidence: number;
  flags: string[];
}

@Injectable()
export class BehaviorService {
  /**
   * Analyse all behaviour signals and return a composite humanness score
   */
  analyze(data?: BehaviorData): BehaviorScore {
    if (!data) {
      return this.defaultScore('No behavior data provided');
    }

    const flags: string[] = [];
    const signals = {
      mouse: this.analyzeMouseMovements(data.mouseMovements, flags),
      clicks: this.analyzeClickTiming(data.clickTiming, flags),
      typing: this.analyzeTypingPattern(data.typingPattern, flags),
      focus: this.analyzeFocusEvents(data.focusEvents, flags),
    };

    // Weighted composite
    const hasData = {
      mouse: !!data.mouseMovements?.length,
      clicks: !!data.clickTiming?.length,
      typing: !!data.typingPattern,
      focus: !!data.focusEvents?.length,
    };

    const weights = {
      mouse: hasData.mouse ? 0.35 : 0,
      clicks: hasData.clicks ? 0.25 : 0,
      typing: hasData.typing ? 0.30 : 0,
      focus: hasData.focus ? 0.10 : 0,
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
    const normalised = Object.fromEntries(
      Object.entries(weights).map(([k, v]) => [k, v / totalWeight])
    ) as typeof weights;

    const score = Math.round(
      signals.mouse * normalised.mouse +
      signals.clicks * normalised.clicks +
      signals.typing * normalised.typing +
      signals.focus * normalised.focus
    );

    const isBot = score < 35 || flags.length >= 3;
    const confidence = Math.min(100, totalWeight * 100);

    return { score: Math.max(0, Math.min(100, score)), signals, isBot, confidence, flags };
  }

  // ─── Mouse ──────────────────────────────────────────────────────────────────

  private analyzeMouseMovements(movements?: MouseMovement[], flags?: string[]): number {
    if (!movements || movements.length < 3) return 50;

    let directionChanges = 0;
    let lastDirection = 0;
    let totalDistance = 0;
    let totalDuration = 0;

    for (let i = 1; i < movements.length; i++) {
      const prev = movements[i - 1];
      const curr = movements[i];

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
      totalDuration += curr.duration || 0;

      const direction = Math.atan2(dy, dx);
      if (i > 1 && Math.abs(direction - lastDirection) > Math.PI / 6) {
        directionChanges++;
      }
      lastDirection = direction;
    }

    const avgSpeed = totalDuration > 0 ? totalDistance / totalDuration : 0;
    const changeRatio = directionChanges / movements.length;

    let score = 50;

    // Perfect straight lines = bot
    if (changeRatio < 0.05) {
      score -= 30;
      flags?.push('Perfectly linear mouse movement (bot signature)');
    } else if (changeRatio > 0.10) {
      score += 25;
    }

    // Speed anomaly
    if (avgSpeed < 0.05 || avgSpeed > 20) {
      score -= 20;
      flags?.push('Abnormal mouse speed');
    } else {
      score += 15;
    }

    // Too few events for long sessions
    if (movements.length < 10) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  // ─── Clicks ─────────────────────────────────────────────────────────────────

  private analyzeClickTiming(clicks?: ClickTiming[], flags?: string[]): number {
    if (!clicks || clicks.length < 2) return 50;

    const delays = clicks
      .slice(1)
      .map((c, i) => c.timestamp - clicks[i].timestamp)
      .filter((d) => d > 0);

    if (delays.length === 0) return 50;

    const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
    const variance =
      delays.reduce((s, d) => s + Math.pow(d - avg, 2), 0) / delays.length;

    let score = 50;

    // Perfect consistency = bot
    if (variance < 200) {
      score -= 30;
      flags?.push('Robotic click timing (zero variance)');
    } else if (variance > 5000) {
      score += 20; // Natural human variation
    }

    // Too fast
    if (avg < 80) {
      score -= 25;
      flags?.push('Click speed exceeds human threshold');
    } else if (avg > 200) {
      score += 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  // ─── Typing ─────────────────────────────────────────────────────────────────

  private analyzeTypingPattern(pattern?: TypingPattern, flags?: string[]): number {
    if (!pattern || pattern.keystrokes.length < 3) return 50;

    const { keystrokes, averageSpeed, corrections } = pattern;
    let score = 50;

    // Speed check (wpm analogue)
    if (averageSpeed < 30 || averageSpeed > 600) {
      score -= 25;
      flags?.push('Typing speed outside human range');
    } else {
      score += 20;
    }

    // No corrections = bot
    if (corrections === 0 && keystrokes.length > 5) {
      score -= 20;
      flags?.push('Zero typing corrections (bot signature)');
    } else if (corrections > 0) {
      score += 15;
    }

    // Variance in keystroke delays
    const delays = keystrokes.slice(1).map((k) => k.delay).filter((d) => d > 0);
    if (delays.length > 1) {
      const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
      const variance = delays.reduce((s, d) => s + Math.pow(d - avg, 2), 0) / delays.length;
      if (variance < 100) {
        score -= 15;
        flags?.push('Metronomic typing rhythm (bot signature)');
      } else {
        score += 10;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  // ─── Focus events ────────────────────────────────────────────────────────────

  private analyzeFocusEvents(events?: FocusEventData[], flags?: string[]): number {
    if (!events || events.length === 0) return 60;

    const focusCount = events.filter((e) => e.type === 'focus').length;
    const blurCount = events.filter((e) => e.type === 'blur').length;

    if (focusCount > 0 && blurCount > 0) return 85; // Natural tab switching
    if (focusCount === 0 && blurCount === 0) return 60;
    return 50;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private defaultScore(flag: string): BehaviorScore {
    return {
      score: 50,
      signals: { mouse: 50, clicks: 50, typing: 50, focus: 50 },
      isBot: false,
      confidence: 0,
      flags: [flag],
    };
  }
}
