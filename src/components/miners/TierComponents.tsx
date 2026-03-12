import React from 'react';
import {
  Box,
  Typography,
  Tooltip,
  type TooltipProps,
  LinearProgress,
  Stack,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { STATUS_COLORS } from '../../theme';

// Shared tooltip styling
export const tooltipSlotProps: TooltipProps['slotProps'] = {
  tooltip: {
    sx: {
      backgroundColor: 'rgba(30, 30, 30, 0.95)',
      color: '#ffffff',
      fontSize: '0.75rem',
      fontFamily: '"JetBrains Mono", monospace',
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      maxWidth: 240,
      whiteSpace: 'pre-line',
    },
  },
  arrow: {
    sx: {
      color: 'rgba(30, 30, 30, 0.95)',
    },
  },
};

const largeTooltipSlotProps: TooltipProps['slotProps'] = {
  tooltip: {
    sx: {
      backgroundColor: 'rgba(30, 30, 30, 0.95)',
      color: '#ffffff',
      fontSize: '0.8rem',
      fontFamily: '"JetBrains Mono", monospace',
      padding: '10px 14px',
      borderRadius: '8px',
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

// StyledTooltip component
interface StyledTooltipProps {
  title: string;
  children: React.ReactElement;
  large?: boolean;
  placement?: TooltipProps['placement'];
}

export const StyledTooltip: React.FC<StyledTooltipProps> = ({
  title,
  children,
  large = false,
  placement = 'top',
}) => (
  <Tooltip
    title={title}
    arrow
    placement={placement}
    slotProps={large ? largeTooltipSlotProps : tooltipSlotProps}
  >
    {children}
  </Tooltip>
);

// TierStatItem component
interface TierStatItemProps {
  label: string;
  value: string;
  tooltip?: string;
  valueColor?: string;
  large?: boolean;
}

export const TierStatItem: React.FC<TierStatItemProps> = ({
  label,
  value,
  tooltip,
  valueColor = '#ffffff',
  large = false,
}) => {
  const labelContent = (
    <Typography
      sx={{
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.78rem',
        fontFamily: '"JetBrains Mono", monospace',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        cursor: tooltip ? 'pointer' : 'default',
      }}
    >
      {label}
      {tooltip && <InfoOutlinedIcon sx={{ fontSize: '0.75rem' }} />}
    </Typography>
  );

  return (
    <Box>
      {tooltip ? (
        <StyledTooltip title={tooltip}>{labelContent}</StyledTooltip>
      ) : (
        labelContent
      )}
      <Typography
        sx={{
          color: valueColor,
          fontSize: large ? '1.3rem' : '1.05rem',
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 700,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

// TierProgressBar component
interface TierProgressBarProps {
  label: string;
  current: number | string;
  required: number | string;
  progress: number;
  tierColor: string;
  tooltip?: string;
}

export const TierProgressBar: React.FC<TierProgressBarProps> = ({
  label,
  current,
  required,
  progress,
  tierColor,
  tooltip,
}) => {
  const isComplete = progress >= 100;

  const labelEl = (
    <Typography
      sx={{
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '0.7rem',
        fontFamily: '"JetBrains Mono", monospace',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        cursor: tooltip ? 'pointer' : 'default',
      }}
    >
      {label}
      {tooltip && (
        <InfoOutlinedIcon sx={{ fontSize: '0.7rem' }} />
      )}
    </Typography>
  );

  return (
    <Box sx={{ mb: 1 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 0.5,
        }}
      >
        {tooltip ? (
          <StyledTooltip title={tooltip}>
            {labelEl}
          </StyledTooltip>
        ) : (
          labelEl
        )}
        <Typography
          sx={{
            color: isComplete ? STATUS_COLORS.success : '#ffffff',
            fontSize: '0.7rem',
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          {current}{' '}
          <Box component="span" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            (Req: {required})
          </Box>
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 6,
          borderRadius: 3,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          '& .MuiLinearProgress-bar': {
            backgroundColor: isComplete ? STATUS_COLORS.success : tierColor,
            borderRadius: 3,
            transition: 'transform 0.8s ease-out',
          },
        }}
      />
    </Box>
  );
};

// TierPRActivity component
interface TierPRActivityProps {
  merged: number;
  opened: number;
  closed: number;
  borderColor: string;
}

export const TierPRActivity: React.FC<TierPRActivityProps> = ({
  merged,
  opened,
  closed,
  borderColor,
}) => (
  <Box sx={{ pt: 1.5, borderTop: `1px solid ${borderColor}` }}>
    <Typography
      sx={{
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.7rem',
        fontFamily: '"JetBrains Mono", monospace',
        mb: 1,
        textTransform: 'uppercase',
      }}
    >
      PR Activity
    </Typography>
    <Typography
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.85rem',
        color: 'rgba(255,255,255,0.6)',
      }}
    >
      Merged: <Box component="span" sx={{ color: '#fff', fontWeight: 600 }}>{merged}</Box>
      {'  '}Open: <Box component="span" sx={{ color: '#fff', fontWeight: 600 }}>{opened}</Box>
      {'  '}Closed: <Box component="span" sx={{ color: '#fff', fontWeight: 600 }}>{closed}</Box>
    </Typography>
  </Box>
);

// TierUnlockProgress component
interface TierUnlockProgressProps {
  tokenScore: number;
  requiredTokenScore: number | null;
  tokenScoreProgress: number;
  qualifiedReposCount: number;
  requiredQualifiedRepos: number;
  qualifiedReposProgress: number;
  credibility: number;
  requiredCredibility: number;
  credibilityProgress: number;
  tierColor: string;
  borderColor: string;
  title?: string;
  qualifiedReposTooltip?: string;
}

export const TierUnlockProgress: React.FC<TierUnlockProgressProps> = ({
  tokenScore,
  requiredTokenScore,
  tokenScoreProgress,
  qualifiedReposCount,
  requiredQualifiedRepos,
  qualifiedReposProgress,
  credibility,
  requiredCredibility,
  credibilityProgress,
  tierColor,
  borderColor,
  title = 'Unlock Progress',
  qualifiedReposTooltip,
}) => (
  <Box
    sx={{
      pt: 1.5,
      mt: 1,
      borderTop: `1px solid ${borderColor}`,
    }}
  >
    <Typography
      sx={{
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.7rem',
        fontFamily: '"JetBrains Mono", monospace',
        mb: 1,
        textTransform: 'uppercase',
      }}
    >
      {title}
    </Typography>

    {requiredTokenScore !== null && (
      <TierProgressBar
        label="Token Score"
        current={Math.round(tokenScore)}
        required={requiredTokenScore}
        progress={tokenScoreProgress}
        tierColor={tierColor}
      />
    )}

    <TierProgressBar
      label="Qualified Repos"
      current={qualifiedReposCount}
      required={requiredQualifiedRepos}
      progress={qualifiedReposProgress}
      tierColor={tierColor}
      tooltip={qualifiedReposTooltip}
    />

    <TierProgressBar
      label="Credibility"
      current={credibility ? `${(credibility * 100).toFixed(0)}%` : '0%'}
      required={`${(requiredCredibility * 100).toFixed(0)}%`}
      progress={credibilityProgress}
      tierColor={tierColor}
    />
  </Box>
);

// TierCard component
interface TierStats {
  score?: number;
  credibility?: number;
  merged?: number;
  closed?: number;
  total?: number;
  collateral?: number;
  uniqueRepos?: number;
  qualifiedUniqueRepos?: number;
  tokenScore?: number;
}

interface TierCardProps {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  stats: TierStats;
  isLocked: boolean;
  isNextTier: boolean;
  tooltipMessage?: string;
  qualifiedReposTooltip?: string;
  unlockProgress?: {
    tokenScore: number;
    requiredTokenScore: number | null;
    tokenScoreProgress: number;
    qualifiedReposCount: number;
    requiredQualifiedRepos: number;
    qualifiedReposProgress: number;
    credibility: number;
    requiredCredibility: number;
    credibilityProgress: number;
  };
}

export const TierCard: React.FC<TierCardProps> = ({
  name,
  color,
  bgColor,
  borderColor,
  stats,
  isLocked,
  isNextTier,
  tooltipMessage,
  qualifiedReposTooltip,
  unlockProgress,
}) => {
  const opened = (stats.total || 0) - (stats.merged || 0) - (stats.closed || 0);

  const getFilterStyles = () => {
    if (!isLocked) return { opacity: 1, filter: 'none' };
    if (isNextTier) return { opacity: 0.85, filter: 'grayscale(35%)' };
    return { opacity: 0.55, filter: 'grayscale(50%)' };
  };

  const getHoverStyles = () => {
    if (!isLocked) return {};
    if (isNextTier) return { opacity: 0.95, filter: 'grayscale(15%)' };
    return { opacity: 0.65, filter: 'grayscale(35%)' };
  };

  const getBorderStyles = () => {
    if (!isLocked) {
      return {
        border: `2px solid ${color}50`,
        boxShadow: `0 0 8px ${color}20`,
      };
    }
    return {
      border: `2px solid ${borderColor}`,
    };
  };

  const filterStyles = getFilterStyles();

  const cardContent = (
    <Box
      sx={{
        backgroundColor: bgColor,
        borderRadius: 2.5,
        ...getBorderStyles(),
        p: { xs: 1.5, sm: 2.5 },
        height: '100%',
        ...filterStyles,
        position: 'relative',
        transition: 'all 0.25s ease',
        '&:hover': {
          ...getHoverStyles(),
          ...(!isLocked && {
            transform: 'translateY(-2px)',
            boxShadow: `0 0 16px ${color}35`,
          }),
        },
      }}
    >
      {isLocked && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'rgba(255, 255, 255, 0.4)',
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: '1rem' }} />
        </Box>
      )}
      <Typography
        sx={{
          color,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.95rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          mb: 1.5,
          pb: 1,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        {name} Tier
      </Typography>

      <Stack spacing={1.5}>
        <TierStatItem
          label="Score"
          value={stats.score ? Number(stats.score).toFixed(4) : '0.0000'}
          large
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <TierStatItem
            label="Credibility"
            value={
              stats.credibility
                ? `${(Number(stats.credibility) * 100).toFixed(1)}%`
                : 'N/A'
            }
            tooltip="Your raw credibility (merged ÷ total attempts) for this tier. When applied to PRs, this is exponentially scaled by the tier's scalar to calculate your final credibility multiplier."
            valueColor={
              stats.credibility && stats.credibility >= 0.7
                ? STATUS_COLORS.success
                : '#ffffff'
            }
          />
          <Box sx={{ textAlign: 'right' }}>
            <TierStatItem
              label="Collateral"
              value={
                stats.collateral
                  ? Number(stats.collateral).toFixed(4)
                  : '0.0000'
              }
            />
          </Box>
        </Box>

        <TierPRActivity
          merged={stats.merged || 0}
          opened={opened > 0 ? opened : 0}
          closed={stats.closed || 0}
          borderColor={borderColor}
        />

        {unlockProgress && (
          <TierUnlockProgress
            tokenScore={unlockProgress.tokenScore}
            requiredTokenScore={unlockProgress.requiredTokenScore}
            tokenScoreProgress={unlockProgress.tokenScoreProgress}
            qualifiedReposCount={unlockProgress.qualifiedReposCount}
            requiredQualifiedRepos={unlockProgress.requiredQualifiedRepos}
            qualifiedReposProgress={unlockProgress.qualifiedReposProgress}
            credibility={unlockProgress.credibility}
            requiredCredibility={unlockProgress.requiredCredibility}
            credibilityProgress={unlockProgress.credibilityProgress}
            tierColor={color}
            borderColor={borderColor}
            title={isLocked ? 'Unlock Progress' : 'Maintenance Requirements'}
            qualifiedReposTooltip={qualifiedReposTooltip}
          />
        )}
      </Stack>
    </Box>
  );

  if (isLocked && tooltipMessage) {
    return (
      <StyledTooltip title={tooltipMessage} large placement="top">
        {cardContent}
      </StyledTooltip>
    );
  }

  return cardContent;
};
