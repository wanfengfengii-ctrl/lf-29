import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useMaskSchemeStore, type MaskSchemeStore } from './maskScheme'
import { useVersionManagerStore, type VersionManagerStore } from './versionManager'
import type {
  Mask,
  ProcessScheme,
  ProcessLayer,
  PatternRegion,
  ProcessType,
  ImportResult,
  ValidationResult,
  SchemeVersion,
  VersionDiff,
  ValidationReport,
  PreviewToken
} from '@/types'

export type MaskStore = MaskSchemeStore & VersionManagerStore

export const useMaskStore = defineStore('mask', () => {
  const schemeStore = useMaskSchemeStore()
  const versionStore = useVersionManagerStore()

  const masks = computed({
    get: () => schemeStore.masks,
    set: (v: Mask[]) => { schemeStore.masks = v }
  })
  const activeMaskId = computed({
    get: () => schemeStore.activeMaskId,
    set: (v: string | null) => { schemeStore.activeMaskId = v }
  })
  const pendingDeleteLayerId = computed({
    get: () => schemeStore.pendingDeleteLayerId,
    set: (v: string | null) => { schemeStore.pendingDeleteLayerId = v }
  })
  const versions = computed({
    get: () => versionStore.versions,
    set: (v: SchemeVersion[]) => { versionStore.versions = v }
  })
  const previewTokens = computed({
    get: () => versionStore.previewTokens,
    set: (v: PreviewToken[]) => { versionStore.previewTokens = v }
  })

  const activeMask = computed(() => schemeStore.activeMask)
  const activeScheme = computed(() => schemeStore.activeScheme)
  const orderedLayers = computed(() => schemeStore.orderedLayers)
  const activeSchemeVersions = computed(() => versionStore.activeSchemeVersions)

  function setActiveMask(maskId: string) { schemeStore.setActiveMask(maskId) }
  function createMask(name: string, description: string = ''): Mask { return schemeStore.createMask(name, description) }
  function deleteMask(maskId: string) { schemeStore.deleteMask(maskId) }
  function createScheme(name: string, description: string = ''): ProcessScheme | null { return schemeStore.createScheme(name, description) }
  function switchScheme(schemeId: string) { schemeStore.switchScheme(schemeId) }
  function deleteScheme(schemeId: string) { schemeStore.deleteScheme(schemeId) }
  function duplicateScheme(schemeId: string, newName: string): ProcessScheme | null { return schemeStore.duplicateScheme(schemeId, newName) }
  function exportScheme(schemeId: string): string | null { return schemeStore.exportScheme(schemeId) }
  function importScheme(jsonString: string): ImportResult { return schemeStore.importScheme(jsonString) }
  function findSchemeById(schemeId: string): ProcessScheme | null { return schemeStore.findSchemeById(schemeId) }
  function findMaskOfScheme(schemeId: string): Mask | null { return schemeStore.findMaskOfScheme(schemeId) }

  function addLayer(type: ProcessType, name: string, customTypeName?: string): ProcessLayer | null { return schemeStore.addLayer(type, name, customTypeName) }
  function updateLayer(layerId: string, updates: Partial<ProcessLayer>) { schemeStore.updateLayer(layerId, updates) }
  function requestDeleteLayer(layerId: string): boolean { return schemeStore.requestDeleteLayer(layerId) }
  function confirmDeleteLayer() { schemeStore.confirmDeleteLayer() }
  function cancelDeleteLayer() { schemeStore.cancelDeleteLayer() }
  function performDeleteLayer(layerId: string) { schemeStore.performDeleteLayer(layerId) }
  function reorderLayers(newOrder: string[]) { schemeStore.reorderLayers(newOrder) }
  function moveLayerUp(layerId: string) { schemeStore.moveLayerUp(layerId) }
  function moveLayerDown(layerId: string) { schemeStore.moveLayerDown(layerId) }

  function addPattern(layerId: string, name: string, color: string, area: number, opacity: number = 100): PatternRegion | null { return schemeStore.addPattern(layerId, name, color, area, opacity) }
  function updatePattern(layerId: string, patternId: string, updates: Partial<PatternRegion>) { schemeStore.updatePattern(layerId, patternId, updates) }
  function deletePattern(layerId: string, patternId: string) { schemeStore.deletePattern(layerId, patternId) }

  function validateCurrentScheme(): ValidationResult { return schemeStore.validateCurrentScheme() }
  function canAddFaceCarving(): boolean { return schemeStore.canAddFaceCarving() }

  function getVersionsByScheme(schemeId: string): SchemeVersion[] { return versionStore.getVersionsByScheme(schemeId) }
  function saveVersion(schemeId: string, name: string, description: string = '', tags: string[] = [], author: string = '当前用户'): SchemeVersion | null { return versionStore.saveVersion(schemeId, name, description, tags, author) }
  function rollbackToVersion(versionId: string): boolean { return versionStore.rollbackToVersion(versionId) }
  function deleteVersion(versionId: string): boolean { return versionStore.deleteVersion(versionId) }
  function getVersionDiff(oldVersionId: string, newVersionId: string): VersionDiff | null { return versionStore.getVersionDiff(oldVersionId, newVersionId) }
  function compareVersionWithCurrent(versionId: string): VersionDiff | null { return versionStore.compareVersionWithCurrent(versionId) }
  function batchCopyPatternsFromVersion(sourceVersionId: string, targetSchemeId: string, targetLayerId?: string, patternIds?: string[]): number { return versionStore.batchCopyPatternsFromVersion(sourceVersionId, targetSchemeId, targetLayerId, patternIds) }
  function exportVersionAsJson(versionId: string): string | null { return versionStore.exportVersionAsJson(versionId) }
  function exportVersionAsCSV(versionId: string): string | null { return versionStore.exportVersionAsCSV(versionId) }
  function exportDiffReport(oldVersionId: string, newVersionId: string, schemeName: string): string | null { return versionStore.exportDiffReport(oldVersionId, newVersionId, schemeName) }
  function validateSchemeFull(schemeId?: string): ValidationReport { return versionStore.validateSchemeFull(schemeId) }

  function createPreviewToken(schemeId: string, author: string = '当前用户', expirationHours: number | null = 72): PreviewToken | null { return versionStore.createPreviewToken(schemeId, author, expirationHours) }
  function getPreviewToken(tokenId: string): PreviewToken | null { return versionStore.getPreviewToken(tokenId) }
  function getAllPreviewTokens(): PreviewToken[] { return versionStore.getAllPreviewTokens() }
  function addPreviewComment(tokenId: string, author: string, content: string, replyTo?: string): boolean { return versionStore.addPreviewComment(tokenId, author, content, replyTo) }

  return {
    masks,
    activeMaskId,
    activeMask,
    activeScheme,
    orderedLayers,
    pendingDeleteLayerId,
    versions,
    previewTokens,
    activeSchemeVersions,
    setActiveMask,
    createMask,
    deleteMask,
    createScheme,
    switchScheme,
    deleteScheme,
    duplicateScheme,
    exportScheme,
    importScheme,
    addLayer,
    updateLayer,
    requestDeleteLayer,
    confirmDeleteLayer,
    cancelDeleteLayer,
    reorderLayers,
    moveLayerUp,
    moveLayerDown,
    addPattern,
    updatePattern,
    deletePattern,
    validateCurrentScheme,
    canAddFaceCarving,
    getVersionsByScheme,
    saveVersion,
    rollbackToVersion,
    deleteVersion,
    getVersionDiff,
    compareVersionWithCurrent,
    batchCopyPatternsFromVersion,
    exportVersionAsJson,
    exportVersionAsCSV,
    exportDiffReport,
    validateSchemeFull,
    createPreviewToken,
    getPreviewToken,
    getAllPreviewTokens,
    addPreviewComment,
    findMaskOfScheme
  }
})
