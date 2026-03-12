import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Grid,
  Tooltip,
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
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import {
  type MinerEvaluation,
  type GithubMinerData,
  type CommitLog,
  type RepositoryPrScoring,
} from '../../api';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';
import {
  formatTimeAgo,
  calculateDynamicThreshold,
  getOpenPrColor,
  getTierLevel,
} from '../../utils';
import { tooltipSlotProps } from './TierComponents';

interface MinerProfileHeaderProps {
  minerStats: MinerEvaluation;
  githubData?: GithubMinerData;
  prs?: CommitLog[];
  githubId: string;
  allMinersStats?: MinerEvaluation[];
  prScoring?: RepositoryPrScoring;
}

const MinerProfileHeader: React.FC<MinerProfileHeaderProps> = ({
  minerStats,
  githubData,
  prs,
  githubId,
  allMinersStats,
  prScoring,
}) => {
  const username = githubData?.login || prs?.[0]?.author || githubId;
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const tierColor =
    minerStats.currentTier === 'Gold'
      ? TIER_COLORS.gold
      : minerStats.currentTier === 'Silver'
        ? TIER_COLORS.silver
        : minerStats.currentTier === 'Bronze'
          ? TIER_COLORS.bronze
          : 'rgba(255, 255, 255, 0.4)';

  const tierGradient =
    minerStats.currentTier === 'Gold'
      ? `linear-gradient(135deg, ${TIER_COLORS.gold}, #FFA500)`
      : minerStats.currentTier === 'Silver'
        ? `linear-gradient(135deg, ${TIER_COLORS.silver}, #8FAADC)`
        : minerStats.currentTier === 'Bronze'
          ? `linear-gradient(135deg, ${TIER_COLORS.bronze}, #E8A87C)`
          : 'linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.2))';

  const isUnranked = !minerStats.currentTier;

  const handleCopy = (value: string, field: string) => {
    navigator.clipboard.writeText(value).catch(() => {
      /* clipboard unavailable in insecure contexts */
    });
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // --- Stat calculations ---
  const currentTierLevel = getTierLevel(minerStats.currentTier);
  const openPrThreshold = calculateDynamicThreshold(
    minerStats.currentTier,
    minerStats.bronzeTokenScore || 0,
    minerStats.silverTokenScore || 0,
    minerStats.goldTokenScore || 0,
    prScoring,
  );
  const topPR = useMemo(() => {
    if (!prs || prs.length === 0) return null;
    return prs.reduce((max, pr) => {
      const prScore = parseFloat(pr.score || '0');
      const maxScore = parseFloat(max.score || '0');
      return prScore > maxScore ? pr : max;
    }, prs[0]);
  }, [prs]);

  const openPrs = Number(minerStats.totalOpenPrs || 0);
  const openPrColor = getOpenPrColor(openPrs, openPrThreshold);
  const collateral = Number(minerStats.totalCollateralScore || 0);
  const credibility = Number(minerStats.credibility || 0);
  const dailyUsd = minerStats.usdPerDay ?? 0;

  const credibilityColor =
    credibility >= 0.9
      ? STATUS_COLORS.success
      : credibility >= 0.7
        ? '#a3e635'
        : credibility >= 0.5
          ? '#facc15'
          : credibility >= 0.3
            ? '#fb923c'
            : '#f87171';

  const rankings = useMemo(() => {
    if (!allMinersStats) return null;
    const rankOf = (
      sortFn: (a: MinerEvaluation, b: MinerEvaluation) => number,
    ) => {
      const idx = allMinersStats
        .slice()
        .sort(sortFn)
        .findIndex((m) => m.githubId === minerStats.githubId);
      return idx >= 0 ? idx + 1 : null;
    };
    return {
      score: rankOf((a, b) => Number(b.totalScore) - Number(a.totalScore)),
      credibility: rankOf(
        (a, b) => Number(b.credibility || 0) - Number(a.credibility || 0),
      ),
      totalPrs: rankOf(
        (a, b) => Number(b.totalPrs) - Number(a.totalPrs),
      ),
    };
  }, [allMinersStats, minerStats.githubId]);

  const openRiskTooltip = useMemo(() => {
    const base = prScoring?.excessivePrPenaltyThreshold ?? 10;
    const tokenScorePer = prScoring?.openPrThresholdTokenScore ?? 500;
    const tiers = [
      { name: 'Bronze', score: Number(minerStats.bronzeTokenScore || 0), unlocked: currentTierLevel >= 1 },
      { name: 'Silver', score: Number(minerStats.silverTokenScore || 0), unlocked: currentTierLevel >= 2 },
      { name: 'Gold', score: Number(minerStats.goldTokenScore || 0), unlocked: currentTierLevel >= 3 },
    ];
    const unlockedTotal = tiers.filter((t) => t.unlocked).reduce((s, t) => s + t.score, 0);
    const bonus = Math.floor(unlockedTotal / tokenScorePer);
    const lines = [`Base threshold: ${base}`];
    tiers.forEach((t) => {
      if (t.score > 0 || t.unlocked) {
        const status = t.unlocked ? `+${Math.round(t.score)}` : `${Math.round(t.score)} (locked)`;
        lines.push(`${t.name}: ${status}`);
      }
    });
    if (bonus > 0) lines.push(`Bonus: +${bonus} (${Math.round(unlockedTotal)} / ${tokenScorePer})`);
    const lockedTier = tiers.find((t) => !t.unlocked && t.score > 0);
    if (lockedTier) lines.push(`Unlock ${lockedTier.name} to raise your threshold.`);
    return lines.join('\n');
  }, [minerStats, prScoring, currentTierLevel]);

  const getRankColor = (rank: number | null) => {
    if (!rank) return 'rgba(255, 255, 255, 0.6)';
    if (rank === 1) return TIER_COLORS.gold;
    if (rank === 2) return TIER_COLORS.silver;
    if (rank === 3) return TIER_COLORS.bronze;
    return 'rgba(255, 255, 255, 0.6)';
  };

  // --- Stat card data ---
  const totalScore = Number(minerStats.totalScore || 0);
  const bronzeScore = Number(minerStats.bronzeScore || 0);
  const silverScore = Number(minerStats.silverScore || 0);
  const goldScore = Number(minerStats.goldScore || 0);
  const grossScore = bronzeScore + silverScore + goldScore;
  const totalTokenScore = Number(minerStats.totalTokenScore || 0);
  const totalPrs = Number(minerStats.totalPrs || 0);
  const mergedPrs = Number(minerStats.totalMergedPrs || 0);
  const closedPrs = Number(minerStats.totalClosedPrs || 0);
  const totalLines = useMemo(() => {
    const fromStats =
      (minerStats.totalAdditions ?? 0) + (minerStats.totalDeletions ?? 0);
    if (fromStats > 0) return fromStats;
    // Fallback: sum from individual PRs
    if (!prs || prs.length === 0) return 0;
    return prs.reduce(
      (sum, pr) => sum + Number(pr.additions || 0) + Number(pr.deletions || 0),
      0,
    );
  }, [minerStats.totalAdditions, minerStats.totalDeletions, prs]);
  const qualifiedRepos = minerStats.qualifiedUniqueReposCount ?? 0;
  const riskPct = Math.min((openPrs / openPrThreshold) * 100, 120);

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: !isUnranked
          ? alpha(tierColor, 0.15)
          : 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'transparent',
        p: { xs: 2, sm: 2.5, md: 3 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient radial glow from avatar position */}
      {!isUnranked && (
        <Box
          sx={{
            position: 'absolute',
            top: { xs: -20, md: -40 },
            left: { xs: -20, md: -10 },
            width: { xs: 200, md: 280 },
            height: { xs: 200, md: 280 },
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(tierColor, 0.08)} 0%, transparent 70%)`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* Updated chip — absolute top-right (desktop) */}
      {minerStats.updatedAt && (
        <Chip
          icon={<UpdateIcon sx={{ fontSize: '0.8rem' }} />}
          label={`Updated ${formatTimeAgo(new Date(minerStats.updatedAt))}`}
          variant="outlined"
          size="small"
          sx={{
            display: { xs: 'none', sm: 'flex' },
            position: 'absolute',
            top: 14,
            right: 14,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.65rem',
            color: 'rgba(255, 255, 255, 0.4)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 2,
            '& .MuiChip-icon': { color: 'rgba(255, 255, 255, 0.3)' },
          }}
        />
      )}

      {/* Identity Section */}
      <Box sx={{ mb: 3, position: 'relative', zIndex: 1 }}>
        {/* Top row: Avatar + Info */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 2, md: 3 },
          }}
        >
          {/* Avatar with rotating ring frame */}
          <Box
            sx={{
              position: 'relative',
              flexShrink: 0,
              width: { xs: 64, md: 76 },
              height: { xs: 64, md: 76 },
            }}
          >
            <Avatar
              src={`https://avatars.githubusercontent.com/${username}`}
              alt={username}
              sx={{
                width: '100%',
                height: '100%',
                border: '2.5px solid',
                borderColor: !isUnranked
                  ? tierColor
                  : 'rgba(255,255,255,0.15)',
                ...(!isUnranked && {
                  boxShadow: `0 0 12px ${alpha(tierColor, 0.3)}`,
                }),
              }}
            />
          </Box>

          {/* Name + Tier + Quick meta */}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {/* Row 1: Name + Tier badge */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
                mb: 0.5,
              }}
            >
              <Typography
                sx={{
                  color: '#ffffff',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: { xs: '1.15rem', sm: '1.5rem', md: '1.9rem' },
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: '-0.5px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: { xs: '180px', sm: 'none' },
                }}
              >
                {githubData?.name || username}
              </Typography>

              {/* Tier Shield Badge */}
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.25,
                  py: 0.375,
                  borderRadius: '6px',
                  background: !isUnranked
                    ? `linear-gradient(135deg, ${alpha(tierColor, 0.2)}, ${alpha(tierColor, 0.06)})`
                    : 'rgba(255,255,255,0.04)',
                  border: '1px solid',
                  borderColor: !isUnranked
                    ? alpha(tierColor, 0.35)
                    : 'rgba(255,255,255,0.1)',
                  ...(!isUnranked && {
                    boxShadow: `0 0 14px ${alpha(tierColor, 0.2)}, inset 0 0 8px ${alpha(tierColor, 0.06)}`,
                  }),
                }}
              >
                {!isUnranked && (
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: tierColor,
                      boxShadow: `0 0 8px ${tierColor}`,
                    }}
                  />
                )}
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: { xs: '0.65rem', sm: '0.78rem' },
                    fontWeight: 700,
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    background: tierGradient,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    ...(!isUnranked && {
                      filter: `drop-shadow(0 0 4px ${alpha(tierColor, 0.5)})`,
                    }),
                  }}
                >
                  {minerStats.currentTier || 'Unranked'}
                </Typography>
              </Box>
            </Box>

            {/* Row 2: GitHub link + key meta chips */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
                mb: githubData?.bio ? 0.75 : 0,
              }}
            >
              {/* GitHub link — glass pill */}
              <Typography
                component="a"
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: 'rgba(255, 255, 255, 0.75)',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: { xs: '0.78rem', sm: '0.92rem' },
                  fontWeight: 500,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.3,
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  '&:hover': {
                    color: '#ffffff',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,255,255,0.15)',
                  },
                  transition: 'all 0.15s',
                }}
              >
                <GitHubIcon sx={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)' }} />
                @{username}
              </Typography>

              {githubData && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {githubData.location && (
                    <Chip variant="info" icon={<LocationIcon />} label={githubData.location} size="small" sx={{ display: { xs: 'none', sm: 'flex' } }} />
                  )}
                  {githubData.company && (
                    <Chip variant="info" icon={<CompanyIcon />} label={githubData.company} size="small" sx={{ display: { xs: 'none', sm: 'flex' } }} />
                  )}
                  {githubData.blog && (
                    <Chip
                      variant="status"
                      component="a"
                      href={githubData.blog.startsWith('http') ? githubData.blog : `https://${githubData.blog}`}
                      target="_blank"
                      icon={<WebsiteIcon />}
                      label="Website"
                      clickable
                      size="small"
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
                      size="small"
                      sx={{
                        color: '#1DA1F2',
                        borderColor: 'rgba(29, 161, 242, 0.3)',
                        '& .MuiChip-icon': { color: '#1DA1F2' },
                      }}
                    />
                  )}
                  {githubData.hireable && (
                    <Chip icon={<HireableIcon />} label="Open to Work" color="success" variant="outlined" size="small" sx={{ display: { xs: 'none', sm: 'flex' } }} />
                  )}
                  <Box
                    sx={{
                      display: { xs: 'none', sm: 'inline-flex' },
                      alignItems: 'center',
                      gap: 0.4,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <FollowersIcon sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }} />
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.65)',
                        fontWeight: 500,
                      }}
                    >
                      {githubData.followers}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Bio */}
            {githubData?.bio && (
              <Typography
                sx={{
                  color: 'rgba(255, 255, 255, 0.55)',
                  fontStyle: 'italic',
                  fontSize: { xs: '0.78rem', sm: '0.88rem' },
                  maxWidth: 550,
                  display: { xs: '-webkit-box', sm: 'block' },
                  WebkitLineClamp: { xs: 2, sm: 'unset' },
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.45,
                }}
              >
                {githubData.bio}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Hotkey bar — full-width code block */}
        {minerStats.hotkey && (
          <Box
            onClick={() => handleCopy(minerStats.hotkey, 'hotkey')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mt: 2,
              px: 1.5,
              py: 0.75,
              borderRadius: '8px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: !isUnranked
                  ? alpha(tierColor, 0.25)
                  : 'rgba(255,255,255,0.15)',
                backgroundColor: 'rgba(0,0,0,0.4)',
                '& .hotkey-label': {
                  color: 'rgba(255,255,255,0.6)',
                },
                '& .hotkey-value': {
                  color: 'rgba(255,255,255,0.65)',
                },
                '& .hotkey-icon': {
                  color: 'rgba(255,255,255,0.5)',
                },
              },
            }}
          >
            <Typography
              className="hotkey-label"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                flexShrink: 0,
                transition: 'color 0.2s',
              }}
            >
              Hotkey
            </Typography>
            <Box
              sx={{
                width: '1px',
                height: 14,
                backgroundColor: 'rgba(255,255,255,0.1)',
                flexShrink: 0,
              }}
            />
            <Typography
              className="hotkey-value"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: { xs: '0.7rem', sm: '0.82rem' },
                color: 'rgba(255, 255, 255, 0.55)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
                transition: 'color 0.2s',
              }}
            >
              {minerStats.hotkey}
            </Typography>
            {copiedField === 'hotkey' ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.375,
                  flexShrink: 0,
                }}
              >
                <CheckIcon sx={{ fontSize: 13, color: STATUS_COLORS.success }} />
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.6rem',
                    color: STATUS_COLORS.success,
                    fontWeight: 600,
                  }}
                >
                  Copied
                </Typography>
              </Box>
            ) : (
              <CopyIcon
                className="hotkey-icon"
                sx={{
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.25)',
                  flexShrink: 0,
                  transition: 'color 0.2s',
                }}
              />
            )}
          </Box>
        )}

        {/* Updated — mobile only */}
        {minerStats.updatedAt && (
          <Chip
            icon={<UpdateIcon sx={{ fontSize: '0.75rem' }} />}
            label={`Updated ${formatTimeAgo(new Date(minerStats.updatedAt))}`}
            variant="outlined"
            size="small"
            sx={{
              display: { xs: 'flex', sm: 'none' },
              mt: 1.5,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.6rem',
              color: 'rgba(255, 255, 255, 0.4)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              '& .MuiChip-icon': { color: 'rgba(255, 255, 255, 0.3)' },
            }}
          />
        )}

      </Box>

      {/* Stat Grid — Bento-style with micro-visualizations */}
      <Grid container spacing={{ xs: 1, sm: 1.5 }}>
        {/* 1. Credibility */}
        <Grid item xs={6} md={4}>
          <Tooltip
            title="Credibility = merged / (merged + closed). Applied as an exponent per tier (1.0x Bronze, 1.5x Silver, 2.0x Gold)."
            arrow
            slotProps={tooltipSlotProps}
          >
            <Box sx={statCardSx()}>
              <StatLabel label="Credibility" rank={rankings?.credibility} getRankColor={getRankColor} />
              <Typography
                sx={{
                  ...heroValueSx,
                  color: credibilityColor,
                }}
              >
                {(credibility * 100).toFixed(1)}
                <Box component="span" sx={{ fontSize: '0.65em', color: credibilityColor, ml: 0.25 }}>%</Box>
              </Typography>
              <MicroBar pct={credibility * 100} color={credibilityColor} />
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 0.5 }}>
                <MiniLabel label="" value={`${mergedPrs} merged`} />
                <MiniLabel label="" value={`${closedPrs} closed`} />
              </Box>
            </Box>
          </Tooltip>
        </Grid>

        {/* 2. Score */}
        <Grid item xs={6} md={4}>
          <Box sx={statCardSx()}>
            <StatLabel label="Score" rank={rankings?.score} getRankColor={getRankColor} />
            <Typography sx={heroValueSx}>{totalScore.toFixed(2)}</Typography>
            {grossScore > 0 ? (
              <TierBar bronze={bronzeScore} silver={silverScore} gold={goldScore} />
            ) : null}
            <SubText>
              {topPR
                ? `Top PR: ${parseFloat(topPR.score || '0').toFixed(2)}`
                : 'No score yet'}
            </SubText>
          </Box>
        </Grid>

        {/* 3. Tokens */}
        <Grid item xs={6} md={4}>
          <Tooltip
            title="Total token score from merged PRs. Tokens are code elements (functions, classes, etc.) scored by the network."
            arrow
            slotProps={tooltipSlotProps}
          >
            <Box sx={statCardSx()}>
              <StatLabel label="Tokens" />
              <Typography sx={heroValueSx}>{totalTokenScore.toFixed(2)}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.75 }}>
                <MiniLabel label="Nodes" value={Number(minerStats.totalNodesScored || 0).toLocaleString()} />
              </Box>
            </Box>
          </Tooltip>
        </Grid>

        {/* 4. PRs */}
        <Grid item xs={6} md={4}>
          <Box sx={statCardSx()}>
            <StatLabel label="PRs" rank={rankings?.totalPrs} getRankColor={getRankColor} />
            <Typography sx={heroValueSx}>{totalPrs}</Typography>
            <PrStatusBar merged={mergedPrs} closed={closedPrs} open={openPrs} total={totalPrs} />
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 0.5 }}>
              <MiniLabel label="Lines" value={totalLines.toLocaleString()} />
              <MiniLabel label="Repos" value={`${qualifiedRepos}`} />
            </Box>
          </Box>
        </Grid>

        {/* 5. Open Risk */}
        <Grid item xs={6} md={4}>
          <Tooltip
            title={`${openRiskTooltip}\n\nExceeding threshold applies a penalty multiplier that can drastically reduce your entire merged score.`}
            arrow
            slotProps={tooltipSlotProps}
          >
            <Box sx={statCardSx()}>
              <StatLabel label="Open Risk" />
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, justifyContent: 'center' }}>
                <Typography
                  sx={{
                    ...heroValueSx,
                    color: riskPct >= 100 ? STATUS_COLORS.error : riskPct >= 75 ? STATUS_COLORS.warning : '#ffffff',
                  }}
                >
                  {openPrs}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: { xs: '0.8rem', sm: '1.1rem' },
                    color: 'rgba(255,255,255,0.3)',
                  }}
                >
                  / {openPrThreshold}
                </Typography>
              </Box>
              <MicroBar pct={riskPct} color={openPrColor || 'rgba(255,255,255,0.3)'} />
              {collateral > 0 ? (
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: { xs: '0.75rem', sm: '0.88rem' },
                    fontWeight: 600,
                    color: 'rgba(248, 113, 113, 0.8)',
                    mt: 0.75,
                    textAlign: 'center',
                  }}
                >
                  Collateral: -{collateral.toFixed(2)}
                </Typography>
              ) : (
                <SubText>Threshold {openPrThreshold}</SubText>
              )}
            </Box>
          </Tooltip>
        </Grid>

        {/* 6. Earnings */}
        <Grid item xs={6} md={4}>
          <Box sx={statCardSx()}>
            <StatLabel label="Est. Earnings" />
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: { xs: 0.5, sm: 0.75 }, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5 }}>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: { xs: '0.6rem', sm: '0.7rem' }, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Daily:</Typography>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: { xs: '1.1rem', sm: '1.65rem' }, fontWeight: 700, color: STATUS_COLORS.success, lineHeight: 1.2 }}>
                  ${Math.round(dailyUsd).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5 }}>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: { xs: '0.6rem', sm: '0.7rem' }, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mo:</Typography>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: { xs: '1.1rem', sm: '1.65rem' }, fontWeight: 700, color: STATUS_COLORS.success, lineHeight: 1.2 }}>
                  ${Math.round(dailyUsd * 30).toLocaleString()}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.08)', mt: 1, mb: 0.5 }} />
            <SubText>Lifetime: ${Math.round(minerStats.lifetimeUsd ?? 0).toLocaleString()}</SubText>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

