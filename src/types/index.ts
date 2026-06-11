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

export type SchoolStyle = 'jiangxi' | 'guizhou' | 'hunan' | 'sichuan' | 'yunnan' | 'custom'

export const SCHOOL_STYLE_META: Record<SchoolStyle, { label: string; region: string; color: string }> = {
  jiangxi: { label: '江西傩', region: '赣鄱地区', color: '#8B4513' },
  guizhou: { label: '贵州傩', region: '黔东南', color: '#4a148c' },
  hunan: { label: '湖南傩', region: '湘西地区', color: '#c62828' },
  sichuan: { label: '四川傩', region: '巴蜀地区', color: '#2e7d32' },
  yunnan: { label: '云南傩', region: '滇西地区', color: '#ef6c00' },
  custom: { label: '自定义流派', region: '其他', color: '#546e7a' }
}

export interface ColorTemplate {
  id: string
  name: string
  color: string
  purpose: string
  usageArea: string
  opacity: number
}

export interface LineSketch {
  id: string
  name: string
  description: string
  path: string
  category: 'face_outline' | 'facial_feature' | 'decoration' | 'symbol'
  referenceImage?: string
  keyPoints: string
}

export interface MaterialItem {
  id: string
  name: string
  category: 'wood' | 'paint' | 'tool' | 'accessory' | 'other'
  specification: string
  quantity: string
  notes: string
  alternative?: string
}

export interface TemplateProcessStep {
  id: string
  order: number
  layerType: ProcessType
  customTypeName?: string
  stepName: string
  description: string
  durationMinutes: number
  difficultyLevel: 1 | 2 | 3 | 4 | 5
  keyPoints: string[]
  commonMistakes: string[]
  qualityStandards: string[]
  referenceLines: string[]
  recommendedColors: string[]
  materials: string[]
  safetyNotes: string[]
}

export interface CraftTemplate {
  id: string
  name: string
  school: SchoolStyle
  customSchoolName?: string
  maskType: string
  description: string
  author: string
  coverImage?: string
  createdAt: number
  updatedAt: number
  isPublic: boolean
  tags: string[]
  version: string
  processSteps: TemplateProcessStep[]
  colorTemplates: ColorTemplate[]
  lineSketches: LineSketch[]
  materials: MaterialItem[]
  precautions: string[]
  culturalBackground: string
  inheritanceNotes: string
  usageCount: number
  rating: number
}

export interface TeachingSession {
  id: string
  templateId: string
  templateName: string
  currentStepIndex: number
  isPlaying: boolean
  playMode: 'manual' | 'auto'
  autoPlayInterval: number
  startTime: number
  lastUpdateTime: number
  apprenticeName: string
  notes: Record<string, string>
}

export type DeviationType = 'missing_step' | 'extra_step' | 'order_wrong'
  | 'color_mismatch' | 'area_deviation' | 'material_mismatch'
  | 'completion_insufficient' | 'pattern_missing' | 'pattern_extra'

export interface DeviationItem {
  id: string
  type: DeviationType
  severity: 'minor' | 'major' | 'critical'
  targetName: string
  expected: string
  actual: string
  description: string
  suggestion: string
  scoreDeduction: number
}

export interface PracticeSubmission {
  id: string
  templateId: string
  templateName: string
  apprenticeName: string
  schemeId: string
  schemeSnapshot: ProcessScheme
  submittedAt: number
  deviations: DeviationItem[]
  totalScore: number
  maxScore: number
  grade: 'excellent' | 'good' | 'pass' | 'fail'
  feedback: string
  stepScores: {
    stepId: string
    stepName: string
    score: number
    maxScore: number
    issues: string[]
  }[]
}

export interface TemplateApplyResult {
  success: boolean
  message: string
  schemeId?: string
  layersCreated?: number
  patternsCreated?: number
  maskId?: string
  maskName?: string
}

export type ReviewStatus = 'pending' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'archived'
export type ReviewType = 'process_step' | 'scheme' | 'template' | 'practice'
export type RejectionCategory = 'technique' | 'material' | 'color' | 'pattern' | 'order' | 'other'

export interface RejectionRecord {
  id: string
  reviewer: string
  category: RejectionCategory
  reason: string
  suggestions: string[]
  rejectedAt: number
}

export interface ReReviewResult {
  id: string
  reviewer: string
  result: 'pass' | 'fail'
  comments: string
  reviewedAt: number
}

