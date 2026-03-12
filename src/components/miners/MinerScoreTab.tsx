import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  Tooltip,
  Collapse,
  alpha,
} from '@mui/material';
import ReactECharts from 'echarts-for-react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  ExpandMore as ExpandMoreIcon,
  HelpOutline as HelpIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  type MinerEvaluation,
  type CommitLog,
  type GeneralConfigResponse,
  type TierConfig,
} from '../../api';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';
import { tooltipSlotProps } from './TierComponents';

interface MinerScoreTabProps {
  minerStats: MinerEvaluation;
  prs?: CommitLog[];
  generalConfig?: GeneralConfigResponse;
  tierConfigs?: TierConfig[];
  githubId: string;
}

const MinerScoreTab: React.FC<MinerScoreTabProps> = ({
  minerStats,
  prs,
  generalConfig,
  tierConfigs,
  githubId,
}) => {
  const navigate = useNavigate();
  const [explainerOpen, setExplainerOpen] = useState(true);
  const username = prs?.[0]?.author || githubId;

  // Score composition
  const bronzeScore = Number(minerStats.bronzeScore || 0);
  const silverScore = Number(minerStats.silverScore || 0);
  const goldScore = Number(minerStats.goldScore || 0);
  const collateral = Number(minerStats.totalCollateralScore || 0);
  const netScore = Number(minerStats.totalScore || 0);
  const grossScore = bronzeScore + silverScore + goldScore;
  const baseTotalScore = Number(minerStats.baseTotalScore || 0);
  const credibilityCost = baseTotalScore - grossScore;

  // Waterfall chart options
  const waterfallOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(30, 30, 30, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
          color: '#ffffff',
        },
      },
      grid: {
        left: 20,
        right: 20,
        top: 20,
        bottom: 40,
        containLabel: true,
      },
      xAxis: {
        type: 'category' as const,
        data: [
          'Bronze',
          'Silver',
          'Gold',
          'Collateral',
          'Net Score',
        ],
        axisLabel: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
          color: 'rgba(255, 255, 255, 0.6)',
        },
        axisLine: {
          lineStyle: { color: 'rgba(255, 255, 255, 0.1)' },
        },
      },
      yAxis: {
        type: 'value' as const,
        axisLabel: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          color: 'rgba(255, 255, 255, 0.4)',
        },
        splitLine: {
          lineStyle: { color: 'rgba(255, 255, 255, 0.05)' },
        },
      },
      series: [
        // Invisible base for waterfall stacking
        {
          name: 'Base',
          type: 'bar',
          stack: 'total',
          itemStyle: {
            borderColor: 'transparent',
            color: 'transparent',
          },
          emphasis: {
            itemStyle: {
              borderColor: 'transparent',
              color: 'transparent',
            },
          },
          data: [
            0, // Bronze starts at 0
            bronzeScore, // Silver starts at bronze
            bronzeScore + silverScore, // Gold starts at bronze+silver
            0, // Collateral starts at 0
            0, // Net starts at 0
          ],
        },
        // Visible bars
        {
          name: 'Score',
          type: 'bar',
          stack: 'total',
          itemStyle: {
            borderRadius: [3, 3, 0, 0],
          },
          data: [
            {
              value: bronzeScore,
              itemStyle: {
                color: alpha(TIER_COLORS.bronze, 0.8),
              },
            },
            {
              value: silverScore,
              itemStyle: {
                color: alpha(TIER_COLORS.silver, 0.8),
              },
            },
            {
              value: goldScore,
              itemStyle: {
                color: alpha(TIER_COLORS.gold, 0.8),
              },
            },
            {
              value: collateral > 0 ? collateral : 0,
              itemStyle: {
                color: 'rgba(248, 113, 113, 0.7)',
                borderRadius: [3, 3, 0, 0],
              },
            },
            {
              value: netScore,
              itemStyle: {
                color: alpha(STATUS_COLORS.info, 0.8),
              },
            },
          ],
          label: {
            show: true,
            position: 'top',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            color: 'rgba(255, 255, 255, 0.7)',
            formatter: (params: { dataIndex: number; value: number }) =>
              params.dataIndex === 3 && params.value > 0
                ? `-${params.value.toFixed(2)}`
                : params.value !== 0
                  ? params.value.toFixed(2)
                  : '',
          },
        },
      ],
    }),
    [bronzeScore, silverScore, goldScore, collateral, netScore, grossScore],
  );

  // Scoring parameters
  const scoringParams = generalConfig?.repositoryPrScoring;
  const baseParamRows = useMemo(() => {
    if (!scoringParams) return [];
    return [
      {
        label: 'Base Score (Merged PR)',
        value: String(scoringParams.defaultMergedPrBaseScore),
        tooltip:
          'Base score awarded for each merged pull request.',
      },
      {
        label: 'Max Contribution Bonus',
        value: String(
          scoringParams.mergedPrContributionBonusScoreMax,
        ),
        tooltip:
          'Maximum bonus score from code contribution volume.',
      },
      {
        label: 'Unique PR Boost',
        value: String(scoringParams.uniquePrBoost),
        tooltip:
          'Bonus multiplier for unique repository contributions.',
      },
      {
        label: 'Time Decay Min',
        value: String(scoringParams.timeDecayMinMultiplier),
        tooltip:
          'Minimum time decay multiplier applied to score.',
      },
      {
        label: 'Open PR Penalty Threshold',
        value: String(
          scoringParams.excessivePrPenaltyThreshold,
        ),
        tooltip:
          'Number of open PRs before collateral penalty applies.',
      },
      {
        label: 'Max Open PR Threshold',
        value: String(scoringParams.maxOpenPrThreshold),
        tooltip:
          'Maximum threshold after dynamic bonuses from token score.',
      },
      {
        label: 'Time Decay Grace Period',
        value: `${scoringParams.timeDecayGracePeriodHours}h`,
        tooltip:
          'Hours after PR creation before time decay begins.',
      },
      {
        label: 'Time Decay Midpoint',
        value: `${scoringParams.timeDecaySigmoidMidpoint}d`,
        tooltip:
          'Days at which an open PR loses ~50% of its potential score.',
      },
    ];
  }, [scoringParams]);

  // Top 5 PRs by score
  const topPRs = useMemo(() => {
    if (!prs || prs.length === 0) return [];
    return prs
      .filter((pr) => parseFloat(pr.score || '0') > 0)
      .sort(
        (a, b) =>
          parseFloat(b.score || '0') - parseFloat(a.score || '0'),
      )
      .slice(0, 5);
  }, [prs]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* How Scoring Works */}
      <Card sx={{ p: 0, overflow: 'hidden' }}>
        <Box
          onClick={() => setExplainerOpen((v) => !v)}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
            },
            transition: 'background-color 0.2s',
          }}
        >
          <HelpIcon
            sx={{
              fontSize: '1rem',
              color: STATUS_COLORS.info,
            }}
          />
          <Typography
            variant="sectionTitle"
            sx={{ flex: 1 }}
          >
            How Scoring Works
          </Typography>
          <ExpandMoreIcon
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              transform: explainerOpen
                ? 'rotate(180deg)'
                : 'rotate(0deg)',
              transition: 'transform 0.3s',
              fontSize: '1.2rem',
            }}
          />
        </Box>
        <Collapse in={explainerOpen} timeout="auto">
          <Box
            sx={{
              px: 2,
              pb: 2,
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              pt: 1.5,
            }}
          >
            {/* Visual pipeline */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'stretch', md: 'center' },
                gap: { xs: 1, md: 0.5 },
                mb: 2,
              }}
            >
              {[
                {
                  icon: '\u2211',
                  label: 'Base Score',
                  value: baseTotalScore.toFixed(2),
                  color: 'rgba(255,255,255,0.7)',
                },
                {
                  icon: '\u00D7',
                  label: 'Credibility',
                  value:
                    credibilityCost > 0
                      ? `-${credibilityCost.toFixed(2)}`
                      : '0.00',
                  color:
                    credibilityCost > 0.5
                      ? STATUS_COLORS.warning
                      : STATUS_COLORS.success,
                },
                {
                  icon: '\u2212',
                  label: 'Collateral',
                  value:
                    collateral > 0
                      ? `-${collateral.toFixed(2)}`
                      : '0.00',
                  color:
                    collateral > 0
                      ? 'rgba(248,113,113,0.9)'
                      : 'rgba(255,255,255,0.5)',
                },
                {
                  icon: '=',
                  label: 'Final',
                  value: netScore.toFixed(2),
                  color: STATUS_COLORS.info,
                },
              ].map((step, i, arr) => (
                <React.Fragment key={step.label}>
                  <Box
                    sx={{
                      flex: { md: 1 },
                      backgroundColor:
                        'rgba(255,255,255,0.03)',
                      borderRadius: 2,
                      border:
                        '1px solid rgba(255,255,255,0.08)',
                      p: 1.5,
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '1rem',
                        mb: 0.5,
                        opacity: 0.6,
                      }}
                    >
                      {step.icon}
                    </Typography>
                    <Typography
                      variant="monoSmall"
                      sx={{
                        color: 'rgba(255,255,255,0.5)',
                        mb: 0.25,
                      }}
                    >
                      {step.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily:
                          '"JetBrains Mono", monospace',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: step.color,
                      }}
                    >
                      {step.value}
                    </Typography>
                  </Box>
                  {i < arr.length - 1 && (
                    <ArrowIcon
                      sx={{
                        color: 'rgba(255,255,255,0.2)',
                        fontSize: '1rem',
                        mx: { md: 0.5 },
                        alignSelf: 'center',
                        transform: {
                          xs: 'rotate(90deg)',
                          md: 'rotate(0deg)',
                        },
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </Box>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.5)',
                lineHeight: 1.6,
                mb: 2,
              }}
            >
              Each merged PR earns a base score multiplied by
              token contribution and structural complexity.
              Credibility is raised to a tier-specific exponent
              — higher tiers penalize low credibility more.
              Open PRs incur collateral that is subtracted
              until they are merged or closed.
            </Typography>

            {/* Credibility Impact by Tier */}
            {tierConfigs &&
              tierConfigs.length > 0 &&
              minerStats.credibility !== undefined && (
                <CredibilityImpactTable
                  minerStats={minerStats}
                  tierConfigs={tierConfigs}
                />
              )}

            {/* Time Decay Info */}
            {scoringParams && (
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                  lineHeight: 1.6,
                  mb: 1.5,
                }}
              >
                Time decay: PRs have a{' '}
                {scoringParams.timeDecayGracePeriodHours}h
                grace period, then lose ~50% at{' '}
                {scoringParams.timeDecaySigmoidMidpoint} days.
                Score locks at merge time — merging quickly
                matters.
              </Typography>
            )}

            {/* Docs link */}
            <Typography
              component="a"
              href="https://docs.gittensor.io"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
                color: STATUS_COLORS.info,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Full documentation {'\u2192'} docs.gittensor.io
            </Typography>
          </Box>
        </Collapse>
      </Card>

      {/* Waterfall Chart */}
      <Card sx={{ p: { xs: 1.5, sm: 3 } }}>
        <Typography
          variant="sectionTitle"
          sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          Score Composition
        </Typography>
        {baseTotalScore > 0 && (
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.7rem',
              color: 'rgba(255, 255, 255, 0.4)',
              mb: 2,
            }}
          >
            Before credibility: {baseTotalScore.toFixed(2)} {'\u2192'}{' '}
            After: {grossScore.toFixed(2)}
            {credibilityCost > 0 && (
              <Box
                component="span"
                sx={{ color: STATUS_COLORS.warning, ml: 0.5 }}
              >
                {'\u2192'} Cost: -{credibilityCost.toFixed(2)}
              </Box>
            )}
          </Typography>
        )}
        <Box sx={{ height: { xs: 220, sm: 280 } }}>
          <ReactECharts
            option={waterfallOption}
            style={{ height: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </Box>
      </Card>

      {/* Two-column layout */}
      <Box
        sx={{
          display: 'flex',
          gap: { xs: 2, md: 3 },
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        {/* Scoring Parameters */}
        <Card sx={{ flex: 1, p: 0, overflow: 'hidden' }}>
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <Typography variant="sectionTitle">
              Scoring Parameters
            </Typography>
          </Box>

          {/* Base Scoring */}
          {baseParamRows.length > 0 && (
            <Box sx={{ p: 2 }}>
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.35)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  mb: 1.5,
                }}
              >
                Base Scoring
              </Typography>
              {baseParamRows.map((row, idx) => (
                <Tooltip
                  key={row.label}
                  title={row.tooltip}
                  arrow
                  placement="right"
                  slotProps={tooltipSlotProps}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1,
                      cursor: 'pointer',
                      borderBottom:
                        idx < baseParamRows.length - 1
                          ? '1px solid rgba(255,255,255,0.05)'
                          : 'none',
                      '&:hover': {
                        backgroundColor:
                          'rgba(255,255,255,0.03)',
                      },
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily:
                            '"JetBrains Mono", monospace',
                          fontSize: '0.8rem',
                          color: 'rgba(255,255,255,0.7)',
                        }}
                      >
                        {row.label}
                      </Typography>
                      <InfoOutlinedIcon
                        sx={{
                          fontSize: '0.7rem',
                          color: 'rgba(255,255,255,0.25)',
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontFamily:
                          '"JetBrains Mono", monospace',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#ffffff',
                        backgroundColor:
                          'rgba(255,255,255,0.06)',
                        px: 1.25,
                        py: 0.25,
                        borderRadius: 1,
                        minWidth: 36,
                        textAlign: 'center',
                      }}
                    >
                      {row.value}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
            </Box>
          )}

          {/* Tier Multipliers */}
          {tierConfigs && tierConfigs.length > 0 && (
            <Box
              sx={{
                p: 2,
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.35)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  mb: 1.5,
                }}
              >
                Tier Multipliers
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(3, 1fr)',
                  },
                  gap: 1.5,
                }}
              >
                {tierConfigs.map((tc) => {
                  const color =
                    tc.name === 'Gold'
                      ? TIER_COLORS.gold
                      : tc.name === 'Silver'
                        ? TIER_COLORS.silver
                        : TIER_COLORS.bronze;
                  return (
                    <Box
                      key={tc.name}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: `1px solid ${alpha(color, 0.3)}`,
                        backgroundColor: alpha(color, 0.04),
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: alpha(color, 0.08),
                          borderColor: alpha(color, 0.5),
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily:
                            '"JetBrains Mono", monospace',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          mb: 1,
                        }}
                      >
                        {tc.name}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily:
                              '"JetBrains Mono", monospace',
                            fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.5)',
                          }}
                        >
                          Cred Scalar
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily:
                              '"JetBrains Mono", monospace',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#ffffff',
                          }}
                        >
                          {tc.credibilityScalar}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily:
                              '"JetBrains Mono", monospace',
                            fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.5)',
                          }}
                        >
                          Collateral
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily:
                              '"JetBrains Mono", monospace',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#ffffff',
                          }}
                        >
                          {(
                            tc.openPrCollateralPercentage * 100
                          ).toFixed(0)}
                          %
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Card>

        {/* Top PRs by Score */}
        <Card sx={{ flex: 1, p: 0, overflow: 'hidden' }}>
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <Typography variant="sectionTitle">
              Top PRs by Score
            </Typography>
          </Box>
          {topPRs.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.85rem',
                }}
              >
                No scored PRs found
              </Typography>
            </Box>
          ) : (
            <Box>
              {topPRs.map((pr, idx) => {
                const maxScore =
                  parseFloat(topPRs[0].score || '0') || 1;
                const thisScore = parseFloat(pr.score || '0');
                const pct = Math.min(
                  (thisScore / maxScore) * 100,
                  100,
                );
                const rankColor =
                  idx === 0
                    ? TIER_COLORS.gold
                    : idx === 1
                      ? TIER_COLORS.silver
                      : idx === 2
                        ? TIER_COLORS.bronze
                        : 'rgba(255,255,255,0.25)';

                return (
                  <Box
                    key={`${pr.repository}-${pr.pullRequestNumber}`}
                    onClick={() =>
                      navigate(
                        `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
                        {
                          state: {
                            backLabel: `Back to ${username}`,
                          },
                        },
                      )
                    }
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      borderBottom:
                        idx < topPRs.length - 1
                          ? '1px solid rgba(255,255,255,0.06)'
                          : 'none',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor:
                          'rgba(255,255,255,0.04)',
                      },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'flex-start',
                      }}
                    >
                      {/* Rank badge */}
                      <Box
                        sx={{
                          minWidth: 28,
                          height: 28,
                          borderRadius: '50%',
                          border: `1.5px solid ${alpha(rankColor, 0.5)}`,
                          backgroundColor: alpha(
                            rankColor,
                            0.1,
                          ),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily:
                              '"JetBrains Mono", monospace',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            color: rankColor,
                          }}
                        >
                          {idx + 1}
                        </Typography>
                      </Box>

                      {/* Content */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily:
                                '"JetBrains Mono", monospace',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              color: '#ffffff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                              mr: 2,
                            }}
                          >
                            #{pr.pullRequestNumber}{' '}
                            {pr.pullRequestTitle}
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily:
                                '"JetBrains Mono", monospace',
                              fontSize: '1.05rem',
                              fontWeight: 700,
                              color: '#ffffff',
                              flexShrink: 0,
                            }}
                          >
                            {thisScore.toFixed(4)}
                          </Typography>
                        </Box>

                        {/* Score bar */}
                        <Box
                          sx={{
                            height: 3,
                            borderRadius: 2,
                            backgroundColor:
                              'rgba(255,255,255,0.08)',
                            mb: 0.75,
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              borderRadius: 2,
                              backgroundColor: alpha(
                                rankColor,
                                0.5,
                              ),
                              width: `${pct}%`,
                              transition:
                                'width 0.6s ease-out',
                            }}
                          />
                        </Box>

                        {/* Repo + mini stats */}
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 2,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily:
                                '"JetBrains Mono", monospace',
                              fontSize: '0.7rem',
                              color:
                                'rgba(255,255,255,0.35)',
                            }}
                          >
                            {pr.repository}
                          </Typography>
                          {pr.baseScore && (
                            <MiniStat
                              label="Base"
                              value={parseFloat(
                                pr.baseScore,
                              ).toFixed(2)}
                            />
                          )}
                          {pr.tokenScore !== undefined && (
                            <MiniStat
                              label="Token"
                              value={Number(
                                pr.tokenScore,
                              ).toFixed(2)}
                            />
                          )}
                          {pr.credibilityScalar !==
                            undefined && (
                            <MiniStat
                              label="Cred"
                              value={Number(
                                pr.credibilityScalar,
                              ).toFixed(2)}
                            />
                          )}
                          {pr.predictedUsdPerDay !==
                            undefined &&
                            pr.predictedUsdPerDay !==
                              null && (
                              <MiniStat
                                label="$/Day"
                                value={`$${pr.predictedUsdPerDay.toFixed(2)}`}
                                color={
                                  STATUS_COLORS.success
                                }
                              />
                            )}
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Card>
      </Box>
    </Box>
  );
};

const CredibilityImpactTable: React.FC<{
  minerStats: MinerEvaluation;
  tierConfigs: TierConfig[];
}> = ({ minerStats, tierConfigs }) => {
  const monoSx = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.75rem',
  };

  return (
    <Box
      sx={{
        mb: 2,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
      }}
    >
      <Typography
        sx={{
          ...monoSx,
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          mb: 1,
        }}
      >
        Credibility Impact by Tier
      </Typography>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 0.75,
          pb: 0.75,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Typography
          sx={{ ...monoSx, color: 'rgba(255,255,255,0.6)' }}
        >
          Overall Credibility
        </Typography>
        <Typography
          sx={{ ...monoSx, fontWeight: 700, color: '#ffffff' }}
        >
          {((minerStats.credibility || 0) * 100).toFixed(1)}%
        </Typography>
      </Box>
      {tierConfigs.map((tc) => {
        const tierKey = tc.name.toLowerCase() as
          | 'bronze'
          | 'silver'
          | 'gold';
        const tierCred =
          (minerStats[
            `${tierKey}Credibility` as keyof typeof minerStats
          ] as number) ||
          minerStats.credibility ||
          0;
        const mult = Math.pow(tierCred, tc.credibilityScalar);
        const tierColor =
          tc.name === 'Gold'
            ? TIER_COLORS.gold
            : tc.name === 'Silver'
              ? TIER_COLORS.silver
              : TIER_COLORS.bronze;
        const isCurrent = minerStats.currentTier === tc.name;
        return (
          <Box
            key={tc.name}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 0.5,
            }}
          >
            <Typography
              sx={{
                ...monoSx,
                color: tierColor,
                fontWeight: isCurrent ? 700 : 400,
              }}
            >
              {tc.name} (^{tc.credibilityScalar})
            </Typography>
            <Typography
              sx={{
                ...monoSx,
                fontWeight: 700,
                color:
                  mult < 0.6
                    ? STATUS_COLORS.error
                    : mult < 0.8
                      ? STATUS_COLORS.warning
                      : '#ffffff',
              }}
            >
              {mult.toFixed(2)}x
              {isCurrent && (
                <Box
                  component="span"
                  sx={{
                    color: 'rgba(255,255,255,0.4)',
                    ml: 0.5,
                    fontSize: '0.65rem',
                  }}
                >
                  {'\u2190'} YOUR TIER
                </Box>
              )}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

const MiniStat: React.FC<{
  label: string;
  value: string;
  color?: string;
}> = ({ label, value, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    <Typography
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
      }}
    >
      {label}:
    </Typography>
    <Typography
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: color || 'rgba(255,255,255,0.7)',
      }}
    >
      {value}
    </Typography>
  </Box>
);

export default MinerScoreTab;
