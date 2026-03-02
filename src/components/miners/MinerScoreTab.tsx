import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  alpha,
} from '@mui/material';
import ReactECharts from 'echarts-for-react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useNavigate } from 'react-router-dom';
import {
  type MinerEvaluation,
  type CommitLog,
  type GeneralConfigResponse,
  type TierConfig,
} from '../../api';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';

interface MinerScoreTabProps {
  minerStats: MinerEvaluation;
  prs?: CommitLog[];
  generalConfig?: GeneralConfigResponse;
  tierConfigs?: TierConfig[];
  githubId: string;
}

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
      maxWidth: 280,
    },
  },
  arrow: {
    sx: {
      color: 'rgba(30, 30, 30, 0.95)',
    },
  },
};

const MinerScoreTab: React.FC<MinerScoreTabProps> = ({
  minerStats,
  prs,
  generalConfig,
  tierConfigs,
  githubId,
}) => {
  const navigate = useNavigate();
  const username = prs?.[0]?.author || githubId;

  // Score composition
  const bronzeScore = Number(minerStats.bronzeScore || 0);
  const silverScore = Number(minerStats.silverScore || 0);
  const goldScore = Number(minerStats.goldScore || 0);
  const collateral = Number(minerStats.totalCollateralScore || 0);
  const netScore = Number(minerStats.totalScore || 0);

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
            netScore, // Collateral starts at net, draws up to gross
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
    [bronzeScore, silverScore, goldScore, collateral, netScore],
  );

  // Multiplier reference
  const scoringParams = generalConfig?.repositoryPrScoring;
  const multiplierRows = useMemo(() => {
    const rows: {
      label: string;
      value: string;
      tooltip: string;
    }[] = [];

    if (scoringParams) {
      rows.push(
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
      );
    }

    if (tierConfigs) {
      tierConfigs.forEach((tc) => {
        rows.push({
          label: `${tc.name} Credibility Scalar`,
          value: String(tc.credibilityScalar),
          tooltip: `Exponential scalar applied to credibility for ${tc.name} tier.`,
        });
        rows.push({
          label: `${tc.name} Collateral %`,
          value: `${(tc.openPrCollateralPercentage * 100).toFixed(0)}%`,
          tooltip: `Percentage of PR score deducted as collateral for open PRs in ${tc.name} tier.`,
        });
      });
    }

    return rows;
  }, [scoringParams, tierConfigs]);

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
      {/* Waterfall Chart */}
      <Card sx={{ p: 3 }}>
        <Typography
          variant="sectionTitle"
          sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          Score Composition
        </Typography>
        <ReactECharts
          option={waterfallOption}
          style={{ height: 280 }}
          opts={{ renderer: 'svg' }}
        />
      </Card>

      {/* Two-column layout */}
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        {/* Multiplier Reference */}
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
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={paramHeaderStyle}>
                    Parameter
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={paramHeaderStyle}
                  >
                    Value
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {multiplierRows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell sx={paramCellStyle}>
                      <Tooltip
                        title={row.tooltip}
                        arrow
                        placement="right"
                        slotProps={tooltipSlotProps}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            cursor: 'pointer',
                          }}
                        >
                          {row.label}
                          <InfoOutlinedIcon
                            sx={{
                              fontSize: '0.7rem',
                              color:
                                'rgba(255,255,255,0.3)',
                            }}
                          />
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        ...paramCellStyle,
                        fontWeight: 600,
                      }}
                    >
                      {row.value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
              {topPRs.map((pr, idx) => (
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
                    p: 2,
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
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 0.5,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
                      <Typography
                        sx={{
                          fontFamily:
                            '"JetBrains Mono", monospace',
                          fontSize: '0.8rem',
                          color: '#ffffff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        #{pr.pullRequestNumber}{' '}
                        {pr.pullRequestTitle}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily:
                            '"JetBrains Mono", monospace',
                          fontSize: '0.65rem',
                          color: 'rgba(255,255,255,0.4)',
                        }}
                      >
                        {pr.repository}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontFamily:
                          '"JetBrains Mono", monospace',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: '#ffffff',
                        flexShrink: 0,
                      }}
                    >
                      {parseFloat(pr.score).toFixed(4)}
                    </Typography>
                  </Box>
                  {/* Inline breakdown */}
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      flexWrap: 'wrap',
                      mt: 0.5,
                    }}
                  >
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
                        value={pr.tokenScore.toFixed(2)}
                      />
                    )}
                    {pr.credibilityScalar !== undefined && (
                      <MiniStat
                        label="Cred"
                        value={pr.credibilityScalar.toFixed(
                          2,
                        )}
                      />
                    )}
                    {pr.predictedUsdPerDay !== undefined &&
                      pr.predictedUsdPerDay !== null && (
                        <MiniStat
                          label="$/Day"
                          value={`$${pr.predictedUsdPerDay.toFixed(2)}`}
                          color={STATUS_COLORS.success}
                        />
                      )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Card>
      </Box>
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
        fontSize: '0.6rem',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
      }}
    >
      {label}:
    </Typography>
    <Typography
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: color || 'rgba(255,255,255,0.7)',
      }}
    >
      {value}
    </Typography>
  </Box>
);

const paramHeaderStyle = {
  backgroundColor: 'rgba(18, 18, 20, 0.95)',
  color: 'rgba(255, 255, 255, 0.7)',
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: '0.7rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  py: 1,
  px: 2,
};

const paramCellStyle = {
  color: '#ffffff',
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  fontSize: '0.75rem',
  py: 1,
  px: 2,
};

export default MinerScoreTab;
