import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  SchemeVersion,
  VersionDiff,
  ValidationReport,
  PreviewToken,
  ProcessScheme,
  ProcessLayer,
  PatternRegion
} from '@/types'
import { generateId, now } from '@/utils/id'
import {
  snapshotScheme,
  extractChanges,
  compareVersions,
  runValidation,
  exportSchemeAsCSV,
  exportVersionDiffAsMarkdown
} from '@/utils/versioning'
import { useMaskSchemeStore } from './maskScheme'

export interface VersionManagerStoreState {
  versions: SchemeVersion[]
  previewTokens: PreviewToken[]
}

export interface VersionManagerStoreGetters {
  activeSchemeVersions: SchemeVersion[]
}

export interface VersionManagerStoreActions {
  getVersionsByScheme(schemeId: string): SchemeVersion[]
  saveVersion(schemeId: string, name: string, description?: string, tags?: string[], author?: string): SchemeVersion | null
  rollbackToVersion(versionId: string): boolean
  deleteVersion(versionId: string): boolean
  getVersionDiff(oldVersionId: string, newVersionId: string): VersionDiff | null
  compareVersionWithCurrent(versionId: string): VersionDiff | null
  batchCopyPatternsFromVersion(sourceVersionId: string, targetSchemeId: string, targetLayerId?: string, patternIds?: string[]): number
  exportVersionAsJson(versionId: string): string | null
  exportVersionAsCSV(versionId: string): string | null
  exportDiffReport(oldVersionId: string, newVersionId: string, schemeName: string): string | null
  validateSchemeFull(schemeId?: string): ValidationReport
  createPreviewToken(schemeId: string, author?: string, expirationHours?: number | null): PreviewToken | null
  getPreviewToken(tokenId: string): PreviewToken | null
  getAllPreviewTokens(): PreviewToken[]
  addPreviewComment(tokenId: string, author: string, content: string, replyTo?: string): boolean
}

export type VersionManagerStore = VersionManagerStoreState & VersionManagerStoreGetters & VersionManagerStoreActions

