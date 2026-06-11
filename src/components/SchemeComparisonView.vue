<script setup lang="ts">
import { useMaskStore } from '@/stores/mask'
import { computed, ref } from 'vue'
import { compareSchemes, aggregateColorStats, getColorName } from '@/utils/analysis'
import type { SchemeComparison } from '@/types'

const store = useMaskStore()

const includeHidden = ref(false)

const comparisons = computed<SchemeComparison[]>(() => {
  if (!store.activeMask) return []
  return compareSchemes(store.activeMask.schemes, includeHidden.value)
})

function formatArea(area: number): string {
  return area.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}
</script>

<template>
  <div class="editor-panel">
    <div class="editor-tabs">
      <div class="editor-tab active">📊 方案比较 · 面积分析</div>
    </div>

    <div class="editor-content">
      <div class="flex-between mb-16">
        <div>
          <h3 style="font-size: 16px; color: #3d2914;">
            开脸配色方案并排比较
          </h3>
          <p class="text-small text-muted mt-8">
            对比不同方案的颜色分布、纹线面积占比和工序完成度
          </p>
        </div>
        <label class="flex gap-8" style="align-items: center; cursor: pointer;">
          <input type="checkbox" v-model="includeHidden" />
          <span class="text-small">包含隐藏纹线层</span>
        </label>
      </div>

      <div v-if="comparisons.length === 0" class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-text">暂无方案可比较，请先创建至少一个方案</div>
      </div>

      <div v-else class="comparison-view">
        <div v-for="comp in comparisons" :key="comp.schemeId" class="comparison-card">
          <div class="comparison-header">
            <h4>{{ comp.schemeName }}</h4>
            <span style="font-size: 11px; opacity: 0.8;">
              {{ store.activeMask?.activeSchemeId === comp.schemeId ? '★ 当前方案' : '' }}
            </span>
          </div>

          <div class="comparison-stats">
            <div class="stat-item">
              <div class="stat-value">{{ formatArea(comp.visibleArea) }}</div>
              <div class="stat-label">可见面积</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ formatArea(comp.totalArea) }}</div>
              <div class="stat-label">总面积</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">
                {{ comp.colorDistribution.length }}
              </div>
              <div class="stat-label">纹线数</div>
            </div>
          </div>

          <div class="color-bar">
            <div
              v-for="(color, idx) in aggregateColorStats(comp.colorDistribution)"
              :key="idx"
              class="color-bar-segment"
              :style="{ width: color.percentage + '%', backgroundColor: color.color }"
              :title="`${color.colorName}: ${color.percentage}%`"
            ></div>
          </div>

          <div class="color-legend">
            <div
              v-for="(color, idx) in aggregateColorStats(comp.colorDistribution).slice(0, 6)"
              :key="idx"
              class="color-legend-item"
            >
              <span class="color-legend-swatch" :style="{ backgroundColor: color.color }"></span>
              <span style="flex: 1;">{{ color.colorName }}</span>
              <span style="color: #8b7355;">{{ color.percentage }}%</span>
            </div>
            <div
              v-if="aggregateColorStats(comp.colorDistribution).length === 0"
              class="text-small text-muted"
              style="text-align: center; padding: 8px 0;"
            >
              暂无颜色数据
            </div>
          </div>

          <div class="layer-stats-grid" style="border-top: 1px solid #e8dcc8;">
            <div style="font-size: 12px; color: #8b7355; font-weight: 500; padding: 8px 0 4px;">
              工序进度
            </div>
            <div v-for="stat in comp.layerStats" :key="stat.layerId" class="layer-stat-row">
              <span class="layer-stat-name">{{ stat.layerName }}</span>
              <div class="layer-stat-progress">
                <div class="layer-stat-fill" :style="{ width: stat.completion + '%' }"></div>
              </div>
              <span class="layer-stat-count">{{ stat.completion }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="comparisons.length >= 2" style="margin-top: 24px;">
        <h3 style="font-size: 16px; color: #3d2914; margin-bottom: 12px;">
          🔍 各方案纹线面积明细
        </h3>
        <div style="background: #fff; border-radius: 8px; border: 1px solid #e8dcc8; overflow: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #fffaf0;">
                <th style="padding: 10px 14px; text-align: left; border-bottom: 1px solid #e8dcc8;">方案</th>
                <th style="padding: 10px 14px; text-align: left; border-bottom: 1px solid #e8dcc8;">工序</th>
                <th style="padding: 10px 14px; text-align: left; border-bottom: 1px solid #e8dcc8;">纹线</th>
                <th style="padding: 10px 14px; text-align: left; border-bottom: 1px solid #e8dcc8;">颜色</th>
                <th style="padding: 10px 14px; text-align: right; border-bottom: 1px solid #e8dcc8;">面积</th>
                <th style="padding: 10px 14px; text-align: right; border-bottom: 1px solid #e8dcc8;">占比</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="comp in comparisons" :key="comp.schemeId">
                <tr v-for="(item, idx) in comp.colorDistribution" :key="comp.schemeId + '-' + idx" style="border-bottom: 1px solid #f0e6d6;">
                  <td style="padding: 8px 14px; color: #8b4513; font-weight: 500;">
                    {{ comp.schemeName }}
                  </td>
                  <td style="padding: 8px 14px; color: #3d2914;">{{ item.layerName }}</td>
                  <td style="padding: 8px 14px; color: #3d2914;">{{ item.patternName }}</td>
                  <td style="padding: 8px 14px;">
                    <div class="flex gap-8" style="align-items: center;">
                      <span style="width: 14px; height: 14px; border-radius: 3px; border: 1px solid #d4c8b8; background: {{ item.color }};"></span>
                      <span>{{ item.colorName }}</span>
                    </div>
                  </td>
                  <td style="padding: 8px 14px; text-align: right; font-family: monospace;">
                    {{ formatArea(item.area) }}
                  </td>
                  <td style="padding: 8px 14px; text-align: right; font-family: monospace; color: #8b4513;">
                    {{ item.percentage }}%
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
