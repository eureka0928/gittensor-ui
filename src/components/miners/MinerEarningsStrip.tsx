import React, { useState, useMemo } from 'react';
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
import {
  TIER_COLORS,
  STATUS_COLORS,
  TEXT_OPACITY,
} from '../../theme';
import {
  calculateDynamicThreshold,
  getOpenPrColor,
  getTierLevel,
} from '../../utils';
import { tooltipSlotProps } from './TierComponents';

type DisplayMode = 'usd' | 'tao' | 'alpha';

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
  const [displayMode, setDisplayMode] = useState<DisplayMode>('usd');
  const currentTierLevel = getTierLevel(minerStats.currentTier);

  const openPrThreshold = calculateDynamicThreshold(
    minerStats.currentTier,
    minerStats.bronzeTokenScore || 0,
    minerStats.silverTokenScore || 0,
    minerStats.goldTokenScore || 0,
    prScoring,
  );

  const openRiskTooltip = useMemo(() => {
    const base = prScoring?.excessivePrPenaltyThreshold ?? 10;
    const tokenScorePer =
      prScoring?.openPrThresholdTokenScore ?? 500;
    const tiers: { name: string; score: number; unlocked: boolean }[] =
      [
        {
          name: 'Bronze',
          score: Number(minerStats.bronzeTokenScore || 0),
          unlocked: currentTierLevel >= 1,
        },
        {
          name: 'Silver',
          score: Number(minerStats.silverTokenScore || 0),
          unlocked: currentTierLevel >= 2,
        },
        {
          name: 'Gold',
          score: Number(minerStats.goldTokenScore || 0),
          unlocked: currentTierLevel >= 3,
        },
      ];

    const unlockedTotal = tiers
      .filter((t) => t.unlocked)
      .reduce((s, t) => s + t.score, 0);
    const bonus = Math.floor(unlockedTotal / tokenScorePer);

    const lines = [`Base threshold: ${base}`];
    tiers.forEach((t) => {
      if (t.score > 0 || t.unlocked) {
        const status = t.unlocked
          ? `+${Math.round(t.score)}`
          : `${Math.round(t.score)} (locked)`;
        lines.push(`${t.name}: ${status}`);
      }
    });
    if (bonus > 0) {
      lines.push(
        `Bonus: +${bonus} (${Math.round(unlockedTotal)} / ${tokenScorePer})`,
      );
    }
    const lockedTier = tiers.find(
      (t) => !t.unlocked && t.score > 0,
    );
    if (lockedTier) {
      lines.push(
        `Unlock ${lockedTier.name} to raise your threshold.`,
      );
    }
    return lines.join('\n');
  }, [minerStats, prScoring, currentTierLevel]);

  const scoreRank = useMemo(() => {
    if (!allMinersStats) return null;
    return (
      allMinersStats
        .slice()
        .sort((a, b) => Number(b.totalScore) - Number(a.totalScore))
        .findIndex((m) => m.githubId === minerStats.githubId) + 1 ||
      null
    );
  }, [allMinersStats, minerStats.githubId]);

  const openPrs = Number(minerStats.totalOpenPrs || 0);
  const openPrColor = getOpenPrColor(openPrs, openPrThreshold);
  const collateral = Number(minerStats.totalCollateralScore || 0);
  const credibility = Number(minerStats.credibility || 0);
  const dailyUsd = minerStats.usdPerDay ?? 0;
  const dailyTao = minerStats.taoPerDay ?? 0;
  const dailyAlpha = minerStats.alphaPerDay ?? 0;
  const lifetimeUsd = minerStats.lifetimeUsd ?? 0;
  const lifetimeTao = minerStats.lifetimeTao ?? 0;
  const lifetimeAlpha = minerStats.lifetimeAlpha ?? 0;
  const monthlyUsd = dailyUsd * 30;
  const isEarning = dailyUsd > 0 || dailyTao > 0;

  const heroValue = useMemo(() => {
    switch (displayMode) {
      case 'tao':
        return `${dailyTao.toFixed(4)} TAO`;
      case 'alpha':
        return `${dailyAlpha.toFixed(4)} \u03B1`;
      default:
        return `$${Math.round(dailyUsd).toLocaleString()}`;
    }
  }, [displayMode, dailyUsd, dailyTao, dailyAlpha]);

  const heroSubtext = useMemo(() => {
    if (displayMode !== 'usd') return null;
    return `${dailyTao.toFixed(4)} TAO \u00B7 ${dailyAlpha.toFixed(4)} \u03B1`;
  }, [displayMode, dailyTao, dailyAlpha]);

  const lifetimeValue = useMemo(() => {
    switch (displayMode) {
      case 'tao':
        return `${lifetimeTao.toFixed(2)} TAO`;
      case 'alpha':
        return `${lifetimeAlpha.toFixed(2)} \u03B1`;
      default:
        return `$${Math.round(lifetimeUsd).toLocaleString()}`;
    }
  }, [displayMode, lifetimeUsd, lifetimeTao, lifetimeAlpha]);

  const lifetimeSubtext = useMemo(() => {
    if (displayMode !== 'usd') return null;
    return `${lifetimeTao.toFixed(2)} TAO \u00B7 ${lifetimeAlpha.toFixed(2)} \u03B1`;
  }, [displayMode, lifetimeTao, lifetimeAlpha]);

  const credibilityColor =
    credibility >= 0.9
      ? STATUS_COLORS.success
      : credibility >= 0.7
        ? '#a3e635'
        : credibility >= 0.5
          ? '#facc15'
          : credibility >= 0.3
            ? '#fb923c'
            : '#f87171';

  const rankBadgeColor = scoreRank
    ? scoreRank === 1
      ? TIER_COLORS.gold
      : scoreRank === 2
        ? TIER_COLORS.silver
        : scoreRank === 3
          ? TIER_COLORS.bronze
          : 'rgba(255, 255, 255, 0.5)'
    : undefined;

  const secondaryItems = [
    {
      label: 'Lifetime',
      value: lifetimeValue,
      subtext: lifetimeSubtext,
    },
    {
      label: 'Score',
      value: Number(minerStats.totalScore).toFixed(2),
      suffix: scoreRank
        ? `#${scoreRank}/${allMinersStats?.length ?? '?'}`
        : undefined,
      suffixColor: rankBadgeColor,
    },
    {
      label: 'Credibility',
      value: `${(credibility * 100).toFixed(1)}%`,
      color: credibilityColor,
      tooltip: `Ratio of merged PRs to total attempts.\n${minerStats.totalMergedPrs ?? 0} merged / ${(minerStats.totalMergedPrs ?? 0) + (minerStats.totalClosedPrs ?? 0)} total`,
    },
    {
      label: 'Open Risk',
      value: `${openPrs}/${openPrThreshold}`,
      color: openPrColor,
      subValue:
        collateral > 0 ? `-${collateral.toFixed(2)}` : undefined,
      subColor:
        collateral > 0 ? 'rgba(248, 113, 113, 0.8)' : undefined,
      tooltip: openRiskTooltip,
    },
  ];

  const modeOptions: { key: DisplayMode; label: string }[] = [
    { key: 'usd', label: 'USD' },
    { key: 'tao', label: 'TAO' },
    { key: 'alpha', label: '\u03B1' },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 1.5, md: 2 },
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'transparent',
        p: { xs: 1.5, sm: 2 },
        '@keyframes fadeSlideUp': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {/* Hero Zone — "Your Earnings" */}
      <Box
        sx={{
          flex: { md: '0 0 35%' },
          backgroundColor: isEarning
            ? alpha(STATUS_COLORS.success, 0.05)
            : 'rgba(255, 255, 255, 0.03)',
          borderRadius: 2,
          border: '1px solid',
          borderColor: isEarning
            ? alpha(STATUS_COLORS.success, 0.2)
            : 'rgba(255, 255, 255, 0.08)',
          px: { xs: 2, md: 2.5 },
          py: { xs: 2, md: 2.5 },
          position: 'relative',
          overflow: 'hidden',
          ...(isEarning && {
            boxShadow: `0 0 20px ${alpha(STATUS_COLORS.success, 0.12)}, 0 0 40px ${alpha(STATUS_COLORS.success, 0.05)}`,
          }),
          animation: 'fadeSlideUp 0.4s ease-out',
        }}
      >
        {/* Ambient glow */}
        {isEarning && (
          <Box
            sx={{
              position: 'absolute',
              top: -30,
              right: -30,
              width: 100,
              height: 100,
              backgroundColor: alpha(STATUS_COLORS.success, 0.15),
              borderRadius: '50%',
              filter: 'blur(25px)',
              zIndex: 0,
            }}
          />
        )}

        {/* Token toggle + Rank badge */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: { xs: 'center', md: 'space-between' },
            alignItems: 'center',
            gap: 1,
            mb: 1.5,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Typography
            variant="monoSmall"
            sx={{
              color: alpha(STATUS_COLORS.success, 0.8),
              display: { xs: 'none', md: 'block' },
            }}
          >
            Daily Earnings
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Token toggle pills */}
            <Box
              sx={{
                display: 'flex',
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.08)',
                overflow: 'hidden',
                mr: scoreRank ? 1.5 : 0,
              }}
            >
              {modeOptions.map((opt, i) => (
                <Box
                  key={opt.key}
                  onClick={() => setDisplayMode(opt.key)}
                  sx={{
                    px: 1.25,
                    py: 0.5,
                    cursor: 'pointer',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    color:
                      displayMode === opt.key
                        ? '#ffffff'
                        : 'rgba(255,255,255,0.4)',
                    backgroundColor:
                      displayMode === opt.key
                        ? 'rgba(255,255,255,0.1)'
                        : 'transparent',
                    borderLeft:
                      i > 0
                        ? '1px solid rgba(255,255,255,0.06)'
                        : 'none',
                    transition: 'all 0.2s',
                    '&:hover': {
                      color: '#ffffff',
                      backgroundColor:
                        'rgba(255,255,255,0.06)',
                    },
                  }}
                >
                  {opt.label}
                </Box>
              ))}
            </Box>

            {/* Rank badge */}
            {scoreRank && (
              <Box
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: rankBadgeColor,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  px: 1,
                  py: 0.25,
                  borderRadius: '6px',
                  border: `1px solid ${alpha(
                    rankBadgeColor || 'rgba(255,255,255,0.2)',
                    0.3,
                  )}`,
                  ...(scoreRank <= 3 && {
                    boxShadow: `0 0 8px ${alpha(
                      rankBadgeColor || '#fff',
                      0.4,
                    )}`,
                  }),
                }}
              >
                #{scoreRank}
              </Box>
            )}
          </Box>
        </Box>

        {/* Hero value */}
        <Typography
          sx={{
            color: isEarning
              ? STATUS_COLORS.success
              : 'rgba(255,255,255,0.5)',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: { xs: '1.8rem', md: '2.25rem' },
            fontWeight: 700,
            lineHeight: 1.1,
            position: 'relative',
            zIndex: 1,
            textAlign: { xs: 'center', md: 'left' },
          }}
        >
          {heroValue}
        </Typography>

        {/* TAO + Alpha subtext */}
        {heroSubtext && (
          <Typography
            variant="monoSmall"
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              mt: 0.5,
              position: 'relative',
              zIndex: 1,
              fontSize: '0.8rem',
              textAlign: { xs: 'center', md: 'left' },
            }}
          >
            {heroSubtext}
          </Typography>
        )}

        {/* Monthly projection */}
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.85rem',
            color: `rgba(255, 255, 255, ${TEXT_OPACITY.tertiary})`,
            mt: 1,
            position: 'relative',
            zIndex: 1,
            textAlign: { xs: 'center', md: 'left' },
          }}
        >
          {displayMode === 'tao'
            ? `~${(dailyTao * 30).toFixed(2)} TAO/mo`
            : displayMode === 'alpha'
              ? `~${(dailyAlpha * 30).toFixed(2)} \u03B1/mo`
              : `~$${Math.round(monthlyUsd).toLocaleString()}/mo`}
        </Typography>
      </Box>

      {/* Secondary Stats Zone */}
      <Box
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(4, 1fr)',
          },
          gap: { xs: 1, sm: 1.5 },
        }}
      >
        {secondaryItems.map((item, idx) => {
          const content = (
            <Box
              key={item.label}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                px: { xs: 1.25, sm: 2.5 },
                py: { xs: 1.25, sm: 2 },
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
                animation: 'fadeSlideUp 0.4s ease-out',
                animationDelay: `${idx * 60}ms`,
                animationFillMode: 'backwards',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px ${alpha(
                    item.color || 'rgba(255,255,255,0.1)',
                    0.15,
                  )}`,
                },
              }}
            >
              <Typography
                variant="monoSmall"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
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
                    fontSize: {
                      xs: '1.25rem',
                      sm: '1.5rem',
                    },
                    fontWeight: 700,
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
                      fontWeight: 700,
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
              {item.subtext && (
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.8rem',
                    color: 'rgba(255, 255, 255, 0.4)',
                  }}
                >
                  {item.subtext}
                </Typography>
              )}
              {item.subValue && (
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.85rem',
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

          return content;
        })}
      </Box>
    </Box>
  );
};

export default MinerEarningsStrip;
