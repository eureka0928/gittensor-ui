import {
  TIER_LEVELS,
  getTierLevel,
  calculateDynamicThreshold,
  getTierColor,
  matchesStatus,
  formatTimeAgo,
  getOpenPrColor,
  getZeroScoreReason,
} from '../miner';
import { type CommitLog } from '../../api';

// --------------- calculateDynamicThreshold ---------------

describe('calculateDynamicThreshold', () => {
  it('returns default base threshold when no config', () => {
    expect(
      calculateDynamicThreshold(undefined, 0, 0, 0),
    ).toBe(10);
  });

  it('uses config base threshold when provided', () => {
    expect(
      calculateDynamicThreshold(undefined, 0, 0, 0, {
        excessivePrPenaltyThreshold: 15,
      }),
    ).toBe(15);
  });

  it('adds bonus from bronze token score for bronze tier', () => {
    // bronze tier, 1000 token score => 1000/500 = 2 bonus
    expect(
      calculateDynamicThreshold('Bronze', 1000, 0, 0),
    ).toBe(12);
  });

  it('unlocks silver and bronze scores for silver tier', () => {
    // silver tier => bronze(1000) + silver(500) = 1500 => 3 bonus
    expect(
      calculateDynamicThreshold('Silver', 1000, 500, 0),
    ).toBe(13);
  });

  it('unlocks all tiers for gold tier', () => {
    // gold => 1000+500+500 = 2000 => 4 bonus
    expect(
      calculateDynamicThreshold('Gold', 1000, 500, 500),
    ).toBe(14);
  });

  it('caps at max threshold', () => {
    expect(
      calculateDynamicThreshold('Gold', 50000, 50000, 50000, {
        maxOpenPrThreshold: 30,
      }),
    ).toBe(30);
  });

  it('handles string token scores (API coercion)', () => {
    expect(
      calculateDynamicThreshold(
        'Bronze',
        '1000' as unknown as number,
        '0' as unknown as number,
        '0' as unknown as number,
      ),
    ).toBe(12);
  });

  it('handles custom tokenScorePer', () => {
    // 1000 / 250 = 4 bonus
    expect(
      calculateDynamicThreshold('Bronze', 1000, 0, 0, {
        openPrThresholdTokenScore: 250,
      }),
    ).toBe(14);
  });
});

// --------------- getTierLevel ---------------

describe('getTierLevel', () => {
  it('returns 0 for undefined', () => {
    expect(getTierLevel(undefined)).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(getTierLevel(null)).toBe(0);
  });

  it('returns 1 for bronze (case-insensitive)', () => {
    expect(getTierLevel('Bronze')).toBe(1);
    expect(getTierLevel('BRONZE')).toBe(1);
  });

  it('returns 2 for silver', () => {
    expect(getTierLevel('Silver')).toBe(2);
  });

  it('returns 3 for gold', () => {
    expect(getTierLevel('Gold')).toBe(3);
  });

  it('returns 0 for unknown tier', () => {
    expect(getTierLevel('platinum')).toBe(0);
  });
});

// --------------- TIER_LEVELS ---------------

describe('TIER_LEVELS', () => {
  it('has correct hierarchy', () => {
    expect(TIER_LEVELS.bronze).toBe(1);
    expect(TIER_LEVELS.silver).toBe(2);
    expect(TIER_LEVELS.gold).toBe(3);
  });
});

// --------------- getTierColor ---------------

describe('getTierColor', () => {
  it('returns gold color', () => {
    const color = getTierColor('Gold');
    expect(color).not.toBe('transparent');
    expect(typeof color).toBe('string');
  });

  it('returns silver color', () => {
    expect(getTierColor('Silver')).not.toBe('transparent');
  });

  it('returns bronze color', () => {
    expect(getTierColor('Bronze')).not.toBe('transparent');
  });

  it('returns transparent for unknown tier', () => {
    expect(getTierColor('platinum')).toBe('transparent');
  });

  it('returns transparent for empty string', () => {
    expect(getTierColor('')).toBe('transparent');
  });
});

// --------------- matchesStatus ---------------

describe('matchesStatus', () => {
  it('returns true for all filter', () => {
    expect(matchesStatus('OPEN', null, 'all')).toBe(true);
  });

  it('matches open PRs', () => {
    expect(matchesStatus('OPEN', null, 'open')).toBe(true);
  });

  it('matches open when no prState and no mergedAt', () => {
    expect(matchesStatus(null, null, 'open')).toBe(true);
  });

  it('matches merged via mergedAt', () => {
    expect(
      matchesStatus('CLOSED', '2024-01-01', 'merged'),
    ).toBe(true);
  });

  it('matches merged via MERGED state', () => {
    expect(matchesStatus('MERGED', null, 'merged')).toBe(true);
  });

  it('matches closed without merge', () => {
    expect(matchesStatus('CLOSED', null, 'closed')).toBe(true);
  });

  it('does not match closed when mergedAt is set', () => {
    expect(
      matchesStatus('CLOSED', '2024-01-01', 'closed'),
    ).toBe(false);
  });
});

