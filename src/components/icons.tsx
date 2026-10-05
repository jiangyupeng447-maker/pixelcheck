import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
}

export const Logo = (p: IconProps) => (
  <svg viewBox="0 0 32 32" {...p}>
    <rect width="32" height="32" rx="7" fill="#DDF45A" />
    <rect x="8" y="8" width="7" height="7" rx="1.5" fill="#171817" />
    <rect x="17" y="8" width="7" height="7" rx="1.5" fill="#171817" opacity="0.55" />
    <rect x="8" y="17" width="7" height="7" rx="1.5" fill="#171817" opacity="0.55" />
    <rect x="17" y="17" width="7" height="7" rx="1.5" fill="#171817" />
  </svg>
)

export const IconGrid = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

export const IconCompare = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="7" height="16" rx="1.5" />
    <rect x="14" y="4" width="7" height="16" rx="1.5" />
  </svg>
)

export const IconPlus = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconLayers = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
)

export const IconDiff = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="12" r="6" />
    <circle cx="15" cy="12" r="6" />
  </svg>
)

export const IconZoomIn = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5M11 8v6M8 11h6" />
  </svg>
)

export const IconZoomOut = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5M8 11h6" />
  </svg>
)

export const IconFit = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
  </svg>
)

export const IconReset = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)

export const IconUpload = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 16V4m0 0-4 4m4-4 4 4" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
)

export const IconCheck = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m5 12 5 5L20 7" />
  </svg>
)

export const IconTrash = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
  </svg>
)

export const IconArrowRight = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const IconAlert = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 9v4m0 4h.01" />
    <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </svg>
)

export const IconTarget = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
)

// --- Issue-type icons ---
export const IconSpacing = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 4v16M20 4v16" />
    <path d="M8 12h8M8 12l2-2M8 12l2 2M16 12l-2-2M16 12l-2 2" />
  </svg>
)

export const IconSize = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="16" height="16" rx="1.5" />
    <path d="M9 15V9h6" />
  </svg>
)

export const IconPosition = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3v18M3 12h18" />
    <circle cx="12" cy="12" r="3.5" />
  </svg>
)

export const IconColor = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-.5-.3-.9-.3-1.4 0-.6.5-1.1 1.1-1.1H16a5 5 0 0 0 5-5c0-4.4-4-9-9-9Z" />
    <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

export const IconRadius = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 19V11a6 6 0 0 1 6-6h8" />
  </svg>
)

export const IconTypography = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 7V5h16v2M9 5v14M9 19h6" />
  </svg>
)

export const IconCrop = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14" />
  </svg>
)

export const IconGlobe = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
  </svg>
)
