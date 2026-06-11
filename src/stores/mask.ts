import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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
  PreviewToken,
  ChangeRecord
} from '@/types'
import { generateId, now } from '@/utils/id'
import {
  validateScheme,
  validateSchemeImport,
  validateLayer,
  validatePattern,
  validateOpacity,
  validateLayerNameUniqueness,
  canStartFaceCarving
} from '@/utils/validators'
import {
  snapshotScheme,
  extractChanges,
  compareVersions,
  runValidation,
  exportSchemeAsCSV,
  exportVersionDiffAsMarkdown
} from '@/utils/versioning'

function createSamplePatterns(): PatternRegion[] {
  return [
    {
      id: generateId(),
      name: '额头区域',
      path: 'M50,20 L80,30 L70,60 L30,60 L20,30 Z',
      color: '#8B4513',
      opacity: 100,
      visible: true,
      area: 1500,
      createdAt: now()
    },
    {
      id: generateId(),
      name: '左眼窝',
      path: 'M25,50 L40,45 L45,65 L30,70 Z',
      color: '#000000',
      opacity: 90,
      visible: true,
      area: 300,
      createdAt: now()
    },
    {
      id: generateId(),
      name: '右眼窝',
      path: 'M55,45 L75,50 L70,70 L55,65 Z',
      color: '#000000',
      opacity: 90,
      visible: true,
      area: 300,
      createdAt: now()
    }
  ]
}

function createSampleScheme(name: string): ProcessScheme {
  const baseLayer: ProcessLayer = {
    id: generateId(),
    name: '底胚制作',
    type: 'base_embryo',
    description: '使用传统樟木雕刻底胚',
    materialBatch: '樟木-2024-A01',
    completion: 100,
    patterns: [],
    notes: '木质纹理良好，无裂纹',
    createdAt: now(),
    updatedAt: now()
  }

  const polishLayer: ProcessLayer = {
    id: generateId(),
    name: '粗打磨',
    type: 'polishing',
    description: '使用240目砂纸初步打磨',
    materialBatch: '砂纸-240目-001',
    completion: 80,
    patterns: [],
    notes: '表面基本平整',
    createdAt: now(),
    updatedAt: now()
  }

  const faceLayer: ProcessLayer = {
    id: generateId(),
    name: '开脸-传统配色',
    type: 'face_carving',
    description: '按照传统傩戏配色方案进行开脸',
    materialBatch: '矿物颜料-A组',
    completion: 60,
    patterns: createSamplePatterns(),
    notes: '主色采用朱砂红配黑',
    createdAt: now(),
    updatedAt: now()
  }

  const goldLayer: ProcessLayer = {
    id: generateId(),
    name: '描金装饰',
    type: 'gold_outlining',
    description: '边缘描金处理',
    materialBatch: '金箔-24K-003',
    completion: 0,
    patterns: [],
    notes: '',
    createdAt: now(),
    updatedAt: now()
  }

  return {
    id: generateId(),
    name,
    description: '',
    layers: [baseLayer, polishLayer, faceLayer, goldLayer],
    layerOrder: [baseLayer.id, polishLayer.id, faceLayer.id, goldLayer.id],
    createdAt: now(),
    updatedAt: now(),
    isActive: true
  }
}

function createSampleMask(): Mask {
  const scheme1 = createSampleScheme('方案一：传统红脸')
  const scheme2: ProcessScheme = {
    ...createSampleScheme('方案二：黑面金刚'),
    id: generateId(),
    layers: [
      ...createSampleScheme('方案二：黑面金刚').layers.map(l => ({
        ...l,
        id: generateId(),
        patterns: l.patterns.map(p => ({
          ...p,
          id: generateId(),
          color: p.color === '#8B4513' ? '#000000' : p.color,
          area: p.area * 1.1
        }))
      }))
    ]
  }
  scheme2.layerOrder = scheme2.layers.map(l => l.id)

  return {
    id: generateId(),
    name: '开山傩面',
    description: '传统开山神将傩面具，用于驱邪纳福仪式',
    thumbnail: '',
    schemes: [scheme1, scheme2],
    activeSchemeId: scheme1.id,
    createdAt: now(),
    updatedAt: now()
  }
}