export interface MasterComment {
  id: string
  reviewer: string
  content: string
  rating: number
  highlights: string[]
  improvements: string[]
  createdAt: number
  replies?: {
    id: string
    author: string
    content: string
    createdAt: number
  }[]
}

export interface StageAcceptance {
  id: string
  stepId: string
  stepName: string
  layerType: ProcessType
  status: 'pending' | 'submitted' | 'under_review' | 'accepted' | 'rejected'
  submittedAt?: number
  reviewedAt?: number
  reviewer?: string
  acceptanceCriteria: string[]
  actualResults: string[]
  comments: string
  rejections: RejectionRecord[]
  reReviews: ReReviewResult[]
}

export interface ModificationTrack {
  id: string
  targetType: 'scheme' | 'layer' | 'pattern'
  targetId: string
  targetName: string
  description: string
  changeType: 'add' | 'modify' | 'remove'
  oldValue?: string
  newValue?: string
  author: string
  createdAt: number
  status: 'pending' | 'in_progress' | 'completed' | 'verified'
  verifiedBy?: string
  verifiedAt?: number
}

export interface ReviewRecord {
  id: string
  maskId: string
  maskName: string
  schemeId: string
  schemeName: string
  templateId?: string
  templateName?: string
  type: ReviewType
  status: ReviewStatus
  currentStageIndex: number
  submittedAt?: number
  reviewStartAt?: number
  completedAt?: number
  stages: StageAcceptance[]
  masterComments: MasterComment[]
  modifications: ModificationTrack[]
  practiceSubmissionId?: string
  finalScore?: number
  finalGrade?: 'excellent' | 'good' | 'pass' | 'fail'
  reviewConclusion: string
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface ArchiveItem {
  id: string
  archiveType: 'scheme' | 'template' | 'practice' | 'review'
  referenceId: string
  title: string
  description: string
  author: string
  school?: SchoolStyle
  tags: string[]
  version?: string
  rating?: number
  usageCount?: number
  archivedAt: number
  metadata: Record<string, unknown>
  snapshot?: unknown
}

export interface ArchiveSearchQuery {
  keyword?: string
  archiveType?: ArchiveItem['archiveType'] | 'all'
  school?: SchoolStyle | 'all'
  author?: string
  dateRange?: { start: number; end: number }
  ratingRange?: { min: number; max: number }
  tags?: string[]
}

export interface InheritanceRecord {
  id: string
  type: 'teaching' | 'practice' | 'review' | 'version'
  title: string
  description: string
  timestamp: number
  operator: string
  details: Record<string, unknown>
}

export interface InheritanceArchive {
  id: string
  maskId: string
  maskName: string
  schemeId: string
  schemeName: string
  templateId?: string
  templateName?: string
  apprenticeName: string
  masterName: string
  createdAt: number
  completedAt?: number
  status: 'in_progress' | 'completed'
  processRecords: {
    stepId: string
    stepName: string
    layerType: ProcessType
    startedAt: number
    completedAt?: number
    notes: string
    materials: string[]
    completion: number
  }[]
  versionHistory: {
    versionId: string
    versionName: string
    versionNumber: number
    description: string
    createdAt: number
    author: string
    diffSummary?: string
  }[]
  teachingRecords: {
    sessionId: string
    startTime: number
    endTime?: number
    notes: Record<string, string>
  }[]
  practiceRecords: PracticeSubmission[]
  reviewRecords: ReviewRecord[]
  teachingContent?: {
    culturalBackground: string
    inheritanceNotes: string
    precautions: string[]
  }
  finalEvaluation: {
    totalScore: number
    maxScore: number
    grade: 'excellent' | 'good' | 'pass' | 'fail'
    strengths: string[]
    improvements: string[]
    comments: string
    evaluatedBy: string
    evaluatedAt: number
  } | null
}

export type OperationStatus = 'idle' | 'loading' | 'success' | 'error'

export interface OperationResult<TData = unknown, TError = Error> {
  success: boolean
  data?: TData
  error?: TError
  message: string
}

export interface AsyncOperationState<TData = unknown, TError = Error> {
  status: OperationStatus
  data: TData | null
  error: TError | null
  message: string
}

export interface ListResult<TItem> {
  items: TItem[]
  total: number
  page: number
  pageSize: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface IDWithTimestamp {
  id: string
  createdAt: number
  updatedAt: number
}

export type EntityStatus = 'draft' | 'active' | 'archived' | 'deleted'

