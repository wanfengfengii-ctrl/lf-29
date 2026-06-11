import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  TeachingSession,
  PracticeSubmission,
  DeviationItem,
  TemplateApplyResult,
  ProcessScheme,
  CraftTemplate
} from '@/types'
import { PROCESS_ORDER, SCHOOL_STYLE_META } from '@/types'
import { generateId, now } from '@/utils/id'
import { useCraftTemplateCoreStore } from './craftTemplateCore'
import { useMaskSchemeStore } from './maskScheme'

export interface TeachingPracticeStoreState {
  teachingSessions: TeachingSession[]
  submissions: PracticeSubmission[]
  activeTeachingId: string | null
}

export interface TeachingPracticeStoreGetters {
  activeTeaching: TeachingSession | null
}

export interface TeachingPracticeStoreActions {
  applyTemplateToScheme(templateId: string, maskId: string, schemeName: string): TemplateApplyResult
  startTeachingSession(templateId: string, apprenticeName?: string): TeachingSession | null
  goToStep(sessionId: string, index: number): void
  nextStep(sessionId: string): void
  prevStep(sessionId: string): void
  togglePlay(sessionId: string): void
  saveStepNote(sessionId: string, stepId: string, note: string): void
  setPlayMode(sessionId: string, mode: 'manual' | 'auto'): void
  closeTeachingSession(sessionId: string): void
  analyzeDeviations(template: CraftTemplate, scheme: ProcessScheme): DeviationItem[]
  calculateStepScores(template: CraftTemplate, scheme: ProcessScheme, deviations: DeviationItem[]): PracticeSubmission['stepScores']
  submitPractice(templateId: string, schemeId: string, apprenticeName?: string): PracticeSubmission | null
  getSubmissionsByTemplate(templateId: string): PracticeSubmission[]
  getSubmissionsByApprentice(name: string): PracticeSubmission[]
}

export type TeachingPracticeStore = TeachingPracticeStoreState & TeachingPracticeStoreGetters & TeachingPracticeStoreActions

