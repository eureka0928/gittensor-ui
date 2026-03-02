import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Button,
  Collapse,
  IconButton,
  InputBase,
  alpha,
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowRight as CollapseIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  type CommitLog,
  type Repository,
} from '../../api';
import theme, { TIER_COLORS } from '../../theme';

const AUTO_EXPAND_THRESHOLD = 10;

interface MinerContributionsTabProps {
  prs?: CommitLog[];
  repos?: Repository[];
  githubId: string;
}

type StatusFilter = 'all' | 'open' | 'merged' | 'closed';
type TierFilter = 'all' | 'bronze' | 'silver' | 'gold';
type SortField = 'score' | 'date' | 'lines' | 'repo';
type SortDir = 'asc' | 'desc';

const getTierColor = (tier: string): string => {
  switch (tier?.toLowerCase()) {
    case 'gold':
      return TIER_COLORS.gold;
    case 'silver':
      return TIER_COLORS.silver;
    case 'bronze':
      return TIER_COLORS.bronze;
    default:
      return 'transparent';
  }
};

const matchesStatus = (
  pr: CommitLog,
  filter: StatusFilter,
): boolean => {
  if (filter === 'all') return true;
  if (filter === 'open')
    return pr.prState === 'OPEN' || (!pr.prState && !pr.mergedAt);
  if (filter === 'merged')
    return !!pr.mergedAt || pr.prState === 'MERGED';
  if (filter === 'closed')
    return pr.prState === 'CLOSED' && !pr.mergedAt;
  return true;
};

interface RepoGroup {
  name: string;
  tier: string;
  weight: number;
  prCount: number;
  totalScore: number;
  prs: CommitLog[];
}

const FilterButton: React.FC<{
  label: string;
  count?: number;
  color: string;
  selected: boolean;
  onClick: () => void;
}> = ({ label, count, color, selected, onClick }) => (
  <Button
    size="small"
    onClick={onClick}
    sx={{
      color: selected ? '#fff' : 'rgba(255,255,255,0.5)',
      backgroundColor: selected
        ? 'rgba(255,255,255,0.1)'
        : 'transparent',
      borderRadius: '6px',
      px: 1.5,
      minWidth: 'auto',
      textTransform: 'none',
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '0.75rem',
      border: selected
        ? `1px solid ${color}`
        : '1px solid transparent',
      '&:hover': {
        backgroundColor: 'rgba(255,255,255,0.15)',
      },
    }}
  >
    {label}
    {count !== undefined && (
      <span
        style={{
          opacity: 0.6,
          marginLeft: '6px',
          fontSize: '0.7rem',
        }}
      >
        {count}
      </span>
    )}
  </Button>
);

