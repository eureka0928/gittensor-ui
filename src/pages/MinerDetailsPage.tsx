import React, { useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Card, Typography, alpha } from '@mui/material';
import { Page } from '../components/layout';
import {
  MinerProfileHeader,
  MinerEarningsStrip,
  MinerDetailsTabs,
  MinerOverviewTab,
  MinerContributionsTab,
  MinerTierTab,
  MinerScoreTab,
  BackButton,
  SEO,
} from '../components';
import { type MinerTab } from '../components/miners/MinerDetailsTabs';
import {
  useMinerStats,
  useMinerPRs,
  useMinerGithubData,
  useAllMiners,
  useGeneralConfig,
  useReposAndWeights,
  useTierConfigurations,
} from '../api';
import { STATUS_COLORS } from '../theme';

const VALID_TABS: MinerTab[] = [
  'overview',
  'contributions',
  'tiers',
  'score',
];

const MinerDetailsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const githubId = searchParams.get('githubId');
  const tabParam = searchParams.get('tab') as MinerTab | null;
  const activeTab =
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'overview';

  const handleTabChange = useCallback(
    (tab: MinerTab) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === 'overview') {
            next.delete('tab');
          } else {
            next.set('tab', tab);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // If no githubId is provided, redirect to miners page
  if (!githubId) {
    navigate('/miners');
    return null;
  }

  return (
    <Page title="Miner Details">
      <SEO
        title={`Miner Stats - ${githubId}`}
        description={`View detailed statistics, contributions, and pull requests for ${githubId} on Gittensor. Track open source contributions and rewards.`}
        type="website"
      />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          minHeight: { xs: 'auto', md: 'calc(100vh - 80px)' },
          width: '100%',
          py: { xs: 2, sm: 3 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            maxWidth: 1200,
            width: '100%',
            px: { xs: 2, sm: 2, md: 0 },
          }}
        >
          <BackButton to="/top-miners" />
          <MinerDetailsContent
            githubId={githubId}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </Box>
      </Box>
    </Page>
  );
};

interface MinerDetailsContentProps {
  githubId: string;
  activeTab: MinerTab;
  onTabChange: (tab: MinerTab) => void;
}

const MinerDetailsContent: React.FC<MinerDetailsContentProps> = ({
  githubId,
  activeTab,
  onTabChange,
}) => {
  // Lift all shared API hooks to page level
  const {
    data: minerStats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useMinerStats(githubId);
  const { data: prs, isLoading: isLoadingPRs } = useMinerPRs(githubId);
  const { data: githubData } = useMinerGithubData(githubId);
  const { data: allMinersStats } = useAllMiners();
  const { data: generalConfig } = useGeneralConfig();
  const { data: repos } = useReposAndWeights();
  const { data: tierConfigData } = useTierConfigurations();

  const tierConfigs = tierConfigData?.tiers;

  if (isLoadingStats) {
    return (
      <Card
        sx={{
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'transparent',
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  if (statsError || !minerStats) {
    return (
      <Card
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          p: 4,
        }}
      >
        <Typography
          sx={{
            color: alpha(STATUS_COLORS.error, 0.9),
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.9rem',
          }}
        >
          No data found for GitHub user: {githubId}
        </Typography>
      </Card>
    );
  }

  return (
    <>
      {/* Profile Header */}
      <MinerProfileHeader
        minerStats={minerStats}
        githubData={githubData}
        prs={prs}
        githubId={githubId}
      />

      {/* Earnings Strip */}
      <MinerEarningsStrip
        minerStats={minerStats}
        allMinersStats={allMinersStats}
        prScoring={generalConfig?.repositoryPrScoring}
      />

      {/* Tabs */}
      <MinerDetailsTabs
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <MinerOverviewTab
          minerStats={minerStats}
          prs={prs}
          repos={repos}
          allMinerStats={allMinersStats}
          tierConfigs={tierConfigs}
          isLoadingPRs={isLoadingPRs}
        />
      )}

      {activeTab === 'contributions' && (
        <MinerContributionsTab
          prs={prs}
          repos={repos}
          githubId={githubId}
        />
      )}

      {activeTab === 'tiers' && (
        <MinerTierTab
          githubId={githubId}
          minerStats={minerStats}
          tierConfigs={tierConfigs}
        />
      )}

      {activeTab === 'score' && (
        <MinerScoreTab
          minerStats={minerStats}
          prs={prs}
          generalConfig={generalConfig}
          tierConfigs={tierConfigs}
          githubId={githubId}
        />
      )}
    </>
  );
};

export default MinerDetailsPage;
