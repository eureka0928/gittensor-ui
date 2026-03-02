import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  alpha,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Lightbulb as LightbulbIcon,
  WarningAmber as WarningIcon,
  CheckCircleOutline as CheckIcon,
  ArrowForward as NextStepIcon,
} from '@mui/icons-material';
import {
  type MinerEvaluation,
  type RepositoryPrScoring,
  type TierConfig,
} from '../../api';
import { STATUS_COLORS, TIER_COLORS } from '../../theme';

interface MinerInsightsProps {
  minerStats: MinerEvaluation;
  prScoring?: RepositoryPrScoring;
  tierConfigs?: TierConfig[];
}

const TIER_LEVELS: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

const calculateDynamicThreshold = (
  minerStats: MinerEvaluation,
  prScoring: RepositoryPrScoring | undefined,
): number => {
  const baseThreshold = prScoring?.excessivePrPenaltyThreshold ?? 10;
  const tokenScorePer = prScoring?.openPrThresholdTokenScore ?? 500;
  const maxThreshold = prScoring?.maxOpenPrThreshold ?? 30;

  const currentTierLevel =
    TIER_LEVELS[(minerStats.currentTier || '').toLowerCase()] || 0;

  let unlockedTokenScore = 0;
  if (currentTierLevel >= 1) unlockedTokenScore += Number(minerStats.bronzeTokenScore || 0);
  if (currentTierLevel >= 2) unlockedTokenScore += Number(minerStats.silverTokenScore || 0);
  if (currentTierLevel >= 3) unlockedTokenScore += Number(minerStats.goldTokenScore || 0);

  const bonus = Math.floor(unlockedTokenScore / tokenScorePer);
  return Math.min(baseThreshold + bonus, maxThreshold);
};

type InsightType = 'warning' | 'alert' | 'next-step' | 'achievement';

interface Insight {
  type: InsightType;
  title: string;
  description: string;
}

const MinerInsights: React.FC<MinerInsightsProps> = ({
  minerStats,
  prScoring,
  tierConfigs,
}) => {
  const insights = useMemo(() => {
    const generatedInsights: Insight[] = [];
    
    // 1. Open Risk / Collateral Analysis
    const openPrs = Number(minerStats.totalOpenPrs || 0);
    const openPrThreshold = calculateDynamicThreshold(minerStats, prScoring);
    const collateral = Number(minerStats.totalCollateralScore || 0);

    if (openPrs >= openPrThreshold) {
      generatedInsights.push({
        type: 'warning',
        title: 'High Collateral Risk',
        description: `You have ${openPrs} open PRs, exceeding your threshold of ${openPrThreshold}. You are currently losing ${collateral.toFixed(2)} score to collateral penalty. Close stale PRs immediately to recover score.`,
      });
    } else if (openPrs >= openPrThreshold - 2) {
      generatedInsights.push({
        type: 'alert',
        title: 'Approaching PR Limit',
        description: `You have ${openPrs} open PRs. You are very close to your penalty threshold of ${openPrThreshold}. Consider merging or closing current PRs before opening new ones.`,
      });
    }

    // 2. Credibility Analysis
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

    // 3. Next Tier Progression Analysis
    const currentTierLevel = TIER_LEVELS[(minerStats.currentTier || '').toLowerCase()] || 0;
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

    return generatedInsights;
  }, [minerStats, prScoring, tierConfigs]);

  if (insights.length === 0) return null;

  const getIconForType = (type: InsightType) => {
    switch (type) {
      case 'warning': return <WarningIcon sx={{ color: STATUS_COLORS.error }} />;
      case 'alert': return <WarningIcon sx={{ color: STATUS_COLORS.warning }} />;
      case 'next-step': return <NextStepIcon sx={{ color: STATUS_COLORS.info }} />;
      case 'achievement': return <CheckIcon sx={{ color: STATUS_COLORS.success }} />;
    }
  };

  const getColorForType = (type: InsightType) => {
    switch (type) {
      case 'warning': return STATUS_COLORS.error;
      case 'alert': return STATUS_COLORS.warning;
      case 'next-step': return STATUS_COLORS.info;
      case 'achievement': return STATUS_COLORS.success;
    }
  };

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        p: 2.5,
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
      
      <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {insights.map((insight, idx) => (
          <React.Fragment key={idx}>
            <ListItem
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: alpha(getColorForType(insight.type), 0.05),
                border: `1px solid ${alpha(getColorForType(insight.type), 0.2)}`,
                alignItems: 'flex-start',
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                {getIconForType(insight.type)}
              </ListItemIcon>
              <ListItemText
                primary={insight.title}
                secondary={insight.description}
                primaryTypographyProps={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: getColorForType(insight.type),
                  mb: 0.5,
                }}
                secondaryTypographyProps={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  lineHeight: 1.5,
                }}
              />
            </ListItem>
          </React.Fragment>
        ))}
      </List>
    </Card>
  );
};

export default MinerInsights;