// --- Stat card helpers ---

const statCardSx = (accentColor?: string) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.025)',
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.08)',
  p: { xs: 1.5, sm: 2 },
  height: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  position: 'relative' as const,
  overflow: 'hidden',
  cursor: 'default',
  transition: 'all 0.25s ease',
  '&:hover': {
    borderColor: accentColor
      ? `${accentColor}44`
      : 'rgba(255,255,255,0.15)',
    transform: 'translateY(-1px)',
    boxShadow: accentColor
      ? `0 4px 20px ${accentColor}15`
      : '0 4px 20px rgba(255,255,255,0.03)',
  },
});

const heroValueSx = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: { xs: '1.35rem', sm: '1.9rem' },
  fontWeight: 700,
  color: '#ffffff',
  lineHeight: 1.2,
  textAlign: 'center' as const,
};

const StatLabel: React.FC<{
  label: string;
  rank?: number | null;
  getRankColor?: (rank: number | null) => string;
}> = ({ label, rank, getRankColor: grc }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0.75,
      mb: 0.5,
    }}
  >
    <Typography
      sx={{
        color: 'rgba(255,255,255,0.45)',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: { xs: '0.68rem', sm: '0.8rem' },
        textTransform: 'uppercase',
        letterSpacing: { xs: '1px', sm: '1.5px' },
        fontWeight: 600,
      }}
    >
      {label}
    </Typography>
    {rank && grc && (
      <Box
        sx={{
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderRadius: '3px',
          px: 0.5,
          py: 0.125,
          border: `1px solid ${alpha(grc(rank), 0.4)}`,
          ...(rank <= 3 && {
            boxShadow: `0 0 8px ${alpha(grc(rank), 0.3)}`,
          }),
        }}
      >
        <Typography
          sx={{
            color: grc(rank),
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.7rem',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          #{rank}
        </Typography>
      </Box>
    )}
  </Box>
);

const MiniLabel: React.FC<{
  label: string;
  value: string;
  color?: string;
}> = ({ label, value, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.375 }}>
    {color && (
      <Box
        sx={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
    )}
    <Typography
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: { xs: '0.68rem', sm: '0.82rem' },
        color: 'rgba(255,255,255,0.5)',
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: { xs: '0.75rem', sm: '0.9rem' },
        fontWeight: 600,
        color: color || 'rgba(255,255,255,0.7)',
      }}
    >
      {value}
    </Typography>
  </Box>
);

