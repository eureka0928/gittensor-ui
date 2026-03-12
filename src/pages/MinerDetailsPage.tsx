import React, { useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Skeleton,
  alpha,
} from '@mui/material';
import { WarningAmber as WarningIcon } from '@mui/icons-material';
import { Page } from '../components/layout';
import {
  MinerProfileHeader,
  MinerDetailsTabs,
  MinerOverviewTab,
  MinerActivityTab,
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
  'activity',
  'pull-requests',
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
    navigate('/top-miners');
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
    const skeletonBg = 'rgba(255, 255, 255, 0.05)';
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Profile header skeleton */}
        <Box
          sx={{
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            p: { xs: 2, md: 3 },
            display: 'flex',
            gap: 2.5,
            alignItems: 'flex-start',
          }}
        >
          <Skeleton
            variant="circular"
            sx={{
              bgcolor: skeletonBg,
              flexShrink: 0,
              width: { xs: 56, md: 80 },
              height: { xs: 56, md: 80 },
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Skeleton
              variant="rounded"
              width="60%"
              height={32}
              sx={{ bgcolor: skeletonBg, mb: 1.5 }}
            />
            <Skeleton
              variant="text"
              width="40%"
              height={20}
              sx={{ bgcolor: skeletonBg, mb: 1 }}
            />
            <Skeleton
              variant="text"
              width="70%"
              height={16}
              sx={{ bgcolor: skeletonBg }}
            />
          </Box>
        </Box>

        {/* Earnings strip skeleton */}
        <Box
          sx={{
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            p: 2,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
          }}
        >
          <Skeleton
            variant="rounded"
            sx={{
              bgcolor: skeletonBg,
              flex: { md: '0 0 35%' },
              height: { xs: 100, md: 120 },
              borderRadius: 2,
            }}
          />
          <Box
            sx={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
              },
              gap: 1.5,
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={52}
                sx={{ bgcolor: skeletonBg, borderRadius: 2 }}
              />
            ))}
          </Box>
        </Box>

        {/* Tab bar skeleton */}
        <Skeleton
          variant="rounded"
          width="100%"
          height={40}
          sx={{ bgcolor: skeletonBg, borderRadius: 2 }}
        />
      </Box>
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
      {/* Profile + Stats Card */}
      <MinerProfileHeader
        minerStats={minerStats}
        githubData={githubData}
        prs={prs}
        githubId={githubId}
        allMinersStats={allMinersStats}
        prScoring={generalConfig?.repositoryPrScoring}
      />

      {/* Failed Reason Banner */}
      {minerStats.failedReason && (
        <Card
          sx={{
            p: 2,
            backgroundColor: alpha(STATUS_COLORS.error, 0.08),
            border: `1px solid ${alpha(STATUS_COLORS.error, 0.3)}`,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
          elevation={0}
        >
          <WarningIcon
            sx={{
              color: STATUS_COLORS.error,
              fontSize: '1.2rem',
              mt: 0.25,
              flexShrink: 0,
            }}
          />
          <Box>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: STATUS_COLORS.error,
                mb: 0.5,
              }}
            >
              Scoring Issue Detected
            </Typography>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.8rem',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: 1.5,
              }}
            >
              {minerStats.failedReason}
            </Typography>
          </Box>
        </Card>
      )}

      {/* Tabs */}
      <Box
        sx={{
          position: { xs: 'sticky', md: 'static' },
          top: { xs: 0, md: 'auto' },
          zIndex: 10,
          mx: { xs: -2, sm: -2, md: 0 },
          px: { xs: 2, sm: 2, md: 0 },
          py: { xs: 0.5, md: 0 },
          backgroundColor: {
            xs: 'rgba(18, 18, 20, 0.95)',
            md: 'transparent',
          },
          backdropFilter: { xs: 'blur(8px)', md: 'none' },
        }}
      >
        <MinerDetailsTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      </Box>

      {/* Tab Content */}
      <Box
        key={activeTab}
        sx={{
          '@keyframes tabSlideUp': {
            from: { opacity: 0, transform: 'translateY(12px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          animation: 'tabSlideUp 0.3s ease-out',
        }}
      >
        {activeTab === 'overview' && (
          <MinerOverviewTab
            minerStats={minerStats}
            prs={prs}
            tierConfigs={tierConfigs}
            prScoring={generalConfig?.repositoryPrScoring}
          />
        )}

        {activeTab === 'activity' && (
          <MinerActivityTab
            minerStats={minerStats}
            prs={prs}
            repos={repos}
            allMinerStats={allMinersStats}
            isLoadingPRs={isLoadingPRs}
          />
        )}

        {activeTab === 'pull-requests' && (
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
      </Box>
    </>
  );
};

export default MinerDetailsPage;
