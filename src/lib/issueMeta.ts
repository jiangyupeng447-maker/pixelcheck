import type { IssueType, Severity } from '../types'
import {
  IconSpacing,
  IconSize,
  IconPosition,
  IconColor,
  IconRadius,
  IconTypography,
} from '../components/icons'

export const severityMeta: Record<
  Severity,
  { label: string; dot: string; text: string; badge: string; ring: string; hex: string }
> = {
  high: {
    label: 'High',
    dot: 'bg-danger',
    text: 'text-danger',
    badge: 'text-danger bg-danger/10 border-danger/20',
    ring: 'ring-danger',
    hex: '#F0526B',
  },
  medium: {
    label: 'Medium',
    dot: 'bg-warning',
    text: 'text-warning',
    badge: 'text-warning bg-warning/10 border-warning/20',
    ring: 'ring-warning',
    hex: '#F5A623',
  },
  low: {
    label: 'Low',
    dot: 'bg-content-muted',
    text: 'text-content-secondary',
    badge: 'text-content-secondary bg-white/5 border-border',
    ring: 'ring-content-muted',
    hex: '#8A9099',
  },
}

export const issueTypeIcon: Record<IssueType, typeof IconSpacing> = {
  spacing: IconSpacing,
  size: IconSize,
  position: IconPosition,
  color: IconColor,
  radius: IconRadius,
  typography: IconTypography,
}
