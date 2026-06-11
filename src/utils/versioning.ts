import type {
  ProcessScheme,
  ProcessLayer,
  PatternRegion,
  ChangeRecord,
  VersionDiff,
  LayerDiff,
  PatternDiff,
  ValidationReport,
  SchemeIssue
} from '@/types'
import { generateId, now } from './id'
import { getLayerDisplayName } from './validators'
import { calculateSchemeTotalArea, analyzeColorDistribution, aggregateColorStats } from './analysis'
import { PROCESS_ORDER, PROCESS_TYPE_META, type ProcessType } from '@/types'

function deepCloneScheme(scheme: ProcessScheme): ProcessScheme {
  return JSON.parse(JSON.stringify(scheme))
}

function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function snapshotScheme(scheme: ProcessScheme): ProcessScheme {
  const clone = deepCloneScheme(scheme)
  clone.layers = clone.layers.map(layer => ({
    ...layer,
    patterns: layer.patterns.map(p => ({ ...p }))
  }))
  return clone
}

export function extractChanges(
  oldScheme: ProcessScheme | null,
  newScheme: ProcessScheme
): ChangeRecord[] {
  const changes: ChangeRecord[] = []
  if (!oldScheme) {
    newScheme.layers.forEach(layer => {
      changes.push({
        type: 'layer_added',
        targetType: 'layer',
        targetId: layer.id,
        targetName: layer.name,
        description: `添加工序：${getLayerDisplayName(layer)}`
      })
      layer.patterns.forEach(pattern => {
        changes.push({
          type: 'pattern_added',
          targetType: 'pattern',
          targetId: pattern.id,
          targetName: pattern.name,
          layerId: layer.id,
          description: `新增纹线：${pattern.name}（${getLayerDisplayName(layer)}）`
        })
      })
    })
    return changes
  }

  const schemeFields: (keyof ProcessScheme)[] = ['name', 'description']
  schemeFields.forEach(field => {
    if (!isEqual(oldScheme[field], newScheme[field])) {
      changes.push({
        type: 'scheme_modified',
        targetType: 'scheme',
        targetId: newScheme.id,
        targetName: newScheme.name,
        field,
        oldValue: oldScheme[field],
        newValue: newScheme[field],
        description: `方案${field === 'name' ? '名称' : '描述'}变更`
      })
    }
  })

  const oldLayerMap = new Map(oldScheme.layers.map(l => [l.id, l]))
  const newLayerMap = new Map(newScheme.layers.map(l => [l.id, l]))

  oldScheme.layers.forEach(oldLayer => {
    if (!newLayerMap.has(oldLayer.id)) {
      changes.push({
        type: 'layer_removed',
        targetType: 'layer',
        targetId: oldLayer.id,
        targetName: oldLayer.name,
        description: `删除工序：${getLayerDisplayName(oldLayer)}`
      })
      oldLayer.patterns.forEach(p => {
        changes.push({
          type: 'pattern_removed',
          targetType: 'pattern',
          targetId: p.id,
          targetName: p.name,
          layerId: oldLayer.id,
          description: `删除纹线：${p.name}（原属 ${getLayerDisplayName(oldLayer)}）`
        })
      })
    }
  })

  newScheme.layers.forEach(newLayer => {
    const oldLayer = oldLayerMap.get(newLayer.id)
    if (!oldLayer) {
      changes.push({
        type: 'layer_added',
        targetType: 'layer',
        targetId: newLayer.id,
        targetName: newLayer.name,
        description: `添加工序：${getLayerDisplayName(newLayer)}`
      })
      newLayer.patterns.forEach(p => {
        changes.push({
          type: 'pattern_added',
          targetType: 'pattern',
          targetId: p.id,
          targetName: p.name,
          layerId: newLayer.id,
          description: `新增纹线：${p.name}`
        })
      })
      return
    }

    const layerFields: (keyof ProcessLayer)[] = [
      'name', 'type', 'customTypeName', 'description',
      'materialBatch', 'completion', 'notes'
    ]
    layerFields.forEach(field => {
      if (!isEqual(oldLayer![field], newLayer[field])) {
        const labelMap: Record<string, string> = {
          name: '工序名称',
          type: '工序类型',
          customTypeName: '自定义类型',
          description: '工序描述',
          materialBatch: '材料批次',
          completion: '完成度',
          notes: '备注'
        }
        changes.push({
          type: 'layer_modified',
          targetType: 'layer',
          targetId: newLayer.id,
          targetName: newLayer.name,
          field,
          oldValue: oldLayer![field],
          newValue: newLayer[field],
          description: `${getLayerDisplayName(newLayer)} - ${labelMap[field]}变更`
        })
      }
    })

    const oldPatternMap = new Map(oldLayer.patterns.map(p => [p.id, p]))
    const newPatternMap = new Map(newLayer.patterns.map(p => [p.id, p]))

    oldLayer.patterns.forEach(op => {
      if (!newPatternMap.has(op.id)) {
        changes.push({
          type: 'pattern_removed',
          targetType: 'pattern',
          targetId: op.id,
          targetName: op.name,
          layerId: newLayer.id,
          description: `删除纹线：${op.name}（${getLayerDisplayName(newLayer)}）`
        })
      }
    })

    newLayer.patterns.forEach(np => {
      const op = oldPatternMap.get(np.id)
      if (!op) {
        changes.push({
          type: 'pattern_added',
          targetType: 'pattern',
          targetId: np.id,
          targetName: np.name,
          layerId: newLayer.id,
          description: `新增纹线：${np.name}（${getLayerDisplayName(newLayer)}）`
        })
        return
      }
      const patternFields: (keyof PatternRegion)[] = [
        'name', 'path', 'color', 'opacity', 'visible', 'area'
      ]
      patternFields.forEach(field => {
        if (!isEqual(op![field], np[field])) {
          const labelMap: Record<string, string> = {
            name: '名称',
            path: '路径',
            color: '颜色',
            opacity: '透明度',
            visible: '可见性',
            area: '面积'
          }
          changes.push({
            type: 'pattern_modified',
            targetType: 'pattern',
            targetId: np.id,
            targetName: np.name,
            layerId: newLayer.id,
            field,
            oldValue: op![field],
            newValue: np[field],
            description: `${getLayerDisplayName(newLayer)} > ${np.name} - ${labelMap[field]}变更`
          })
        }
      })
    })
  })

  return changes
}