const MinerContributionsTab: React.FC<MinerContributionsTabProps> = ({
  prs,
  repos,
  githubId,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(
    new Set(),
  );
  const [expandedPRs, setExpandedPRs] = useState<Set<string>>(
    new Set(),
  );
  const [initialized, setInitialized] = useState(false);

  const username = prs?.[0]?.author || githubId;

  // Build repo maps
  const repoWeights = useMemo(() => {
    const map = new Map<string, number>();
    if (Array.isArray(repos)) {
      repos.forEach((repo) => {
        if (repo?.fullName) {
          map.set(
            repo.fullName,
            parseFloat(repo.weight || '0'),
          );
        }
      });
    }
    return map;
  }, [repos]);

  const repoTiers = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(repos)) {
      repos.forEach((repo) => {
        if (repo?.fullName) {
          map.set(repo.fullName, repo.tier || '');
        }
      });
    }
    return map;
  }, [repos]);

  // Status counts
  const statusCounts = useMemo(() => {
    if (!prs) return { all: 0, open: 0, merged: 0, closed: 0 };
    return {
      all: prs.length,
      open: prs.filter(
        (pr) =>
          pr.prState === 'OPEN' || (!pr.prState && !pr.mergedAt),
      ).length,
      merged: prs.filter(
        (pr) => pr.mergedAt || pr.prState === 'MERGED',
      ).length,
      closed: prs.filter(
        (pr) => pr.prState === 'CLOSED' && !pr.mergedAt,
      ).length,
    };
  }, [prs]);

  // Group PRs by repository
  const repoGroups = useMemo(() => {
    if (!prs || prs.length === 0) return [];

    const searchLower = search.toLowerCase();
    const filtered = prs.filter((pr) => {
      if (!matchesStatus(pr, statusFilter)) return false;
      if (
        tierFilter !== 'all' &&
        (repoTiers.get(pr.repository) || '').toLowerCase() !==
          tierFilter
      )
        return false;
      if (
        search &&
        !pr.pullRequestTitle.toLowerCase().includes(searchLower) &&
        !pr.repository.toLowerCase().includes(searchLower) &&
        !String(pr.pullRequestNumber).includes(search)
      )
        return false;
      return true;
    });

    const groupMap = new Map<string, RepoGroup>();
    filtered.forEach((pr) => {
      const existing = groupMap.get(pr.repository);
      if (existing) {
        existing.prCount++;
        existing.totalScore += parseFloat(pr.score || '0');
        existing.prs.push(pr);
      } else {
        groupMap.set(pr.repository, {
          name: pr.repository,
          tier: repoTiers.get(pr.repository) || '',
          weight: repoWeights.get(pr.repository) || 0,
          prCount: 1,
          totalScore: parseFloat(pr.score || '0'),
          prs: [pr],
        });
      }
    });

    const groups = Array.from(groupMap.values());

    // Sort groups
    groups.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'score':
          cmp = a.totalScore - b.totalScore;
          break;
        case 'date': {
          const aDate = Math.max(
            ...a.prs.map((p) =>
              p.mergedAt
                ? new Date(p.mergedAt).getTime()
                : new Date(p.prCreatedAt).getTime(),
            ),
          );
          const bDate = Math.max(
            ...b.prs.map((p) =>
              p.mergedAt
                ? new Date(p.mergedAt).getTime()
                : new Date(p.prCreatedAt).getTime(),
            ),
          );
          cmp = aDate - bDate;
          break;
        }
        case 'lines':
          cmp =
            a.prs.reduce(
              (s, p) => s + p.additions + p.deletions,
              0,
            ) -
            b.prs.reduce(
              (s, p) => s + p.additions + p.deletions,
              0,
            );
          break;
        case 'repo':
          cmp = a.name.localeCompare(b.name);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    // Sort PRs within each group by score desc
    groups.forEach((g) => {
      g.prs.sort(
        (a, b) =>
          parseFloat(b.score || '0') - parseFloat(a.score || '0'),
      );
    });

    return groups;
  }, [
    prs,
    search,
    statusFilter,
    tierFilter,
    repoTiers,
    repoWeights,
    sortField,
    sortDir,
  ]);

  // Auto-expand repos with < threshold PRs on first render
  useEffect(() => {
    if (!initialized && repoGroups.length > 0) {
      const autoExpand = new Set<string>();
      repoGroups.forEach((g) => {
        if (g.prCount < AUTO_EXPAND_THRESHOLD) {
          autoExpand.add(g.name);
        }
      });
      setExpandedRepos(autoExpand);
      setInitialized(true);
    }
  }, [repoGroups, initialized]);

  const toggleRepo = useCallback((name: string) => {
    setExpandedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const togglePR = useCallback(
    (key: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedPRs((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [],
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const totalFiltered = repoGroups.reduce(
    (s, g) => s + g.prCount,
    0,
  );

  if (!prs || prs.length === 0) {
    return (
      <Box
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          p: 4,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.9rem',
          }}
        >
          No contributions found
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            px: 1.5,
            flex: { xs: '1 1 100%', sm: '0 1 240px' },
          }}
        >
          <SearchIcon
            sx={{
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.4)',
              mr: 1,
            }}
          />
          <InputBase
            placeholder="Search PRs or repos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8rem',
              color: '#ffffff',
              flex: 1,
              py: 0.5,
            }}
          />
        </Box>

        {/* Status Filters */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <FilterButton
            label="All"
            count={statusCounts.all}
            color={theme.palette.status.neutral}
            selected={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          <FilterButton
            label="Open"
            count={statusCounts.open}
            color={theme.palette.status.open}
            selected={statusFilter === 'open'}
            onClick={() => setStatusFilter('open')}
          />
          <FilterButton
            label="Merged"
            count={statusCounts.merged}
            color={theme.palette.status.merged}
            selected={statusFilter === 'merged'}
            onClick={() => setStatusFilter('merged')}
          />
          <FilterButton
            label="Closed"
            count={statusCounts.closed}
            color={theme.palette.status.closed}
            selected={statusFilter === 'closed'}
            onClick={() => setStatusFilter('closed')}
          />
        </Box>

        {/* Tier Filters */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            pl: 1,
          }}
        >
          <FilterButton
            label="All"
            color="rgba(255,255,255,0.4)"
            selected={tierFilter === 'all'}
            onClick={() => setTierFilter('all')}
          />
          {(['bronze', 'silver', 'gold'] as TierFilter[]).map(
            (t) => (
              <FilterButton
                key={t}
                label={t.charAt(0).toUpperCase() + t.slice(1)}
                color={getTierColor(t)}
                selected={tierFilter === t}
                onClick={() => setTierFilter(t)}
              />
            ),
          )}
        </Box>

        {/* Count */}
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.4)',
            ml: 'auto',
          }}
        >
          {totalFiltered} PR{totalFiltered !== 1 ? 's' : ''} in{' '}
          {repoGroups.length} repo
          {repoGroups.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Table */}
      <TableContainer
        sx={{
          maxHeight: { xs: '500px', sm: '600px' },
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          },
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerStyle, width: 40 }} />
              <TableCell sx={headerStyle}>PR</TableCell>
              <TableCell sx={headerStyle}>Title</TableCell>
              <TableCell
                align="right"
                sx={{
                  ...headerStyle,
                  display: { xs: 'none', md: 'table-cell' },
                }}
              >
                +/-
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  ...headerStyle,
                  cursor: 'pointer',
                  '&:hover': {
                    color: 'rgba(255,255,255,0.9)',
                  },
                }}
                onClick={() => handleSort('score')}
              >
                Score{' '}
                {sortField === 'score'
                  ? sortDir === 'desc'
                    ? '\u25BC'
                    : '\u25B2'
                  : ''}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  ...headerStyle,
                  display: { xs: 'none', sm: 'table-cell' },
                  cursor: 'pointer',
                  '&:hover': {
                    color: 'rgba(255,255,255,0.9)',
                  },
                }}
                onClick={() => handleSort('date')}
              >
                Status{' '}
                {sortField === 'date'
                  ? sortDir === 'desc'
                    ? '\u25BC'
                    : '\u25B2'
                  : ''}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {repoGroups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  sx={{
                    textAlign: 'center',
                    py: 4,
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.85rem',
                    borderBottom:
                      '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  No PRs match current filters
                </TableCell>
              </TableRow>
            ) : (
              repoGroups.map((group) => {
                const isExpanded = expandedRepos.has(group.name);
                return (
                  <React.Fragment key={group.name}>
                    {/* Repo Group Header */}
                    <TableRow
                      onClick={() => toggleRepo(group.name)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor:
                          'rgba(255, 255, 255, 0.03)',
                        '&:hover': {
                          backgroundColor:
                            'rgba(255, 255, 255, 0.06)',
                        },
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <TableCell sx={bodyCellStyle}>
                        <IconButton
                          size="small"
                          sx={{
                            color: 'rgba(255,255,255,0.5)',
                            p: 0.5,
                          }}
                        >
                          {isExpanded ? (
                            <ExpandIcon fontSize="small" />
                          ) : (
                            <CollapseIcon fontSize="small" />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell
                        colSpan={3}
                        sx={bodyCellStyle}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                          }}
                        >
                          <Avatar
                            src={`https://avatars.githubusercontent.com/${group.name.split('/')[0]}`}
                            alt={group.name.split('/')[0]}
                            sx={{
                              width: 20,
                              height: 20,
                              border:
                                '1px solid rgba(255, 255, 255, 0.2)',
                            }}
                          />
                          {group.tier && (
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor:
                                  getTierColor(group.tier),
                                flexShrink: 0,
                              }}
                              title={`${group.tier} tier`}
                            />
                          )}
                          <Typography
                            component="span"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/miners/repository?name=${encodeURIComponent(group.name)}`,
                                {
                                  state: {
                                    backLabel: `Back to ${username}`,
                                  },
                                },
                              );
                            }}
                            sx={{
                              fontFamily:
                                '"JetBrains Mono", monospace',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              '&:hover': {
                                color: 'primary.main',
                                textDecoration: 'underline',
                              },
                              transition: 'color 0.2s',
                            }}
                          >
                            {group.name}
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily:
                                '"JetBrains Mono", monospace',
                              fontSize: '0.7rem',
                              color: 'rgba(255,255,255,0.4)',
                            }}
                          >
                            {group.prCount} PR
                            {group.prCount !== 1 ? 's' : ''}
                          </Typography>
                          {group.weight > 0 && (
                            <Typography
                              sx={{
                                fontFamily:
                                  '"JetBrains Mono", monospace',
                                fontSize: '0.65rem',
                                color:
                                  'rgba(255,255,255,0.3)',
                                display: {
                                  xs: 'none',
                                  sm: 'block',
                                },
                              }}
                            >
                              w:{group.weight.toFixed(2)}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={bodyCellStyle}
                      >
                        <Typography
                          sx={{
                            fontFamily:
                              '"JetBrains Mono", monospace',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                          }}
                        >
                          {group.totalScore.toFixed(4)}
                        </Typography>
                      </TableCell>
                      <TableCell
                        sx={{
                          ...bodyCellStyle,
                          display: {
                            xs: 'none',
                            sm: 'table-cell',
                          },
                        }}
                      />
                    </TableRow>

                    {/* PR Rows */}
                    {isExpanded &&
                      group.prs.map((pr, idx) => {
                        const prKey = `${pr.repository}-${pr.pullRequestNumber}`;
                        const isPrExpanded =
                          expandedPRs.has(prKey);
                        return (
                          <React.Fragment key={`${prKey}-${idx}`}>
                            <TableRow
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
                                cursor: 'pointer',
                                '&:hover': {
                                  backgroundColor:
                                    'rgba(255, 255, 255, 0.05)',
                                },
                                transition: 'all 0.2s',
                              }}
                            >
                              <TableCell
                                sx={{
                                  ...bodyCellStyle,
                                  pl: 3,
                                }}
                              >
                                <IconButton
                                  size="small"
                                  onClick={(e) =>
                                    togglePR(prKey, e)
                                  }
                                  sx={{
                                    color:
                                      'rgba(255,255,255,0.3)',
                                    p: 0.25,
                                  }}
                                >
                                  {isPrExpanded ? (
                                    <ExpandIcon
                                      sx={{
                                        fontSize: '0.9rem',
                                      }}
                                    />
                                  ) : (
                                    <CollapseIcon
                                      sx={{
                                        fontSize: '0.9rem',
                                      }}
                                    />
                                  )}
                                </IconButton>
                              </TableCell>
                              <TableCell
                                sx={{
                                  ...bodyCellStyle,
                                  fontSize: {
                                    xs: '0.75rem',
                                    sm: '0.85rem',
                                  },
                                }}
                              >
                                #{pr.pullRequestNumber}
                              </TableCell>
                              <TableCell
                                sx={{
                                  ...bodyCellStyle,
                                  fontSize: {
                                    xs: '0.75rem',
                                    sm: '0.85rem',
                                  },
                                }}
                              >
                                <Box
                                  sx={{
                                    overflow: 'hidden',
                                    textOverflow:
                                      'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: {
                                      xs: 150,
                                      sm: 300,
                                      md: 400,
                                    },
                                  }}
                                >
                                  {pr.pullRequestTitle}
                                </Box>
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  ...bodyCellStyle,
                                  display: {
                                    xs: 'none',
                                    md: 'table-cell',
                                  },
                                }}
                              >
                                <Box
                                  component="span"
                                  sx={{
                                    color:
                                      theme.palette.diff
                                        .additions,
                                    mr: 1,
                                    fontFamily:
                                      '"JetBrains Mono", monospace',
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  +{pr.additions}
                                </Box>
                                <Box
                                  component="span"
                                  sx={{
                                    color:
                                      theme.palette.diff
                                        .deletions,
                                    fontFamily:
                                      '"JetBrains Mono", monospace',
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  -{pr.deletions}
                                </Box>
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={bodyCellStyle}
                              >
                                {pr.prState === 'CLOSED' &&
                                !pr.mergedAt ? (
                                  <Typography
                                    sx={{
                                      fontFamily:
                                        '"JetBrains Mono", monospace',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      color:
                                        'rgba(255,255,255,0.3)',
                                    }}
                                  >
                                    -
                                  </Typography>
                                ) : !pr.mergedAt &&
                                  pr.collateralScore ? (
                                  <Typography
                                    sx={{
                                      fontFamily:
                                        '"JetBrains Mono", monospace',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      color: '#fb923c',
                                    }}
                                  >
                                    {parseFloat(
                                      pr.collateralScore,
                                    ).toFixed(4)}
                                  </Typography>
                                ) : (
                                  <Typography
                                    sx={{
                                      fontFamily:
                                        '"JetBrains Mono", monospace',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {parseFloat(
                                      pr.score,
                                    ).toFixed(4)}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  ...bodyCellStyle,
                                  display: {
                                    xs: 'none',
                                    sm: 'table-cell',
                                  },
                                  color:
                                    'rgba(255,255,255,0.7)',
                                  fontSize: '0.8rem',
                                }}
                              >
                                {pr.mergedAt
                                  ? new Date(
                                      pr.mergedAt,
                                    ).toLocaleDateString()
                                  : pr.prState === 'CLOSED'
                                    ? 'Closed'
                                    : 'Open'}
                              </TableCell>
                            </TableRow>

                            {/* Expanded PR Scoring Breakdown */}
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                sx={{
                                  p: 0,
                                  borderBottom: isPrExpanded
                                    ? '1px solid rgba(255,255,255,0.1)'
                                    : 'none',
                                }}
                              >
                                <Collapse
                                  in={isPrExpanded}
                                  timeout="auto"
                                  unmountOnExit
                                >
                                  <Box
                                    sx={{
                                      pl: {
                                        xs: 3,
                                        sm: 6,
                                      },
                                      pr: 2,
                                      py: 1.5,
                                      backgroundColor:
                                        'rgba(255,255,255,0.02)',
                                      borderTop:
                                        '1px solid rgba(255,255,255,0.05)',
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: {
                                          xs: 1.5,
                                          sm: 3,
                                        },
                                      }}
                                    >
                                      <ScoreItem
                                        label="Base Score"
                                        value={
                                          pr.baseScore
                                            ? parseFloat(
                                                pr.baseScore,
                                              ).toFixed(4)
                                            : 'N/A'
                                        }
                                      />
                                      <ScoreItem
                                        label="Token Score"
                                        value={
                                          pr.tokenScore?.toFixed(
                                            4,
                                          ) || 'N/A'
                                        }
                                      />
                                      <ScoreItem
                                        label="Structural"
                                        value={
                                          pr.structuralScore?.toFixed(
                                            4,
                                          ) || 'N/A'
                                        }
                                      />
                                      <ScoreItem
                                        label="Leaf"
                                        value={
                                          pr.leafScore?.toFixed(
                                            4,
                                          ) || 'N/A'
                                        }
                                      />
                                      <ScoreItem
                                        label="Credibility"
                                        value={
                                          pr.credibilityScalar?.toFixed(
                                            4,
                                          ) || 'N/A'
                                        }
                                      />
                                      {pr.collateralScore && (
                                        <ScoreItem
                                          label="Collateral"
                                          value={parseFloat(
                                            pr.collateralScore,
                                          ).toFixed(4)}
                                          color="rgba(248,113,113,0.8)"
                                        />
                                      )}
                                      {pr.predictedUsdPerDay !==
                                        undefined &&
                                        pr.predictedUsdPerDay !==
                                          null && (
                                          <ScoreItem
                                            label="$/Day"
                                            value={`$${pr.predictedUsdPerDay.toFixed(2)}`}
                                            color={
                                              alpha(theme.palette.status.success, 0.9)
                                            }
                                          />
                                        )}
                                    </Box>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const ScoreItem: React.FC<{
  label: string;
  value: string;
  color?: string;
}> = ({ label, value, color }) => (
  <Box>
    <Typography
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.6rem',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: color || '#ffffff',
      }}
    >
      {value}
    </Typography>
  </Box>
);

const headerStyle = {
  backgroundColor: 'rgba(18, 18, 20, 0.95)',
  backdropFilter: 'blur(8px)',
  color: 'rgba(255, 255, 255, 0.7)',
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: { xs: '0.65rem', sm: '0.75rem' },
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  py: 1,
  px: { xs: 0.5, sm: 1.5 },
};

const bodyCellStyle = {
  color: '#ffffff',
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  fontSize: '0.85rem',
  py: 0.75,
  px: { xs: 0.5, sm: 1.5 },
};

export default MinerContributionsTab;
