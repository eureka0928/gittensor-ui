import React, { useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  Grid,
  CircularProgress,
  alpha,
} from '@mui/material';
import { subDays, format } from 'date-fns';
import {
  type MinerEvaluation,
  type CommitLog,
  type Repository,
  type TierConfig,
} from '../../api';
import { ContributionHeatmap } from '../dashboard';
import TrustBadge from './TrustBadge';
import CredibilityChart from './CredibilityChart';
import PerformanceRadar from './PerformanceRadar';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';

interface MinerOverviewTabProps {
  minerStats: MinerEvaluation;
  prs?: CommitLog[];
  repos?: Repository[];
  allMinerStats?: MinerEvaluation[];
  tierConfigs?: TierConfig[];
  isLoadingPRs: boolean;
}

const TIER_LEVELS: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

const MinerOverviewTab: React.FC<MinerOverviewTabProps> = ({
  minerStats,
  prs,
  repos,
  allMinerStats,
  tierConfigs,
  isLoadingPRs,
}) => {
  // Heatmap data
  const { contributionData, contributionsLast30Days, totalDaysShown } =
    useMemo(() => {
      if (!prs || prs.length === 0) {
        return {
          contributionData: [],
          contributionsLast30Days: 0,
          totalDaysShown: 0,
        };
      }

      const today = new Date();
      let earliestDate = today;

      prs.forEach((pr) => {
        if (pr.mergedAt) {
          const d = new Date(pr.mergedAt);
          if (d < earliestDate) earliestDate = d;
        }
      });

      const diffTime = Math.abs(
        today.getTime() - earliestDate.getTime(),
      );
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const daysToShow = Math.max(daysDiff, 1);

      const dataMap = new Map<string, number>();
      for (let i = daysToShow; i >= 0; i--) {
        dataMap.set(format(subDays(today, i), 'yyyy-MM-dd'), 0);
      }

      let last30Count = 0;
      const thirtyDaysAgo = subDays(today, 30);

      prs.forEach((pr) => {
        if (!pr.mergedAt) return;
        const date = new Date(pr.mergedAt);
        if (isNaN(date.getTime())) return;

        const dateStr = format(date, 'yyyy-MM-dd');
        if (dataMap.has(dateStr)) {
          dataMap.set(dateStr, (dataMap.get(dateStr) || 0) + 1);
        }
        if (date >= thirtyDaysAgo) last30Count++;
      });

      const data = Array.from(dataMap.entries())
        .map(([date, count]) => {
          let level: 0 | 1 | 2 | 3 | 4 = 0;
          if (count > 0) level = 1;
          if (count >= 2) level = 2;
          if (count >= 3) level = 3;
          if (count >= 5) level = 4;
          return { date, count, level };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        contributionData: data,
        contributionsLast30Days: last30Count,
        totalDaysShown: daysToShow,
      };
    }, [prs]);

  // Radar chart values
  const radarValues = useMemo(() => {
    if (!minerStats || !allMinerStats || allMinerStats.length === 0) {
      return {
        credibility: 0,
        complexity: 0,
        issuesSolved: 0,
        uniqueRepos: 0,
        totalPRs: 0,
        avgRepoWeight: 0,
      };
    }

    const maxCredibility = Math.max(
      ...allMinerStats.map((m) => m.credibility || 0),
      0.01,
    );
    const maxComplexity = Math.max(
      ...allMinerStats.map((m) => m.totalNodesScored || 0),
      1,
    );
    const maxMergedPrs = Math.max(
      ...allMinerStats.map((m) => m.totalMergedPrs || 0),
      1,
    );
    const maxUniqueRepos = Math.max(
      ...allMinerStats.map((m) => m.uniqueReposCount || 0),
      1,
    );
    const maxTotalPrs = Math.max(
      ...allMinerStats.map((m) => m.totalPrs || 0),
      1,
    );

    let avgWeightVal = 0;
    if (prs && prs.length > 0 && repos && Array.isArray(repos)) {
      const repoWeights = new Map<string, number>();
      repos.forEach((repo) => {
        if (repo?.fullName) {
          repoWeights.set(
            repo.fullName,
            parseFloat(repo.weight || '0'),
          );
        }
      });
      const totalWeight = prs.reduce(
        (sum, pr) => sum + (repoWeights.get(pr.repository) || 0),
        0,
      );
      avgWeightVal = Math.min(totalWeight / prs.length, 100);
    }

    return {
      credibility:
        ((minerStats.credibility || 0) / maxCredibility) * 100,
      complexity:
        ((minerStats.totalNodesScored || 0) / maxComplexity) * 100,
      issuesSolved:
        ((minerStats.totalMergedPrs || 0) / maxMergedPrs) * 100,
      uniqueRepos:
        ((minerStats.uniqueReposCount || 0) / maxUniqueRepos) * 100,
      totalPRs: ((minerStats.totalPrs || 0) / maxTotalPrs) * 100,
      avgRepoWeight: avgWeightVal,
    };
  }, [minerStats, prs, repos, allMinerStats]);

  // Tier summary data
  const currentTierLevel =
    TIER_LEVELS[(minerStats.currentTier || '').toLowerCase()] || 0;

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Charts Section */}
      <Card sx={{ p: 0, overflow: 'hidden' }}>
        {/* Header with Trust Badge */}
        <Box
          sx={{
            p: 2.5,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="sectionTitle">
            Developer Activity
          </Typography>
          <TrustBadge
            credibility={minerStats.credibility || 0}
            totalPRs={minerStats.totalPrs || 0}
          />
        </Box>

        {isLoadingPRs ? (
          <Box
            sx={{
              p: 4,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={30} />
          </Box>
        ) : (
          <Grid container>
            {/* Heatmap */}
            <Grid
              item
              xs={12}
              md={6}
              sx={{
                p: 3,
                borderRight: {
                  md: '1px solid rgba(255, 255, 255, 0.1)',
                },
                borderBottom: {
                  xs: '1px solid rgba(255, 255, 255, 0.1)',
                  md: 'none',
                },
              }}
            >
              <ContributionHeatmap
                data={contributionData}
                contributionsLast30Days={contributionsLast30Days}
                totalDaysShown={totalDaysShown}
                subtitle="contributions in the last 30 days"
                footerText="* Activity based on merged PRs in Gittensor-tracked repositories"
                bare
              />
            </Grid>

            {/* Credibility Donut */}
            <Grid
              item
              xs={12}
              md={3}
              sx={{
                p: 3,
                borderRight: {
                  md: '1px solid rgba(255, 255, 255, 0.1)',
                },
                borderBottom: {
                  xs: '1px solid rgba(255, 255, 255, 0.1)',
                  md: 'none',
                },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <CredibilityChart
                merged={minerStats.totalMergedPrs || 0}
                open={minerStats.totalOpenPrs || 0}
                closed={minerStats.totalClosedPrs || 0}
                credibility={minerStats.credibility || 0}
              />
            </Grid>

            {/* Performance Radar */}
            <Grid
              item
              xs={12}
              md={3}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <PerformanceRadar {...radarValues} />
            </Grid>
          </Grid>
        )}
      </Card>

      {/* Tier Summary Strip */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        {tierSummary.map((tier) => (
          <Box
            key={tier.name}
            sx={{
              flex: '1 1 0',
              minWidth: 140,
              backgroundColor: tier.unlocked
                ? alpha(tier.color, 0.06)
                : 'rgba(255, 255, 255, 0.02)',
              borderRadius: 2,
              border: '1px solid',
              borderColor: tier.unlocked
                ? alpha(tier.color, 0.3)
                : 'rgba(255, 255, 255, 0.08)',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              opacity: tier.unlocked ? 1 : 0.5,
              transition: 'all 0.2s',
            }}
          >
            {/* Progress ring */}
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
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
                  fontSize: '0.75rem',
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
                  fontSize: '0.95rem',
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
    </Box>
  );
};

export default MinerOverviewTab;
