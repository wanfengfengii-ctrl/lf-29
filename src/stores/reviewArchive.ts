import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateId, now } from '@/utils/id'
import { useMaskStore } from '@/stores/mask'
import { useCraftTemplateStore } from '@/stores/craftTemplate'
import type {
  ReviewRecord,
  StageAcceptance,
  MasterComment,
  ModificationTrack,
  RejectionRecord,
  ReReviewResult,
  ArchiveItem,
  ArchiveSearchQuery,
  InheritanceArchive,
  ReviewStatus,
  ReviewType,
  RejectionCategory
} from '@/types'

function createSampleReviewRecords(): ReviewRecord[] {
  const maskStore = useMaskStore()
  const templateStore = useCraftTemplateStore()
  const mask = maskStore.masks[0]
  const scheme = mask?.schemes[0]
  const template = templateStore.templates[0]

  if (!mask || !scheme || !template) return []

  const stages: StageAcceptance[] = template.processSteps
    .sort((a, b) => a.order - b.order)
    .map((step, idx) => ({
      id: generateId(),
      stepId: step.id,
      stepName: step.stepName,
      layerType: step.layerType,
      status: idx < 2 ? 'accepted' : idx === 2 ? 'rejected' : 'pending',
      submittedAt: idx < 3 ? now() - 86400000 * (5 - idx) : undefined,
      reviewedAt: idx < 3 ? now() - 86400000 * (4 - idx) : undefined,
      reviewer: idx < 3 ? '李师傅（第三代传人）' : undefined,
      acceptanceCriteria: step.qualityStandards,
      actualResults: idx < 2 ? step.qualityStandards : [],
      comments: idx === 2 ? '鹿角灰配比不准确，灰层厚度不均匀，需重新上灰' : idx < 2 ? '工序规范，质量达标' : '',
      rejections: idx === 2 ? [{
        id: generateId(),
        reviewer: '李师傅（第三代传人）',
        category: 'technique' as RejectionCategory,
        reason: '鹿角灰配比不准确，灰层厚度不均匀',
        suggestions: [
          '严格按照鹿角霜60% + 生漆30% + 面粉10%的配比',
          '每道厚度控制在0.5mm以内',
          '重新上灰后需阴干24小时'
        ],
        rejectedAt: now() - 86400000 * 2
      }] : [],
      reReviews: []
    }))

  return [{
    id: generateId(),
    maskId: mask.id,
    maskName: mask.name,
    schemeId: scheme.id,
    schemeName: scheme.name,
    templateId: template.id,
    templateName: template.name,
    type: 'scheme' as ReviewType,
    status: 'under_review' as ReviewStatus,
    currentStageIndex: 2,
    submittedAt: now() - 86400000 * 5,
    reviewStartAt: now() - 86400000 * 4,
    stages,
    masterComments: [{
      id: generateId(),
      reviewer: '李师傅（第三代传人）',
      content: '整体进度良好，底胚和打磨工序都做得很到位。上灰工序需要返工，注意配比和厚度控制。这是传统工艺的关键步骤，不能马虎。',
      rating: 4,
      highlights: [
        '樟木选材考究，纹理清晰',
        '打磨工序规范，表面光滑',
        '脸型比例准确，左右对称'
      ],
      improvements: [
        '鹿角灰配比需要更精确',
        '上灰手法需要练习，保持厚度均匀',
        '阴干时间要充足，不可急于求成'
      ],
      createdAt: now() - 86400000 * 2,
      replies: [{
        id: generateId(),
        author: '学徒张三',
        content: '谢谢师傅指点，我已经重新调整了配比，正在重新上灰',
        createdAt: now() - 86400000 * 1
      }]
    }],
    modifications: [{
      id: generateId(),
      targetType: 'layer',
      targetId: scheme.layers[2]?.id || '',
      targetName: '传统鹿角灰上灰',
      description: '调整鹿角灰配比，重新上灰',
      changeType: 'modify',
      oldValue: '鹿角霜50% + 生漆40% + 面粉10%',
      newValue: '鹿角霜60% + 生漆30% + 面粉10%',
      author: '学徒张三',
      createdAt: now() - 86400000 * 1,
      status: 'in_progress'
    }],
    reviewConclusion: '',
    createdBy: '学徒张三',
    createdAt: now() - 86400000 * 5,
    updatedAt: now() - 86400000 * 1
  }]
}

