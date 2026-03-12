import React, { useCallback } from 'react';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';

export type MinerTab =
  | 'overview'
  | 'pull-requests'
  | 'activity'
  | 'tiers'
  | 'score';

const TABS: { label: string; shortLabel?: string; value: MinerTab }[] = [
  { label: 'Overview', value: 'overview' },
  { label: 'Activity', value: 'activity' },
  { label: 'Pull Requests', shortLabel: 'PRs', value: 'pull-requests' },
  { label: 'Tiers', value: 'tiers' },
  { label: 'Score Breakdown', shortLabel: 'Score', value: 'score' },
];

interface MinerDetailsTabsProps {
  activeTab: MinerTab;
  onTabChange: (tab: MinerTab) => void;
}

const MinerDetailsTabs: React.FC<MinerDetailsTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  const muiTheme = useTheme();
  const isSmall = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIdx = TABS.findIndex((t) => t.value === activeTab);
      let nextIdx = -1;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextIdx = (currentIdx + 1) % TABS.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextIdx = (currentIdx - 1 + TABS.length) % TABS.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIdx = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIdx = TABS.length - 1;
      }

      if (nextIdx >= 0) {
        onTabChange(TABS[nextIdx].value);
        const tabEl = (e.currentTarget as HTMLElement).children[
          nextIdx
        ] as HTMLElement;
        tabEl?.focus();
      }
    },
    [activeTab, onTabChange],
  );

  return (
    <Box
      sx={{
        position: 'relative',
        // Right-edge gradient fade hint on mobile
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: 32,
          height: '100%',
          background:
            'linear-gradient(to right, transparent, rgba(18, 18, 20, 0.9))',
          pointerEvents: 'none',
          zIndex: 1,
          display: { xs: 'block', sm: 'none' },
          borderRadius: '0 8px 8px 0',
        },
      }}
    >
      <Box
        role="tablist"
        aria-label="Miner detail tabs"
        onKeyDown={handleKeyDown}
        sx={{
          display: 'flex',
          gap: 0.5,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          p: 0.5,
          borderRadius: 2,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 0 },
          // Smooth scroll on touch
          WebkitOverflowScrolling: 'touch',
        }}
      >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <Box
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.value}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.value)}
            sx={{
              px: { xs: 1.5, sm: 2.5 },
              py: 1,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 1.5,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              outline: 'none',
              backgroundColor: isActive
                ? 'rgba(255, 255, 255, 0.15)'
                : 'transparent',
              color: isActive
                ? '#fff'
                : 'rgba(255, 255, 255, 0.5)',
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#e6edf3',
              },
              '&:focus-visible': {
                boxShadow:
                  '0 0 0 2px rgba(99, 179, 237, 0.6)',
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
              {isSmall && tab.shortLabel
                ? tab.shortLabel
                : tab.label}
            </Typography>
          </Box>
        );
      })}
      </Box>
    </Box>
  );
};

export default MinerDetailsTabs;
