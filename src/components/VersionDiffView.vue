<script setup lang="ts">
import { useMaskStore } from '@/stores/mask'
import { ref, computed, watch } from 'vue'
import type { VersionDiff, PatternDiff } from '@/types'
import { aggregateColorStats } from '@/utils/analysis'

const props = defineProps<{
  defaultVersionA?: string
  defaultVersionB?: string
  compareWithCurrent?: boolean
  sourceVersionId?: string
}>()

const store = useMaskStore()

const versionA = ref(props.defaultVersionA || '')
const versionB = ref(props.defaultVersionB || '')
const diffResult = ref<VersionDiff | null>(null)
const showExportModal = ref(false)
const localCompareWithCurrent = ref(!!props.compareWithCurrent)

const versions = computed(() => {
  if (!store.activeScheme) return []
  return store.getVersionsByScheme(store.activeScheme.id)
})

watch(
  () => [props.sourceVersionId, props.defaultVersionA, props.defaultVersionB, props.compareWithCurrent],
  () => {
    if (props.sourceVersionId && props.compareWithCurrent) {
      versionA.value = props.sourceVersionId
      versionB.value = ''
      localCompareWithCurrent.value = true
      doCompare()
    } else if (props.defaultVersionA && props.defaultVersionB) {
      versionA.value = props.defaultVersionA
      versionB.value = props.defaultVersionB
      localCompareWithCurrent.value = false
      doCompare()
    }
  },
  { immediate: true }
)

function doCompare() {
  if (!versionA.value) {
    diffResult.value = null
    return
  }

  if (localCompareWithCurrent.value || !versionB.value) {
    diffResult.value = store.compareVersionWithCurrent(versionA.value)
  } else {
    const oldId = [versionA.value, versionB.value].sort((a, b) => {
      const va = versions.value.find(v => v.id === a)
      const vb = versions.value.find(v => v.id === b)
      return (va?.versionNumber || 0) - (vb?.versionNumber || 0)
    })
    diffResult.value = store.getVersionDiff(oldId[0], oldId[1])
  }
}

function getPatternDisplayClass(p: PatternDiff): string {
  if (p.status === 'added') return 'diff-added'
  if (p.status === 'removed') return 'diff-removed'
  if (p.status === 'modified') return 'diff-modified'
  return 'diff-unchanged'
}

