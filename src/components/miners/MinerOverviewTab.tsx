import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  type MinerEvaluation,
  type CommitLog,
  type TierConfig,
  type RepositoryPrScoring,
} from '../../api';
import MinerInsights from './MinerInsights';
import { tooltipSlotProps } from './TierComponents';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';
import { getTierLevel, getZeroScoreReason, getTierColor } from '../../utils';

interface MinerOverviewTabProps {
  minerStats: MinerEvaluation;
  prs?: CommitLog[];
  tierConfigs?: TierConfig[];
  prScoring?: RepositoryPrScoring;
}

const MinerOverviewTab: React.FC<MinerOverviewTabProps> = ({
  minerStats,
  prs,
  tierConfigs,
  prScoring,
}) => {

  // Tier summary data
  const currentTierLevel = getTierLevel(minerStats.currentTier);

  const tierSummary = [
    {
      name: 'Bronze',
      level: 1,
      color: TIER_COLORS.bronze,
      score: Number(minerStats.bronzeScore || 0),
      unlocked: currentTierLevel >= 1,
    },
    {
      name: 'Silver',
      level: 2,
      color: TIER_COLORS.silver,
      score: Number(minerStats.silverScore || 0),
      unlocked: currentTierLevel >= 2,
    },
    {
      name: 'Gold',
      level: 3,
      color: TIER_COLORS.gold,
      score: Number(minerStats.goldScore || 0),
      unlocked: currentTierLevel >= 3,
    },
  ];

  // Next tier progress
  const nextTier = tierSummary.find((t) => t.level === currentTierLevel + 1);
  const nextTierConfig = nextTier
    ? tierConfigs?.find(
        (c) => c.name.toLowerCase() === nextTier.name.toLowerCase(),
      )
    : undefined;

  const getNextTierProgress = () => {
    if (!nextTier || !nextTierConfig) return null;
    const tierKey = nextTier.name.toLowerCase() as
      | 'bronze'
      | 'silver'
      | 'gold';
    const qualifiedRepos =
      minerStats[
        `${tierKey}QualifiedUniqueRepos` as keyof MinerEvaluation
      ] as number || 0;
    const credibility =
      minerStats[
        `${tierKey}Credibility` as keyof MinerEvaluation
      ] as number || 0;
    const tokenScore =
      minerStats[
        `${tierKey}TokenScore` as keyof MinerEvaluation
      ] as number || 0;

    const reqRepos = nextTierConfig.requiredQualifiedUniqueRepos;
    const reqCred = nextTierConfig.requiredCredibility;
    const reqToken = nextTierConfig.requiredMinTokenScore;

    const repoProgress = Math.min(
      (qualifiedRepos / reqRepos) * 100,
      100,
    );
    const credProgress = Math.min(
      (credibility / reqCred) * 100,
      100,
    );
    const tokenProgress = reqToken
      ? Math.min((tokenScore / reqToken) * 100, 100)
      : 100;

    return {
      overall: Math.min(
        (repoProgress + credProgress + tokenProgress) / 3,
        100,
      ),
    };
  };

  const nextTierProgress = getNextTierProgress();

  // Tier distribution
  const tierScores = tierSummary.map((t) => ({
    ...t,
    pct: 0,
  }));
  const totalScore = tierScores.reduce(
    (s, t) => s + t.score,
    0,
  );
  if (totalScore > 0) {
    tierScores.forEach(
      (t) => (t.pct = (t.score / totalScore) * 100),
    );
  }

  // Recent PRs (last 5 by date)
  const recentPRs = useMemo(() => {
    if (!prs || prs.length === 0) return [];
    return [...prs]
      .sort((a, b) => {
        const da = a.mergedAt || a.prCreatedAt || '';
        const db = b.mergedAt || b.prCreatedAt || '';
        return db.localeCompare(da);
      })
      .slice(0, 5);
  }, [prs]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Tier Summary Strip — at-a-glance tier status */}
      <Box
        sx={{
          display: 'flex',
          gap: { xs: 1, sm: 1.5 },
          flexWrap: 'wrap',
        }}
      >
        {tierSummary.map((tier) => (
          <Box
            key={tier.name}
            sx={{
              flex: { xs: '1 1 calc(33.33% - 8px)', sm: '1 1 0' },
              minWidth: { xs: 90, sm: 140 },
              backgroundColor: tier.unlocked
                ? alpha(tier.color, 0.06)
                : 'rgba(255, 255, 255, 0.02)',
              borderRadius: 2,
              border: '1px solid',
              borderColor: tier.unlocked
                ? alpha(tier.color, 0.3)
                : 'rgba(255, 255, 255, 0.08)',
              p: { xs: 1.25, sm: 2 },
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1.25, sm: 2 },
              opacity: tier.unlocked ? 1 : 0.5,
              transition: 'all 0.2s',
            }}
          >
            {/* Progress ring */}
            <Box sx={{ position: 'relative', display: { xs: 'none', sm: 'inline-flex' } }}>
              <CircularProgress
                variant="determinate"
                value={
                  tier.unlocked
                    ? 100
                    : nextTier?.name === tier.name &&
                        nextTierProgress
                      ? nextTierProgress.overall
                      : 0
                }
                size={40}
                thickness={3}
                sx={{
                  color: tier.unlocked
                    ? tier.color
                    : alpha(tier.color, 0.4),
                  '& .MuiCircularProgress-circle': {
                    strokeLinecap: 'round',
                  },
                }}
              />
              <CircularProgress
                variant="determinate"
                value={100}
                size={40}
                thickness={3}
                sx={{
                  color: 'rgba(255, 255, 255, 0.08)',
                  position: 'absolute',
                  left: 0,
                  zIndex: -1,
                }}
              />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                  fontWeight: 700,
                  color: tier.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {tier.name}
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: { xs: '0.85rem', sm: '0.95rem' },
                  fontWeight: 600,
                  color: '#ffffff',
                }}
              >
                {tier.score.toFixed(2)}
              </Typography>
              {!tier.unlocked &&
                nextTier?.name === tier.name && (
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.65rem',
                      color: STATUS_COLORS.warning,
                    }}
                  >
                    Unlocking...
                  </Typography>
                )}
            </Box>
          </Box>
        ))}
      </Box>


      {/* Smart Insights */}
      <MinerInsights
        minerStats={minerStats}
        prs={prs}
        prScoring={prScoring}
        tierConfigs={tierConfigs}
      />

      {/* Recent Activity Feed — Timeline */}
      {recentPRs.length > 0 && (
        <Box
          sx={{
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.015)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: { xs: 1.5, sm: 2.5 },
              py: { xs: 1.5, sm: 2 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
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
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: STATUS_COLORS.success,
                  boxShadow: `0 0 8px ${alpha(STATUS_COLORS.success, 0.5)}`,
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.4 },
                  },
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
              <Typography variant="sectionTitle">
                Recent Activity
              </Typography>
            </Box>
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                {recentPRs.length} latest
              </Typography>
            </Box>
          </Box>

          {/* Timeline container */}
          <Box sx={{ position: 'relative', pl: 0 }}>
            {/* Vertical timeline line — aligned with dots */}
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 1,
                background:
                  'linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.03))',
                display: { xs: 'none', sm: 'block' },
              }}
            />

            {recentPRs.map((pr, idx) => {
              const isMerged = !!pr.mergedAt;
              const isClosed =
                pr.prState === 'CLOSED' && !pr.mergedAt;
              const statusColor = isMerged
                ? STATUS_COLORS.merged
                : isClosed
                  ? STATUS_COLORS.closed
                  : STATUS_COLORS.open;
              const statusLabel = isMerged
                ? 'Merged'
                : isClosed
                  ? 'Closed'
                  : 'Open';
              const scoreVal = parseFloat(pr.score || '0');
              const zeroReason =
                scoreVal === 0 && isMerged
                  ? getZeroScoreReason(pr)
                  : null;
              const tierColor = pr.tier
                ? getTierColor(pr.tier)
                : null;
              const linesAdded = Number(pr.additions || 0);
              const linesDeleted = Number(pr.deletions || 0);
              const totalLines = linesAdded + linesDeleted;
              const addPct =
                totalLines > 0
                  ? (linesAdded / totalLines) * 100
                  : 50;
              const dateRef =
                pr.mergedAt || pr.prCreatedAt || '';
              const timeAgo = dateRef
                ? getRelativeTime(new Date(dateRef))
                : '';
              const isFirst = idx === 0;

              return (
                <Box
                  key={`${pr.repository}-${pr.pullRequestNumber}-${idx}`}
                  sx={{
                    display: 'flex',
                    gap: { xs: 1.5, sm: 2 },
                    px: { xs: 2, sm: 2.5 },
                    py: 1.75,
                    borderTop:
                      idx > 0
                        ? '1px solid rgba(255,255,255,0.04)'
                        : 'none',
                    position: 'relative',
                    '&:hover': {
                      backgroundColor:
                        'rgba(255,255,255,0.025)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Timeline dot */}
                  <Box
                    sx={{
                      display: { xs: 'none', sm: 'flex' },
                      flexDirection: 'column',
                      alignItems: 'center',
                      pt: 0.5,
                      flexShrink: 0,
                      width: 12,
                      zIndex: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: isFirst ? 10 : 8,
                        height: isFirst ? 10 : 8,
                        borderRadius: '50%',
                        backgroundColor: isFirst
                          ? statusColor
                          : alpha(statusColor, 0.4),
                        border: `2px solid ${alpha(statusColor, isFirst ? 0.6 : 0.2)}`,
                        boxShadow: isFirst
                          ? `0 0 10px ${alpha(statusColor, 0.4)}`
                          : 'none',
                        transition: 'all 0.2s',
                      }}
                    />
                  </Box>

                  {/* Main content */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {/* Title row */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                        mb: 0.75,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily:
                            '"JetBrains Mono", monospace',
                          fontSize: { xs: '0.78rem', sm: '0.85rem' },
                          fontWeight: 500,
                          color: 'rgba(255,255,255,0.92)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {pr.pullRequestTitle}
                      </Typography>
                    </Box>

                    {/* Meta row */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        flexWrap: 'wrap',
                      }}
                    >
                      {/* Status pill */}
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.4,
                          px: 0.75,
                          py: 0.2,
                          borderRadius: 1,
                          backgroundColor: alpha(
                            statusColor,
                            0.1,
                          ),
                          border: `1px solid ${alpha(statusColor, 0.15)}`,
                        }}
                      >
                        <Box
                          sx={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            backgroundColor: statusColor,
                          }}
                        />
                        <Typography
                          sx={{
                            fontFamily:
                              '"JetBrains Mono", monospace',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: statusColor,
                          }}
                        >
                          {statusLabel}
                        </Typography>
                      </Box>

                      {/* PR number */}
                      <Typography
                        sx={{
                          fontFamily:
                            '"JetBrains Mono", monospace',
                          fontSize: '0.72rem',
                          color: 'rgba(255,255,255,0.5)',
                        }}
                      >
                        #{pr.pullRequestNumber}
                      </Typography>

                      {/* Separator */}
                      <Box
                        sx={{
                          width: 2,
                          height: 2,
                          borderRadius: '50%',
                          backgroundColor:
                            'rgba(255,255,255,0.25)',
                        }}
                      />

                      {/* Repo name */}
                      <Typography
                        sx={{
                          fontFamily:
                            '"JetBrains Mono", monospace',
                          fontSize: '0.72rem',
                          color: 'rgba(255,255,255,0.55)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: { xs: 100, sm: 160 },
                        }}
                      >
                        {pr.repository?.split('/').pop()}
                      </Typography>

                      {/* Tier badge */}
                      {tierColor && pr.tier && (
                        <>
                          <Box
                            sx={{
                              width: 2,
                              height: 2,
                              borderRadius: '50%',
                              backgroundColor:
                                'rgba(255,255,255,0.15)',
                            }}
                          />
                          <Box
                            sx={{
                              px: 0.5,
                              py: 0.1,
                              borderRadius: 0.5,
                              backgroundColor: alpha(
                                tierColor,
                                0.12,
                              ),
                            }}
                          >
                            <Typography
                              sx={{
                                fontFamily:
                                  '"JetBrains Mono", monospace',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                color: tierColor,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}
                            >
                              {pr.tier}
                            </Typography>
                          </Box>
                        </>
                      )}

                      {/* Diff bar — hidden on mobile */}
                      {totalLines > 0 && (
                        <Box sx={{ display: { xs: 'none', sm: 'contents' } }}>
                          <Box
                            sx={{
                              width: 2,
                              height: 2,
                              borderRadius: '50%',
                              backgroundColor:
                                'rgba(255,255,255,0.15)',
                            }}
                          />
                          <Tooltip
                            title={`+${linesAdded} / -${linesDeleted}`}
                            arrow
                            slotProps={tooltipSlotProps}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 32,
                                  height: 4,
                                  borderRadius: 1,
                                  overflow: 'hidden',
                                  display: 'flex',
                                  backgroundColor:
                                    'rgba(255,255,255,0.06)',
                                }}
                              >
                                <Box
                                  sx={{
                                    width: `${addPct}%`,
                                    backgroundColor: alpha(
                                      STATUS_COLORS.success,
                                      0.6,
                                    ),
                                  }}
                                />
                                <Box
                                  sx={{
                                    flex: 1,
                                    backgroundColor: alpha(
                                      STATUS_COLORS.error,
                                      0.5,
                                    ),
                                  }}
                                />
                              </Box>
                              <Typography
                                sx={{
                                  fontFamily:
                                    '"JetBrains Mono", monospace',
                                  fontSize: '0.68rem',
                                  color:
                                    'rgba(255,255,255,0.5)',
                                }}
                              >
                                {totalLines > 999
                                  ? `${(totalLines / 1000).toFixed(1)}k`
                                  : totalLines}
                              </Typography>
                            </Box>
                          </Tooltip>
                        </Box>
                      )}

                      {/* Time */}
                      {timeAgo && (
                        <>
                          <Box sx={{ flex: 1 }} />
                          <Typography
                            sx={{
                              fontFamily:
                                '"JetBrains Mono", monospace',
                              fontSize: '0.72rem',
                              color:
                                'rgba(255,255,255,0.5)',
                            }}
                          >
                            {timeAgo}
                          </Typography>
                        </>
                      )}
                    </Box>

                    {/* Zero-score reason */}
                    {zeroReason && (
                      <Typography
                        sx={{
                          fontFamily:
                            '"JetBrains Mono", monospace',
                          fontSize: '0.62rem',
                          color: alpha(
                            STATUS_COLORS.warning,
                            0.7,
                          ),
                          mt: 0.5,
                          pl: 0.25,
                        }}
                      >
                        {zeroReason}
                      </Typography>
                    )}
                  </Box>

                  {/* Score badge */}
                  <Box
                    sx={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Box
                      sx={{
                        px: { xs: 0.75, sm: 1.25 },
                        py: { xs: 0.375, sm: 0.5 },
                        borderRadius: 1.5,
                        backgroundColor: isClosed
                          ? 'rgba(255,255,255,0.04)'
                          : scoreVal > 0
                            ? alpha(
                                tierColor ||
                                  STATUS_COLORS.success,
                                0.08,
                              )
                            : scoreVal === 0 && isMerged
                              ? alpha(
                                  STATUS_COLORS.warning,
                                  0.08,
                                )
                              : 'rgba(255,255,255,0.04)',
                        border: '1px solid',
                        borderColor: isClosed
                          ? 'rgba(255,255,255,0.06)'
                          : scoreVal > 0
                            ? alpha(
                                tierColor ||
                                  STATUS_COLORS.success,
                                0.15,
                              )
                            : scoreVal === 0 && isMerged
                              ? alpha(
                                  STATUS_COLORS.warning,
                                  0.15,
                                )
                              : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily:
                            '"JetBrains Mono", monospace',
                          fontSize: { xs: '0.72rem', sm: '0.8rem' },
                          fontWeight: 700,
                          color: isClosed
                            ? 'rgba(255,255,255,0.25)'
                            : scoreVal > 0
                              ? '#fff'
                              : scoreVal === 0 && isMerged
                                ? STATUS_COLORS.warning
                                : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {isClosed
                          ? '--'
                          : scoreVal.toFixed(4)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

    </Box>
  );
};

const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${Math.max(diffMins, 1)}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

export default MinerOverviewTab;
