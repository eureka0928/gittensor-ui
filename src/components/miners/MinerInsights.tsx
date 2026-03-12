import React, { useMemo } from 'react';
import {
  Typography,
  Card,
  Box,
  alpha,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
} from '@mui/material';
import {
  Lightbulb as LightbulbIcon,
  WarningAmber as WarningIcon,
  CheckCircleOutline as CheckIcon,
  ArrowForward as NextStepIcon,
  RocketLaunch as RocketIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import {
  type MinerEvaluation,
  type CommitLog,
  type RepositoryPrScoring,
  type TierConfig,
} from '../../api';
import { STATUS_COLORS, TIER_COLORS } from '../../theme';
import {
  getTierLevel,
  calculateDynamicThreshold,
  getZeroScoreReason,
} from '../../utils';

interface MinerInsightsProps {
  minerStats: MinerEvaluation;
  prs?: CommitLog[];
  prScoring?: RepositoryPrScoring;
  tierConfigs?: TierConfig[];
}

type InsightType =
  | 'warning'
  | 'alert'
  | 'next-step'
  | 'achievement'
  | 'onboarding';

interface Insight {
  type: InsightType;
  title: string;
  description: string;
  buttonText?: string;
  buttonLink?: string;
}

const MinerInsights: React.FC<MinerInsightsProps> = ({
  minerStats,
  prs,
  prScoring,
  tierConfigs,
}) => {
  const insights = useMemo(() => {
    const generatedInsights: Insight[] = [];
    
    // 1. Open Risk / Collateral Analysis
    const openPrs = Number(minerStats.totalOpenPrs || 0);
    const openPrThreshold = calculateDynamicThreshold(
      minerStats.currentTier,
      minerStats.bronzeTokenScore || 0,
      minerStats.silverTokenScore || 0,
      minerStats.goldTokenScore || 0,
      prScoring,
    );
    const collateral = Number(minerStats.totalCollateralScore || 0);
    const currentTierLevel = getTierLevel(minerStats.currentTier);

    if (openPrs >= openPrThreshold) {
      generatedInsights.push({
        type: 'warning',
        title: 'High Collateral Risk',
        description: `You have ${openPrs} open PRs, exceeding your threshold of ${openPrThreshold}. Exceeding the threshold doesn't just add collateral \u2014 it applies a penalty multiplier to ALL your merged PR scores, not just the excess PRs. You are losing ${collateral.toFixed(2)} score. Close or merge stale PRs immediately.`,
      });
    } else if (openPrs >= openPrThreshold - 2) {
      generatedInsights.push({
        type: 'alert',
        title: 'Approaching PR Limit',
        description: `You have ${openPrs} open PRs. You are very close to your penalty threshold of ${openPrThreshold}. Consider merging or closing current PRs before opening new ones.`,
      });
    }

    // 1b. Unreached tier token score not counting toward threshold
    const tierTokenScores = [
      { name: 'Bronze', level: 1, score: Number(minerStats.bronzeTokenScore || 0) },
      { name: 'Silver', level: 2, score: Number(minerStats.silverTokenScore || 0) },
      { name: 'Gold', level: 3, score: Number(minerStats.goldTokenScore || 0) },
    ];
    const firstLockedWithScore = tierTokenScores.find(
      (t) => t.level > currentTierLevel && t.score > 0,
    );
    if (firstLockedWithScore) {
      const tokenScorePer =
        prScoring?.openPrThresholdTokenScore ?? 500;
      const potentialBonus = Math.floor(
        firstLockedWithScore.score / tokenScorePer,
      );
      if (potentialBonus > 0) {
        generatedInsights.push({
          type: 'next-step',
          title: 'Locked Threshold Bonus',
          description: `You have ${Math.round(firstLockedWithScore.score)} token score in ${firstLockedWithScore.name}, but it does not count toward your open PR threshold because ${firstLockedWithScore.name} is not unlocked yet. Unlocking it would raise your threshold by ${potentialBonus} (to ${openPrThreshold + potentialBonus}).`,
        });
      }
    }

    // 2. Zero-Score PR Analysis (answers "why no payment?")
    if (prs && prs.length > 0) {
      const lockedTiers = [
        { name: 'Bronze', level: 1 },
        { name: 'Silver', level: 2 },
        { name: 'Gold', level: 3 },
      ].filter((t) => t.level > currentTierLevel);

      // 2a. Per-tier locked insights — "I made a PR to a gold repo"
      for (const locked of lockedTiers) {
        const prsInTier = prs.filter(
          (pr) =>
            pr.tier &&
            pr.tier.toLowerCase() === locked.name.toLowerCase(),
        );
        if (prsInTier.length === 0) continue;

        const isNextTier = locked.level === currentTierLevel + 1;
        const config = tierConfigs?.find(
          (c) =>
            c.name.toLowerCase() === locked.name.toLowerCase(),
        );
        const tierKey = locked.name.toLowerCase() as
          | 'bronze'
          | 'silver'
          | 'gold';

        if (isNextTier && config) {
          // Actionable: show unlock progress
          const qualifiedRepos =
            (minerStats[
              `${tierKey}QualifiedUniqueRepos` as keyof MinerEvaluation
            ] as number) || 0;
          const tierCred =
            (minerStats[
              `${tierKey}Credibility` as keyof MinerEvaluation
            ] as number) || 0;
          const tierToken =
            (minerStats[
              `${tierKey}TokenScore` as keyof MinerEvaluation
            ] as number) || 0;

          const reqs: string[] = [];
          if (
            config.requiredMinTokenScore &&
            tierToken < config.requiredMinTokenScore
          ) {
            reqs.push(
              `${Math.round(config.requiredMinTokenScore - tierToken)} more token score`,
            );
          }
          if (
            qualifiedRepos <
            config.requiredQualifiedUniqueRepos
          ) {
            const remaining =
              config.requiredQualifiedUniqueRepos -
              qualifiedRepos;
            reqs.push(
              `${remaining} more qualified repo${remaining === 1 ? '' : 's'}`,
            );
          }
          if (tierCred < config.requiredCredibility) {
            reqs.push(
              `${(config.requiredCredibility * 100).toFixed(0)}% credibility (currently ${(tierCred * 100).toFixed(0)}%)`,
            );
          }

          const reqText =
            reqs.length > 0
              ? ` You need ${reqs.join(', ')} to unlock it.`
              : ' You are close to unlocking it.';
          generatedInsights.push({
            type: 'warning',
            title: `${locked.name} PRs Earning Zero`,
            description: `You have ${prsInTier.length} PR${prsInTier.length === 1 ? '' : 's'} in ${locked.name} repos scoring 0 because ${locked.name} is locked.${reqText}`,
          });
        } else {
          // Not the next tier — must unlock earlier tiers first
          const prevTier =
            locked.level === 3
              ? 'Silver'
              : locked.level === 2
                ? 'Bronze'
                : '';
          generatedInsights.push({
            type: 'alert',
            title: `${locked.name} PRs Earning Zero`,
            description: `You have ${prsInTier.length} PR${prsInTier.length === 1 ? '' : 's'} in ${locked.name} repos scoring 0. ${locked.name} is locked \u2014 unlock ${prevTier} first. Tiers must be unlocked in order: Bronze \u2192 Silver \u2192 Gold.`,
          });
        }
      }

      // 2b. Other zero-score merged PRs — "I solved this, why 0?"
      const zeroScoreMerged = prs.filter(
        (pr) =>
          pr.mergedAt &&
          parseFloat(pr.score || '0') === 0 &&
          !(pr.tier && getTierLevel(pr.tier) > currentTierLevel),
      );
      if (zeroScoreMerged.length > 0) {
        const reasons: Record<string, number> = {};
        zeroScoreMerged.forEach((pr) => {
          const reason =
            getZeroScoreReason(pr) || 'Unknown';
          reasons[reason] = (reasons[reason] || 0) + 1;
        });
        const reasonList = Object.entries(reasons)
          .sort((a, b) => b[1] - a[1])
          .map(([reason, count]) => `${count} ${reason.toLowerCase()}`)
          .join(', ');
        generatedInsights.push({
          type: 'alert',
          title: 'Merged PRs With Zero Score',
          description: `${zeroScoreMerged.length} of your merged PR${zeroScoreMerged.length === 1 ? '' : 's'} scored 0: ${reasonList}. See the Contributions tab for per-PR details.`,
        });
      }
    }

    // 3. Credibility Analysis
    const credibility = Number(minerStats.credibility || 0);
    if (credibility < 0.5) {
      generatedInsights.push({
        type: 'warning',
        title: 'Low Credibility',
        description: `Your credibility has dropped to ${(credibility * 100).toFixed(0)}%. Focus on high-quality submissions and getting your currently open PRs merged to improve your score multiplier.`,
      });
    } else if (credibility >= 0.9 && minerStats.totalPrs && minerStats.totalPrs > 10) {
      generatedInsights.push({
        type: 'achievement',
        title: 'Excellent Credibility',
        description: `You maintain an outstanding credibility rating of ${(credibility * 100).toFixed(0)}% across ${minerStats.totalPrs} PRs. This maximizes your scoring potential.`,
      });
    }

    // 3b. Credibility Exponent Impact
    if (
      currentTierLevel >= 2 &&
      tierConfigs
    ) {
      const currentTierName =
        currentTierLevel === 3 ? 'Gold' : 'Silver';
      const tierKey = currentTierName.toLowerCase() as
        | 'silver'
        | 'gold';
      const tierCred =
        (minerStats[
          `${tierKey}Credibility` as keyof MinerEvaluation
        ] as number) || credibility;
      const currentTierConfig = tierConfigs.find(
        (c) =>
          c.name.toLowerCase() ===
          currentTierName.toLowerCase(),
      );
      if (currentTierConfig && tierCred < 0.85) {
        const scalar = currentTierConfig.credibilityScalar;
        const effectiveMult = Math.pow(tierCred, scalar);
        generatedInsights.push({
          type: 'alert',
          title: 'Credibility Exponent Impact',
          description: `Your ${currentTierName} credibility of ${(tierCred * 100).toFixed(0)}% with exponent ${scalar} gives a ${effectiveMult.toFixed(2)}x multiplier \u2014 ${effectiveMult < 0.6 ? 'more than half' : 'a significant portion of'} your score is lost. Merge more PRs to improve.`,
        });
      }
    }

    // 3c. Time Decay Warning
    if (prs && prScoring) {
      const graceHours =
        prScoring.timeDecayGracePeriodHours;
      const midpointDays =
        prScoring.timeDecaySigmoidMidpoint;
      const now = new Date();
      const openPrsWithDecay = prs.filter((pr) => {
        if (pr.mergedAt || pr.prState === 'CLOSED')
          return false;
        const created = new Date(pr.prCreatedAt);
        const hoursSinceCreation =
          (now.getTime() - created.getTime()) /
          (1000 * 60 * 60);
        return hoursSinceCreation > graceHours;
      });
      if (openPrsWithDecay.length > 0) {
        generatedInsights.push({
          type: 'alert',
          title: 'Time Decay Warning',
          description: `You have ${openPrsWithDecay.length} open PR${openPrsWithDecay.length === 1 ? '' : 's'} past the ${graceHours}h grace period. Score decays ~50% at ${midpointDays} days. Merge soon to preserve value.`,
        });
      }
    }

    // 3d. Closed PRs Damage Credibility
    const totalClosedPrs = Number(
      minerStats.totalClosedPrs || 0,
    );
    if (totalClosedPrs > 0 && credibility < 0.8) {
      generatedInsights.push({
        type: 'alert',
        title: 'Closed PRs Damage Credibility',
        description: `You have ${totalClosedPrs} closed PR${totalClosedPrs === 1 ? '' : 's'} permanently counting against your credibility. Each lowers your merged-to-total ratio, reducing your score multiplier at every tier.`,
      });
    }

    // 3e. Test/Doc Files Score Very Low
    if (prs && prs.length > 0) {
      const mergedWithTokens = prs.filter(
        (pr) =>
          pr.mergedAt &&
          pr.tokenScore !== undefined &&
          pr.additions + pr.deletions > 0,
      );
      if (mergedWithTokens.length >= 3) {
        const avgRatio =
          mergedWithTokens.reduce((sum, pr) => {
            const lines = pr.additions + pr.deletions;
            return (
              sum + (pr.tokenScore || 0) / Math.max(lines, 1)
            );
          }, 0) / mergedWithTokens.length;
        if (avgRatio < 0.05) {
          generatedInsights.push({
            type: 'next-step',
            title: 'Test/Doc Files Score Very Low',
            description:
              'Test files are weighted at 0.05x and docs at 0.12x. Docs don\'t count toward tier token score requirements. Focus on core code changes for higher scores.',
          });
        }
      }
    }

    // 4. Next Tier Progression Analysis
    if (currentTierLevel < 3 && tierConfigs) {
      const nextTierName = currentTierLevel === 0 ? 'Bronze' : currentTierLevel === 1 ? 'Silver' : 'Gold';
      const nextTierConfig = tierConfigs.find((c) => c.name.toLowerCase() === nextTierName.toLowerCase());
      
      if (nextTierConfig) {
        const tierKey = nextTierName.toLowerCase() as 'bronze' | 'silver' | 'gold';
        const qualifiedRepos = (minerStats[`${tierKey}QualifiedUniqueRepos` as keyof MinerEvaluation] as number) || 0;
        const currentCred = (minerStats[`${tierKey}Credibility` as keyof MinerEvaluation] as number) || 0;
        
        const reqRepos = nextTierConfig.requiredQualifiedUniqueRepos;
        const reqCred = nextTierConfig.requiredCredibility;
        
        if (qualifiedRepos < reqRepos) {
          const remaining = reqRepos - qualifiedRepos;
          generatedInsights.push({
            type: 'next-step',
            title: `Unlock ${nextTierName} Tier`,
            description: `You need to merge code in ${remaining} more unique qualified repositor${remaining === 1 ? 'y' : 'ies'} to unlock the ${nextTierName} multiplier.`,
          });
        } else if (currentCred < reqCred) {
          generatedInsights.push({
            type: 'next-step',
            title: `Unlock ${nextTierName} Tier`,
            description: `You have enough repositories, but need to improve your credibility from ${(currentCred * 100).toFixed(0)}% to ${(reqCred * 100).toFixed(0)}% to unlock ${nextTierName}.`,
          });
        }
      }
    }

    // 5. Adaptive: New miner getting started
    const totalMergedPrs = Number(minerStats.totalMergedPrs || 0);
    const totalPrsCount = Number(minerStats.totalPrs || 0);
    const qualifiedReposCount = Number(
      minerStats.qualifiedUniqueReposCount || 0,
    );
    if (currentTierLevel <= 1 && totalMergedPrs < 15) {
      if (totalMergedPrs === 0 && totalPrsCount === 0) {
        generatedInsights.push({
          type: 'onboarding',
          title: 'Welcome to Gittensor',
          description:
            'You\'re registered and ready to earn. Find a Bronze-tier repository with open issues, submit a quality PR, and get it merged to earn your first score. Tiers unlock as you grow — start with Bronze repos to build your foundation.',
          buttonText: 'Start Onboarding',
          buttonLink: '/onboard',
        });
      } else if (totalMergedPrs === 0 && totalPrsCount > 0) {
        generatedInsights.push({
          type: 'onboarding',
          title: 'Almost There',
          description: `You have ${totalPrsCount} PR${totalPrsCount === 1 ? '' : 's'} submitted — great start! Score is awarded only after merge, so follow up with reviewers and address feedback to get your PRs across the finish line.`,
          buttonText: 'Start Onboarding',
          buttonLink: '/onboard',
        });
      } else if (totalMergedPrs < 5) {
        const repoText =
          qualifiedReposCount > 0
            ? `across ${qualifiedReposCount} qualified repo${qualifiedReposCount === 1 ? '' : 's'}`
            : 'but no qualified repos yet';
        generatedInsights.push({
          type: 'onboarding',
          title: 'Building Momentum',
          description: `${totalMergedPrs} merged PR${totalMergedPrs === 1 ? '' : 's'} ${repoText}. Spread your contributions across different repos — each qualified repo counts toward unlocking higher tiers and bigger rewards.`,
          buttonText: 'Browse Repositories',
          buttonLink: '/repositories',
        });
      } else {
        const nextTierName =
          currentTierLevel === 0 ? 'Bronze' : 'Silver';
        generatedInsights.push({
          type: 'onboarding',
          title: 'Growing Contributor',
          description: `${totalMergedPrs} merged PRs across ${qualifiedReposCount} qualified repo${qualifiedReposCount === 1 ? '' : 's'}. You're on track to unlock ${nextTierName} tier — keep diversifying across repos to increase your earning potential.`,
          buttonText: 'Browse Repositories',
          buttonLink: '/repositories',
        });
      }
    }

    // 6. Adaptive: Established miner earning consistently
    const dailyUsd = Number(minerStats.usdPerDay || 0);
    if (
      currentTierLevel >= 3 &&
      totalMergedPrs > 30 &&
      dailyUsd > 0
    ) {
      const monthlyProjection = Math.round(dailyUsd * 30);
      generatedInsights.push({
        type: 'achievement',
        title: 'Earning Consistently',
        description: `As a Gold miner with ${totalMergedPrs} merged PRs, you are projected to earn ~$${monthlyProjection}/month at current rates. Maintain your credibility and diversify across repos to maximize rewards.`,
      });
    }

    return generatedInsights;
  }, [minerStats, prs, prScoring, tierConfigs]);

  if (insights.length === 0) return null;

  const getIconForType = (type: InsightType) => {
    switch (type) {
      case 'warning': return <WarningIcon sx={{ color: STATUS_COLORS.error }} />;
      case 'alert': return <WarningIcon sx={{ color: STATUS_COLORS.warning }} />;
      case 'next-step': return <NextStepIcon sx={{ color: STATUS_COLORS.info }} />;
      case 'achievement': return <CheckIcon sx={{ color: STATUS_COLORS.success }} />;
      case 'onboarding': return <RocketIcon sx={{ color: '#a78bfa' }} />;
    }
  };

  const getColorForType = (type: InsightType) => {
    switch (type) {
      case 'warning': return STATUS_COLORS.error;
      case 'alert': return STATUS_COLORS.warning;
      case 'next-step': return STATUS_COLORS.info;
      case 'achievement': return STATUS_COLORS.success;
      case 'onboarding': return '#a78bfa';
    }
  };

  const onboardingInsight = insights.find(
    (i) => i.type === 'onboarding',
  );
  const otherInsights = insights.filter(
    (i) => i.type !== 'onboarding',
  );

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        p: { xs: 1.5, sm: 2.5 },
      }}
      elevation={0}
    >
      <Typography
        variant="sectionTitle"
        sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <LightbulbIcon sx={{ color: TIER_COLORS.gold, fontSize: '1.2rem' }} />
        Smart Insights
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {onboardingInsight && (
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              background:
                'linear-gradient(135deg, rgba(167, 139, 250, 0.1) 0%, rgba(99, 102, 241, 0.08) 50%, rgba(59, 130, 246, 0.06) 100%)',
              border: '1px solid rgba(167, 139, 250, 0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 120,
                height: 120,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(167, 139, 250, 0.08) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: { xs: 1.5, sm: 2 },
              }}
            >
              <Box
                sx={{
                  width: { xs: 36, sm: 42 },
                  height: { xs: 36, sm: 42 },
                  borderRadius: '12px',
                  background:
                    'linear-gradient(135deg, rgba(167, 139, 250, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  mt: 0.25,
                }}
              >
                <RocketIcon
                  sx={{
                    fontSize: { xs: '1.2rem', sm: '1.4rem' },
                    color: '#a78bfa',
                  }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: { xs: '0.85rem', sm: '0.9rem' },
                    fontWeight: 700,
                    color: '#c4b5fd',
                    mb: 0.75,
                  }}
                >
                  {onboardingInsight.title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: { xs: '0.75rem', sm: '0.8rem' },
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: 1.6,
                    mb: 1.5,
                  }}
                >
                  {onboardingInsight.description}
                </Typography>
                <Button
                  href={onboardingInsight.buttonLink || '/onboard'}
                  size="small"
                  endIcon={
                    <OpenInNewIcon sx={{ fontSize: '0.85rem' }} />
                  }
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#a78bfa',
                    textTransform: 'none',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '20px',
                    border: '1px solid rgba(167, 139, 250, 0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(167, 139, 250, 0.1)',
                      borderColor: 'rgba(167, 139, 250, 0.5)',
                    },
                  }}
                >
                  {onboardingInsight.buttonText || 'Start Onboarding'}
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {otherInsights.length > 0 && (
          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {otherInsights.map((insight, idx) => (
              <ListItem
                key={idx}
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2,
                  backgroundColor: alpha(getColorForType(insight.type), 0.05),
                  border: `1px solid ${alpha(getColorForType(insight.type), 0.2)}`,
                  alignItems: 'flex-start',
                }}
              >
                <ListItemIcon
                  sx={{ minWidth: { xs: 32, sm: 40 }, mt: 0.5 }}
                >
                  {getIconForType(insight.type)}
                </ListItemIcon>
                <ListItemText
                  primary={insight.title}
                  secondary={insight.description}
                  primaryTypographyProps={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: { xs: '0.8rem', sm: '0.85rem' },
                    fontWeight: 700,
                    color: getColorForType(insight.type),
                    mb: 0.5,
                  }}
                  secondaryTypographyProps={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: { xs: '0.75rem', sm: '0.8rem' },
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: 1.5,
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Card>
  );
};

export default MinerInsights;