export const useTeachingPracticeStore = defineStore('teachingPractice', () => {
  const templateStore = useCraftTemplateCoreStore()
  const maskStore = useMaskSchemeStore()

  const teachingSessions = ref<TeachingSession[]>([])
  const submissions = ref<PracticeSubmission[]>([])
  const activeTeachingId = ref<string | null>(null)

  const activeTeaching = computed((): TeachingSession | null => {
    return teachingSessions.value.find(s => s.id === activeTeachingId.value) || null
  })

  function applyTemplateToScheme(
    templateId: string,
    maskId: string,
    schemeName: string
  ): TemplateApplyResult {
    const template = templateStore.templates.find(t => t.id === templateId)
    if (!template) {
      return { success: false, message: '模板不存在' }
    }

    const mask = maskStore.masks.find(m => m.id === maskId)
    if (!mask) {
      return { success: false, message: '面具不存在' }
    }

    maskStore.setActiveMask(maskId)

    const scheme = maskStore.createScheme(schemeName || `套用·${template.name}`)
    if (!scheme) {
      return { success: false, message: '创建方案失败' }
    }

    let layersCreated = 0
    let patternsCreated = 0
    const idMap = new Map<string, string>()

    const sortedSteps = [...template.processSteps].sort((a, b) => a.order - b.order)
    sortedSteps.forEach(step => {
      const layer = maskStore.addLayer(step.layerType, step.stepName, step.customTypeName)
      if (layer) {
        idMap.set(step.id, layer.id)
        layersCreated++
        maskStore.updateLayer(layer.id, {
          description: step.description,
          notes: `【要点】\n${step.keyPoints.join('\n')}\n\n【质量标准】\n${step.qualityStandards.join('\n')}${step.safetyNotes.length ? '\n\n【安全提示】\n' + step.safetyNotes.join('\n') : ''}`,
          materialBatch: step.materials.join('、')
        })

        if (step.recommendedColors.length > 0 && step.layerType === 'face_carving') {
          const lineSketchesInStep = template.lineSketches.filter(
            l => step.referenceLines.some(r => l.name.includes(r)) || step.referenceLines.length === 0
          )
          step.recommendedColors.forEach((color, ci) => {
            const lineInfo = lineSketchesInStep[ci] || template.lineSketches[ci]
            const colorInfo = template.colorTemplates.find(c => c.color === color)
            const patternName = colorInfo?.name || lineInfo?.name || `配色${ci + 1}`
            const pattern = maskStore.addPattern(
              layer.id,
              patternName,
              color,
              500 + ci * 100,
              colorInfo?.opacity ?? 100
            )
            if (pattern) {
              if (lineInfo?.path) {
                Object.assign(pattern, { path: lineInfo.path })
              }
              patternsCreated++
            }
          })
        }
      }
    })

    template.usageCount++

    return {
      success: true,
      message: `已在「${mask.name}」成功套用模板「${template.name}」，已创建 ${layersCreated} 个工序，${patternsCreated} 条纹线`,
      schemeId: scheme.id,
      layersCreated,
      patternsCreated,
      maskId,
      maskName: mask.name
    }
  }

  function startTeachingSession(templateId: string, apprenticeName: string = '学徒'): TeachingSession | null {
    const template = templateStore.templates.find(t => t.id === templateId)
    if (!template) return null

    const session: TeachingSession = {
      id: generateId(),
      templateId,
      templateName: template.name,
      currentStepIndex: 0,
      isPlaying: false,
      playMode: 'manual',
      autoPlayInterval: 30,
      startTime: now(),
      lastUpdateTime: now(),
      apprenticeName,
      notes: {}
    }
    teachingSessions.value.push(session)
    activeTeachingId.value = session.id
    return session
  }

  function goToStep(sessionId: string, index: number) {
    const s = teachingSessions.value.find(x => x.id === sessionId)
    if (!s) return
    const template = templateStore.templates.find(t => t.id === s.templateId)
    if (!template) return
    if (index < 0 || index >= template.processSteps.length) return
    s.currentStepIndex = index
    s.lastUpdateTime = now()
  }

  function nextStep(sessionId: string) {
    const s = teachingSessions.value.find(x => x.id === sessionId)
    if (!s) return
    const template = templateStore.templates.find(t => t.id === s.templateId)
    if (!template) return
    if (s.currentStepIndex < template.processSteps.length - 1) {
      s.currentStepIndex++
      s.lastUpdateTime = now()
    }
  }

  function prevStep(sessionId: string) {
    const s = teachingSessions.value.find(x => x.id === sessionId)
    if (!s) return
    if (s.currentStepIndex > 0) {
      s.currentStepIndex--
      s.lastUpdateTime = now()
    }
  }

  function togglePlay(sessionId: string) {
    const s = teachingSessions.value.find(x => x.id === sessionId)
    if (s) {
      s.isPlaying = !s.isPlaying
      s.lastUpdateTime = now()
    }
  }

  function saveStepNote(sessionId: string, stepId: string, note: string) {
    const s = teachingSessions.value.find(x => x.id === sessionId)
    if (s) {
      s.notes[stepId] = note
      s.lastUpdateTime = now()
    }
  }

  function setPlayMode(sessionId: string, mode: 'manual' | 'auto') {
    const s = teachingSessions.value.find(x => x.id === sessionId)
    if (s) { s.playMode = mode; s.lastUpdateTime = now() }
  }

  function closeTeachingSession(sessionId: string) {
    const idx = teachingSessions.value.findIndex(s => s.id === sessionId)
    if (idx >= 0) {
      teachingSessions.value.splice(idx, 1)
      if (activeTeachingId.value === sessionId) {
        activeTeachingId.value = null
      }
    }
  }

  function analyzeDeviations(
    template: CraftTemplate,
    scheme: ProcessScheme
  ): DeviationItem[] {
    const deviations: DeviationItem[] = []
    const templateSteps = [...template.processSteps].sort((a, b) => a.order - b.order)
    const schemeLayers = [...scheme.layers].sort((a, b) => {
      const ai = scheme.layerOrder.indexOf(a.id)
      const bi = scheme.layerOrder.indexOf(b.id)
      return ai - bi
    })

    templateSteps.forEach((step, expectedIdx) => {
      const matchedLayer = schemeLayers.find(
        l => l.type === step.layerType && l.type !== 'custom'
      ) || schemeLayers[expectedIdx]

      if (!matchedLayer) {
        deviations.push({
          id: generateId(),
          type: 'missing_step',
          severity: 'critical',
          targetName: step.stepName,
          expected: step.layerType,
          actual: '缺失',
          description: `标准模板中的工序「${step.stepName}」在方案中不存在`,
          suggestion: `请添加工序类型为「${step.layerType}」的工序层`,
          scoreDeduction: 15
        })
        return
      }

      const actualIdx = schemeLayers.indexOf(matchedLayer)
      if (Math.abs(expectedIdx - actualIdx) > 0 && step.layerType !== 'custom') {
        const expectedOrderMeta = PROCESS_ORDER[step.layerType]
        if (expectedOrderMeta && expectedOrderMeta !== 99) {
          deviations.push({
            id: generateId(),
            type: 'order_wrong',
            severity: 'minor',
            targetName: step.stepName,
            expected: `第 ${expectedIdx + 1} 道工序`,
            actual: `第 ${actualIdx + 1} 道工序`,
            description: `工序「${step.stepName}」顺序不对，应在第 ${expectedIdx + 1} 位，实际在第 ${actualIdx + 1} 位`,
            suggestion: '调整工序顺序，符合工艺流程规范',
            scoreDeduction: 3
          })
        }
      }

      if (matchedLayer.completion < 60) {
        deviations.push({
          id: generateId(),
          type: 'completion_insufficient',
          severity: 'major',
          targetName: step.stepName,
          expected: '完成度 ≥ 60%',
          actual: `完成度 ${matchedLayer.completion}%`,
          description: `工序「${step.stepName}」完成度过低，未达到合格线`,
          suggestion: '继续完善该工序内容，完成度至少达到60%',
          scoreDeduction: 8
        })
      }

      if (step.materials.length > 0 && matchedLayer.materialBatch.trim() === '') {
        deviations.push({
          id: generateId(),
          type: 'material_mismatch',
          severity: 'minor',
          targetName: step.stepName,
          expected: step.materials.join('、'),
          actual: '未填写',
          description: `工序「${step.stepName}」未填写使用的材料`,
          suggestion: `请填写材料批次信息，推荐材料：${step.materials.join('、')}`,
          scoreDeduction: 2
        })
      }

      if (step.recommendedColors.length > 0) {
        const layerColors = new Set(matchedLayer.patterns.map(p => p.color))
        const missingColors = step.recommendedColors.filter(c => !layerColors.has(c))
        if (missingColors.length > 0) {
          const colorInfo = missingColors.map(c => {
            const ct = template.colorTemplates.find(t => t.color === c)
            return ct ? `${ct.name}(${c})` : c
          })
          deviations.push({
            id: generateId(),
            type: 'color_mismatch',
            severity: 'major',
            targetName: step.stepName,
            expected: step.recommendedColors.length + ' 种推荐色',
            actual: `缺失 ${missingColors.length} 种`,
            description: `工序「${step.stepName}」配色方案缺少推荐颜色：${colorInfo.join('、')}`,
            suggestion: '请补充标准模板中推荐的关键配色',
            scoreDeduction: missingColors.length * 3
          })
        }

        const areaThreshold = 300
        matchedLayer.patterns.forEach(p => {
          if (step.recommendedColors.includes(p.color) && p.area < areaThreshold) {
            deviations.push({
              id: generateId(),
              type: 'area_deviation',
              severity: 'minor',
              targetName: `${step.stepName} - ${p.name}`,
              expected: `面积 ≥ ${areaThreshold}`,
              actual: `面积 ${p.area}`,
              description: `纹线「${p.name}」着色面积偏小，可能影响整体效果`,
              suggestion: '适当增加该颜色的着色面积',
              scoreDeduction: 2
            })
          }
        })
      }

      const expectedPatternCount = step.recommendedColors.length
      if (expectedPatternCount > 0 && matchedLayer.patterns.length < expectedPatternCount * 0.6) {
        deviations.push({
          id: generateId(),
          type: 'pattern_missing',
          severity: 'major',
          targetName: step.stepName,
          expected: `至少 ${Math.ceil(expectedPatternCount * 0.6)} 条纹线`,
          actual: `${matchedLayer.patterns.length} 条`,
          description: `工序「${step.stepName}」纹线数量明显少于推荐数量`,
          suggestion: '根据标准模板补充必要的纹线和着色区域',
          scoreDeduction: 10
        })
      }

      if (expectedPatternCount > 0 && matchedLayer.patterns.length > expectedPatternCount * 2) {
        deviations.push({
          id: generateId(),
          type: 'pattern_extra',
          severity: 'minor',
          targetName: step.stepName,
          expected: `约 ${expectedPatternCount} 条纹线`,
          actual: `${matchedLayer.patterns.length} 条`,
          description: `工序「${step.stepName}」纹线数量过多，可能偏离传统造型`,
          suggestion: '简化纹线，保持传统造型的简洁庄重',
          scoreDeduction: 3
        })
      }
    })

    schemeLayers.forEach((layer) => {
      const hasMatch = templateSteps.some(
        s => s.layerType === layer.type && layer.type !== 'custom'
      )
      if (!hasMatch && templateSteps.length > 0) {
        deviations.push({
          id: generateId(),
          type: 'extra_step',
          severity: 'minor',
          targetName: layer.name,
          expected: '标准模板中无此工序',
          actual: '额外工序',
          description: `方案中包含标准模板未定义的额外工序「${layer.name}」`,
          suggestion: '如确需此工序请注明原因，否则建议移除以保持与模板一致',
          scoreDeduction: 2
        })
      }
    })

    return deviations
  }

  function calculateStepScores(
    template: CraftTemplate,
    scheme: ProcessScheme,
    deviations: DeviationItem[]
  ): PracticeSubmission['stepScores'] {
    return template.processSteps.sort((a, b) => a.order - b.order).map(step => {
      const stepDeviations = deviations.filter(d =>
        d.targetName.startsWith(step.stepName) || d.targetName.includes(step.stepName)
      )
      const maxScore = 20
      const deduction = stepDeviations.reduce((sum, d) => sum + d.scoreDeduction, 0)
      const score = Math.max(0, maxScore - deduction)
      const issues = stepDeviations.map(d => `${d.description}（扣${d.scoreDeduction}分）`)
      if (issues.length === 0) issues.push('本工序各项指标符合标准，表现优秀')
      return {
        stepId: step.id,
        stepName: step.stepName,
        score,
        maxScore,
        issues
      }
    })
  }

  function submitPractice(
    templateId: string,
    schemeId: string,
    apprenticeName: string = '匿名学徒'
  ): PracticeSubmission | null {
    const template = templateStore.templates.find(t => t.id === templateId)
    if (!template) return null

    const scheme = maskStore.findSchemeById ? maskStore.findSchemeById(schemeId) : null
    const activeScheme = maskStore.activeScheme
    const targetScheme: ProcessScheme | null = scheme || (activeScheme?.id === schemeId ? activeScheme : null)

    if (!targetScheme) return null

    const schemeSnapshot: ProcessScheme = JSON.parse(JSON.stringify(targetScheme))
    schemeSnapshot.id = schemeId

    const deviations = analyzeDeviations(template, targetScheme)
    const stepScores = calculateStepScores(template, targetScheme, deviations)
    const totalStepScore = stepScores.reduce((s, x) => s + x.score, 0)
    const maxStepScore = stepScores.reduce((s, x) => s + x.maxScore, 0)

    const completionAvg = targetScheme.layers.length > 0
      ? targetScheme.layers.reduce((s, l) => s + l.completion, 0) / targetScheme.layers.length
      : 0
    const completionBonus = Math.round(completionAvg * 0.1)

    const materialCoverage = template.processSteps.filter(s => {
      const matched = targetScheme.layers.find(l => l.type === s.layerType)
      return matched && matched.materialBatch.trim().length > 0
    }).length
    const materialBonus = template.processSteps.length > 0
      ? Math.round((materialCoverage / template.processSteps.length) * 10)
      : 0

    const totalScore = Math.min(100, totalStepScore + completionBonus + materialBonus)
    const maxScore = Math.min(100, maxStepScore + 10 + 10)

    let grade: PracticeSubmission['grade'] = 'fail'
    const percentage = totalScore / maxScore
    if (percentage >= 0.9) grade = 'excellent'
    else if (percentage >= 0.75) grade = 'good'
    else if (percentage >= 0.6) grade = 'pass'

    let feedback = ''
    const criticalCount = deviations.filter(d => d.severity === 'critical').length
    const majorCount = deviations.filter(d => d.severity === 'major').length
    const minorCount = deviations.filter(d => d.severity === 'minor').length

    if (grade === 'excellent') {
      feedback = `🎉 太棒了！${apprenticeName}的作品达到了优秀水准，深得${template.school === 'custom' ? '' : SCHOOL_STYLE_META[template.school].label}真传！工艺规范，形神兼备，传承有望！${criticalCount > 0 ? `仍有 ${criticalCount} 项关键问题需要改进。` : ''}`
    } else if (grade === 'good') {
      feedback = `👍 表现良好！整体工艺符合规范，造型基本到位。建议重点改进 ${majorCount} 项较重要问题，多加练习必成大器。`
    } else if (grade === 'pass') {
      feedback = `📝 勉强及格。作品有 ${criticalCount} 项关键缺陷和 ${majorCount} 项重要问题，需要回过头对照教学演示，仔细检查工序顺序、配色和纹线。`
    } else {
      feedback = `💪 未能通过考核。建议重新观看教学演示的分步骤内容，从底胚开始逐步制作，不要急于求成。有疑问及时向师傅请教。`
    }

    if (deviations.length > 0) {
      feedback += `\n\n📋 偏差统计：${criticalCount}项严重 · ${majorCount}项重要 · ${minorCount}项轻微`
    }

    const submission: PracticeSubmission = {
      id: generateId(),
      templateId,
      templateName: template.name,
      apprenticeName,
      schemeId,
      schemeSnapshot,
      submittedAt: now(),
      deviations,
      totalScore,
      maxScore,
      grade,
      feedback,
      stepScores
    }

    submissions.value.unshift(submission)
    return submission
  }

  function getSubmissionsByTemplate(templateId: string): PracticeSubmission[] {
    return submissions.value.filter(s => s.templateId === templateId)
  }

  function getSubmissionsByApprentice(name: string): PracticeSubmission[] {
    return submissions.value.filter(s => s.apprenticeName === name)
  }

  return {
    teachingSessions,
    submissions,
    activeTeachingId,
    activeTeaching,
    applyTemplateToScheme,
    startTeachingSession,
    goToStep,
    nextStep,
    prevStep,
    togglePlay,
    saveStepNote,
    setPlayMode,
    closeTeachingSession,
    analyzeDeviations,
    calculateStepScores,
    submitPractice,
    getSubmissionsByTemplate,
    getSubmissionsByApprentice
  }
})
