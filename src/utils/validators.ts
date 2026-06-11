import type {
  ProcessLayer,
  ProcessScheme,
  ProcessType,
  ValidationResult,
  PatternRegion
} from '@/types'
import { PROCESS_ORDER, PROCESS_TYPE_META } from '@/types'

export function validateOpacity(opacity: number): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] }
  if (opacity < 0 || opacity > 100 || !Number.isFinite(opacity)) {
    result.valid = false
    result.errors.push(`透明度必须在 0-100 范围内，当前值: ${opacity}`)
  }
  return result
}

export function validateLayerNameUniqueness(layers: ProcessLayer[], excludeId?: string): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] }
  const nameMap = new Map<string, string[]>()

  layers.forEach(layer => {
    if (excludeId && layer.id === excludeId) return
    const key = layer.name.trim().toLowerCase()
    if (!nameMap.has(key)) {
      nameMap.set(key, [])
    }
    nameMap.get(key)!.push(layer.id)
  })

  nameMap.forEach((ids, name) => {
    if (ids.length > 1) {
      result.valid = false
      result.errors.push(`工序名称"${name}"在方案内重复，请修改`)
    }
  })

  return result
}

export function validateProcessOrder(layers: ProcessLayer[]): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] }

  const faceCarvingLayer = layers.find(l => l.type === 'face_carving')
  const baseEmbryoLayer = layers.find(l => l.type === 'base_embryo')

  if (faceCarvingLayer) {
    if (!baseEmbryoLayer) {
      result.valid = false
      result.errors.push('存在开脸工序但缺少底胚工序，必须先完成底胚')
    } else if (baseEmbryoLayer.completion < 100) {
      if (faceCarvingLayer.completion > 0) {
        result.valid = false
        result.errors.push('底胚未完成（完成度需100%）前不能进入开脸工序')
      } else {
        result.warnings.push('底胚尚未完成，开脸工序暂不可开始')
      }
    }
  }

  return result
}

export function validatePattern(pattern: PatternRegion): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] }

  if (!pattern.name.trim()) {
    result.valid = false
    result.errors.push('纹线区域名称不能为空')
  }

  const opacityValidation = validateOpacity(pattern.opacity)
  if (!opacityValidation.valid) {
    result.valid = false
    result.errors.push(...opacityValidation.errors)
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(pattern.color)) {
    result.valid = false
    result.errors.push(`颜色格式不正确: ${pattern.color}`)
  }

  if (pattern.area < 0) {
    result.valid = false
    result.errors.push('面积不能为负数')
  }

  return result
}

export function validateLayer(layer: ProcessLayer, allLayers: ProcessLayer[]): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] }

  if (!layer.name.trim()) {
    result.valid = false
    result.errors.push('工序名称不能为空')
  }

  if (layer.completion < 0 || layer.completion > 100) {
    result.valid = false
    result.errors.push(`工序完成度必须在 0-100 范围内`)
  }

  const nameUniqueness = validateLayerNameUniqueness(allLayers, layer.id)
  if (!nameUniqueness.valid) {
    result.valid = false
    result.errors.push(...nameUniqueness.errors)
  }

  for (const pattern of layer.patterns) {
    const patternValidation = validatePattern(pattern)
    if (!patternValidation.valid) {
      result.valid = false
      result.errors.push(`纹线"${pattern.name}": ${patternValidation.errors.join('; ')}`)
    }
  }

  return result
}

export function validateScheme(scheme: ProcessScheme): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] }

  if (!scheme.name.trim()) {
    result.valid = false
    result.errors.push('方案名称不能为空')
  }

  const nameUniqueness = validateLayerNameUniqueness(scheme.layers)
  if (!nameUniqueness.valid) {
    result.valid = false
    result.errors.push(...nameUniqueness.errors)
  }

  const orderValidation = validateProcessOrder(scheme.layers)
  if (!orderValidation.valid) {
    result.valid = false
    result.errors.push(...orderValidation.errors)
  }
  result.warnings.push(...orderValidation.warnings)

  for (const layer of scheme.layers) {
    const layerValidation = validateLayer(layer, scheme.layers)
    if (!layerValidation.valid) {
      result.valid = false
      result.errors.push(...layerValidation.errors)
    }
    result.warnings.push(...layerValidation.warnings)
  }

  return result
}

export function validateSchemeImport(data: unknown): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] }

  if (!data || typeof data !== 'object') {
    result.valid = false
    result.errors.push('导入数据格式无效')
    return result
  }

  const obj = data as Record<string, unknown>

  if (!obj.id || typeof obj.id !== 'string') {
    result.valid = false
    result.errors.push('缺少有效的方案ID')
  }

  if (!obj.name || typeof obj.name !== 'string') {
    result.valid = false
    result.errors.push('缺少有效的方案名称')
  }

  if (!Array.isArray(obj.layers)) {
    result.valid = false
    result.errors.push('缺少工序层数据')
  } else {
    (obj.layers as unknown[]).forEach((layer, idx) => {
      if (!layer || typeof layer !== 'object') {
        result.valid = false
        result.errors.push(`第${idx + 1}个工序层数据无效`)
        return
      }
      const l = layer as Record<string, unknown>
      if (!l.id || !l.name || !l.type) {
        result.valid = false
        result.errors.push(`第${idx + 1}个工序层缺少必要字段`)
      }
    })
  }

  return result
}

export function canStartFaceCarving(layers: ProcessLayer[]): boolean {
  const baseEmbryo = layers.find(l => l.type === 'base_embryo')
  return baseEmbryo ? baseEmbryo.completion >= 100 : false
}

export function getLayerDisplayName(layer: ProcessLayer): string {
  if (layer.type === 'custom' && layer.customTypeName) {
    return layer.customTypeName
  }
  return PROCESS_TYPE_META[layer.type]?.label || layer.name
}

export function getLayersByType(layers: ProcessLayer[], type: ProcessType): ProcessLayer[] {
  return layers.filter(l => l.type === type)
}