function formatArea(n?: number): string {
  if (n === undefined) return '-'
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

function getOldAggregatedColors() {
  const vId = diffResult.value?.oldVersionName
  const v = versions.value.find(x => x.name === vId)
  if (!v) return []
  const dist: any[] = []
  const total = v.snapshot.layers.reduce((s, l) => s + l.patterns.reduce((ss, p) => ss + p.area, 0), 0)
  const map = new Map<string, { color: string; colorName: string; area: number }>()
  v.snapshot.layers.forEach(l => l.patterns.forEach(p => {
    const key = p.color
    if (!map.has(key)) map.set(key, { color: p.color, colorName: p.color, area: 0 })
    map.get(key)!.area += p.area
  }))
  return Array.from(map.values()).map(c => ({
    ...c,
    percentage: total > 0 ? Number(((c.area / total) * 100).toFixed(2)) : 0
  })).sort((a, b) => b.area - a.area)
}

function getNewAggregatedColors() {
  if (!store.activeScheme) return []
  const dist: any[] = []
  const total = store.activeScheme.layers.reduce((s, l) => s + l.patterns.reduce((ss, p) => ss + p.area, 0), 0)
  const map = new Map<string, { color: string; colorName: string; area: number }>()
  store.activeScheme.layers.forEach(l => l.patterns.forEach(p => {
    const key = p.color
    if (!map.has(key)) map.set(key, { color: p.color, colorName: p.color, area: 0 })
    map.get(key)!.area += p.area
  }))
  return Array.from(map.values()).map(c => ({
    ...c,
    percentage: total > 0 ? Number(((c.area / total) * 100).toFixed(2)) : 0
  })).sort((a, b) => b.area - a.area)
}

function getLayerCompletionBar(layerDiff: any) {
  const oldC = layerDiff.oldCompletion ?? 0
  const newC = layerDiff.newCompletion ?? 0
  return { oldC, newC }
}

function exportMarkdown() {
  if (!diffResult.value || !store.activeScheme) return
  const ids = [versionA.value, versionB.value].filter(Boolean)
  if (ids.length === 2) {
    const sorted = ids.sort((a, b) => {
      const va = versions.value.find(v => v.id === a)
      const vb = versions.value.find(v => v.id === b)
      return (va?.versionNumber || 0) - (vb?.versionNumber || 0)
    })
    const md = store.exportDiffReport(sorted[0], sorted[1], store.activeScheme.name)
    if (md) {
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `diff-report-${Date.now()}.md`
      a.click()
      URL.revokeObjectURL(url)
    }
  }
  showExportModal.value = false
}
</script>

<template>
  <div class="editor-panel">
    <div class="editor-tabs">
      <div class="editor-tab active">🔍 版本差异对比</div>
    </div>

    <div class="editor-content">
      <div class="diff-selector">
        <div class="diff-selector-group">
          <label>基准版本（A）</label>
          <select v-model="versionA" @change="doCompare">
            <option value="">-- 选择 --</option>
            <option v-for="v in versions" :key="v.id" :value="v.id">
              V{{ v.versionNumber }} · {{ v.name }}
            </option>
          </select>
        </div>

        <div class="diff-arrows">
          <span style="font-size: 20px;">⇄</span>
        </div>

        <div class="diff-selector-group">
          <label>对比版本（B）</label>
          <select
            v-model="versionB"
            @change="doCompare"
            :disabled="localCompareWithCurrent"
          >
            <option value="">当前编辑版</option>
            <option v-for="v in versions" :key="v.id" :value="v.id">
              V{{ v.versionNumber }} · {{ v.name }}
            </option>
          </select>
        </div>

        <div class="flex gap-8" style="align-self: flex-end;">
          <label
            class="flex gap-8"
            style="align-items: center; cursor: pointer; padding: 6px 10px; background: #fff; border: 1px solid #d4c8b8; border-radius: 4px;"
          >
            <input type="checkbox" v-model="localCompareWithCurrent" @change="doCompare" />
            <span class="text-small">对比当前</span>
          </label>
          <button class="btn btn-primary" @click="doCompare" :disabled="!versionA">
            开始对比
          </button>
          <button
            class="btn btn-secondary"
            @click="showExportModal = true"
            :disabled="!diffResult"
          >
            📄 导出报告
          </button>
        </div>
      </div>

      <div v-if="!diffResult" class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">选择两个版本开始对比</div>
      </div>

      <template v-else>
        <div class="diff-summary-card">
          <div class="diff-summary-header">
            <h3>{{ diffResult.oldVersionName }} ➝ {{ diffResult.newVersionName }}</h3>
          </div>
          <div class="diff-summary-stats">
            <div class="diff-stat-item diff-stat-added">
              <div class="diff-stat-value">+{{ diffResult.summary.layersAdded }}</div>
              <div class="diff-stat-label">工序新增</div>
            </div>
            <div class="diff-stat-item diff-stat-removed">
              <div class="diff-stat-value">-{{ diffResult.summary.layersRemoved }}</div>
              <div class="diff-stat-label">工序删除</div>
            </div>
            <div class="diff-stat-item diff-stat-modified">
              <div class="diff-stat-value">~{{ diffResult.summary.layersModified }}</div>
              <div class="diff-stat-label">工序修改</div>
            </div>
            <div class="diff-stat-item diff-stat-pattern">
              <div class="diff-stat-value">
                +{{ diffResult.summary.patternsAdded }} / -{{ diffResult.summary.patternsRemoved }}
              </div>
              <div class="diff-stat-label">纹线增删</div>
            </div>
            <div class="diff-stat-item">
              <div :class="['diff-stat-value', diffResult.summary.totalAreaDiff >= 0 ? 'diff-positive' : 'diff-negative']">
                {{ diffResult.summary.totalAreaDiff >= 0 ? '+' : '' }}{{ formatArea(diffResult.summary.totalAreaDiff) }}
              </div>
              <div class="diff-stat-label">面积差</div>
            </div>
            <div class="diff-stat-item">
              <div class="diff-stat-value">{{ diffResult.summary.colorsChanged }}</div>
              <div class="diff-stat-label">颜色调整</div>
            </div>
          </div>
        </div>

        <div class="color-compare-section">
          <h4 style="font-size: 14px; color: #3d2914; margin-bottom: 12px;">
            🎨 颜色占比对比
          </h4>
          <div class="color-compare-grid">
            <div class="color-compare-side">
              <div class="color-compare-title">
                <span class="version-label version-label-old">A</span>
                {{ diffResult.oldVersionName }}
              </div>
              <div class="color-bar-large">
                <div
                  v-for="(c, idx) in getOldAggregatedColors()"
                  :key="idx"
                  class="color-bar-segment"
                  :style="{ width: c.percentage + '%', backgroundColor: c.color }"
                  :title="`${c.colorName}: ${c.percentage}%`"
                ></div>
              </div>
              <div class="color-legend">
                <div
                  v-for="(c, idx) in getOldAggregatedColors().slice(0, 5)"
                  :key="idx"
                  class="color-legend-item"
                >
                  <span class="color-legend-swatch" :style="{ backgroundColor: c.color }"></span>
                  <span style="flex: 1;">{{ c.colorName }}</span>
                  <span style="color: #8b7355;">{{ c.percentage }}%</span>
                </div>
              </div>
            </div>
            <div class="color-compare-arrow">→</div>
            <div class="color-compare-side">
              <div class="color-compare-title">
                <span class="version-label version-label-new">B</span>
                {{ diffResult.newVersionName }}
              </div>
              <div class="color-bar-large">
                <div
                  v-for="(c, idx) in getNewAggregatedColors()"
                  :key="idx"
                  class="color-bar-segment"
                  :style="{ width: c.percentage + '%', backgroundColor: c.color }"
                  :title="`${c.colorName}: ${c.percentage}%`"
                ></div>
              </div>
              <div class="color-legend">
                <div
                  v-for="(c, idx) in getNewAggregatedColors().slice(0, 5)"
                  :key="idx"
                  class="color-legend-item"
                >
                  <span class="color-legend-swatch" :style="{ backgroundColor: c.color }"></span>
                  <span style="flex: 1;">{{ c.colorName }}</span>
                  <span style="color: #8b7355;">{{ c.percentage }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <h4 style="font-size: 14px; color: #3d2914; margin: 20px 0 12px;">
          📋 工序与纹线详细对比
        </h4>

        <div class="diff-layer-list">
          <div
            v-for="(ld, li) in diffResult.layerDiffs"
            :key="ld.layerId"
            :class="['diff-layer-card', `diff-layer-${ld.status}`]"
          >
            <div class="diff-layer-header">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span :class="['diff-layer-status', `status-${ld.status}`]">
                  {{ ld.status === 'added' ? '新增' : ld.status === 'removed' ? '删除' : ld.status === 'modified' ? '修改' : '未变' }}
                </span>
                <h5>{{ ld.layerName }}</h5>
              </div>
              <div v-if="ld.status !== 'removed' && ld.status !== 'added'" class="completion-compare">
                <div class="completion-pair">
                  <span class="completion-label">A: {{ ld.oldCompletion }}%</span>
                  <span class="completion-arrow">→</span>
                  <span :class="['completion-label', ld.newCompletion !== ld.oldCompletion ? 'changed' : '']">
                    B: {{ ld.newCompletion }}%
                  </span>
                </div>
                <div class="dual-progress">
                  <div class="dual-progress-bar">
                    <div
                      class="dual-progress-fill old"
                      :style="{ width: (ld.oldCompletion ?? 0) + '%' }"
                    ></div>
                  </div>
                  <div class="dual-progress-bar">
                    <div
                      class="dual-progress-fill new"
                      :style="{ width: (ld.newCompletion ?? 0) + '%' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="(ld.oldMaterial || ld.newMaterial) && ld.oldMaterial !== ld.newMaterial"
              class="diff-material-row"
            >
              <span class="material-label">材料批次：</span>
              <span class="material-old">{{ ld.oldMaterial || '(空)' }}</span>
              <span>→</span>
              <span class="material-new">{{ ld.newMaterial || '(空)' }}</span>
            </div>

            <div class="diff-pattern-list">
              <div
                v-for="(pd, pi) in ld.patternDiffs.filter(p => p.status !== 'unchanged')"
                :key="pd.patternId"
                :class="['diff-pattern-row', getPatternDisplayClass(pd)]"
              >
                <div class="diff-pattern-main">
                  <span class="diff-pattern-icon">
                    {{ pd.status === 'added' ? '➕' : pd.status === 'removed' ? '➖' : '✏️' }}
                  </span>
                  <span class="diff-pattern-name">{{ pd.patternName }}</span>
                </div>
                <div class="diff-pattern-changes">
                  <template v-if="pd.oldColor !== pd.newColor && pd.status === 'modified'">
                    <span class="color-compare-pair">
                      <span class="color-dot" :style="{ background: pd.oldColor }"></span>
                      →
                      <span class="color-dot" :style="{ background: pd.newColor }"></span>
                    </span>
                  </template>
                  <template v-else>
                    <span class="color-dot" :style="{ background: pd.newColor || pd.oldColor }"></span>
                  </template>
                  <template v-if="pd.status === 'modified' && pd.oldArea !== pd.newArea">
                    <span class="area-change">
                      {{ formatArea(pd.oldArea) }} → <strong>{{ formatArea(pd.newArea) }}</strong>
                      <span :class="['area-diff', ((pd.newArea ?? 0) - (pd.oldArea ?? 0)) >= 0 ? 'pos' : 'neg']">
                        ({{ ((pd.newArea ?? 0) - (pd.oldArea ?? 0)) >= 0 ? '+' : '' }}{{ formatArea((pd.newArea ?? 0) - (pd.oldArea ?? 0)) }})
                      </span>
                    </span>
                  </template>
                  <template v-else>
                    <span class="area-value">{{ formatArea(pd.newArea ?? pd.oldArea) }}</span>
                  </template>
                  <template v-if="pd.status === 'modified' && pd.oldOpacity !== pd.newOpacity">
                    <span class="opacity-change">
                      透明度 {{ pd.oldOpacity }}% → {{ pd.newOpacity }}%
                    </span>
                  </template>
                </div>
              </div>
              <div
                v-if="ld.patternDiffs.filter(p => p.status !== 'unchanged').length === 0"
                class="text-small text-muted"
                style="padding: 8px 12px;"
              >
                纹线无变更
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

  <div v-if="showExportModal" class="modal-overlay" @click.self="showExportModal = false">
    <div class="modal">
      <div class="modal-header">
        <h3>导出差异报告</h3>
        <button class="icon-btn" @click="showExportModal = false">✕</button>
      </div>
      <div class="modal-body">
        <p class="text-small text-muted">
          将生成 Markdown 格式的差异报告，包含变更摘要和详细对比表。
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showExportModal = false">取消</button>
        <button class="btn btn-primary" @click="exportMarkdown">下载 .md 文件</button>
      </div>
    </div>
  </div>
</template>