function createSampleArchiveItems(): ArchiveItem[] {
  const templateStore = useCraftTemplateStore()
  const items: ArchiveItem[] = []

  templateStore.templates.forEach(template => {
    items.push({
      id: generateId(),
      archiveType: 'template',
      referenceId: template.id,
      title: template.name,
      description: template.description,
      author: template.author,
      school: template.school,
      tags: template.tags,
      version: template.version,
      rating: template.rating,
      usageCount: template.usageCount,
      archivedAt: template.updatedAt,
      metadata: {
        processSteps: template.processSteps.length,
        colorTemplates: template.colorTemplates.length,
        lineSketches: template.lineSketches.length,
        materials: template.materials.length
      },
      snapshot: template
    })
  })

  const maskStore = useMaskStore()
  maskStore.masks.forEach(mask => {
    mask.schemes.forEach(scheme => {
      items.push({
        id: generateId(),
        archiveType: 'scheme',
        referenceId: scheme.id,
        title: `${mask.name} - ${scheme.name}`,
        description: scheme.description,
        author: '当前用户',
        tags: [mask.name, scheme.name],
        archivedAt: scheme.updatedAt,
        metadata: {
          maskId: mask.id,
          layers: scheme.layers.length,
          patterns: scheme.layers.reduce((s, l) => s + l.patterns.length, 0),
          isActive: scheme.isActive
        }
      })
    })
  })

  templateStore.submissions.forEach(submission => {
    items.push({
      id: generateId(),
      archiveType: 'practice',
      referenceId: submission.id,
      title: `${submission.apprenticeName} - ${submission.templateName}练习评分`,
      description: submission.feedback,
      author: submission.apprenticeName,
      tags: ['练习', submission.grade, submission.templateName],
      rating: submission.totalScore / submission.maxScore * 5,
      archivedAt: submission.submittedAt,
      metadata: {
        totalScore: submission.totalScore,
        maxScore: submission.maxScore,
        grade: submission.grade,
        deviationCount: submission.deviations.length
      }
    })
  })

  return items
}

