export interface LotteryNumbers {
  main: number[];
  lucky: number[];
}

export interface LotteryOdds {
  jackpot: bigint;
  drawsPerWeek: number;
  costPerLine: number;
}

export interface LifetimeCalculation {
  linesPerWeek: number;
  birthDate: Date;
  yearsToWin: bigint;
  ageAtWin: bigint;
  lifetimeSpend: number;
  minorWinnings: number;
  netOutcome: number;
}

export interface PrizeTier {
  match: string;
  odds: bigint;
  prize: number;
}
