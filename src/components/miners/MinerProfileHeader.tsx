import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Stack,
  alpha,
} from '@mui/material';
import {
  Language as WebsiteIcon,
  Twitter as TwitterIcon,
  LocationOn as LocationIcon,
  Business as CompanyIcon,
  CheckCircle as HireableIcon,
  GitHub as GitHubIcon,
  People as FollowersIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import {
  type MinerEvaluation,
  type GithubMinerData,
  type CommitLog,
} from '../../api';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) {
    const mins = diffMins % 60;
    return mins > 0 ? `${diffHours}h ${mins}m ago` : `${diffHours}h ago`;
  }
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};

interface MinerProfileHeaderProps {
  minerStats: MinerEvaluation;
  githubData?: GithubMinerData;
  prs?: CommitLog[];
  githubId: string;
}

const MinerProfileHeader: React.FC<MinerProfileHeaderProps> = ({
  minerStats,
  githubData,
  prs,
  githubId,
}) => {
  const username = githubData?.login || prs?.[0]?.author || githubId;

  const tierColor =
    minerStats.currentTier === 'Gold'
      ? TIER_COLORS.gold
      : minerStats.currentTier === 'Silver'
        ? TIER_COLORS.silver
        : minerStats.currentTier === 'Bronze'
          ? TIER_COLORS.bronze
          : '#ffffff';

  const isUnranked = !minerStats.currentTier;

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'transparent',
        p: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
        }}
      >
        {/* Identity Column */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5 }}>
          <Avatar
            src={`https://avatars.githubusercontent.com/${username}`}
            alt={username}
            sx={{
              width: 80,
              height: 80,
              border: '2px solid rgba(255, 255, 255, 0.1)',
            }}
          />
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1.5,
                mb: 0.5,
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'stretch',
                  border: '1px solid',
                  borderColor: isUnranked
                    ? 'rgba(255, 255, 255, 0.2)'
                    : alpha(tierColor, 0.5),
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      color: '#ffffff',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    {githubData?.name || username}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    px: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    borderLeft: '1px solid',
                    borderColor: isUnranked
                      ? 'rgba(255, 255, 255, 0.1)'
                      : alpha(tierColor, 0.3),
                    backgroundColor: isUnranked
                      ? 'transparent'
                      : alpha(tierColor, 0.1),
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.875rem',
                      color: isUnranked
                        ? 'rgba(255, 255, 255, 0.4)'
                        : tierColor,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      fontWeight: 700,
                    }}
                  >
                    {minerStats.currentTier || 'Unranked'} Tier
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Typography
              component="a"
              href={`https://github.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'primary.main',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '1.1rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                '&:hover': { textDecoration: 'underline' },
                mb: 1,
              }}
            >
              <GitHubIcon fontSize="small" />@{username}
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mt: 0.5,
                flexWrap: 'wrap',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  sx={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Hotkey:
                </Typography>
                <Typography
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.75rem',
                  }}
                >
                  {minerStats.hotkey || 'N/A'}
                </Typography>
              </Box>

              {minerStats.updatedAt && (
                <Chip
                  icon={<UpdateIcon sx={{ fontSize: '0.9rem' }} />}
                  label={`Updated ${formatTimeAgo(new Date(minerStats.updatedAt))}`}
                  variant="outlined"
                  size="small"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.7rem',
                    color: 'rgba(255, 255, 255, 0.5)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    '& .MuiChip-icon': {
                      color: 'rgba(255, 255, 255, 0.4)',
                    },
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Extended Details Column */}
        {githubData && (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {githubData.bio && (
              <Typography
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontStyle: 'italic',
                  mb: 2,
                  fontSize: '0.95rem',
                  maxWidth: '600px',
                }}
              >
                {githubData.bio}
              </Typography>
            )}

            <Stack direction="row" gap={1.5} flexWrap="wrap">
              {githubData.company && (
                <Chip
                  variant="info"
                  icon={<CompanyIcon />}
                  label={githubData.company}
                />
              )}
              {githubData.location && (
                <Chip
                  variant="info"
                  icon={<LocationIcon />}
                  label={githubData.location}
                />
              )}
              {githubData.blog && (
                <Chip
                  variant="status"
                  component="a"
                  href={
                    githubData.blog.startsWith('http')
                      ? githubData.blog
                      : `https://${githubData.blog}`
                  }
                  target="_blank"
                  icon={<WebsiteIcon />}
                  label="Website"
                  clickable
                  sx={{
                    color: STATUS_COLORS.info,
                    borderColor: alpha(STATUS_COLORS.info, 0.3),
                    '& .MuiChip-icon': { color: STATUS_COLORS.info },
                  }}
                />
              )}
              {githubData.twitterUsername && (
                <Chip
                  variant="status"
                  component="a"
                  href={`https://twitter.com/${githubData.twitterUsername}`}
                  target="_blank"
                  icon={<TwitterIcon />}
                  label={`@${githubData.twitterUsername}`}
                  clickable
                  sx={{
                    color: '#1DA1F2',
                    borderColor: 'rgba(29, 161, 242, 0.3)',
                    '& .MuiChip-icon': { color: '#1DA1F2' },
                  }}
                />
              )}
              {githubData.hireable && (
                <Chip
                  icon={<HireableIcon />}
                  label="Open to Work"
                  color="success"
                  variant="outlined"
                />
              )}
              <Chip
                variant="info"
                icon={<FollowersIcon />}
                label={`${githubData.followers} followers`}
              />
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MinerProfileHeader;
