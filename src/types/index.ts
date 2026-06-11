export type ProcessType =
  | 'base_embryo'
  | 'polishing'
  | 'plastering'
  | 'face_carving'
  | 'gold_outlining'
  | 'custom'

export const PROCESS_TYPE_META: Record<ProcessType, { label: string; color: string; order: number }> = {
  base_embryo: { label: '底胚', color: '#8B4513', order: 1 },
  polishing: { label: '打磨', color: '#A0522D', order: 2 },
  plastering: { label: '上灰', color: '#D2B48C', order: 3 },
  face_carving: { label: '开脸', color: '#CD853F', order: 4 },
  gold_outlining: { label: '描金', color: '#DAA520', order: 5 },
  custom: { label: '自定义', color: '#696969', order: 99 }
}

export const PROCESS_ORDER: Record<ProcessType, number> = {
  base_embryo: 1,
  polishing: 2,
  plastering: 3,
  face_carving: 4,
  gold_outlining: 5,
  custom: 99
}

export interface PatternRegion {
  id: string
  name: string
  path: string
  color: string
  opacity: number
  visible: boolean
  area: number
  createdAt: number
}

export interface ProcessLayer {
  id: string
  name: string
  type: ProcessType
  customTypeName?: string
  description: string
  materialBatch: string
  completion: number
  patterns: PatternRegion[]
  notes: string
  createdAt: number
  updatedAt: number
}

export interface ProcessScheme {
  id: string
  name: string
  description: string
  layers: ProcessLayer[]
  layerOrder: string[]
  createdAt: number
  updatedAt: number
  isActive: boolean
}

export interface Mask {
  id: string
  name: string
  description: string
  thumbnail: string
  schemes: ProcessScheme[]
  activeSchemeId: string | null
  createdAt: number
  updatedAt: number
}

export interface AreaAnalysisResult {
  color: string
  colorName: string
  area: number
  percentage: number
  layerId: string
  layerName: string
  patternId: string
  patternName: string
}

export interface SchemeComparison {
  schemeId: string
  schemeName: string
  totalArea: number
  visibleArea: number
  colorDistribution: AreaAnalysisResult[]
  layerStats: {
    layerId: string
    layerName: string
    completion: number
    patternCount: number
    totalPatternArea: number
  }[]
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface ImportResult {
  success: boolean
  message: string
  scheme?: ProcessScheme
}

export type ChangeType = 'layer_added' | 'layer_removed' | 'layer_modified'
  | 'pattern_added' | 'pattern_removed' | 'pattern_modified'
  | 'scheme_modified'

export interface ChangeRecord {
  type: ChangeType
  targetType: 'scheme' | 'layer' | 'pattern'
  targetId: string
  targetName: string
  layerId?: string
  field?: string
  oldValue?: unknown
  newValue?: unknown
  description: string
}

export interface SchemeVersion {
  id: string
  schemeId: string
  versionNumber: number
  name: string
  description: string
  snapshot: ProcessScheme
  changes: ChangeRecord[]
  createdAt: number
  author: string
  tags: string[]
}

export type IssueSeverity = 'error' | 'warning' | 'info'
export type IssueType = 'missing_process' | 'area_abnormal' | 'too_many_colors'
  | 'material_conflict' | 'completion_gap' | 'orphan_pattern'
  | 'low_opacity' | 'batch_missing'

export interface SchemeIssue {
  id: string
  type: IssueType
  severity: IssueSeverity
  title: string
  description: string
  layerId?: string
  patternId?: string
  suggestion?: string
}

export interface ValidationReport {
  issues: SchemeIssue[]
  errorCount: number
  warningCount: number
  infoCount: number
  generatedAt: number
}

export interface LayerDiff {
  layerId: string
  layerName: string
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  oldCompletion?: number
  newCompletion?: number
  oldMaterial?: string
  newMaterial?: string
  patternDiffs: PatternDiff[]
}

export interface PatternDiff {
  patternId: string
  patternName: string
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  oldColor?: string
  newColor?: string
  oldArea?: number
  newArea?: number
  oldOpacity?: number
  newOpacity?: number
}

export interface VersionDiff {
  oldVersionName: string
  newVersionName: string
  layerDiffs: LayerDiff[]
  summary: {
    layersAdded: number
    layersRemoved: number
    layersModified: number
    patternsAdded: number
    patternsRemoved: number
    patternsModified: number
    totalAreaDiff: number
    colorsChanged: number
  }
}

export interface PreviewToken {
  id: string
  schemeId: string
  maskId: string
  snapshot: ProcessScheme
  createdAt: number
  expiresAt: number | null
  author: string
  comments: PreviewComment[]
}

export interface PreviewComment {
  id: string
  author: string
  content: string
  createdAt: number
  replyTo?: string
}
