import React from 'react';
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  alpha,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  useMinerStats,
  useTierConfigurations,
  type TierConfig,
} from '../../api';
import { TierCard } from './TierComponents';
import { TIER_COLORS } from '../../theme';
import { getTierLevel } from '../../utils';

const getTierConfig = (
  tierName: string,
  tierConfigs: TierConfig[] | undefined,
): TierConfig | undefined =>
  tierConfigs?.find((t) => t.name.toLowerCase() === tierName.toLowerCase());

const getPreviousTierName = (level: number): string => {
  const tierNames = ['', 'Bronze', 'Silver', 'Gold'];
  return tierNames[level - 1] || '';
};

const getTooltipMessage = (
  tierName: string,
  tierLevel: number,
  isNextTier: boolean,
  config: TierConfig | undefined,
): string => {
  if (isNextTier) {
    if (!config) {
      return `${tierName} tier unlock in progress. Continue contributing to ${tierName} tier repos to unlock this tier.`;
    }
    const reqQualifiedRepos =
      config.requiredQualifiedUniqueRepos;
    const reqTokenScorePerRepo =
      config.requiredMinTokenScorePerRepo;
    const reqCred = (
      config.requiredCredibility * 100
    ).toFixed(0);
    const reqTokenScore = config.requiredMinTokenScore;
    const tokenScoreReq = reqTokenScore
      ? ` with ${reqTokenScore}+ total token score and`
      : '';
    return `${tierName} tier unlock in progress. Requires${tokenScoreReq} ${reqQualifiedRepos} qualified repos (each with ${reqTokenScorePerRepo}+ token score) and ${reqCred}%+ credibility.`;
  }

  const prevTier = getPreviousTierName(tierLevel);
  return `${tierName} is locked \u2014 PRs to ${tierName} repos earn 0 score. Unlock ${prevTier} first. Tiers must be unlocked in order: Bronze \u2192 Silver \u2192 Gold.`;
};

interface MinerTierPerformanceProps {
  githubId: string;
}

const MinerTierPerformance: React.FC<MinerTierPerformanceProps> = ({
  githubId,
}) => {
  const navigate = useNavigate();
  const { data: minerStats, isLoading, error } = useMinerStats(githubId);
  const { data: tierConfigData } = useTierConfigurations();

  const handleTierClick = (tierName: string) => {
    navigate(
      `/miners/tier-details?githubId=${encodeURIComponent(githubId)}&tier=${encodeURIComponent(tierName)}`,
      { state: { backLabel: 'Back to Miner' } },
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={30} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (error || !minerStats) {
    return null; // Don't show anything if no data
  }

  const tierConfigs = tierConfigData?.tiers;
  const currentTierLevel = getTierLevel(minerStats.currentTier);

  const tiers = [
    {
      name: 'Bronze',
      level: 1,
      color: TIER_COLORS.bronze,
      bgColor: alpha(TIER_COLORS.bronze, 0.05),
      borderColor: alpha(TIER_COLORS.bronze, 0.4),
      stats: {
        score: minerStats.bronzeScore,
        credibility: minerStats.bronzeCredibility,
        merged: minerStats.bronzeMergedPrs,
        closed: minerStats.bronzeClosedPrs,
        total: minerStats.bronzeTotalPrs,
        collateral: minerStats.bronzeCollateralScore,
        uniqueRepos: minerStats.bronzeUniqueRepos,
        qualifiedUniqueRepos: minerStats.bronzeQualifiedUniqueRepos,
        tokenScore: minerStats.bronzeTokenScore,
      },
    },
    {
      name: 'Silver',
      level: 2,
      color: TIER_COLORS.silver,
      bgColor: alpha(TIER_COLORS.silver, 0.05),
      borderColor: alpha(TIER_COLORS.silver, 0.4),
      stats: {
        score: minerStats.silverScore,
        credibility: minerStats.silverCredibility,
        merged: minerStats.silverMergedPrs,
        closed: minerStats.silverClosedPrs,
        total: minerStats.silverTotalPrs,
        collateral: minerStats.silverCollateralScore,
        uniqueRepos: minerStats.silverUniqueRepos,
        qualifiedUniqueRepos: minerStats.silverQualifiedUniqueRepos,
        tokenScore: minerStats.silverTokenScore,
      },
    },
    {
      name: 'Gold',
      level: 3,
      color: TIER_COLORS.gold,
      bgColor: alpha(TIER_COLORS.gold, 0.05),
      borderColor: alpha(TIER_COLORS.gold, 0.4),
      stats: {
        score: minerStats.goldScore,
        credibility: minerStats.goldCredibility,
        merged: minerStats.goldMergedPrs,
        closed: minerStats.goldClosedPrs,
        total: minerStats.goldTotalPrs,
        collateral: minerStats.goldCollateralScore,
        uniqueRepos: minerStats.goldUniqueRepos,
        qualifiedUniqueRepos: minerStats.goldQualifiedUniqueRepos,
        tokenScore: minerStats.goldTokenScore,
      },
    },
  ];

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        p: { xs: 2.5, sm: 3 },
      }}
    >
      <Typography
        variant="sectionTitle"
        component="p"
        sx={{ mb: 3 }}
      >
        Tier Performance
      </Typography>

      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        {tiers.map((tier) => {
          const isLocked = tier.level > currentTierLevel;
          const isNextTier = tier.level === currentTierLevel + 1;
          const config = getTierConfig(tier.name, tierConfigs);

          // Calculate progress towards unlocking this tier
          const tokenScore = tier.stats.tokenScore || 0;
          const qualifiedReposCount = tier.stats.qualifiedUniqueRepos || 0;
          const credibility = tier.stats.credibility || 0;
          const requiredTokenScore = config?.requiredMinTokenScore ?? null;
          const requiredQualifiedRepos =
            config?.requiredQualifiedUniqueRepos || 3;
          const requiredCredibility = config?.requiredCredibility || 0.7;

          const tokenScoreProgress = requiredTokenScore
            ? Math.min((tokenScore / requiredTokenScore) * 100, 100)
            : 100;
          const qualifiedReposProgress = Math.min(
            (qualifiedReposCount / requiredQualifiedRepos) * 100,
            100,
          );
          const credibilityProgress = Math.min(
            (credibility / requiredCredibility) * 100,
            100,
          );

          const unlockProgress =
            (isNextTier || !isLocked) && config
              ? {
                  tokenScore,
                  requiredTokenScore,
                  tokenScoreProgress,
                  qualifiedReposCount,
                  requiredQualifiedRepos,
                  qualifiedReposProgress,
                  credibility,
                  requiredCredibility,
                  credibilityProgress,
                }
              : undefined;

          return (
            <Grid item xs={12} md={4} key={tier.name}>
              <Box
                onClick={() => handleTierClick(tier.name)}
                sx={{
                  cursor: 'pointer',
                  height: '100%',
                  '&:hover': { opacity: 0.95 },
                }}
              >
                <TierCard
                  name={tier.name}
                  color={tier.color}
                  bgColor={tier.bgColor}
                  borderColor={tier.borderColor}
                  stats={tier.stats}
                  isLocked={isLocked}
                  isNextTier={isNextTier}
                  tooltipMessage={
                    isLocked
                      ? getTooltipMessage(
                          tier.name,
                          tier.level,
                          isNextTier,
                          config,
                        )
                      : undefined
                  }
                  unlockProgress={unlockProgress}
                />
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default MinerTierPerformance;