const SubText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    sx={{
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: { xs: '0.72rem', sm: '0.85rem' },
      color: 'rgba(255,255,255,0.6)',
      textAlign: 'center',
      mt: 0.75,
      lineHeight: 1.3,
    }}
  >
    {children}
  </Typography>
);

const MicroBar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => (
  <Box
    sx={{
      width: '100%',
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.06)',
      mt: 0.75,
      overflow: 'hidden',
    }}
  >
    <Box
      sx={{
        width: `${Math.min(Math.max(pct, 0), 100)}%`,
        height: '100%',
        borderRadius: 2,
        background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.4)})`,
        transition: 'width 0.6s ease',
      }}
    />
  </Box>
);

const PrStatusBar: React.FC<{
  merged: number;
  closed: number;
  open: number;
  total: number;
}> = ({ merged, closed, open, total }) => {
  if (total === 0) return null;
  const mPct = (merged / total) * 100;
  const cPct = (closed / total) * 100;
  const oPct = (open / total) * 100;
  return (
    <Box
      sx={{
        width: '100%',
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.06)',
        mt: 0.75,
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {mPct > 0 && (
        <Box sx={{ width: `${mPct}%`, height: '100%', background: `linear-gradient(90deg, ${STATUS_COLORS.success}, ${alpha(STATUS_COLORS.success, 0.7)})` }} />
      )}
      {oPct > 0 && (
        <Box sx={{ width: `${oPct}%`, height: '100%', background: `linear-gradient(90deg, ${STATUS_COLORS.open}, ${alpha(STATUS_COLORS.open, 0.5)})` }} />
      )}
      {cPct > 0 && (
        <Box sx={{ width: `${cPct}%`, height: '100%', background: 'linear-gradient(90deg, rgba(248, 113, 113, 0.8), rgba(248, 113, 113, 0.5))' }} />
      )}
    </Box>
  );
};

const TierBar: React.FC<{
  bronze: number;
  silver: number;
  gold: number;
}> = ({ bronze, silver, gold }) => {
  const total = bronze + silver + gold;
  if (total === 0) return null;
  const bPct = (bronze / total) * 100;
  const sPct = (silver / total) * 100;
  const gPct = (gold / total) * 100;
  return (
    <Box
      sx={{
        width: '100%',
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.06)',
        mt: 0.75,
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {bPct > 0 && (
        <Box sx={{ width: `${bPct}%`, height: '100%', backgroundColor: TIER_COLORS.bronze }} />
      )}
      {sPct > 0 && (
        <Box sx={{ width: `${sPct}%`, height: '100%', backgroundColor: TIER_COLORS.silver }} />
      )}
      {gPct > 0 && (
        <Box sx={{ width: `${gPct}%`, height: '100%', backgroundColor: TIER_COLORS.gold }} />
      )}
    </Box>
  );
};

export default MinerProfileHeader;
