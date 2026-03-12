import { TIER_COLORS } from '../theme';
import { type CommitLog } from '../api';

export type StatusFilter = 'all' | 'open' | 'merged' | 'closed';

/**
 * Diagnoses why a PR scored zero. Returns a human-readable reason
 * or null if the score is non-zero.
 */
export const getZeroScoreReason = (
  pr: CommitLog,
): string | null => {
  const score = parseFloat(pr.score || '0');
  if (score !== 0) return null;

  // Closed without merge
  if (pr.prState === 'CLOSED' && !pr.mergedAt) {
    return 'Closed without merge \u2014 no score awarded';
  }

  // Open PR
  if (!pr.mergedAt && pr.prState !== 'CLOSED') {
    const hasCollateral =
      pr.collateralScore &&
      parseFloat(pr.collateralScore) > 0;
    return hasCollateral
      ? 'Open \u2014 score awarded after merge. Collateral is being deducted while open.'
      : 'Open \u2014 score awarded after merge';
  }

  // Merged but zero score — diagnose why
  if (pr.mergedAt) {
    if (
      pr.tokenScore !== undefined &&
      pr.tokenScore === 0
    ) {
      return 'Zero token score \u2014 likely test/doc-only files (0.05x weight)';
    }

    if (
      pr.credibilityScalar !== undefined &&
      pr.credibilityScalar < 0.01
    ) {
      return 'Credibility multiplier too low at this tier';
    }

    if (pr.tier === null) {
      return 'Repository tier not tracked';
    }

    return 'Score reduced by penalties \u2014 check Score Breakdown tab';
  }

  return null;
};

export const TIER_LEVELS: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

export const getTierLevel = (
  tier: string | undefined | null,
): number => {
  if (!tier) return 0;
  return TIER_LEVELS[tier.toLowerCase()] || 0;
};

export const calculateDynamicThreshold = (
  currentTier: string | undefined | null,
  bronzeTokenScore: number | string,
  silverTokenScore: number | string,
  goldTokenScore: number | string,
  prScoring?: {
    excessivePrPenaltyThreshold?: number;
    openPrThresholdTokenScore?: number;
    maxOpenPrThreshold?: number;
  },
): number => {
  const baseThreshold =
    prScoring?.excessivePrPenaltyThreshold ?? 10;
  const tokenScorePer =
    prScoring?.openPrThresholdTokenScore ?? 500;
  const maxThreshold = prScoring?.maxOpenPrThreshold ?? 30;

  const currentTierLevel = getTierLevel(currentTier);

  let unlockedTokenScore = 0;
  if (currentTierLevel >= 1)
    unlockedTokenScore += Number(bronzeTokenScore || 0);
  if (currentTierLevel >= 2)
    unlockedTokenScore += Number(silverTokenScore || 0);
  if (currentTierLevel >= 3)
    unlockedTokenScore += Number(goldTokenScore || 0);

  const bonus = Math.floor(unlockedTokenScore / tokenScorePer);
  return Math.min(baseThreshold + bonus, maxThreshold);
};

export const getTierColor = (tier: string): string => {
  switch (tier?.toLowerCase()) {
    case 'gold':
      return TIER_COLORS.gold;
    case 'silver':
      return TIER_COLORS.silver;
    case 'bronze':
      return TIER_COLORS.bronze;
    default:
      return 'transparent';
  }
};

export const matchesStatus = (
  prState: string | undefined | null,
  mergedAt: string | undefined | null,
  filter: StatusFilter,
): boolean => {
  if (filter === 'all') return true;
  if (filter === 'open')
    return prState === 'OPEN' || (!prState && !mergedAt);
  if (filter === 'merged')
    return !!mergedAt || prState === 'MERGED';
  if (filter === 'closed')
    return prState === 'CLOSED' && !mergedAt;
  return true;
};

export const formatTimeAgo = (
  date: Date,
  now: Date = new Date(),
): string => {
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) {
    const mins = diffMins % 60;
    return mins > 0
      ? `${diffHours}h ${mins}m ago`
      : `${diffHours}h ago`;
  }
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};

export const getOpenPrColor = (
  openPrs: number,
  threshold: number,
): string | undefined => {
  if (openPrs >= threshold) return 'rgba(248, 113, 113, 0.9)';
  if (openPrs >= threshold - 1)
    return 'rgba(251, 146, 60, 0.9)';
  if (openPrs >= threshold - 2)
    return 'rgba(250, 204, 21, 0.9)';
  return undefined;
};
