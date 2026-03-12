import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Avatar,
  Chip,
  Button,
  InputBase,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  type CommitLog,
  type Repository,
} from '../../api';
import theme, { STATUS_COLORS, TIER_COLORS } from '../../theme';
import {
  getTierColor,
  matchesStatus,
  getZeroScoreReason,
  type StatusFilter,
} from '../../utils';
import { tooltipSlotProps } from './TierComponents';

interface MinerContributionsTabProps {
  prs?: CommitLog[];
  repos?: Repository[];
  githubId: string;
}

type TierFilter = 'all' | 'bronze' | 'silver' | 'gold';
type SortField = 'number' | 'score' | 'lines' | 'date' | 'repo';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

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

const getScoreTooltip = (pr: CommitLog): string | null => {
  const score = parseFloat(pr.score || '0');
  if (score === 0) return getZeroScoreReason(pr);
  const base = parseFloat(pr.baseScore || '0');
  if (!pr.mergedAt || base <= 0) return null;
  const parts: string[] = [`Base: ${base.toFixed(2)}`];
  if (pr.tokenScore != null)
    parts.push(`Tokens: ${Number(pr.tokenScore).toFixed(2)}`);
  if (pr.rawCredibility != null)
    parts.push(`Cred: ${(pr.rawCredibility * 100).toFixed(0)}%`);
  if (pr.credibilityScalar != null)
    parts.push(`Cred scalar: ${pr.credibilityScalar.toFixed(2)}x`);
  return parts.join(' \u00b7 ');
};

