import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { STATUS_COLORS } from '../../theme';

interface PerformanceRadarProps {
  credibility: number;
  complexity: number;
  issuesSolved: number;
  uniqueRepos: number;
  totalPRs: number;
  avgRepoWeight: number;
}

const INDICATOR_NAMES = [
  'Credibility',
  'Complexity',
  'Issues\nSolved',
  'Unique\nRepos',
  'Total\nPRs',
  'Avg Repo\nWeight',
];

const PerformanceRadar: React.FC<PerformanceRadarProps> = ({
  credibility,
  complexity,
  issuesSolved,
  uniqueRepos,
  totalPRs,
  avgRepoWeight,
}) => {
  const values = [
    credibility,
    complexity,
    issuesSolved,
    uniqueRepos,
    totalPRs,
    avgRepoWeight,
  ];

  const chartOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: 'rgba(30, 30, 30, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
          color: '#ffffff',
        },
        formatter: () =>
          INDICATOR_NAMES.map(
            (name, i) =>
              `${name.replace('\n', ' ')}: ${values[i].toFixed(0)}%`,
          ).join('<br/>'),
      },
      radar: {
        indicator: [
          { name: 'Credibility', max: 100 },
          { name: 'Complexity', max: 100 },
          { name: 'Issues\nSolved', max: 100 },
          { name: 'Unique\nRepos', max: 100 },
          { name: 'Total\nPRs', max: 100 },
          { name: 'Avg Repo\nWeight', max: 100 },
        ],
        center: ['50%', '50%'],
        radius: '55%',
        shape: 'circle',
        splitNumber: 5,
        axisName: {
          color: 'rgba(255, 255, 255, 0.6)',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          lineHeight: 14,
        },
        splitLine: {
          lineStyle: {
            color: Array(5).fill('rgba(255, 255, 255, 0.05)'),
          },
        },
        splitArea: { show: false },
        axisLine: {
          lineStyle: { color: 'rgba(255, 255, 255, 0.1)' },
        },
      },
      series: [
        {
          type: 'radar',
          lineStyle: {
            width: 2,
            color: STATUS_COLORS.merged,
          },
          areaStyle: {
            color: `${STATUS_COLORS.merged}33`,
          },
          animationDuration: 800,
          animationEasing: 'cubicOut',
          data: [
            {
              value: values,
              name: 'Miner Stats',
              symbol: 'circle',
              symbolSize: 4,
              itemStyle: { color: STATUS_COLORS.merged },
            },
          ],
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      credibility,
      complexity,
      issuesSolved,
      uniqueRepos,
      totalPRs,
      avgRepoWeight,
    ],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Typography
        variant="monoSmall"
        sx={{
          color: 'rgba(255, 255, 255, 0.4)',
          mb: 2,
          textAlign: 'center',
        }}
      >
        Performance Profile
      </Typography>
      <Box sx={{ height: '260px', width: '100%' }}>
        <ReactECharts
          option={chartOption}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'svg' }}
        />
      </Box>
    </Box>
  );
};

export default PerformanceRadar;