export function compareVersions(
  oldScheme: ProcessScheme,
  newScheme: ProcessScheme,
  oldName: string = '旧版本',
  newName: string = '新版本'
): VersionDiff {
  const layerDiffs: LayerDiff[] = []
  const oldLayerMap = new Map(oldScheme.layers.map(l => [l.id, l]))
  const newLayerMap = new Map(newScheme.layers.map(l => [l.id, l]))
  const allLayerIds = new Set([...oldLayerMap.keys(), ...newLayerMap.keys()])

  let layersAdded = 0, layersRemoved = 0, layersModified = 0
  let patternsAdded = 0, patternsRemoved = 0, patternsModified = 0
  let colorsChanged = 0

  allLayerIds.forEach(layerId => {
    const oldLayer = oldLayerMap.get(layerId)
    const newLayer = newLayerMap.get(layerId)

    if (!oldLayer && newLayer) {
      layersAdded++
      const patternDiffs: PatternDiff[] = newLayer.patterns.map(p => ({
        patternId: p.id,
        patternName: p.name,
        status: 'added',
        newColor: p.color,
        newArea: p.area,
        newOpacity: p.opacity
      }))
      patternsAdded += patternDiffs.length
      layerDiffs.push({
        layerId,
        layerName: getLayerDisplayName(newLayer),
        status: 'added',
        newCompletion: newLayer.completion,
        newMaterial: newLayer.materialBatch,
        patternDiffs
      })
      return
    }

    if (oldLayer && !newLayer) {
      layersRemoved++
      const patternDiffs: PatternDiff[] = oldLayer.patterns.map(p => ({
        patternId: p.id,
        patternName: p.name,
        status: 'removed',
        oldColor: p.color,
        oldArea: p.area,
        oldOpacity: p.opacity
      }))
      patternsRemoved += patternDiffs.length
      layerDiffs.push({
        layerId,
        layerName: getLayerDisplayName(oldLayer),
        status: 'removed',
        oldCompletion: oldLayer.completion,
        oldMaterial: oldLayer.materialBatch,
        patternDiffs
      })
      return
    }

    if (oldLayer && newLayer) {
      let layerChanged = false
      const patternDiffs: PatternDiff[] = []
      const oldPMap = new Map(oldLayer.patterns.map(p => [p.id, p]))
      const newPMap = new Map(newLayer.patterns.map(p => [p.id, p]))
      const allPIds = new Set([...oldPMap.keys(), ...newPMap.keys()])

      allPIds.forEach(pid => {
        const op = oldPMap.get(pid)
        const np = newPMap.get(pid)
        if (!op && np) {
          patternsAdded++
          patternDiffs.push({
            patternId: pid,
            patternName: np.name,
            status: 'added',
            newColor: np.color,
            newArea: np.area,
            newOpacity: np.opacity
          })
          layerChanged = true
        } else if (op && !np) {
          patternsRemoved++
          patternDiffs.push({
            patternId: pid,
            patternName: op.name,
            status: 'removed',
            oldColor: op.color,
            oldArea: op.area,
            oldOpacity: op.opacity
          })
          layerChanged = true
        } else if (op && np) {
          const colorChanged = op.color !== np.color
          const areaChanged = op.area !== np.area
          const opacityChanged = op.opacity !== np.opacity
          const nameChanged = op.name !== np.name
          if (colorChanged || areaChanged || opacityChanged || nameChanged) {
            patternsModified++
            if (colorChanged) colorsChanged++
            patternDiffs.push({
              patternId: pid,
              patternName: np.name,
              status: 'modified',
              oldColor: op.color,
              newColor: np.color,
              oldArea: op.area,
              newArea: np.area,
              oldOpacity: op.opacity,
              newOpacity: np.opacity
            })
            layerChanged = true
          } else {
            patternDiffs.push({
              patternId: pid,
              patternName: np.name,
              status: 'unchanged'
            })
          }
        }
      })

      const layerMetaChanged =
        oldLayer.completion !== newLayer.completion ||
        oldLayer.materialBatch !== newLayer.materialBatch ||
        oldLayer.name !== newLayer.name

      if (layerMetaChanged || layerChanged) {
        if (layerMetaChanged && !layerChanged) layersModified++
        else if (layerChanged) layersModified++
        layerDiffs.push({
          layerId,
          layerName: getLayerDisplayName(newLayer),
          status: 'modified',
          oldCompletion: oldLayer.completion,
          newCompletion: newLayer.completion,
          oldMaterial: oldLayer.materialBatch,
          newMaterial: newLayer.materialBatch,
          patternDiffs
        })
      } else {
        layerDiffs.push({
          layerId,
          layerName: getLayerDisplayName(newLayer),
          status: 'unchanged',
          patternDiffs
        })
      }
    }
  })

  const oldArea = calculateSchemeTotalArea(oldScheme, true)
  const newArea = calculateSchemeTotalArea(newScheme, true)

  return {
    oldVersionName: oldName,
    newVersionName: newName,
    layerDiffs,
    summary: {
      layersAdded,
      layersRemoved,
      layersModified,
      patternsAdded,
      patternsRemoved,
      patternsModified,
      totalAreaDiff: Number((newArea - oldArea).toFixed(2)),
      colorsChanged
    }
  }
}

