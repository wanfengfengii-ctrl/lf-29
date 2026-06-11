<script setup lang="ts">
import { useMaskStore } from '@/stores/mask'
import { ref, computed, watch, onMounted } from 'vue'
import type { SchemeIssue, IssueSeverity } from '@/types'

const store = useMaskStore()

const report = ref(store.validateSchemeFull())
const filterSeverity = ref<IssueSeverity | 'all'>('all')
const autoRefresh = ref(true)
const lastChecked = ref<Date | null>(null)

function refresh() {
  report.value = store.validateSchemeFull()
  lastChecked.value = new Date()
}

watch(
  () => store.activeScheme?.updatedAt,
  () => {
    if (autoRefresh.value) {
      refresh()
    }
  }
)

onMounted(() => {
  refresh()
})

const filteredIssues = computed(() => {
  if (filterSeverity.value === 'all') return report.value.issues
  return report.value.issues.filter(i => i.severity === filterSeverity.value)
})

const severityLabels: Record<IssueSeverity, { label: string; icon: string; color: string }> = {
  error: { label: '错误', icon: '🛑', color: '#c0392b' },
  warning: { label: '警告', icon: '⚠️', color: '#e67e22' },
  info: { label: '提示', icon: '💡', color: '#2980b9' }
}

function issuesBySeverity(sev: IssueSeverity) {
  return report.value.issues.filter(i => i.severity === sev)
}

function getIssueTypeLabel(type: string): string {
  const map: Record<string, string> = {
    missing_process: '工序缺失',
    area_abnormal: '面积异常',
    too_many_colors: '颜色过多',
    material_conflict: '材料批次冲突',
    completion_gap: '完成度断层',
    orphan_pattern: '孤立纹线',
    low_opacity: '透明度过低',
    batch_missing: '批次缺失'
  }
  return map[type] || type
}
</script>

