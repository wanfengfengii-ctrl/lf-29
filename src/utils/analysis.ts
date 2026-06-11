import type {
  ProcessScheme,
  AreaAnalysisResult,
  SchemeComparison,
  ProcessLayer,
  PatternRegion
} from '@/types'
import { getLayerDisplayName } from './validators'

const COLOR_NAMES: Record<string, string> = {
  '#FF0000': '红色',
  '#000000': '黑色',
  '#FFFFFF': '白色',
  '#00FF00': '绿色',
  '#0000FF': '蓝色',
  '#FFFF00': '黄色',
  '#FFA500': '橙色',
  '#800080': '紫色',
  '#FFC0CB': '粉色',
  '#DAA520': '金色',
  '#C0C0C0': '银色',
  '#8B4513': '棕色',
  '#A0522D': '赭色',
  '#D2B48C': '浅棕',
  '#CD853F': '秘鲁色',
  '#696969': '灰色'
}

export function getColorName(hex: string): string {
  const upper = hex.toUpperCase()
  if (COLOR_NAMES[upper]) return COLOR_NAMES[upper]
  return hex
}

export function calculatePatternArea(layer: ProcessLayer, includeHidden: boolean = false): number {
  return layer.patterns
    .filter(p => includeHidden || p.visible)
    .reduce((sum, p) => sum + p.area, 0)
}

export function calculateSchemeTotalArea(scheme: ProcessScheme, includeHidden: boolean = false): number {
  return scheme.layers.reduce((sum, layer) => {
    return sum + calculatePatternArea(layer, includeHidden)
  }, 0)
}

export function analyzeColorDistribution(
  scheme: ProcessScheme,
  includeHidden: boolean = false
): AreaAnalysisResult[] {
  const totalArea = calculateSchemeTotalArea(scheme, includeHidden)
  const results: AreaAnalysisResult[] = []

  for (const layer of scheme.layers) {
    for (const pattern of layer.patterns) {
      if (!includeHidden && !pattern.visible) continue
      const percentage = totalArea > 0 ? (pattern.area / totalArea) * 100 : 0
      results.push({
        color: pattern.color,
        colorName: getColorName(pattern.color),
        area: pattern.area,
        percentage: Number(percentage.toFixed(2)),
        layerId: layer.id,
        layerName: getLayerDisplayName(layer),
        patternId: pattern.id,
        patternName: pattern.name
      })
    }
  }

  return results.sort((a, b) => b.area - a.area)
}

export function aggregateColorStats(distribution: AreaAnalysisResult[]): {
  color: string
  colorName: string
  totalArea: number
  percentage: number
}[] {
  const colorMap = new Map<string, { color: string; colorName: string; totalArea: number }>()
  let grandTotal = 0

  for (const item of distribution) {
    grandTotal += item.area
    if (!colorMap.has(item.color)) {
      colorMap.set(item.color, {
        color: item.color,
        colorName: item.colorName,
        totalArea: 0
      })
    }
    colorMap.get(item.color)!.totalArea += item.area
  }

  return Array.from(colorMap.values())
    .map(c => ({
      ...c,
      percentage: grandTotal > 0 ? Number(((c.totalArea / grandTotal) * 100).toFixed(2)) : 0
    }))
    .sort((a, b) => b.totalArea - a.totalArea)
}

export function compareSchemes(
  schemes: ProcessScheme[],
  includeHidden: boolean = false
): SchemeComparison[] {
  return schemes.map(scheme => {
    const totalArea = calculateSchemeTotalArea(scheme, true)
    const visibleArea = calculateSchemeTotalArea(scheme, false)
    const colorDistribution = analyzeColorDistribution(scheme, includeHidden)

    const layerStats = scheme.layers.map(layer => ({
      layerId: layer.id,
      layerName: getLayerDisplayName(layer),
      completion: layer.completion,
      patternCount: layer.patterns.filter(p => includeHidden || p.visible).length,
      totalPatternArea: calculatePatternArea(layer, includeHidden)
    }))

    return {
      schemeId: scheme.id,
      schemeName: scheme.name,
      totalArea,
      visibleArea,
      colorDistribution,
      layerStats
    }
  })
}

export function calculateAreaDifference(
  baseline: SchemeComparison,
  target: SchemeComparison
): { patternName: string; areaDiff: number; percentageDiff: number }[] {
  const baselineMap = new Map<string, AreaAnalysisResult>()
  baseline.colorDistribution.forEach(item => {
    baselineMap.set(`${item.layerId}-${item.patternId}`, item)
  })

  const results: { patternName: string; areaDiff: number; percentageDiff: number }[] = []

  target.colorDistribution.forEach(item => {
    const key = `${item.layerId}-${item.patternId}`
    const base = baselineMap.get(key)
    if (base) {
      results.push({
        patternName: item.patternName,
        areaDiff: Number((item.area - base.area).toFixed(2)),
        percentageDiff: Number((item.percentage - base.percentage).toFixed(2))
      })
    }
  })

  return results
}
