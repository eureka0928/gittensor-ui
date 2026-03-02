import React from 'react';
import { Box, Typography } from '@mui/material';

export type MinerTab = 'overview' | 'contributions' | 'tiers' | 'score';

const TABS: { label: string; value: MinerTab }[] = [
  { label: 'Overview', value: 'overview' },
  { label: 'Contributions', value: 'contributions' },
  { label: 'Tiers', value: 'tiers' },
  { label: 'Score Breakdown', value: 'score' },
];

interface MinerDetailsTabsProps {
  activeTab: MinerTab;
  onTabChange: (tab: MinerTab) => void;
}

const MinerDetailsTabs: React.FC<MinerDetailsTabsProps> = ({
  activeTab,
  onTabChange,
}) => (
  <Box
    sx={{
      display: 'flex',
      gap: 0.5,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      p: 0.5,
      borderRadius: 2,
      overflowX: 'auto',
      '&::-webkit-scrollbar': { height: 0 },
    }}
  >
    {TABS.map((tab) => (
      <Box
        key={tab.value}
        onClick={() => onTabChange(tab.value)}
        sx={{
          px: { xs: 1.5, sm: 2.5 },
          py: 1,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 1.5,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          backgroundColor:
            activeTab === tab.value
              ? 'rgba(255, 255, 255, 0.15)'
              : 'transparent',
          color:
            activeTab === tab.value
              ? '#fff'
              : 'rgba(255, 255, 255, 0.5)',
          transition: 'all 0.2s',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#e6edf3',
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: { xs: '0.75rem', sm: '0.8rem' },
            fontWeight: 600,
          }}
        >
          {tab.label}
        </Typography>
      </Box>
    ))}
  </Box>
);

export default MinerDetailsTabs;