const MinerContributionsTab: React.FC<MinerContributionsTabProps> = ({
  prs,
  repos,
  githubId,
}) => {
  const navigate = useNavigate();
  const username = prs?.[0]?.author || githubId;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

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

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('desc');
      }
      setPage(0);
    },
    [sortField],
  );

  // Status counts (unfiltered)
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

  // Tier counts (unfiltered)
  const tierCounts = useMemo(() => {
    if (!prs)
      return { all: 0, gold: 0, silver: 0, bronze: 0 };
    const counts = { all: prs.length, gold: 0, silver: 0, bronze: 0 };
    prs.forEach((pr) => {
      const tier = (
        pr.tier || repoTiers.get(pr.repository) || ''
      ).toLowerCase();
      if (tier === 'gold') counts.gold++;
      else if (tier === 'silver') counts.silver++;
      else if (tier === 'bronze') counts.bronze++;
    });
    return counts;
  }, [prs, repoTiers]);

  // Filter
  const filteredPRs = useMemo(() => {
    if (!prs) return [];
    const q = search.toLowerCase();
    return prs.filter((pr) => {
      if (!matchesStatus(pr.prState, pr.mergedAt, statusFilter))
        return false;
      if (tierFilter !== 'all') {
        const tier = (
          pr.tier || repoTiers.get(pr.repository) || ''
        ).toLowerCase();
        if (tier !== tierFilter) return false;
      }
      if (
        q &&
        !pr.pullRequestTitle.toLowerCase().includes(q) &&
        !pr.repository.toLowerCase().includes(q) &&
        !String(pr.pullRequestNumber).includes(search)
      )
        return false;
      return true;
    });
  }, [prs, statusFilter, tierFilter, repoTiers, search]);

  // Sort
  const sortedPRs = useMemo(() => {
    const sorted = [...filteredPRs];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'number':
          cmp = a.pullRequestNumber - b.pullRequestNumber;
          break;
        case 'score':
          cmp =
            parseFloat(a.score || '0') -
            parseFloat(b.score || '0');
          break;
        case 'lines':
          cmp =
            a.additions +
            a.deletions -
            (b.additions + b.deletions);
          break;
        case 'repo':
          cmp = a.repository.localeCompare(b.repository);
          break;
        case 'date': {
          const da = a.mergedAt || a.prCreatedAt || '';
          const db = b.mergedAt || b.prCreatedAt || '';
          cmp = da.localeCompare(db);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredPRs, sortField, sortDir]);

  // Paginate
  const pagedPRs = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sortedPRs.slice(start, start + PAGE_SIZE);
  }, [sortedPRs, page]);

  const totalPages = Math.ceil(sortedPRs.length / PAGE_SIZE);

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
          No pull requests found
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
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        {/* Header + count */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="sectionTitle">
            Pull Requests
          </Typography>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            {filteredPRs.length}
            {statusFilter !== 'all' ||
            tierFilter !== 'all' ||
            search.trim()
              ? ` of ${prs.length}`
              : ''}{' '}
            PRs
          </Typography>
        </Box>

        {/* Filters row */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            gap: { xs: 1, sm: 1.5 },
            alignItems: 'center',
            overflowX: { xs: 'auto', sm: 'visible' },
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': { height: 0 },
            pb: { xs: 0.5, sm: 0 },
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
              flex: { xs: '1 1 100%', sm: '0 1 260px' },
              mr: 'auto',
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
              placeholder="Search by title, repo, or PR #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
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
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            <FilterButton
              label="All"
              count={statusCounts.all}
              color={theme.palette.status.neutral}
              selected={statusFilter === 'all'}
              onClick={() => {
                setStatusFilter('all');
                setPage(0);
              }}
            />
            <FilterButton
              label="Open"
              count={statusCounts.open}
              color={theme.palette.status.open}
              selected={statusFilter === 'open'}
              onClick={() => {
                setStatusFilter('open');
                setPage(0);
              }}
            />
            <FilterButton
              label="Merged"
              count={statusCounts.merged}
              color={theme.palette.status.merged}
              selected={statusFilter === 'merged'}
              onClick={() => {
                setStatusFilter('merged');
                setPage(0);
              }}
            />
            <FilterButton
              label="Closed"
              count={statusCounts.closed}
              color={theme.palette.status.closed}
              selected={statusFilter === 'closed'}
              onClick={() => {
                setStatusFilter('closed');
                setPage(0);
              }}
            />
          </Box>

          {/* Tier Filters */}
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              flexShrink: 0,
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              pl: 1,
            }}
          >
            <FilterButton
              label="All"
              count={tierCounts.all}
              color="rgba(255,255,255,0.4)"
              selected={tierFilter === 'all'}
              onClick={() => {
                setTierFilter('all');
                setPage(0);
              }}
            />
            <FilterButton
              label="Gold"
              count={tierCounts.gold}
              color={TIER_COLORS.gold}
              selected={tierFilter === 'gold'}
              onClick={() => {
                setTierFilter('gold');
                setPage(0);
              }}
            />
            <FilterButton
              label="Silver"
              count={tierCounts.silver}
              color={TIER_COLORS.silver}
              selected={tierFilter === 'silver'}
              onClick={() => {
                setTierFilter('silver');
                setPage(0);
              }}
            />
            <FilterButton
              label="Bronze"
              count={tierCounts.bronze}
              color={TIER_COLORS.bronze}
              selected={tierFilter === 'bronze'}
              onClick={() => {
                setTierFilter('bronze');
                setPage(0);
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Table */}
      {pagedPRs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.5)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
            }}
          >
            No PRs match current filters
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer
            sx={{
              overflowY: 'auto',
              overflowX: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.2)',
                },
              },
            }}
          >
            <Table
              stickyHeader
              sx={{
                tableLayout: 'fixed',
                minWidth: '700px',
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{ ...headerCellSx, width: '8%' }}
                  >
                    <TableSortLabel
                      active={sortField === 'number'}
                      direction={
                        sortField === 'number'
                          ? sortDir
                          : 'desc'
                      }
                      onClick={() => handleSort('number')}
                      sx={sortLabelSx}
                    >
                      PR #
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    sx={{ ...headerCellSx, width: '27%' }}
                  >
                    Title
                  </TableCell>
                  <TableCell
                    sx={{ ...headerCellSx, width: '25%' }}
                  >
                    <TableSortLabel
                      active={sortField === 'repo'}
                      direction={
                        sortField === 'repo'
                          ? sortDir
                          : 'asc'
                      }
                      onClick={() => handleSort('repo')}
                      sx={sortLabelSx}
                    >
                      Repository
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...headerCellSx, width: '12%' }}
                  >
                    <TableSortLabel
                      active={sortField === 'lines'}
                      direction={
                        sortField === 'lines'
                          ? sortDir
                          : 'desc'
                      }
                      onClick={() => handleSort('lines')}
                      sx={sortLabelSx}
                    >
                      +/-
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...headerCellSx, width: '13%' }}
                  >
                    <TableSortLabel
                      active={sortField === 'score'}
                      direction={
                        sortField === 'score'
                          ? sortDir
                          : 'desc'
                      }
                      onClick={() => handleSort('score')}
                      sx={sortLabelSx}
                    >
                      Score
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...headerCellSx, width: '15%' }}
                  >
                    <TableSortLabel
                      active={sortField === 'date'}
                      direction={
                        sortField === 'date'
                          ? sortDir
                          : 'desc'
                      }
                      onClick={() => handleSort('date')}
                      sx={sortLabelSx}
                    >
                      Date
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedPRs.map((pr, index) => {
                  const scoreTooltip = getScoreTooltip(pr);
                  const scoreVal = parseFloat(
                    pr.score || '0',
                  );
                  const tierColor = getTierColor(
                    pr.tier ||
                      repoTiers.get(pr.repository) ||
                      '',
                  );

                  return (
                    <TableRow
                      key={`${pr.repository}-${pr.pullRequestNumber}-${index}`}
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
                            'rgba(255,255,255,0.04)',
                        },
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* PR # */}
                      <TableCell sx={bodyCellSx}>
                        <Box
                          component="a"
                          href={`https://github.com/${pr.repository}/pull/${pr.pullRequestNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) =>
                            e.stopPropagation()
                          }
                          sx={{
                            color: 'inherit',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                        >
                          #{pr.pullRequestNumber}
                        </Box>
                      </TableCell>

                      {/* Title */}
                      <TableCell sx={bodyCellSx}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            overflow: 'hidden',
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily:
                                '"JetBrains Mono", monospace',
                              fontSize: {
                                xs: '0.75rem',
                                sm: '0.85rem',
                              },
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {pr.pullRequestTitle}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Repository */}
                      <TableCell sx={bodyCellSx}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            overflow: 'hidden',
                          }}
                        >
                          <Avatar
                            src={`https://avatars.githubusercontent.com/${pr.repository.split('/')[0]}`}
                            alt={
                              pr.repository.split('/')[0]
                            }
                            sx={{
                              width: 20,
                              height: 20,
                              flexShrink: 0,
                              border:
                                '1px solid rgba(255,255,255,0.2)',
                            }}
                          />
                          {tierColor !== 'transparent' && (
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: tierColor,
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <Box
                            component="span"
                            sx={{
                              fontFamily:
                                '"JetBrains Mono", monospace',
                              fontSize: {
                                xs: '0.75rem',
                                sm: '0.85rem',
                              },
                              wordBreak: 'break-word',
                              lineHeight: 1.3,
                            }}
                          >
                            {pr.repository}
                          </Box>
                        </Box>
                      </TableCell>

                      {/* +/- */}
                      <TableCell
                        align="right"
                        sx={bodyCellSx}
                      >
                        <Box
                          component="span"
                          sx={{
                            color:
                              theme.palette.diff.additions,
                            mr: 1,
                            fontFamily:
                              '"JetBrains Mono", monospace',
                          }}
                        >
                          +{pr.additions}
                        </Box>
                        <Box
                          component="span"
                          sx={{
                            color:
                              theme.palette.diff.deletions,
                            fontFamily:
                              '"JetBrains Mono", monospace',
                          }}
                        >
                          -{pr.deletions}
                        </Box>
                      </TableCell>

                      {/* Score */}
                      <TableCell
                        align="right"
                        sx={bodyCellSx}
                      >
                        <Box>
                          {pr.prState === 'CLOSED' &&
                          !pr.mergedAt ? (
                            <Typography
                              sx={{
                                fontFamily:
                                  '"JetBrains Mono", monospace',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color:
                                  'rgba(255,255,255,0.25)',
                              }}
                            >
                              -
                            </Typography>
                          ) : !pr.mergedAt &&
                            pr.collateralScore ? (
                            <>
                              <Typography
                                sx={{
                                  fontFamily:
                                    '"JetBrains Mono", monospace',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  color: '#fb923c',
                                }}
                              >
                                {parseFloat(
                                  pr.collateralScore,
                                ).toFixed(4)}
                              </Typography>
                              <Typography
                                sx={{
                                  fontFamily:
                                    '"JetBrains Mono", monospace',
                                  fontSize: '0.6rem',
                                  color:
                                    'rgba(255,255,255,0.4)',
                                }}
                              >
                                Collateral
                              </Typography>
                            </>
                          ) : scoreTooltip ? (
                            <Tooltip
                              title={scoreTooltip}
                              arrow
                              placement="left"
                              slotProps={tooltipSlotProps}
                            >
                              <Typography
                                sx={{
                                  fontFamily:
                                    '"JetBrains Mono", monospace',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  color:
                                    scoreVal === 0 &&
                                    pr.mergedAt
                                      ? STATUS_COLORS.warning
                                      : undefined,
                                }}
                              >
                                {scoreVal.toFixed(4)}
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Typography
                              sx={{
                                fontFamily:
                                  '"JetBrains Mono", monospace',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                              }}
                            >
                              {scoreVal.toFixed(4)}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Date */}
                      <TableCell
                        align="right"
                        sx={{
                          ...bodyCellSx,
                          color: 'rgba(255,255,255,0.6)',
                        }}
                      >
                        {pr.mergedAt ? (
                          <Chip
                            label={new Date(
                              pr.mergedAt,
                            ).toLocaleDateString()}
                            size="small"
                            sx={{
                              fontFamily:
                                '"JetBrains Mono", monospace',
                              fontSize: '0.7rem',
                              height: 22,
                              backgroundColor: alpha(
                                STATUS_COLORS.merged,
                                0.12,
                              ),
                              color: STATUS_COLORS.merged,
                              border: 'none',
                            }}
                          />
                        ) : pr.prState === 'CLOSED' ? (
                          <Chip
                            label="Closed"
                            size="small"
                            sx={{
                              fontFamily:
                                '"JetBrains Mono", monospace',
                              fontSize: '0.7rem',
                              height: 22,
                              backgroundColor: alpha(
                                STATUS_COLORS.closed,
                                0.12,
                              ),
                              color: STATUS_COLORS.closed,
                              border: 'none',
                            }}
                          />
                        ) : (
                          <Chip
                            label="Open"
                            size="small"
                            sx={{
                              fontFamily:
                                '"JetBrains Mono", monospace',
                              fontSize: '0.7rem',
                              height: 22,
                              backgroundColor: alpha(
                                STATUS_COLORS.open,
                                0.12,
                              ),
                              color: STATUS_COLORS.open,
                              border: 'none',
                            }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                py: 1.5,
                borderTop:
                  '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Box
                onClick={() =>
                  setPage((p) => Math.max(0, p - 1))
                }
                sx={{
                  cursor:
                    page > 0 ? 'pointer' : 'default',
                  opacity: page > 0 ? 1 : 0.3,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'rgba(255,255,255,0.6)',
                  '&:hover':
                    page > 0
                      ? { color: '#fff' }
                      : {},
                }}
              >
                <PrevIcon sx={{ fontSize: '1.2rem' }} />
              </Box>
              <Typography
                sx={{
                  fontFamily:
                    '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                {page + 1} / {totalPages}
              </Typography>
              <Box
                onClick={() =>
                  setPage((p) =>
                    Math.min(totalPages - 1, p + 1),
                  )
                }
                sx={{
                  cursor:
                    page < totalPages - 1
                      ? 'pointer'
                      : 'default',
                  opacity:
                    page < totalPages - 1 ? 1 : 0.3,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'rgba(255,255,255,0.6)',
                  '&:hover':
                    page < totalPages - 1
                      ? { color: '#fff' }
                      : {},
                }}
              >
                <NextIcon sx={{ fontSize: '1.2rem' }} />
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

const sortLabelSx = {
  '&.MuiTableSortLabel-root': {
    color: 'rgba(255,255,255,0.6)',
  },
  '&.MuiTableSortLabel-root:hover': {
    color: '#fff',
  },
  '&.Mui-active': { color: '#fff' },
  '& .MuiTableSortLabel-icon': {
    color: 'rgba(255,255,255,0.4) !important',
  },
};

const headerCellSx = {
  backgroundColor: 'rgba(18, 18, 20, 0.95)',
  backdropFilter: 'blur(8px)',
  color: 'rgba(255,255,255,0.6)',
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: { xs: '0.65rem', sm: '0.75rem' },
  borderBottom: '1px solid rgba(255,255,255,0.15)',
  height: { xs: '48px', sm: '56px' },
  py: { xs: 1, sm: 1.5 },
  px: { xs: 0.5, sm: 2 },
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const bodyCellSx = {
  color: '#fff',
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  fontSize: '0.85rem',
  py: { xs: 0.75, sm: 1 },
  px: { xs: 0.5, sm: 2 },
  height: { xs: '52px', sm: '60px' },
};

export default MinerContributionsTab;