// --------------- formatTimeAgo ---------------

describe('formatTimeAgo', () => {
  const now = new Date('2025-06-15T12:00:00Z');

  it('returns just now for < 1 minute', () => {
    const date = new Date('2025-06-15T11:59:30Z');
    expect(formatTimeAgo(date, now)).toBe('just now');
  });

  it('returns minutes ago', () => {
    const date = new Date('2025-06-15T11:45:00Z');
    expect(formatTimeAgo(date, now)).toBe('15m ago');
  });

  it('returns hours and minutes ago', () => {
    const date = new Date('2025-06-15T09:30:00Z');
    expect(formatTimeAgo(date, now)).toBe('2h 30m ago');
  });

  it('returns hours only when no remainder', () => {
    const date = new Date('2025-06-15T10:00:00Z');
    expect(formatTimeAgo(date, now)).toBe('2h ago');
  });

  it('returns 1 day ago', () => {
    const date = new Date('2025-06-14T12:00:00Z');
    expect(formatTimeAgo(date, now)).toBe('1 day ago');
  });

  it('returns multiple days ago', () => {
    const date = new Date('2025-06-10T12:00:00Z');
    expect(formatTimeAgo(date, now)).toBe('5 days ago');
  });

  it('uses current time when now not provided', () => {
    const recentDate = new Date(Date.now() - 5000);
    expect(formatTimeAgo(recentDate)).toBe('just now');
  });
});

// --------------- getOpenPrColor ---------------

describe('getOpenPrColor', () => {
  it('returns red when at threshold', () => {
    expect(getOpenPrColor(10, 10)).toBe(
      'rgba(248, 113, 113, 0.9)',
    );
  });

  it('returns red when above threshold', () => {
    expect(getOpenPrColor(15, 10)).toBe(
      'rgba(248, 113, 113, 0.9)',
    );
  });

  it('returns orange one below threshold', () => {
    expect(getOpenPrColor(9, 10)).toBe(
      'rgba(251, 146, 60, 0.9)',
    );
  });

  it('returns yellow two below threshold', () => {
    expect(getOpenPrColor(8, 10)).toBe(
      'rgba(250, 204, 21, 0.9)',
    );
  });

  it('returns undefined when safely below threshold', () => {
    expect(getOpenPrColor(5, 10)).toBeUndefined();
  });
});

// --------------- getZeroScoreReason ---------------

describe('getZeroScoreReason', () => {
  const basePr = {
    score: '0',
    prState: 'OPEN',
    mergedAt: null,
    collateralScore: '0',
  } as unknown as CommitLog;

  it('returns null for non-zero score', () => {
    expect(
      getZeroScoreReason({ ...basePr, score: '1.5' }),
    ).toBeNull();
  });

  it('returns closed reason for closed unmerged PR', () => {
    expect(
      getZeroScoreReason({
        ...basePr,
        prState: 'CLOSED',
        mergedAt: null,
      }),
    ).toBe('Closed without merge \u2014 no score awarded');
  });

  it('returns open reason for open PR without collateral', () => {
    expect(
      getZeroScoreReason({
        ...basePr,
        prState: 'OPEN',
        collateralScore: '0',
      }),
    ).toBe('Open \u2014 score awarded after merge');
  });

  it('returns open reason with collateral note', () => {
    expect(
      getZeroScoreReason({
        ...basePr,
        prState: 'OPEN',
        collateralScore: '5.2',
      }),
    ).toBe(
      'Open \u2014 score awarded after merge. Collateral is being deducted while open.',
    );
  });

  it('returns zero token score reason for merged PR', () => {
    expect(
      getZeroScoreReason({
        ...basePr,
        mergedAt: '2024-01-01',
        tokenScore: 0,
      }),
    ).toBe(
      'Zero token score \u2014 likely test/doc-only files (0.05x weight)',
    );
  });

  it('returns credibility reason when scalar near zero', () => {
    expect(
      getZeroScoreReason({
        ...basePr,
        mergedAt: '2024-01-01',
        tokenScore: 100,
        credibilityScalar: 0.005,
      }),
    ).toBe('Credibility multiplier too low at this tier');
  });

  it('returns untracked tier reason when tier is null', () => {
    expect(
      getZeroScoreReason({
        ...basePr,
        mergedAt: '2024-01-01',
        tokenScore: 100,
        credibilityScalar: 1.0,
        tier: null,
      }),
    ).toBe('Repository tier not tracked');
  });

  it('returns fallback penalty reason for merged PR', () => {
    expect(
      getZeroScoreReason({
        ...basePr,
        mergedAt: '2024-01-01',
        tokenScore: 100,
        credibilityScalar: 1.0,
        tier: 'Bronze',
      }),
    ).toBe(
      'Score reduced by penalties \u2014 check Score Breakdown tab',
    );
  });
});