<template>
  <div class="editor-panel">
    <div class="editor-tabs">
      <div class="editor-tab active">🛡️ 异常校验面板</div>
    </div>

    <div class="editor-content">
      <div class="flex-between mb-16">
        <div>
          <h3 style="font-size: 16px; color: #3d2914;">
            {{ store.activeScheme?.name || '未选择方案' }}
          </h3>
          <p class="text-small text-muted mt-8">
            共检测到 {{ report.issues.length }} 项问题 ·
            <span v-if="lastChecked">最后检查: {{ lastChecked.toLocaleTimeString('zh-CN') }}</span>
          </p>
        </div>
        <div class="flex gap-8">
          <label
            class="flex gap-8"
            style="align-items: center; cursor: pointer; padding: 6px 10px; background: #fff; border: 1px solid #d4c8b8; border-radius: 4px;"
          >
            <input type="checkbox" v-model="autoRefresh" />
            <span class="text-small">自动刷新</span>
          </label>
          <button class="btn btn-primary" @click="refresh">
            🔄 重新检查
          </button>
        </div>
      </div>

      <div class="validation-dashboard">
        <div class="val-stat-card val-stat-error">
          <div class="val-stat-icon">🛑</div>
          <div>
            <div class="val-stat-value">{{ report.errorCount }}</div>
            <div class="val-stat-label">严重错误</div>
          </div>
        </div>
        <div class="val-stat-card val-stat-warning">
          <div class="val-stat-icon">⚠️</div>
          <div>
            <div class="val-stat-value">{{ report.warningCount }}</div>
            <div class="val-stat-label">警告</div>
          </div>
        </div>
        <div class="val-stat-card val-stat-info">
          <div class="val-stat-icon">💡</div>
          <div>
            <div class="val-stat-value">{{ report.infoCount }}</div>
            <div class="val-stat-label">优化提示</div>
          </div>
        </div>
        <div class="val-stat-card val-stat-score">
          <div class="val-stat-icon">🎯</div>
          <div>
            <div class="val-stat-value">
              {{ report.issues.length === 0 ? '通过' : Math.max(0, 100 - report.errorCount * 15 - report.warningCount * 5) }}
            </div>
            <div class="val-stat-label">合规评分</div>
          </div>
        </div>
      </div>

      <div class="filter-bar">
        <button
          :class="['filter-chip', filterSeverity === 'all' ? 'active' : '']"
          @click="filterSeverity = 'all'"
        >
          全部 ({{ report.issues.length }})
        </button>
        <button
          :class="['filter-chip chip-error', filterSeverity === 'error' ? 'active' : '']"
          @click="filterSeverity = 'error'"
        >
          🛑 错误 ({{ report.errorCount }})
        </button>
        <button
          :class="['filter-chip chip-warning', filterSeverity === 'warning' ? 'active' : '']"
          @click="filterSeverity = 'warning'"
        >
          ⚠️ 警告 ({{ report.warningCount }})
        </button>
        <button
          :class="['filter-chip chip-info', filterSeverity === 'info' ? 'active' : '']"
          @click="filterSeverity = 'info'"
        >
          💡 提示 ({{ report.infoCount }})
        </button>
      </div>

      <div v-if="!store.activeScheme" class="empty-state">
        <div class="empty-state-icon">🛡️</div>
        <div class="empty-state-text">请先选择一个工序方案</div>
      </div>

      <div v-else-if="filteredIssues.length === 0" class="empty-state">
        <div class="empty-state-icon">✅</div>
        <div class="empty-state-text">
          {{ filterSeverity === 'all' ? '所有检查通过！方案质量良好。' : '当前筛选下无问题' }}
        </div>
      </div>

      <div v-else class="issue-list">
        <div
          v-for="issue in filteredIssues"
          :key="issue.id"
          :class="['issue-card', `issue-${issue.severity}`]"
        >
          <div class="issue-header">
            <div class="issue-title-row">
              <span class="issue-severity-icon">
                {{ severityLabels[issue.severity].icon }}
              </span>
              <h4 class="issue-title">{{ issue.title }}</h4>
              <span :class="['issue-type-tag', `tag-${issue.severity}`]">
                {{ getIssueTypeLabel(issue.type) }}
              </span>
            </div>
          </div>

          <div class="issue-body">
            <p class="issue-description">{{ issue.description }}</p>

            <div v-if="issue.suggestion" class="issue-suggestion">
              <span class="suggestion-icon">💡</span>
              <span>{{ issue.suggestion }}</span>
            </div>

            <div v-if="issue.layerId || issue.patternId" class="issue-location">
              <span v-if="issue.layerId" class="loc-tag">
                📍 工序: {{ store.activeScheme?.layers.find(l => l.id === issue.layerId)?.name || issue.layerId }}
              </span>
              <span v-if="issue.patternId" class="loc-tag">
                🎨 纹线: {{
                  (() => {
                    for (const l of (store.activeScheme?.layers || [])) {
                      const p = l.patterns.find(pp => pp.id === issue.patternId)
                      if (p) return p.name
                    }
                    return issue.patternId
                  })()
                }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style="margin-top: 24px;">
        <h4 style="font-size: 14px; color: #3d2914; margin-bottom: 12px;">
          📊 检查项说明
        </h4>
        <div class="checklist-reference">
          <div class="checklist-item">
            <span class="checklist-icon">🛑</span>
            <div>
              <strong>必要工序完整性</strong>
              <p>检测底胚、打磨、开脸等关键工序是否缺失，以及工序逻辑顺序</p>
            </div>
          </div>
          <div class="checklist-item">
            <span class="checklist-icon">🛑</span>
            <div>
              <strong>纹线面积有效性</strong>
              <p>确保纹线面积大于0，检查异常大或异常小的面积值</p>
            </div>
          </div>
          <div class="checklist-item">
            <span class="checklist-icon">⚠️</span>
            <div>
              <strong>工序完成度衔接</strong>
              <p>检测前置工序未完成但后置工序已开始的情况</p>
            </div>
          </div>
          <div class="checklist-item">
            <span class="checklist-icon">⚠️</span>
            <div>
              <strong>材料批次管理</strong>
              <p>检测批次缺失、批次冲突（多工序共享同一批次号）</p>
            </div>
          </div>
          <div class="checklist-item">
            <span class="checklist-icon">⚠️</span>
            <div>
              <strong>开脸配色合理性</strong>
              <p>检测颜色种类（>12种）、开脸区域面积、主色占比分布</p>
            </div>
          </div>
          <div class="checklist-item">
            <span class="checklist-icon">💡</span>
            <div>
              <strong>纹线数据完整性</strong>
              <p>检测纹线路径缺失、透明度异常偏低等可优化项</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