export function runValidation(scheme: ProcessScheme): ValidationReport {
  const issues: SchemeIssue[] = []

  const requiredTypes: ProcessType[] = ['base_embryo', 'polishing', 'face_carving']
  const typeLabels = PROCESS_TYPE_META
  requiredTypes.forEach(rt => {
    const hasType = scheme.layers.some(l => l.type === rt)
    if (!hasType) {
      issues.push({
        id: generateId(),
        type: 'missing_process',
        severity: 'error',
        title: `缺少必要工序：${typeLabels[rt].label}`,
        description: `标准傩面具制作流程需要包含"${typeLabels[rt].label}"工序，当前方案未设置。`,
        suggestion: `点击"添加工序"选择"${typeLabels[rt].label}"类型`
      })
    }
  })

  const typeOrder = PROCESS_ORDER
  const ordered = scheme.layers.slice().sort((a, b) => {
    const ai = scheme.layerOrder.indexOf(a.id)
    const bi = scheme.layerOrder.indexOf(b.id)
    return ai - bi
  })
  for (let i = 0; i < ordered.length - 1; i++) {
    const cur = ordered[i]
    const nxt = ordered[i + 1]
    if (typeOrder[cur.type] > typeOrder[nxt.type] && cur.type !== 'custom' && nxt.type !== 'custom') {
      issues.push({
        id: generateId(),
        type: 'missing_process',
        severity: 'warning',
        title: '工序顺序异常',
        description: `"${getLayerDisplayName(cur)}"应在"${getLayerDisplayName(nxt)}"之后执行，当前顺序可能影响制作质量。`
      })
    }
  }

  scheme.layers.forEach(layer => {
    if (layer.completion > 0 && layer.completion < 100) {
      const prev = scheme.layers.filter(l =>
        scheme.layerOrder.indexOf(l.id) < scheme.layerOrder.indexOf(layer.id)
      )
      const unfinished = prev.filter(p => p.completion < 100 && p.type !== 'custom')
      if (unfinished.length > 0 && layer.type !== 'custom') {
        issues.push({
          id: generateId(),
          type: 'completion_gap',
          severity: 'warning',
          title: '前置工序未完成',
          description: `"${getLayerDisplayName(layer)}"已开始(${layer.completion}%)，但前置工序"${unfinished.map(u => getLayerDisplayName(u)).join('、')}"未完全完成。`,
          layerId: layer.id,
          suggestion: '建议先完成前置工序再继续当前工序'
        })
      }
    }

    if (!layer.materialBatch.trim() && layer.type !== 'custom') {
      issues.push({
        id: generateId(),
        type: 'batch_missing',
        severity: 'warning',
        title: '材料批次缺失',
        description: `"${getLayerDisplayName(layer)}"未记录材料批次信息。`,
        layerId: layer.id,
        suggestion: '补充材料批次以便质量追溯'
      })
    }

    layer.patterns.forEach(pattern => {
      if (pattern.area <= 0) {
        issues.push({
          id: generateId(),
          type: 'area_abnormal',
          severity: 'error',
          title: '纹线面积异常',
          description: `"${pattern.name}"面积为${pattern.area}，应大于0。`,
          layerId: layer.id,
          patternId: pattern.id,
          suggestion: '重新测量或输入正确的纹线面积'
        })
      } else if (pattern.area > 50000) {
        issues.push({
          id: generateId(),
          type: 'area_abnormal',
          severity: 'warning',
          title: '纹线面积偏大',
          description: `"${pattern.name}"面积${pattern.area}超过常规阈值(50000)，请确认是否正确。`,
          layerId: layer.id,
          patternId: pattern.id
        })
      }

      if (pattern.opacity < 50 && pattern.visible) {
        issues.push({
          id: generateId(),
          type: 'low_opacity',
          severity: 'info',
          title: '纹线透明度过低',
          description: `"${pattern.name}"透明度为${pattern.opacity}%，可能导致可视效果不明显。`,
          layerId: layer.id,
          patternId: pattern.id
        })
      }

      if (!pattern.path.trim()) {
        issues.push({
          id: generateId(),
          type: 'orphan_pattern',
          severity: 'info',
          title: '纹线缺少路径数据',
          description: `"${pattern.name}"尚未设置SVG路径，仅为占位数据。`,
          layerId: layer.id,
          patternId: pattern.id,
          suggestion: '导入SVG或手动绘制纹线路径'
        })
      }
    })
  })

  const allColors = new Set<string>()
  scheme.layers.forEach(l => l.patterns.forEach(p => allColors.add(p.color.toUpperCase())))
  if (allColors.size > 12) {
    issues.push({
      id: generateId(),
      type: 'too_many_colors',
      severity: 'warning',
      title: '颜色种类过多',
      description: `当前方案使用了${allColors.size}种颜色，传统傩面具开脸通常不超过8-10种主色。`,
      suggestion: '合并相近色或采用传统配色方案以保持风格统一'
    })
  }

  const faceLayers = scheme.layers.filter(l => l.type === 'face_carving')
  faceLayers.forEach(fl => {
    const visibleArea = fl.patterns.filter(p => p.visible).reduce((s, p) => s + p.area, 0)
    if (visibleArea > 0 && visibleArea < 500) {
      issues.push({
        id: generateId(),
        type: 'area_abnormal',
        severity: 'warning',
        title: '开脸区域偏小',
        description: `"${getLayerDisplayName(fl)}"已配置但开脸纹线总面积仅${visibleArea}，可能不完整。`,
        layerId: fl.id,
        suggestion: '补充关键五官区域（额、眼、鼻、口、脸颊）纹线'
      })
    }
  })

  const batchMap = new Map<string, string[]>()
  scheme.layers.forEach(l => {
    if (l.materialBatch.trim()) {
      const b = l.materialBatch.trim()
      if (!batchMap.has(b)) batchMap.set(b, [])
      batchMap.get(b)!.push(getLayerDisplayName(l))
    }
  })
  batchMap.forEach((layers, batch) => {
    if (layers.length > 1) {
      const types = layers.join('、')
      issues.push({
        id: generateId(),
        type: 'material_conflict',
        severity: 'info',
        title: '材料批次共享',
        description: `批次"${batch}"被多个工序使用：${types}。若为不同材料请更新批次号。`
      })
    }
  })

  const colorDist = analyzeColorDistribution(scheme, true)
  const agg = aggregateColorStats(colorDist)
  if (agg.length > 0) {
    const topPct = agg[0].percentage
    if (topPct > 85) {
      issues.push({
        id: generateId(),
        type: 'area_abnormal',
        severity: 'info',
        title: '颜色占比过于集中',
        description: `主色"${agg[0].colorName}"占比达${topPct}%，整体配色层次可能不够丰富。`
      })
    }
  }

  let errorCount = 0, warningCount = 0, infoCount = 0
  issues.forEach(i => {
    if (i.severity === 'error') errorCount++
    else if (i.severity === 'warning') warningCount++
    else infoCount++
  })

  return {
    issues,
    errorCount,
    warningCount,
    infoCount,
    generatedAt: now()
  }
}

