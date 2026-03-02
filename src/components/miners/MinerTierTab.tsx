import React from 'react';
import {
  Box,
  Typography,
  alpha,
} from '@mui/material';
import {
  type MinerEvaluation,
  type TierConfig,
} from '../../api';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';
import MinerTierPerformance from './MinerTierPerformance';

const TIER_LEVELS: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

interface MinerTierTabProps {
  githubId: string;
  minerStats: MinerEvaluation;
  tierConfigs?: TierConfig[];
}

const MinerTierTab: React.FC<MinerTierTabProps> = ({
  githubId,
  minerStats,
  tierConfigs,
}) => {
  const currentTierLevel =
    TIER_LEVELS[(minerStats.currentTier || '').toLowerCase()] || 0;

  // Find next milestone
  const getNextMilestone = () => {
    if (currentTierLevel >= 3) return null; // Already gold

    const nextTierName =
      currentTierLevel === 0
        ? 'Bronze'
        : currentTierLevel === 1
          ? 'Silver'
          : 'Gold';
    const nextTierConfig = tierConfigs?.find(
      (c) => c.name.toLowerCase() === nextTierName.toLowerCase(),
    );
    if (!nextTierConfig) return null;

    const tierKey = nextTierName.toLowerCase() as
      | 'bronze'
      | 'silver'
      | 'gold';
    const qualifiedRepos =
      (minerStats[
        `${tierKey}QualifiedUniqueRepos` as keyof MinerEvaluation
      ] as number) || 0;
    const credibility =
      (minerStats[
        `${tierKey}Credibility` as keyof MinerEvaluation
      ] as number) || 0;
    const tokenScore =
      (minerStats[
        `${tierKey}TokenScore` as keyof MinerEvaluation
      ] as number) || 0;

    const requirements = [];

    if (
      nextTierConfig.requiredMinTokenScore &&
      tokenScore < nextTierConfig.requiredMinTokenScore
    ) {
      requirements.push({
        label: 'Token Score',
        current: Math.round(tokenScore),
        required: nextTierConfig.requiredMinTokenScore,
        progress: Math.min(
          (tokenScore / nextTierConfig.requiredMinTokenScore) * 100,
          100,
        ),
      });
    }

    if (
      qualifiedRepos <
      nextTierConfig.requiredQualifiedUniqueRepos
    ) {
      requirements.push({
        label: 'Qualified Repos',
        current: qualifiedRepos,
        required: nextTierConfig.requiredQualifiedUniqueRepos,
        progress: Math.min(
          (qualifiedRepos /
            nextTierConfig.requiredQualifiedUniqueRepos) *
            100,
          100,
        ),
      });
    }

    if (credibility < nextTierConfig.requiredCredibility) {
      requirements.push({
        label: 'Credibility',
        current: `${(credibility * 100).toFixed(0)}%`,
        required: `${(nextTierConfig.requiredCredibility * 100).toFixed(0)}%`,
        progress: Math.min(
          (credibility / nextTierConfig.requiredCredibility) * 100,
          100,
        ),
      });
    }

    if (requirements.length === 0) return null;

    // Find the closest unmet requirement (highest progress)
    const closest = requirements.reduce((prev, curr) =>
      curr.progress > prev.progress ? curr : prev,
    );

    return {
      tierName: nextTierName,
      tierColor:
        TIER_COLORS[
          nextTierName.toLowerCase() as keyof typeof TIER_COLORS
        ],
      closest,
      remaining: requirements.length,
    };
  };

  const nextMilestone = getNextMilestone();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Next Milestone Callout */}
      {nextMilestone && (
        <Box
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: alpha(nextMilestone.tierColor, 0.3),
            backgroundColor: alpha(nextMilestone.tierColor, 0.05),
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: nextMilestone.tierColor,
              flexShrink: 0,
            }}
          />
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: nextMilestone.tierColor,
              }}
            >
              Next: {nextMilestone.tierName} Tier
            </Typography>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              Closest requirement:{' '}
              <Box
                component="span"
                sx={{ color: STATUS_COLORS.warning }}
              >
                {nextMilestone.closest.label}
              </Box>{' '}
              — {String(nextMilestone.closest.current)} /{' '}
              {String(nextMilestone.closest.required)} (
              {nextMilestone.closest.progress.toFixed(0)}%)
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.7rem',
              color: 'rgba(255, 255, 255, 0.4)',
            }}
          >
            {nextMilestone.remaining} requirement
            {nextMilestone.remaining > 1 ? 's' : ''} remaining
          </Typography>
        </Box>
      )}

      {/* Existing Tier Performance */}
      <MinerTierPerformance githubId={githubId} />
    </Box>
  );
};

export default MinerTierTab;
