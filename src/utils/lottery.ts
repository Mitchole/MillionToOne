import { LotteryOdds, LifetimeCalculation, PrizeTier } from '../types';

export const LOTTERY_CONFIG: LotteryOdds = {
  jackpot: 139838160n,
  drawsPerWeek: 2,
  costPerLine: 2.5,
};

export const PRIZE_TIERS: PrizeTier[] = [
  { match: '5+2', odds: 139838160n, prize: 0 }, // Jackpot - variable
  { match: '5+1', odds: 6991908n, prize: 130554.3 },
  { match: '5+0', odds: 3107515n, prize: 13561.2 },
  { match: '4+2', odds: 621503n, prize: 844.7 },
  { match: '4+1', odds: 31075n, prize: 77.8 },
  { match: '3+2', odds: 14125n, prize: 37.3 },
  { match: '4+0', odds: 13811n, prize: 25.6 },
  { match: '2+2', odds: 985n, prize: 9.1 },
  { match: '3+1', odds: 706n, prize: 7.3 },
  { match: '3+0', odds: 314n, prize: 6.0 },
  { match: '1+2', odds: 188n, prize: 4.3 },
  { match: '2+1', odds: 49n, prize: 3.6 },
  { match: '2+0', odds: 22n, prize: 2.5 },
];

export const UK_LIFE_EXPECTANCY = {
  male: 89.3,
  female: 92.2,
  average: 90.75,
};

/**
 * Calculate lifetime lottery statistics
 */
export const calculateLifetimeStats = (
  linesPerWeek: number,
  birthDate: Date,
): LifetimeCalculation => {
  const currentAge = (Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const playsPerYear = BigInt(linesPerWeek) * BigInt(LOTTERY_CONFIG.drawsPerWeek) * 52n;
  const yearsToWin = LOTTERY_CONFIG.jackpot / playsPerYear;
  const ageAtWin = BigInt(Math.round(currentAge)) + yearsToWin;

  // Calculate total plays needed to statistically win jackpot
  const totalPlaysToWin = yearsToWin * playsPerYear;
  const lifetimeSpend = Number(totalPlaysToWin) * LOTTERY_CONFIG.costPerLine;

  // Calculate expected minor winnings
  let totalMinorWinnings = 0;

  PRIZE_TIERS.slice(1).forEach((tier) => {
    const expectedWins = Number(totalPlaysToWin) / Number(tier.odds);
    const winningsFromTier = expectedWins * tier.prize;
    totalMinorWinnings += winningsFromTier;
  });

  const netOutcome = totalMinorWinnings - lifetimeSpend;

  return {
    linesPerWeek,
    birthDate,
    yearsToWin,
    ageAtWin,
    lifetimeSpend,
    minorWinnings: totalMinorWinnings,
    netOutcome,
  };
};

/**
 * Format large numbers for display
 */
export const formatLargeNumber = (value: bigint | number): string => {
  const num = typeof value === 'bigint' ? Number(value) : value;

  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }

  return num.toLocaleString();
};

/**
 * Format currency values
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Generate random lottery numbers
 */
export const generateRandomNumbers = (): { main: number[]; lucky: number[] } => {
  const main: number[] = [];
  const lucky: number[] = [];

  // Generate 5 main numbers (1-50)
  while (main.length < 5) {
    const num = Math.floor(Math.random() * 50) + 1;
    if (!main.includes(num)) {
      main.push(num);
    }
  }

  // Generate 2 lucky stars (1-12)
  while (lucky.length < 2) {
    const num = Math.floor(Math.random() * 12) + 1;
    if (!lucky.includes(num)) {
      lucky.push(num);
    }
  }

  main.sort((a, b) => a - b);
  lucky.sort((a, b) => a - b);

  return { main, lucky };
};

/**
 * Validate lottery number selections
 */
export const validateNumbers = (main: number[], lucky: number[]): boolean => {
  // Check main numbers
  if (main.length !== 5) return false;
  if (main.some((num) => num < 1 || num > 50)) return false;
  if (new Set(main).size !== main.length) return false;

  // Check lucky numbers
  if (lucky.length !== 2) return false;
  if (lucky.some((num) => num < 1 || num > 12)) return false;
  if (new Set(lucky).size !== lucky.length) return false;

  return true;
};