export function exportSchemeAsCSV(scheme: ProcessScheme): string {
  const header = ['工序', '类型', '完成度', '材料批次', '纹线名称', '颜色', '色值', '面积', '占比%', '备注']
  const rows: string[][] = []
  const totalArea = calculateSchemeTotalArea(scheme, true)

  scheme.layerOrder.forEach(lid => {
    const layer = scheme.layers.find(l => l.id === lid)
    if (!layer) return
    if (layer.patterns.length === 0) {
      rows.push([
        layer.name,
        getLayerDisplayName(layer),
        `${layer.completion}%`,
        layer.materialBatch,
        '-', '-', '-', '-', '-',
        layer.notes
      ])
    } else {
      layer.patterns.forEach(p => {
        const pct = totalArea > 0 ? ((p.area / totalArea) * 100).toFixed(2) : '0.00'
        rows.push([
          layer.name,
          getLayerDisplayName(layer),
          `${layer.completion}%`,
          layer.materialBatch,
          p.name,
          p.color,
          p.color,
          String(p.area),
          pct,
          layer.notes
        ])
      })
    }
  })

  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  return [header.map(esc), ...rows.map(r => r.map(esc))].map(r => r.join(',')).join('\n')
}

export function exportVersionDiffAsMarkdown(
  diff: VersionDiff,
  schemeName: string
): string {
  const lines: string[] = []
  lines.push(`# 版本差异报告：${schemeName}`)
  lines.push('')
  lines.push(`对比范围：**${diff.oldVersionName}** → **${diff.newVersionName}**`)
  lines.push('')
  lines.push('## 变更摘要')
  lines.push('')
  lines.push(`| 维度 | 新增 | 删除 | 修改 |`)
  lines.push(`| --- | --- | --- | --- |`)
  lines.push(`| 工序 | ${diff.summary.layersAdded} | ${diff.summary.layersRemoved} | ${diff.summary.layersModified} |`)
  lines.push(`| 纹线 | ${diff.summary.patternsAdded} | ${diff.summary.patternsRemoved} | ${diff.summary.patternsModified} |`)
  lines.push('')
  lines.push(`- 总面积变化：${diff.summary.totalAreaDiff >= 0 ? '+' : ''}${diff.summary.totalAreaDiff}`)
  lines.push(`- 颜色调整项数：${diff.summary.colorsChanged}`)
  lines.push('')
  lines.push('## 详细变更')
  lines.push('')

  diff.layerDiffs.forEach(ld => {
    if (ld.status === 'unchanged') return
    const statusIcon = ld.status === 'added' ? '➕' : ld.status === 'removed' ? '➖' : '✏️'
    lines.push(`### ${statusIcon} ${ld.layerName}`)
    if (ld.status === 'modified') {
      if (ld.oldCompletion !== ld.newCompletion) {
        lines.push(`- 完成度：${ld.oldCompletion}% → ${ld.newCompletion}%`)
      }
      if (ld.oldMaterial !== ld.newMaterial) {
        lines.push(`- 材料批次：${ld.oldMaterial || '(空)'} → ${ld.newMaterial || '(空)'}`)
      }
    }
    const changedPatterns = ld.patternDiffs.filter(p => p.status !== 'unchanged')
    if (changedPatterns.length > 0) {
      lines.push('')
      lines.push('| 操作 | 纹线 | 颜色 | 面积 | 透明度 |')
      lines.push('| --- | --- | --- | --- | --- |')
      changedPatterns.forEach(pd => {
        const op = pd.status === 'added' ? '新增' : pd.status === 'removed' ? '删除' : '修改'
        const color = pd.status === 'modified'
          ? `${pd.oldColor} → ${pd.newColor}`
          : (pd.newColor || pd.oldColor || '-')
        const area = pd.status === 'modified'
          ? `${pd.oldArea} → ${pd.newArea}`
          : String(pd.newArea ?? pd.oldArea ?? '-')
        const opacity = pd.status === 'modified'
          ? `${pd.oldOpacity}% → ${pd.newOpacity}%`
          : `${pd.newOpacity ?? pd.oldOpacity ?? '-'}${(pd.newOpacity ?? pd.oldOpacity) ? '%' : ''}`
        lines.push(`| ${op} | ${pd.patternName} | ${color} | ${area} | ${opacity} |`)
      })
    }
    lines.push('')
  })

  return lines.join('\n')
}
