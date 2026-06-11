import { defineStore } from 'pinia'
import { computed } from 'vue'
import type {
  CraftTemplate,
  TemplateProcessStep,
  ColorTemplate,
  LineSketch,
  MaterialItem,
  TemplateApplyResult,
  TeachingSession,
  PracticeSubmission,
  DeviationItem,
  ProcessScheme,
  SchoolStyle
} from '@/types'
import { useCraftTemplateCoreStore, type CraftTemplateCoreStore } from './craftTemplateCore'
import { useTeachingPracticeStore, type TeachingPracticeStore } from './teachingPractice'

export type CraftTemplateStore = CraftTemplateCoreStore & TeachingPracticeStore

export const useCraftTemplateStore = defineStore('craftTemplate', () => {
  const coreStore = useCraftTemplateCoreStore()
  const practiceStore = useTeachingPracticeStore()

  const templates = computed({
    get: () => coreStore.templates,
    set: (v: CraftTemplate[]) => { coreStore.templates = v }
  })
  const teachingSessions = computed({
    get: () => practiceStore.teachingSessions,
    set: (v: TeachingSession[]) => { practiceStore.teachingSessions = v }
  })
  const submissions = computed({
    get: () => practiceStore.submissions,
    set: (v: PracticeSubmission[]) => { practiceStore.submissions = v }
  })
  const activeTemplateId = computed({
    get: () => coreStore.activeTemplateId,
    set: (v: string | null) => { coreStore.activeTemplateId = v }
  })
  const activeTeachingId = computed({
    get: () => practiceStore.activeTeachingId,
    set: (v: string | null) => { practiceStore.activeTeachingId = v }
  })

  const activeTemplate = computed(() => coreStore.activeTemplate)
  const activeTeaching = computed(() => practiceStore.activeTeaching)
  const sortedTemplates = computed(() => coreStore.sortedTemplates)

  function setActiveTemplate(templateId: string) { coreStore.setActiveTemplate(templateId) }
  function createTemplate(data: Partial<CraftTemplate>): CraftTemplate { return coreStore.createTemplate(data) }
  function updateTemplate(templateId: string, updates: Partial<CraftTemplate>) { coreStore.updateTemplate(templateId, updates) }
  function deleteTemplate(templateId: string) { coreStore.deleteTemplate(templateId) }

  function addProcessStep(templateId: string, step: Partial<TemplateProcessStep>) { return coreStore.addProcessStep(templateId, step) }
  function updateProcessStep(templateId: string, stepId: string, updates: Partial<TemplateProcessStep>) { coreStore.updateProcessStep(templateId, stepId, updates) }
  function deleteProcessStep(templateId: string, stepId: string) { coreStore.deleteProcessStep(templateId, stepId) }
  function reorderProcessSteps(templateId: string, newOrderIds: string[]) { coreStore.reorderProcessSteps(templateId, newOrderIds) }

  function addColorTemplate(templateId: string, color: Partial<ColorTemplate>) { return coreStore.addColorTemplate(templateId, color) }
  function updateColorTemplate(templateId: string, colorId: string, updates: Partial<ColorTemplate>) { coreStore.updateColorTemplate(templateId, colorId, updates) }
  function deleteColorTemplate(templateId: string, colorId: string) { coreStore.deleteColorTemplate(templateId, colorId) }

  function addLineSketch(templateId: string, line: Partial<LineSketch>) { return coreStore.addLineSketch(templateId, line) }
  function updateLineSketch(templateId: string, lineId: string, updates: Partial<LineSketch>) { coreStore.updateLineSketch(templateId, lineId, updates) }
  function deleteLineSketch(templateId: string, lineId: string) { coreStore.deleteLineSketch(templateId, lineId) }

  function addMaterialItem(templateId: string, mat: Partial<MaterialItem>) { return coreStore.addMaterialItem(templateId, mat) }
  function updateMaterialItem(templateId: string, matId: string, updates: Partial<MaterialItem>) { coreStore.updateMaterialItem(templateId, matId, updates) }
  function deleteMaterialItem(templateId: string, matId: string) { coreStore.deleteMaterialItem(templateId, matId) }

  function applyTemplateToScheme(templateId: string, maskId: string, schemeName: string): TemplateApplyResult { return practiceStore.applyTemplateToScheme(templateId, maskId, schemeName) }
  function startTeachingSession(templateId: string, apprenticeName: string = '学徒'): TeachingSession | null { return practiceStore.startTeachingSession(templateId, apprenticeName) }
  function goToStep(sessionId: string, index: number) { practiceStore.goToStep(sessionId, index) }
  function nextStep(sessionId: string) { practiceStore.nextStep(sessionId) }
  function prevStep(sessionId: string) { practiceStore.prevStep(sessionId) }
  function togglePlay(sessionId: string) { practiceStore.togglePlay(sessionId) }
  function saveStepNote(sessionId: string, stepId: string, note: string) { practiceStore.saveStepNote(sessionId, stepId, note) }
  function setPlayMode(sessionId: string, mode: 'manual' | 'auto') { practiceStore.setPlayMode(sessionId, mode) }
  function closeTeachingSession(sessionId: string) { practiceStore.closeTeachingSession(sessionId) }
  function analyzeDeviations(template: CraftTemplate, scheme: ProcessScheme): DeviationItem[] { return practiceStore.analyzeDeviations(template, scheme) }
  function calculateStepScores(template: CraftTemplate, scheme: ProcessScheme, deviations: DeviationItem[]): PracticeSubmission['stepScores'] { return practiceStore.calculateStepScores(template, scheme, deviations) }
  function submitPractice(templateId: string, schemeId: string, apprenticeName: string = '匿名学徒'): PracticeSubmission | null { return practiceStore.submitPractice(templateId, schemeId, apprenticeName) }
  function getSubmissionsByTemplate(templateId: string): PracticeSubmission[] { return practiceStore.getSubmissionsByTemplate(templateId) }
  function getSubmissionsByApprentice(name: string): PracticeSubmission[] { return practiceStore.getSubmissionsByApprentice(name) }
  function getTemplatesBySchool(school: SchoolStyle): CraftTemplate[] { return coreStore.getTemplatesBySchool(school) }

  return {
    templates,
    teachingSessions,
    submissions,
    activeTemplateId,
    activeTeachingId,
    activeTemplate,
    activeTeaching,
    sortedTemplates,
    setActiveTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    addProcessStep,
    updateProcessStep,
    deleteProcessStep,
    reorderProcessSteps,
    addColorTemplate,
    updateColorTemplate,
    deleteColorTemplate,
    addLineSketch,
    updateLineSketch,
    deleteLineSketch,
    addMaterialItem,
    updateMaterialItem,
    deleteMaterialItem,
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
    submitPractice,
    getSubmissionsByTemplate,
    getSubmissionsByApprentice,
    getTemplatesBySchool
  }
})
