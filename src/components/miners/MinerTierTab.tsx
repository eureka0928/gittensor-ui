import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  alpha,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  type MinerEvaluation,
  type TierConfig,
} from '../../api';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';
import { getTierLevel } from '../../utils';
import MinerTierPerformance from './MinerTierPerformance';

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
  const currentTierLevel = getTierLevel(minerStats.currentTier);

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

  const getSequentialUnlockMessage = () => {
    if (currentTierLevel === 0) {
      return 'Tiers unlock in order: Candidate \u2192 Bronze \u2192 Silver \u2192 Gold. Meet all Bronze requirements first.';
    }
    if (currentTierLevel === 1) {
      return 'Silver must be unlocked before Gold. PRs to Gold repos earn 0 score until Silver is unlocked.';
    }
    if (currentTierLevel === 2) {
      return 'Unlock Gold by meeting its requirements. Gold PRs score at 0 until unlocked.';
    }
    return null;
  };

  const sequentialMsg = getSequentialUnlockMessage();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Sequential Unlock Info */}
      {sequentialMsg && (
        <Box
          sx={{
            borderRadius: 2,
            border: `1px solid ${alpha(STATUS_COLORS.info, 0.3)}`,
            backgroundColor: alpha(STATUS_COLORS.info, 0.04),
            p: { xs: 1.5, sm: 2 },
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
        >
          <InfoOutlinedIcon
            sx={{
              color: STATUS_COLORS.info,
              fontSize: '1.1rem',
              mt: 0.25,
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: { xs: '0.75rem', sm: '0.8rem' },
              color: 'rgba(255, 255, 255, 0.7)',
              lineHeight: 1.5,
            }}
          >
            {sequentialMsg}
          </Typography>
        </Box>
      )}

      {/* Next Milestone Callout */}
      {nextMilestone && (
        <Box
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: alpha(nextMilestone.tierColor, 0.3),
            backgroundColor: alpha(nextMilestone.tierColor, 0.04),
            p: { xs: 1.5, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: nextMilestone.tierColor,
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${nextMilestone.tierColor}`,
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.4 },
                  },
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: { xs: '0.8rem', sm: '0.85rem' },
                  fontWeight: 700,
                  color: nextMilestone.tierColor,
                }}
              >
                Next: {nextMilestone.tierName} Tier
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
              {nextMilestone.remaining > 1 ? 's' : ''} left
            </Typography>
          </Box>

          {/* Progress bar for closest requirement */}
          <Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mb: 0.5,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.72rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                }}
              >
                {nextMilestone.closest.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.72rem',
                  color: '#ffffff',
                }}
              >
                {String(nextMilestone.closest.current)}{' '}
                <Box
                  component="span"
                  sx={{ color: 'rgba(255, 255, 255, 0.4)' }}
                >
                  / {String(nextMilestone.closest.required)}
                </Box>
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={nextMilestone.closest.progress}
              sx={{
                height: 5,
                borderRadius: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: nextMilestone.tierColor,
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        </Box>
      )}

      {/* Existing Tier Performance */}
      <MinerTierPerformance githubId={githubId} />
    </Box>
  );
};

export default MinerTierTab;