export const useVersionManagerStore = defineStore('versionManager', () => {
  const versions = ref<SchemeVersion[]>([])
  const previewTokens = ref<PreviewToken[]>([])

  const maskSchemeStore = useMaskSchemeStore()

  const activeSchemeVersions = computed<SchemeVersion[]>(() => {
    if (!maskSchemeStore.activeScheme) return []
    return versions.value
      .filter(v => v.schemeId === maskSchemeStore.activeScheme!.id)
      .sort((a, b) => b.versionNumber - a.versionNumber)
  })

  function getVersionsByScheme(schemeId: string): SchemeVersion[] {
    return versions.value
      .filter(v => v.schemeId === schemeId)
      .sort((a, b) => b.versionNumber - a.versionNumber)
  }

  function saveVersion(
    schemeId: string,
    name: string,
    description: string = '',
    tags: string[] = [],
    author: string = '当前用户'
  ): SchemeVersion | null {
    const scheme = maskSchemeStore.findSchemeById(schemeId)
    if (!scheme) return null

    const existing = versions.value.filter(v => v.schemeId === schemeId)
    const versionNumber = existing.length + 1
    const previousVersion = existing.length > 0
      ? existing.sort((a, b) => b.versionNumber - a.versionNumber)[0]
      : null

    const changes = extractChanges(
      previousVersion?.snapshot || null,
      scheme
    )

    const version: SchemeVersion = {
      id: generateId(),
      schemeId,
      versionNumber,
      name: name || `V${versionNumber}`,
      description,
      snapshot: snapshotScheme(scheme),
      changes,
      createdAt: now(),
      author,
      tags
    }

    versions.value.push(version)
    return version
  }

  function rollbackToVersion(versionId: string): boolean {
    const version = versions.value.find(v => v.id === versionId)
    if (!version) return false

    const scheme = maskSchemeStore.findSchemeById(version.schemeId)
    if (!scheme) return false

    const mask = maskSchemeStore.findMaskOfScheme(version.schemeId)
    if (!mask) return false

    const idMap = new Map<string, string>()
    const snapshot = version.snapshot
    const newLayers = snapshot.layers.map(oldLayer => {
      const newId = generateId()
      idMap.set(oldLayer.id, newId)
      return {
        ...oldLayer,
        id: newId,
        patterns: oldLayer.patterns.map(p => ({ ...p, id: generateId() })),
        createdAt: now(),
        updatedAt: now()
      }
    })

    scheme.name = snapshot.name
    scheme.description = snapshot.description
    scheme.layers = newLayers
    scheme.layerOrder = snapshot.layerOrder
      .map(oldId => idMap.get(oldId)!)
      .filter(Boolean)
    scheme.updatedAt = now()

    mask.updatedAt = now()

    const rollbackVersion: SchemeVersion = {
      id: generateId(),
      schemeId: scheme.id,
      versionNumber: versions.value.filter(v => v.schemeId === scheme.id).length + 1,
      name: `回滚至 ${version.name}`,
      description: `基于版本${version.name}(#${version.versionNumber})回滚`,
      snapshot: snapshotScheme(scheme),
      changes: [
        {
          type: 'scheme_modified',
          targetType: 'scheme',
          targetId: scheme.id,
          targetName: scheme.name,
          field: 'rollback',
          oldValue: `当前内容`,
          newValue: version.name,
          description: `整体回滚至版本：${version.name}`
        }
      ],
      createdAt: now(),
      author: '当前用户',
      tags: ['rollback']
    }
    versions.value.push(rollbackVersion)

    return true
  }

  function deleteVersion(versionId: string): boolean {
    const idx = versions.value.findIndex(v => v.id === versionId)
    if (idx < 0) return false
    versions.value.splice(idx, 1)
    return true
  }

  function getVersionDiff(
    oldVersionId: string,
    newVersionId: string
  ): VersionDiff | null {
    const oldV = versions.value.find(v => v.id === oldVersionId)
    const newV = versions.value.find(v => v.id === newVersionId)
    if (!oldV || !newV) return null
    if (oldV.schemeId !== newV.schemeId) return null

    return compareVersions(
      oldV.snapshot,
      newV.snapshot,
      oldV.name,
      newV.name
    )
  }

  function compareVersionWithCurrent(versionId: string): VersionDiff | null {
    const v = versions.value.find(vv => vv.id === versionId)
    if (!v) return null
    const scheme = maskSchemeStore.findSchemeById(v.schemeId)
    if (!scheme) return null
    return compareVersions(v.snapshot, scheme, v.name, '当前编辑版')
  }

  function batchCopyPatternsFromVersion(
    sourceVersionId: string,
    targetSchemeId: string,
    targetLayerId?: string,
    patternIds?: string[]
  ): number {
    const sourceVersion = versions.value.find(v => v.id === sourceVersionId)
    if (!sourceVersion) return 0
    const targetScheme = maskSchemeStore.findSchemeById(targetSchemeId)
    if (!targetScheme) return 0

    let copied = 0
    sourceVersion.snapshot.layers.forEach(sourceLayer => {
      const patternsToCopy = patternIds
        ? sourceLayer.patterns.filter(p => patternIds.includes(p.id))
        : sourceLayer.patterns

      if (patternsToCopy.length === 0) return

      let destLayer: ProcessLayer | undefined
      if (targetLayerId) {
        destLayer = targetScheme.layers.find(l => l.id === targetLayerId)
      } else {
        destLayer = targetScheme.layers.find(
          l => l.type === sourceLayer.type && l.type !== 'custom'
        )
        if (!destLayer) {
          destLayer = {
            id: generateId(),
            name: `${sourceLayer.name} - 导入`,
            type: sourceLayer.type,
            customTypeName: sourceLayer.customTypeName,
            description: `从版本${sourceVersion.name}导入`,
            materialBatch: sourceLayer.materialBatch,
            completion: 0,
            patterns: [],
            notes: sourceLayer.notes,
            createdAt: now(),
            updatedAt: now()
          }
          targetScheme.layers.push(destLayer)
          targetScheme.layerOrder.push(destLayer.id)
        }
      }

      if (!destLayer) return

      patternsToCopy.forEach(op => {
        destLayer!.patterns.push({
          ...op,
          id: generateId(),
          name: `${op.name} (导入)`,
          createdAt: now()
        })
        destLayer!.updatedAt = now()
        copied++
      })
    })

    targetScheme.updatedAt = now()
    return copied
  }

  function exportVersionAsJson(versionId: string): string | null {
    const v = versions.value.find(vv => vv.id === versionId)
    if (!v) return null
    return JSON.stringify({
      version: {
        id: v.id,
        versionNumber: v.versionNumber,
        name: v.name,
        description: v.description,
        createdAt: v.createdAt,
        author: v.author,
        tags: v.tags,
        changes: v.changes
      },
      scheme: v.snapshot
    }, null, 2)
  }

  function exportVersionAsCSV(versionId: string): string | null {
    const v = versions.value.find(vv => vv.id === versionId)
    if (!v) return null
    return exportSchemeAsCSV(v.snapshot)
  }

  function exportDiffReport(
    oldVersionId: string,
    newVersionId: string,
    schemeName: string
  ): string | null {
    const diff = getVersionDiff(oldVersionId, newVersionId)
    if (!diff) return null
    return exportVersionDiffAsMarkdown(diff, schemeName)
  }

  function validateSchemeFull(schemeId?: string): ValidationReport {
    const scheme = schemeId ? maskSchemeStore.findSchemeById(schemeId) : maskSchemeStore.activeScheme
    if (!scheme) {
      return { issues: [], errorCount: 0, warningCount: 0, infoCount: 0, generatedAt: now() }
    }
    return runValidation(scheme)
  }

  function createPreviewToken(
    schemeId: string,
    author: string = '当前用户',
    expirationHours: number | null = 72
  ): PreviewToken | null {
    const scheme = maskSchemeStore.findSchemeById(schemeId)
    if (!scheme) return null
    const mask = maskSchemeStore.findMaskOfScheme(schemeId)
    if (!mask) return null

    const token: PreviewToken = {
      id: generateId(),
      schemeId,
      maskId: mask.id,
      snapshot: snapshotScheme(scheme),
      createdAt: now(),
      expiresAt: expirationHours ? now() + expirationHours * 3600 * 1000 : null,
      author,
      comments: []
    }
    previewTokens.value.push(token)
    return token
  }

  function getPreviewToken(tokenId: string): PreviewToken | null {
    return previewTokens.value.find(t => t.id === tokenId) || null
  }

  function getAllPreviewTokens(): PreviewToken[] {
    return [...previewTokens.value].sort((a, b) => b.createdAt - a.createdAt)
  }

  function addPreviewComment(
    tokenId: string,
    author: string,
    content: string,
    replyTo?: string
  ): boolean {
    const token = previewTokens.value.find(t => t.id === tokenId)
    if (!token) return false
    token.comments.push({
      id: generateId(),
      author,
      content,
      createdAt: now(),
      replyTo
    })
    return true
  }

  return {
    versions,
    previewTokens,
    activeSchemeVersions,
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
    addPreviewComment
  }
})