export const useMaskStore = defineStore('mask', () => {
  const masks = ref<Mask[]>([createSampleMask()])
  const activeMaskId = ref<string | null>(masks.value[0]?.id || null)
  const pendingDeleteLayerId = ref<string | null>(null)
  const versions = ref<SchemeVersion[]>([])
  const previewTokens = ref<PreviewToken[]>([])

  const activeMask = computed<Mask | null>(() => {
    return masks.value.find(m => m.id === activeMaskId.value) || null
  })

  const activeScheme = computed<ProcessScheme | null>(() => {
    const mask = activeMask.value
    if (!mask || !mask.activeSchemeId) return null
    return mask.schemes.find(s => s.id === mask.activeSchemeId) || null
  })

  const orderedLayers = computed<ProcessLayer[]>(() => {
    const scheme = activeScheme.value
    if (!scheme) return []
    return scheme.layerOrder
      .map(id => scheme.layers.find(l => l.id === id))
      .filter((l): l is ProcessLayer => !!l)
  })

  function setActiveMask(maskId: string) {
    if (masks.value.find(m => m.id === maskId)) {
      activeMaskId.value = maskId
    }
  }

  function createMask(name: string, description: string = ''): Mask {
    const scheme = createSampleScheme('默认方案')
    const mask: Mask = {
      id: generateId(),
      name,
      description,
      thumbnail: '',
      schemes: [scheme],
      activeSchemeId: scheme.id,
      createdAt: now(),
      updatedAt: now()
    }
    masks.value.push(mask)
    activeMaskId.value = mask.id
    return mask
  }

  function deleteMask(maskId: string) {
    const idx = masks.value.findIndex(m => m.id === maskId)
    if (idx >= 0) {
      masks.value.splice(idx, 1)
      if (activeMaskId.value === maskId) {
        activeMaskId.value = masks.value[0]?.id || null
      }
    }
  }

  function createScheme(name: string, description: string = ''): ProcessScheme | null {
    const mask = activeMask.value
    if (!mask) return null

    const scheme: ProcessScheme = {
      id: generateId(),
      name,
      description,
      layers: [],
      layerOrder: [],
      createdAt: now(),
      updatedAt: now(),
      isActive: false
    }

    mask.schemes.push(scheme)
    mask.activeSchemeId = scheme.id
    mask.updatedAt = now()
    return scheme
  }

  function switchScheme(schemeId: string) {
    const mask = activeMask.value
    if (!mask) return
    const scheme = mask.schemes.find(s => s.id === schemeId)
    if (!scheme) return

    mask.schemes.forEach(s => {
      s.isActive = s.id === schemeId
    })
    mask.activeSchemeId = schemeId
    mask.updatedAt = now()
  }

  function deleteScheme(schemeId: string) {
    const mask = activeMask.value
    if (!mask) return
    const idx = mask.schemes.findIndex(s => s.id === schemeId)
    if (idx < 0) return

    mask.schemes.splice(idx, 1)
    if (mask.activeSchemeId === schemeId) {
      mask.activeSchemeId = mask.schemes[0]?.id || null
      if (mask.schemes[0]) mask.schemes[0].isActive = true
    }
    mask.updatedAt = now()
  }

  function duplicateScheme(schemeId: string, newName: string): ProcessScheme | null {
    const mask = activeMask.value
    if (!mask) return null
    const source = mask.schemes.find(s => s.id === schemeId)
    if (!source) return null

    const idMap = new Map<string, string>()
    const newLayers = source.layers.map(layer => {
      const newId = generateId()
      idMap.set(layer.id, newId)
      return {
        ...layer,
        id: newId,
        patterns: layer.patterns.map(p => ({
          ...p,
          id: generateId()
        })),
        createdAt: now(),
        updatedAt: now()
      }
    })

    const newScheme: ProcessScheme = {
      id: generateId(),
      name: newName,
      description: source.description,
      layers: newLayers,
      layerOrder: source.layerOrder.map(id => idMap.get(id)!).filter(Boolean),
      createdAt: now(),
      updatedAt: now(),
      isActive: false
    }

    mask.schemes.push(newScheme)
    mask.activeSchemeId = newScheme.id
    mask.updatedAt = now()
    return newScheme
  }

  function exportScheme(schemeId: string): string | null {
    const mask = activeMask.value
    if (!mask) return null
    const scheme = mask.schemes.find(s => s.id === schemeId)
    if (!scheme) return null
    return JSON.stringify(scheme, null, 2)
  }

  function importScheme(jsonString: string): ImportResult {
    const mask = activeMask.value
    if (!mask) {
      return { success: false, message: '请先选择一个面具' }
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonString)
    } catch {
      return { success: false, message: 'JSON 解析失败，文件可能已损坏' }
    }

    const validation = validateSchemeImport(parsed)
    if (!validation.valid) {
      return {
        success: false,
        message: `方案数据损坏: ${validation.errors.join('; ')}`
      }
    }

    const scheme = parsed as ProcessScheme
    const finalValidation = validateScheme(scheme)
    if (!finalValidation.valid) {
      return {
        success: false,
        message: `方案校验失败: ${finalValidation.errors.join('; ')}`
      }
    }

    const oldLayerIds = scheme.layers.map(l => l.id)
    const idMap = new Map<string, string>()
    scheme.id = generateId()
    scheme.createdAt = now()
    scheme.updatedAt = now()
    scheme.layers = scheme.layers.map(l => {
      const newId = generateId()
      idMap.set(l.id, newId)
      return {
        ...l,
        id: newId,
        patterns: l.patterns.map(p => ({ ...p, id: generateId() })),
        createdAt: now(),
        updatedAt: now()
      }
    })
    const originalLayerOrder = scheme.layerOrder && scheme.layerOrder.length > 0
      ? scheme.layerOrder
      : oldLayerIds
    scheme.layerOrder = originalLayerOrder
      .map(oldId => idMap.get(oldId))
      .filter((id): id is string => !!id)

    mask.schemes.push(scheme)
    mask.updatedAt = now()

    return {
      success: true,
      message: `方案"${scheme.name}"导入成功`,
      scheme
    }
  }

  function addLayer(
    type: ProcessType,
    name: string,
    customTypeName?: string
  ): ProcessLayer | null {
    const scheme = activeScheme.value
    if (!scheme) return null

    if (type === 'face_carving' && !canStartFaceCarving(scheme.layers)) {
      return null
    }

    const layer: ProcessLayer = {
      id: generateId(),
      name,
      type,
      customTypeName,
      description: '',
      materialBatch: '',
      completion: 0,
      patterns: [],
      notes: '',
      createdAt: now(),
      updatedAt: now()
    }

    const nameValidation = validateLayerNameUniqueness([...scheme.layers, layer])
    if (!nameValidation.valid) {
      return null
    }

    scheme.layers.push(layer)
    scheme.layerOrder.push(layer.id)
    scheme.updatedAt = now()
    return layer
  }

  function updateLayer(layerId: string, updates: Partial<ProcessLayer>) {
    const scheme = activeScheme.value
    if (!scheme) return

    const layer = scheme.layers.find(l => l.id === layerId)
    if (!layer) return

    if (updates.name !== undefined) {
      const otherLayers = scheme.layers.filter(l => l.id !== layerId)
      const nameValidation = validateLayerNameUniqueness([
        ...otherLayers,
        { ...layer, ...updates }
      ])
      if (!nameValidation.valid) return
    }

    if (updates.completion !== undefined) {
      if (layer.type === 'face_carving' && updates.completion > 0) {
        if (!canStartFaceCarving(scheme.layers)) return
      }
    }

    Object.assign(layer, updates, { updatedAt: now() })
    scheme.updatedAt = now()
  }

  function requestDeleteLayer(layerId: string): boolean {
    const scheme = activeScheme.value
    if (!scheme) return false

    const layer = scheme.layers.find(l => l.id === layerId)
    if (!layer) return false

    if (layer.patterns.length > 0) {
      pendingDeleteLayerId.value = layerId
      return false
    }

    performDeleteLayer(layerId)
    return true
  }

  function confirmDeleteLayer() {
    if (pendingDeleteLayerId.value) {
      performDeleteLayer(pendingDeleteLayerId.value)
      pendingDeleteLayerId.value = null
    }
  }

  function cancelDeleteLayer() {
    pendingDeleteLayerId.value = null
  }

  function performDeleteLayer(layerId: string) {
    const scheme = activeScheme.value
    if (!scheme) return

    const idx = scheme.layers.findIndex(l => l.id === layerId)
    if (idx < 0) return

    scheme.layers.splice(idx, 1)
    scheme.layerOrder = scheme.layerOrder.filter(id => id !== layerId)
    scheme.updatedAt = now()
  }

  function reorderLayers(newOrder: string[]) {
    const scheme = activeScheme.value
    if (!scheme) return

    const valid = newOrder.every(id => scheme.layerOrder.includes(id))
      && newOrder.length === scheme.layerOrder.length
    if (!valid) return

    scheme.layerOrder = newOrder
    scheme.updatedAt = now()
  }

  function moveLayerUp(layerId: string) {
    const scheme = activeScheme.value
    if (!scheme) return
    const idx = scheme.layerOrder.indexOf(layerId)
    if (idx <= 0) return
    ;[scheme.layerOrder[idx - 1], scheme.layerOrder[idx]] = [
      scheme.layerOrder[idx],
      scheme.layerOrder[idx - 1]
    ]
    scheme.updatedAt = now()
  }

  function moveLayerDown(layerId: string) {
    const scheme = activeScheme.value
    if (!scheme) return
    const idx = scheme.layerOrder.indexOf(layerId)
    if (idx < 0 || idx >= scheme.layerOrder.length - 1) return
    ;[scheme.layerOrder[idx], scheme.layerOrder[idx + 1]] = [
      scheme.layerOrder[idx + 1],
      scheme.layerOrder[idx]
    ]
    scheme.updatedAt = now()
  }

  function addPattern(
    layerId: string,
    name: string,
    color: string,
    area: number,
    opacity: number = 100
  ): PatternRegion | null {
    const scheme = activeScheme.value
    if (!scheme) return null

    const layer = scheme.layers.find(l => l.id === layerId)
    if (!layer) return null

    const opacityValidation = validateOpacity(opacity)
    if (!opacityValidation.valid) return null

    const pattern: PatternRegion = {
      id: generateId(),
      name,
      path: '',
      color,
      opacity,
      visible: true,
      area,
      createdAt: now()
    }

    const validation = validatePattern(pattern)
    if (!validation.valid) return null

    layer.patterns.push(pattern)
    layer.updatedAt = now()
    scheme.updatedAt = now()
    return pattern
  }

  function updatePattern(
    layerId: string,
    patternId: string,
    updates: Partial<PatternRegion>
  ) {
    const scheme = activeScheme.value
    if (!scheme) return

    const layer = scheme.layers.find(l => l.id === layerId)
    if (!layer) return

    const pattern = layer.patterns.find(p => p.id === patternId)
    if (!pattern) return

    const updated = { ...pattern, ...updates }
    const validation = validatePattern(updated)
    if (!validation.valid) return

    Object.assign(pattern, updates)
    layer.updatedAt = now()
    scheme.updatedAt = now()
  }

  function deletePattern(layerId: string, patternId: string) {
    const scheme = activeScheme.value
    if (!scheme) return

    const layer = scheme.layers.find(l => l.id === layerId)
    if (!layer) return

    const idx = layer.patterns.findIndex(p => p.id === patternId)
    if (idx < 0) return

    layer.patterns.splice(idx, 1)
    layer.updatedAt = now()
    scheme.updatedAt = now()
  }

  function validateCurrentScheme(): ValidationResult {
    const scheme = activeScheme.value
    if (!scheme) {
      return { valid: false, errors: ['未选择方案'], warnings: [] }
    }
    return validateScheme(scheme)
  }

  function canAddFaceCarving(): boolean {
    const scheme = activeScheme.value
    if (!scheme) return false
    return canStartFaceCarving(scheme.layers)
  }

  const activeSchemeVersions = computed<SchemeVersion[]>(() => {
    if (!activeScheme.value) return []
    return versions.value
      .filter(v => v.schemeId === activeScheme.value!.id)
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
    const scheme = findSchemeById(schemeId)
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

  function findSchemeById(schemeId: string): ProcessScheme | null {
    for (const mask of masks.value) {
      const s = mask.schemes.find(s => s.id === schemeId)
      if (s) return s
    }
    return null
  }

  function findMaskOfScheme(schemeId: string): Mask | null {
    for (const mask of masks.value) {
      if (mask.schemes.some(s => s.id === schemeId)) return mask
    }
    return null
  }

  function rollbackToVersion(versionId: string): boolean {
    const version = versions.value.find(v => v.id === versionId)
    if (!version) return false

    const scheme = findSchemeById(version.schemeId)
    if (!scheme) return false

    const mask = findMaskOfScheme(version.schemeId)
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
    const scheme = findSchemeById(v.schemeId)
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
    const targetScheme = findSchemeById(targetSchemeId)
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
    const scheme = schemeId ? findSchemeById(schemeId) : activeScheme.value
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
    const scheme = findSchemeById(schemeId)
    if (!scheme) return null
    const mask = findMaskOfScheme(schemeId)
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
