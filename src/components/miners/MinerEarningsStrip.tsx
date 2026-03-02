import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Tooltip,
  alpha,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  type MinerEvaluation,
  type RepositoryPrScoring,
} from '../../api';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';

const TIER_LEVELS: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

const calculateDynamicThreshold = (
  minerStats: MinerEvaluation,
  prScoring: RepositoryPrScoring | undefined,
): number => {
  const baseThreshold =
    prScoring?.excessivePrPenaltyThreshold ?? 10;
  const tokenScorePer = prScoring?.openPrThresholdTokenScore ?? 500;
  const maxThreshold = prScoring?.maxOpenPrThreshold ?? 30;

  const currentTierLevel =
    TIER_LEVELS[(minerStats.currentTier || '').toLowerCase()] || 0;

  let unlockedTokenScore = 0;
  if (currentTierLevel >= 1)
    unlockedTokenScore += Number(minerStats.bronzeTokenScore || 0);
  if (currentTierLevel >= 2)
    unlockedTokenScore += Number(minerStats.silverTokenScore || 0);
  if (currentTierLevel >= 3)
    unlockedTokenScore += Number(minerStats.goldTokenScore || 0);

  const bonus = Math.floor(unlockedTokenScore / tokenScorePer);
  return Math.min(baseThreshold + bonus, maxThreshold);
};

const tooltipSlotProps = {
  tooltip: {
    sx: {
      backgroundColor: 'rgba(30, 30, 30, 0.95)',
      color: '#ffffff',
      fontSize: '0.75rem',
      fontFamily: '"JetBrains Mono", monospace',
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      maxWidth: 240,
    },
  },
  arrow: {
    sx: {
      color: 'rgba(30, 30, 30, 0.95)',
    },
  },
};

interface MinerEarningsStripProps {
  minerStats: MinerEvaluation;
  allMinersStats?: MinerEvaluation[];
  prScoring?: RepositoryPrScoring;
}

const MinerEarningsStrip: React.FC<MinerEarningsStripProps> = ({
  minerStats,
  allMinersStats,
  prScoring,
}) => {
  const openPrThreshold = calculateDynamicThreshold(
    minerStats,
    prScoring,
  );

  const scoreRank = useMemo(() => {
    if (!allMinersStats) return null;
    return (
      allMinersStats
        .slice()
        .sort((a, b) => Number(b.totalScore) - Number(a.totalScore))
        .findIndex((m) => m.githubId === minerStats.githubId) + 1 || null
    );
  }, [allMinersStats, minerStats.githubId]);

  const getOpenPrColor = (openPrs: number, threshold: number) => {
    if (openPrs >= threshold) return 'rgba(248, 113, 113, 0.9)';
    if (openPrs >= threshold - 1)
      return 'rgba(251, 146, 60, 0.9)';
    if (openPrs >= threshold - 2)
      return 'rgba(250, 204, 21, 0.9)';
    return undefined;
  };

  const openPrs = Number(minerStats.totalOpenPrs || 0);
  const openPrColor = getOpenPrColor(openPrs, openPrThreshold);
  const collateral = Number(minerStats.totalCollateralScore || 0);
  const credibility = Number(minerStats.credibility || 0);
  const dailyUsd = minerStats.usdPerDay ?? 0;
  const monthlyUsd = dailyUsd * 30;
  const lifetimeUsd = minerStats.lifetimeUsd ?? 0;

  const items = [
    {
      label: 'Daily',
      value: `$${Math.round(dailyUsd).toLocaleString()}`,
      color: dailyUsd > 0 ? STATUS_COLORS.success : undefined,
    },
    {
      label: 'Monthly',
      value: `$${Math.round(monthlyUsd).toLocaleString()}`,
      color: dailyUsd > 0 ? STATUS_COLORS.success : undefined,
    },
    {
      label: 'Lifetime',
      value: `$${Math.round(lifetimeUsd).toLocaleString()}`,
    },
    {
      label: 'Score',
      value: Number(minerStats.totalScore).toFixed(2),
      suffix: scoreRank ? `#${scoreRank}` : undefined,
      suffixColor: scoreRank
        ? scoreRank === 1
          ? TIER_COLORS.gold
          : scoreRank === 2
            ? TIER_COLORS.silver
            : scoreRank === 3
              ? TIER_COLORS.bronze
              : 'rgba(255, 255, 255, 0.5)'
        : undefined,
    },
    {
      label: 'Credibility',
      value: `${(credibility * 100).toFixed(1)}%`,
      color:
        credibility >= 0.9
          ? STATUS_COLORS.success
          : credibility >= 0.7
            ? '#a3e635'
            : credibility >= 0.5
              ? '#facc15'
              : credibility >= 0.3
                ? '#fb923c'
                : '#f87171',
      tooltip:
        'Ratio of merged PRs to total attempts (merged + closed).',
    },
    {
      label: 'Open Risk',
      value: `${openPrs}/${openPrThreshold}`,
      color: openPrColor,
      subValue:
        collateral > 0 ? `-${collateral.toFixed(2)}` : undefined,
      subColor:
        collateral > 0 ? 'rgba(248, 113, 113, 0.8)' : undefined,
      tooltip: `Open PRs incur collateral. Exceeding ${openPrThreshold} triggers full penalty.`,
    },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: { xs: 1, sm: 1.5 },
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'transparent',
        p: { xs: 1.5, sm: 2 },
      }}
    >
      {items.map((item) => {
        const content = (
          <Box
            sx={{
              flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 0' },
              minWidth: { xs: 'auto', sm: 100 },
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 2,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              px: 2,
              py: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: item.tooltip ? 'pointer' : 'default',
              }}
            >
              {item.label}
              {item.tooltip && (
                <InfoOutlinedIcon sx={{ fontSize: '0.75rem' }} />
              )}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  color: item.color || '#ffffff',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                {item.value}
              </Typography>
              {item.suffix && (
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color:
                      item.suffixColor ||
                      'rgba(255, 255, 255, 0.5)',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    px: 0.75,
                    py: 0.25,
                    borderRadius: '4px',
                    border: `1px solid ${alpha(
                      item.suffixColor ||
                        'rgba(255,255,255,0.2)',
                      0.3,
                    )}`,
                  }}
                >
                  {item.suffix}
                </Typography>
              )}
            </Box>
            {item.subValue && (
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.7rem',
                  color:
                    item.subColor ||
                    'rgba(255, 255, 255, 0.5)',
                }}
              >
                Collateral: {item.subValue}
              </Typography>
            )}
          </Box>
        );

        if (item.tooltip) {
          return (
            <Tooltip
              key={item.label}
              title={item.tooltip}
              arrow
              placement="top"
              slotProps={tooltipSlotProps}
            >
              {content}
            </Tooltip>
          );
        }

        return (
          <React.Fragment key={item.label}>
            {content}
          </React.Fragment>
        );
      })}
    </Box>
  );
};

export default MinerEarningsStrip;
