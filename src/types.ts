export type ViewMode = 'side-by-side' | 'overlay' | 'difference' | 'issues-overlay'

export type IssueType =
  | 'spacing'
  | 'size'
  | 'position'
  | 'color'
  | 'radius'
  | 'typography'

export type Severity = 'high' | 'medium' | 'low'

/** Rectangle in the shared base (page) coordinate system. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

/** How to draw the measurement annotation on the canvas for this issue. */
export type MeasureAxis = 'vertical' | 'horizontal' | 'box' | 'point'

/** Where an issue came from: whole-page analysis vs a user-selected region. */
export type QAScope = 'global' | 'local'

/**
 * Geometry + values of a measurement (e.g. the gap between two elements).
 * `start`/`end` are in the shared base coordinate system so the guide can be
 * drawn precisely; a real analysis engine will fill these from detected edges.
 */
export interface Measurement {
  type: 'vertical' | 'horizontal'
  start: Point
  end: Point
  designValue: string
  actualValue: string
}

export interface VisualIssue {
  id: string
  type: IssueType
  severity: Severity
  scope: QAScope
  /** Short element / relationship name, e.g. "Card 1 → Card 2". */
  title: string
  description?: string
  designValue: string
  actualValue: string
  difference?: string
  unit?: string
  /** Rects in the shared base coordinate system — may differ between the two. */
  designRect: Rect
  actualRect: Rect
  measurement?: Measurement
  /** 0..1 detector confidence (mock = fixed for now). */
  confidence?: number
}

export interface Screen {
  id: string
  index: string
  name: string
  issues: number
}

export interface Review {
  id: string
  title: string
  status: 'passed' | 'issues' | 'in-review'
  issues: number
  updatedAt: string
  author: string
}

export interface UploadedImage {
  name: string
  dataUrl: string
  width: number
  height: number
  /** file size in bytes */
  size?: number
}

/** Canonical uploaded-image shape for the comparison engine. */
export interface ReviewImage {
  src: string
  width: number
  height: number
  name: string
}

/** The engine's issue shape is exactly the app's VisualIssue. */
export type ComparisonIssue = VisualIssue

/** A full comparison run (real images or demo), in original-pixel coordinates. */
export interface ComparisonSession {
  mode: 'real' | 'demo'
  designImage: string
  actualImage: string
  designWidth: number
  designHeight: number
  actualWidth: number
  actualHeight: number
  /** display scale of the non-base image into the base coordinate system */
  scale: number
  issues: VisualIssue[]
  coverage: number
  pixelDiffRatio: number | null
}

export const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  spacing: 'Spacing',
  size: 'Size',
  position: 'Position',
  color: 'Color',
  radius: 'Radius',
  typography: 'Typography',
}

export const ISSUE_TYPE_ORDER: IssueType[] = [
  'spacing',
  'size',
  'position',
  'color',
  'radius',
  'typography',
]