export const useReviewArchiveStore = defineStore('reviewArchive', () => {
  const reviewRecords = ref<ReviewRecord[]>([])
  const archiveItems = ref<ArchiveItem[]>([])
  const inheritanceArchives = ref<InheritanceArchive[]>([])
  const activeReviewId = ref<string | null>(null)
  const initialized = ref(false)

  const activeReview = computed<ReviewRecord | null>(() => {
    return reviewRecords.value.find(r => r.id === activeReviewId.value) || null
  })

  const sortedReviews = computed<ReviewRecord[]>(() => {
    return [...reviewRecords.value].sort((a, b) => b.updatedAt - a.updatedAt)
  })

  const pendingReviews = computed<ReviewRecord[]>(() => {
    return reviewRecords.value.filter(r => r.status === 'submitted' || r.status === 'under_review')
  })

  const completedReviews = computed<ReviewRecord[]>(() => {
    return reviewRecords.value.filter(r => r.status === 'accepted' || r.status === 'rejected' || r.status === 'archived')
  })

  function ensureInitialized() {
    if (!initialized.value) {
      reviewRecords.value = createSampleReviewRecords()
      archiveItems.value = createSampleArchiveItems()
      initialized.value = true
    }
  }

  function setActiveReview(reviewId: string) {
    ensureInitialized()
    if (reviewRecords.value.find(r => r.id === reviewId)) {
      activeReviewId.value = reviewId
    }
  }

  function createReview(
    data: Omit<ReviewRecord, 'id' | 'status' | 'currentStageIndex' | 'stages' | 'masterComments' | 'modifications' | 'reviewConclusion' | 'createdAt' | 'updatedAt'>
  ): ReviewRecord {
    ensureInitialized()
    const maskStore = useMaskStore()
    const templateStore = useCraftTemplateStore()

    const scheme = maskStore.findSchemeById(data.schemeId)
    const template = data.templateId ? templateStore.templates.find(t => t.id === data.templateId) : null

    const stages: StageAcceptance[] = []
    if (template) {
      template.processSteps
        .sort((a, b) => a.order - b.order)
        .forEach(step => {
          stages.push({
            id: generateId(),
            stepId: step.id,
            stepName: step.stepName,
            layerType: step.layerType,
            status: 'pending',
            acceptanceCriteria: step.qualityStandards,
            actualResults: [],
            comments: '',
            rejections: [],
            reReviews: []
          })
        })
    } else if (scheme) {
      scheme.layers.forEach(layer => {
        stages.push({
          id: generateId(),
          stepId: layer.id,
          stepName: layer.name,
          layerType: layer.type,
          status: 'pending',
          acceptanceCriteria: [],
          actualResults: [],
          comments: '',
          rejections: [],
          reReviews: []
        })
      })
    }

    const review: ReviewRecord = {
      id: generateId(),
      ...data,
      status: 'pending',
      currentStageIndex: 0,
      stages,
      masterComments: [],
      modifications: [],
      reviewConclusion: '',
      createdAt: now(),
      updatedAt: now()
    }

    reviewRecords.value.push(review)
    activeReviewId.value = review.id
    return review
  }

  function submitReview(reviewId: string) {
    ensureInitialized()
    const review = reviewRecords.value.find(r => r.id === reviewId)
    if (!review) return

    review.status = 'submitted'
    review.submittedAt = now()
    review.updatedAt = now()
    review.stages.forEach(stage => {
      if (stage.status === 'pending') {
        stage.status = 'submitted'
        stage.submittedAt = now()
      }
    })

    addToArchive({
      archiveType: 'review',
      referenceId: review.id,
      title: `${review.maskName} - ${review.schemeName} 评审记录`,
      description: `提交时间: ${new Date(review.submittedAt!).toLocaleString()}`,
      author: review.createdBy,
      tags: ['评审', review.maskName, review.schemeName],
      archivedAt: now(),
      metadata: {
        type: review.type,
        stageCount: review.stages.length
      }
    })
  }

  function startReview(reviewId: string, reviewer: string) {
    ensureInitialized()
    const review = reviewRecords.value.find(r => r.id === reviewId)
    if (!review) return

    review.status = 'under_review'
    review.reviewStartAt = now()
    review.updatedAt = now()

    if (review.stages.length > 0 && review.stages[0].status === 'submitted') {
      review.stages[0].status = 'under_review'
    }
  }

  function submitStageForReview(reviewId: string, stageId: string, actualResults: string[]) {
    ensureInitialized()
    const review = reviewRecords.value.find(r => r.id === reviewId)
    if (!review) return

    const stage = review.stages.find(s => s.id === stageId)
    if (!stage) return

    stage.status = 'submitted'
    stage.submittedAt = now()
    stage.actualResults = actualResults
    review.updatedAt = now()
  }

  function reviewStage(
    reviewId: string,
    stageId: string,
    accepted: boolean,
    reviewer: string,
    comments: string,
    rejection?: {
      category: RejectionCategory
      reason: string
      suggestions: string[]
    }
  ) {
    ensureInitialized()
    const review = reviewRecords.value.find(r => r.id === reviewId)
    if (!review) return

    const stageIndex = review.stages.findIndex(s => s.id === stageId)
    if (stageIndex === -1) return

    const stage = review.stages[stageIndex]
    stage.reviewedAt = now()
    stage.reviewer = reviewer
    stage.comments = comments

    if (accepted) {
      stage.status = 'accepted'
      if (stageIndex < review.stages.length - 1) {
        review.currentStageIndex = stageIndex + 1
        review.stages[stageIndex + 1].status = 'under_review'
      } else {
        review.status = 'accepted'
        review.completedAt = now()
        review.reviewConclusion = '所有工序验收通过，评审完成'
      }
    } else {
      stage.status = 'rejected'
      if (rejection) {
        const rejectionRecord: RejectionRecord = {
          id: generateId(),
          reviewer,
          category: rejection.category,
          reason: rejection.reason,
          suggestions: rejection.suggestions,
          rejectedAt: now()
        }
        stage.rejections.push(rejectionRecord)
      }
    }

    review.updatedAt = now()
  }

  function resubmitStage(reviewId: string, stageId: string, actualResults: string[]) {
    ensureInitialized()
    const review = reviewRecords.value.find(r => r.id === reviewId)
    if (!review) return

    const stage = review.stages.find(s => s.id === stageId)
    if (!stage || stage.status !== 'rejected') return

    stage.status = 'submitted'
    stage.submittedAt = now()
    stage.actualResults = actualResults
    review.updatedAt = now()
  }

  function reReviewStage(
    reviewId: string,
    stageId: string,
    pass: boolean,
    reviewer: string,
    comments: string
  ) {
    ensureInitialized()
    const review = reviewRecords.value.find(r => r.id === reviewId)
    if (!review) return

    const stageIndex = review.stages.findIndex(s => s.id === stageId)
    if (stageIndex === -1) return

    const stage = review.stages[stageIndex]
    const reReview: ReReviewResult = {
      id: generateId(),
      reviewer,
      result: pass ? 'pass' : 'fail',
      comments,
      reviewedAt: now()
    }
    stage.reReviews.push(reReview)

    if (pass) {
      stage.status = 'accepted'
      if (stageIndex < review.stages.length - 1) {
        review.currentStageIndex = stageIndex + 1
        review.stages[stageIndex + 1].status = 'under_review'
      } else {
        review.status = 'accepted'
        review.completedAt = now()
        review.reviewConclusion = '所有工序验收通过，评审完成'
      }
    } else {
      stage.status = 'rejected'
    }

    review.updatedAt = now()
  }

  function addMasterComment(
    reviewId: string,
    reviewer: string,
    content: string,
    rating: number,
    highlights: string[],
    improvements: string[]
  ): MasterComment | null {
    ensureInitialized()
    const review = reviewRecords.value.find(r => r.id === reviewId)
    if (!review) return null

    const comment: MasterComment = {
      id: generateId(),
      reviewer,
      content,
      rating,
      highlights,
      improvements,
      createdAt: now(),
      replies: []
    }

    review.masterComments.push(comment)
    review.updatedAt = now()
    return comment
  }

  function replyToMasterComment(
    reviewId: string,
    commentId: string,
    author: string,
    content: string
  ) {
    ensureInitialized()
    const review = reviewRecords.value.find(r => r.id === reviewId)
    if (!review) return

    const comment = review.masterComments.find(c => c.id === commentId)
    if (!comment) return

    if (!comment.replies) comment.replies = []
    comment.replies.push({
      id: generateId(),
      author,
      content,
      createdAt: now()
    })

    review.updatedAt = now()
  }

  function addModificationTrack(
    reviewId: string,
    data: Omit<ModificationTrack, 'id' | 'createdAt' | 'status'> & { status?: ModificationTrack['status'] }
  ): ModificationTrack | null {
    ensureInitialized()
    const review = reviewRecords.value.find(r => r.id === reviewId)
    if (!review) return null

    const modification: ModificationTrack = {
      id: generateId(),
      createdAt: now(),
      status: 'pending',
      ...data
    }

    review.modifications.push(modification)
    review.updatedAt = now()
    return modification
  }

  function updateModificationStatus(
    reviewId: string,
    modificationId: string,
    status: ModificationTrack['status'],
    verifiedBy?: string
  ) {
    ensureInitialized()
    const review = reviewRecords.value.find(r => r.id === reviewId)
    if (!review) return

    const modification = review.modifications.find(m => m.id === modificationId)
    if (!modification) return

    modification.status = status
    if (status === 'verified' && verifiedBy) {
      modification.verifiedBy = verifiedBy
      modification.verifiedAt = now()
    }

    review.updatedAt = now()
  }

  function completeReview(
    reviewId: string,
    finalScore: number,
    finalGrade: ReviewRecord['finalGrade'],
    conclusion: string
  ) {
    ensureInitialized()
    const review = reviewRecords.value.find(r => r.id === reviewId)
    if (!review) return

    review.status = 'accepted'
    review.finalScore = finalScore
    review.finalGrade = finalGrade
    review.reviewConclusion = conclusion
    review.completedAt = now()
    review.updatedAt = now()
  }

  function getReviewsByMask(maskId: string): ReviewRecord[] {
    ensureInitialized()
    return reviewRecords.value.filter(r => r.maskId === maskId)
  }

  function getReviewsByScheme(schemeId: string): ReviewRecord[] {
    ensureInitialized()
    return reviewRecords.value.filter(r => r.schemeId === schemeId)
  }

  function getReviewsByTemplate(templateId: string): ReviewRecord[] {
    ensureInitialized()
    return reviewRecords.value.filter(r => r.templateId === templateId)
  }

  function getReviewsByCreator(creator: string): ReviewRecord[] {
    ensureInitialized()
    return reviewRecords.value.filter(r => r.createdBy === creator)
  }

  function addToArchive(
    data: Omit<ArchiveItem, 'id' | 'archivedAt'>
  ): ArchiveItem {
    ensureInitialized()
    const item: ArchiveItem = {
      id: generateId(),
      archivedAt: now(),
      ...data
    }
    archiveItems.value.unshift(item)
    return item
  }

  function searchArchive(query: ArchiveSearchQuery): ArchiveItem[] {
    ensureInitialized()
    let results = [...archiveItems.value]

    if (query.keyword && query.keyword.trim()) {
      const kw = query.keyword.toLowerCase()
      results = results.filter(item =>
        item.title.toLowerCase().includes(kw) ||
        item.description.toLowerCase().includes(kw) ||
        item.author.toLowerCase().includes(kw) ||
        item.tags.some(t => t.toLowerCase().includes(kw))
      )
    }

    if (query.archiveType && query.archiveType !== 'all') {
      results = results.filter(item => item.archiveType === query.archiveType)
    }

    if (query.school && query.school !== 'all') {
      results = results.filter(item => item.school === query.school)
    }

    if (query.author && query.author.trim()) {
      results = results.filter(item => item.author === query.author)
    }

    if (query.dateRange) {
      results = results.filter(item =>
        item.archivedAt >= query.dateRange!.start &&
        item.archivedAt <= query.dateRange!.end
      )
    }

    if (query.ratingRange) {
      results = results.filter(item => {
        const rating = item.rating || 0
        return rating >= query.ratingRange!.min && rating <= query.ratingRange!.max
      })
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(item =>
        query.tags!.some(tag => item.tags.includes(tag))
      )
    }

    return results.sort((a, b) => b.archivedAt - a.archivedAt)
  }

  function getArchiveByType(type: ArchiveItem['archiveType']): ArchiveItem[] {
    ensureInitialized()
    return archiveItems.value.filter(item => item.archiveType === type)
  }

  function deleteArchiveItem(itemId: string) {
    const idx = archiveItems.value.findIndex(item => item.id === itemId)
    if (idx >= 0) {
      archiveItems.value.splice(idx, 1)
    }
  }

  function createInheritanceArchive(
    data: Omit<InheritanceArchive, 'id' | 'createdAt' | 'status' | 'processRecords' | 'versionHistory' | 'teachingRecords' | 'practiceRecords' | 'reviewRecords' | 'finalEvaluation'>
  ): InheritanceArchive {
    ensureInitialized()
    const maskStore = useMaskStore()
    const templateStore = useCraftTemplateStore()

    const mask = maskStore.masks.find(m => m.id === data.maskId)
    const scheme = mask?.schemes.find(s => s.id === data.schemeId)
    const template = data.templateId ? templateStore.templates.find(t => t.id === data.templateId) : null

    const processRecords: InheritanceArchive['processRecords'] = []
    if (template) {
      template.processSteps
        .sort((a, b) => a.order - b.order)
        .forEach((step, idx) => {
          const schemeLayer = scheme?.layers.find(l => l.type === step.layerType)
          processRecords.push({
            stepId: step.id,
            stepName: step.stepName,
            layerType: step.layerType,
            startedAt: now() - 86400000 * (10 - idx),
            completedAt: schemeLayer?.completion === 100 ? now() - 86400000 * (8 - idx) : undefined,
            notes: schemeLayer?.notes || '',
            materials: step.materials,
            completion: schemeLayer?.completion || 0
          })
        })
    }

    const versionHistory: InheritanceArchive['versionHistory'] = []
    if (scheme) {
      const versions = maskStore.getVersionsByScheme(scheme.id)
      versions.forEach(v => {
        versionHistory.push({
          versionId: v.id,
          versionName: v.name,
          versionNumber: v.versionNumber,
          description: v.description,
          createdAt: v.createdAt,
          author: v.author,
          diffSummary: v.changes.length > 0 ? `${v.changes.length} 项变更` : undefined
        })
      })
    }

    const practiceRecords = templateStore.submissions.filter(s => s.schemeId === data.schemeId)
    const reviewRecordsFiltered = reviewRecords.value.filter(r => r.schemeId === data.schemeId)

    const archive: InheritanceArchive = {
      id: generateId(),
      ...data,
      createdAt: now(),
      status: 'in_progress',
      processRecords,
      versionHistory,
      teachingRecords: [],
      practiceRecords,
      reviewRecords: reviewRecordsFiltered,
      teachingContent: template ? {
        culturalBackground: template.culturalBackground,
        inheritanceNotes: template.inheritanceNotes,
        precautions: template.precautions
      } : undefined,
      finalEvaluation: null
    }

    inheritanceArchives.value.push(archive)

    addToArchive({
      archiveType: 'review',
      referenceId: archive.id,
      title: `${archive.maskName} - ${archive.apprenticeName} 传承档案`,
      description: `师傅: ${archive.masterName}`,
      author: archive.apprenticeName,
      tags: ['传承档案', archive.maskName, archive.apprenticeName, archive.masterName],
      archivedAt: now(),
      metadata: {
        processCount: archive.processRecords.length,
        versionCount: archive.versionHistory.length,
        practiceCount: archive.practiceRecords.length,
        reviewCount: archive.reviewRecords.length
      },
      snapshot: archive
    })

    return archive
  }

  function completeInheritanceArchive(
    archiveId: string,
    evaluation: Omit<InheritanceArchive['finalEvaluation'], 'evaluatedAt'>
  ) {
    ensureInitialized()
    const archive = inheritanceArchives.value.find(a => a.id === archiveId)
    if (!archive) return

    archive.status = 'completed'
    archive.completedAt = now()
    archive.finalEvaluation = {
      ...evaluation,
      evaluatedAt: now()
    }
  }

  function getInheritanceArchivesByApprentice(apprenticeName: string): InheritanceArchive[] {
    ensureInitialized()
    return inheritanceArchives.value
      .filter(a => a.apprenticeName === apprenticeName)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  function getInheritanceArchivesByMaster(masterName: string): InheritanceArchive[] {
    ensureInitialized()
    return inheritanceArchives.value
      .filter(a => a.masterName === masterName)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  function exportInheritanceArchiveAsMarkdown(archiveId: string): string {
    ensureInitialized()
    const archive = inheritanceArchives.value.find(a => a.id === archiveId)
    if (!archive) return ''

    const formatDate = (ts: number) => new Date(ts).toLocaleString('zh-CN')
    const gradeMap = { excellent: '优秀', good: '良好', pass: '及格', fail: '不及格' }

    let md = `# ${archive.maskName} - 传承档案\n\n`
    md += `## 基本信息\n\n`
    md += `- **学徒**: ${archive.apprenticeName}\n`
    md += `- **指导师傅**: ${archive.masterName}\n`
    md += `- **面具**: ${archive.maskName}\n`
    md += `- **方案**: ${archive.schemeName}\n`
    md += `- **模板**: ${archive.templateName || '自定义'}\n`
    md += `- **创建时间**: ${formatDate(archive.createdAt)}\n`
    md += `- **状态**: ${archive.status === 'completed' ? '已完成' : '进行中'}\n`
    if (archive.completedAt) md += `- **完成时间**: ${formatDate(archive.completedAt)}\n`
    md += '\n---\n\n'

    if (archive.teachingContent) {
      md += `## 教学内容\n\n`
      md += `### 文化背景\n\n${archive.teachingContent.culturalBackground}\n\n`
      md += `### 传承说明\n\n${archive.teachingContent.inheritanceNotes}\n\n`
      md += `### 工艺注意事项\n\n`
      archive.teachingContent.precautions.forEach((p, i) => {
        md += `${i + 1}. ${p}\n`
      })
      md += '\n---\n\n'
    }

    md += `## 工序过程记录\n\n`
    archive.processRecords.forEach((record, i) => {
      md += `### ${i + 1}. ${record.stepName}\n\n`
      md += `- **工序类型**: ${record.layerType}\n`
      md += `- **开始时间**: ${formatDate(record.startedAt)}\n`
      if (record.completedAt) md += `- **完成时间**: ${formatDate(record.completedAt)}\n`
      md += `- **完成度**: ${record.completion}%\n`
      md += `- **使用材料**: ${record.materials.join('、') || '无'}\n`
      if (record.notes) md += `- **备注**: ${record.notes}\n`
      md += '\n'
    })
    md += '---\n\n'

    if (archive.versionHistory.length > 0) {
      md += `## 版本演变记录\n\n`
      archive.versionHistory.forEach(v => {
        md += `### V${v.versionNumber} - ${v.versionName}\n\n`
        md += `- **作者**: ${v.author}\n`
        md += `- **创建时间**: ${formatDate(v.createdAt)}\n`
        md += `- **描述**: ${v.description || '无'}\n`
        if (v.diffSummary) md += `- **变更摘要**: ${v.diffSummary}\n`
        md += '\n'
      })
      md += '---\n\n'
    }

    if (archive.practiceRecords.length > 0) {
      md += `## 练习评分记录\n\n`
      archive.practiceRecords.forEach((record, i) => {
        md += `### ${i + 1}. ${record.templateName}\n\n`
        md += `- **提交时间**: ${formatDate(record.submittedAt)}\n`
        md += `- **总分**: ${record.totalScore} / ${record.maxScore}\n`
        md += `- **等级**: ${gradeMap[record.grade]}\n`
        md += `\n**反馈**:\n\n${record.feedback}\n\n`
        if (record.stepScores.length > 0) {
          md += `**各工序得分**:\n\n`
          record.stepScores.forEach(ss => {
            md += `- ${ss.stepName}: ${ss.score} / ${ss.maxScore}\n`
          })
          md += '\n'
        }
      })
      md += '---\n\n'
    }

    if (archive.reviewRecords.length > 0) {
      md += `## 评审记录\n\n`
      archive.reviewRecords.forEach(review => {
        md += `### ${review.schemeName}\n\n`
        md += `- **创建人**: ${review.createdBy}\n`
        md += `- **提交时间**: ${review.submittedAt ? formatDate(review.submittedAt) : '未提交'}\n`
        md += `- **状态**: ${review.status}\n`
        if (review.finalScore !== undefined) {
          md += `- **最终得分**: ${review.finalScore}\n`
          md += `- **最终等级**: ${review.finalGrade ? gradeMap[review.finalGrade] : '未评定'}\n`
        }
        if (review.reviewConclusion) md += `\n**评审结论**: ${review.reviewConclusion}\n`
        md += '\n**阶段验收**:\n\n'
        review.stages.forEach(stage => {
          const stageStatus = {
            pending: '待提交',
            submitted: '已提交待审',
            under_review: '评审中',
            accepted: '验收通过',
            rejected: '验收不通过'
          }[stage.status]
          md += `- ${stage.stepName}: ${stageStatus}`
          if (stage.reviewer) md += ` (评审人: ${stage.reviewer})`
          md += '\n'
          if (stage.rejections.length > 0) {
            stage.rejections.forEach(r => {
              md += `  - 退回原因: ${r.reason}\n`
              md += `  - 改进建议:\n`
              r.suggestions.forEach(s => md += `    - ${s}\n`)
            })
          }
        })

        if (review.masterComments.length > 0) {
          md += `\n**师傅点评**:\n\n`
          review.masterComments.forEach((comment, ci) => {
            md += `#### 点评 ${ci + 1}\n\n`
            md += `- **点评人**: ${comment.reviewer}\n`
            md += `- **评分**: ${'★'.repeat(comment.rating)}${'☆'.repeat(5 - comment.rating)}\n`
            md += `- **时间**: ${formatDate(comment.createdAt)}\n`
            md += `\n${comment.content}\n\n`
            if (comment.highlights.length > 0) {
              md += `**亮点**:\n`
              comment.highlights.forEach(h => md += `- ${h}\n`)
              md += '\n'
            }
            if (comment.improvements.length > 0) {
              md += `**改进建议**:\n`
              comment.improvements.forEach(imp => md += `- ${imp}\n`)
              md += '\n'
            }
          })
        }

        if (review.modifications.length > 0) {
          md += `\n**修改意见跟踪**:\n\n`
          review.modifications.forEach(mod => {
            const modStatus = {
              pending: '待处理',
              in_progress: '处理中',
              completed: '已完成待验证',
              verified: '已验证'
            }[mod.status]
            md += `- ${mod.targetName} (${modStatus})\n`
            md += `  - 变更: ${mod.description}\n`
            if (mod.oldValue) md += `  - 原值: ${mod.oldValue}\n`
            if (mod.newValue) md += `  - 新值: ${mod.newValue}\n`
            md += `  - 操作人: ${mod.author}\n`
          })
          md += '\n'
        }
      })
      md += '---\n\n'
    }

    if (archive.finalEvaluation) {
      md += `## 最终评定\n\n`
      md += `- **总分**: ${archive.finalEvaluation.totalScore} / ${archive.finalEvaluation.maxScore}\n`
      md += `- **等级**: ${gradeMap[archive.finalEvaluation.grade]}\n`
      md += `- **评定人**: ${archive.finalEvaluation.evaluatedBy}\n`
      md += `- **评定时间**: ${formatDate(archive.finalEvaluation.evaluatedAt)}\n\n`

      if (archive.finalEvaluation.strengths.length > 0) {
        md += `### 优点\n\n`
        archive.finalEvaluation.strengths.forEach(s => md += `- ${s}\n`)
        md += '\n'
      }

      if (archive.finalEvaluation.improvements.length > 0) {
        md += `### 待改进\n\n`
        archive.finalEvaluation.improvements.forEach(i => md += `- ${i}\n`)
        md += '\n'
      }

      md += `### 综合评语\n\n${archive.finalEvaluation.comments}\n\n`
    }

    md += `---\n\n*本档案由傩面具工艺数字化平台自动生成，生成时间: ${formatDate(now())}*\n`

    return md
  }

  function downloadInheritanceArchive(archiveId: string) {
    const md = exportInheritanceArchiveAsMarkdown(archiveId)
    const archive = inheritanceArchives.value.find(a => a.id === archiveId)
    if (!archive) return

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${archive.maskName}_${archive.apprenticeName}_传承档案_${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function getAllArchiveAuthors(): string[] {
    ensureInitialized()
    const authors = new Set(archiveItems.value.map(item => item.author))
    return Array.from(authors).sort()
  }

  function getAllArchiveTags(): string[] {
    ensureInitialized()
    const tags = new Set<string>()
    archiveItems.value.forEach(item => {
      item.tags.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  }

  ensureInitialized()

  return {
    reviewRecords,
    archiveItems,
    inheritanceArchives,
    activeReviewId,
    activeReview,
    sortedReviews,
    pendingReviews,
    completedReviews,
    setActiveReview,
    createReview,
    submitReview,
    startReview,
    submitStageForReview,
    reviewStage,
    resubmitStage,
    reReviewStage,
    addMasterComment,
    replyToMasterComment,
    addModificationTrack,
    updateModificationStatus,
    completeReview,
    getReviewsByMask,
    getReviewsByScheme,
    getReviewsByTemplate,
    getReviewsByCreator,
    addToArchive,
    searchArchive,
    getArchiveByType,
    deleteArchiveItem,
    createInheritanceArchive,
    completeInheritanceArchive,
    getInheritanceArchivesByApprentice,
    getInheritanceArchivesByMaster,
    exportInheritanceArchiveAsMarkdown,
    downloadInheritanceArchive,
    getAllArchiveAuthors,
    getAllArchiveTags,
    ensureInitialized
  }
})
