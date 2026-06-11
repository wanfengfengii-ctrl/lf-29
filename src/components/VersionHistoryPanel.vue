<script setup lang="ts">
import { useMaskStore } from '@/stores/mask'
import { ref, computed } from 'vue'
import type { SchemeVersion } from '@/types'

const emit = defineEmits<{
  (e: 'open-diff', v1Id: string, v2Id?: string): void
  (e: 'copy-patterns', versionId: string): void
}>()

const store = useMaskStore()

const showSaveModal = ref(false)
const showExportModal = ref(false)
const showRollbackConfirm = ref(false)
const versionName = ref('')
const versionDesc = ref('')
const versionTags = ref('')
const targetRollbackId = ref('')
const exportVersionId = ref('')
const exportFormat = ref<'json' | 'csv'>('json')

const versions = computed(() => store.activeSchemeVersions)

const nextVersionNumber = computed(() => versions.value.length + 1)

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function countChanges(v: SchemeVersion): { added: number; removed: number; modified: number } {
  let added = 0, removed = 0, modified = 0
  v.changes.forEach(c => {
    if (c.type.includes('_added')) added++
    else if (c.type.includes('_removed')) removed++
    else modified++
  })
  return { added, removed, modified }
}

function openSaveModal() {
  versionName.value = `V${nextVersionNumber.value}`
  versionDesc.value = ''
  versionTags.value = ''
  showSaveModal.value = true
}

function handleSave() {
  if (!store.activeScheme) return
  const tags = versionTags.value
    .split(/[,，]/)
    .map(t => t.trim())
    .filter(Boolean)
  const result = store.saveVersion(
    store.activeScheme.id,
    versionName.value.trim(),
    versionDesc.value.trim(),
    tags
  )
  if (result) {
    showSaveModal.value = false
  }
}

function handleRollbackConfirm(vid: string) {
  targetRollbackId.value = vid
  showRollbackConfirm.value = true
}

function handleRollback() {
  if (targetRollbackId.value) {
    const ok = store.rollbackToVersion(targetRollbackId.value)
    if (ok) {
      showRollbackConfirm.value = false
      targetRollbackId.value = ''
    }
  }
}

function openExportModal(vid: string) {
  exportVersionId.value = vid
  exportFormat.value = 'json'
  showExportModal.value = true
}

function handleExport() {
  if (!exportVersionId.value) return
  const version = versions.value.find(v => v.id === exportVersionId.value)
  if (!version) return

  let content: string | null = null
  let ext = 'json'
  let mime = 'application/json'

  if (exportFormat.value === 'json') {
    content = store.exportVersionAsJson(exportVersionId.value)
  } else {
    content = store.exportVersionAsCSV(exportVersionId.value)
    ext = 'csv'
    mime = 'text/csv;charset=utf-8'
  }

  if (!content) return
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `version-${version.versionNumber}-${version.name}.${ext}`
  a.click()
  URL.revokeObjectURL(url)
  showExportModal.value = false
}

function confirmDelete(v: SchemeVersion) {
  if (confirm(`确定删除版本"${v.name}(V${v.versionNumber})"吗？此操作不可撤销。`)) {
    store.deleteVersion(v.id)
  }
}
</script>

<template>
  <div class="editor-panel">
    <div class="editor-tabs">
      <div class="editor-tab active">📚 版本历史</div>
    </div>

    <div class="editor-content">
      <div class="flex-between mb-16">
        <div>
          <h3 style="font-size: 16px; color: #3d2914;">
            {{ store.activeScheme?.name || '未选择方案' }}
          </h3>
          <p class="text-small text-muted mt-8">
            共 {{ versions.length }} 个历史版本 · 当前最新 V{{ versions.length || 0 }}
          </p>
        </div>
        <button class="btn btn-primary" @click="openSaveModal" :disabled="!store.activeScheme">
          💾 保存版本
        </button>
      </div>

      <div v-if="!store.activeScheme" class="empty-state">
        <div class="empty-state-icon">📚</div>
        <div class="empty-state-text">请先选择一个工序方案</div>
      </div>

      <div v-else-if="versions.length === 0" class="empty-state">
        <div class="empty-state-icon">🕒</div>
        <div class="empty-state-text">暂无历史版本，点击"保存版本"创建首个快照</div>
      </div>

      <div v-else class="version-timeline">
        <div
          v-for="(v, idx) in versions"
          :key="v.id"
          :class="['version-card', { latest: idx === 0 }]"
        >
          <div class="version-timeline-dot" :class="idx === 0 ? 'latest' : ''"></div>

          <div class="version-header">
            <div class="version-title">
              <span class="version-badge">V{{ v.versionNumber }}</span>
              <h4>{{ v.name }}</h4>
              <span v-if="idx === 0" class="version-latest-tag">最新</span>
            </div>
            <div class="version-meta">
              <span>{{ v.author }}</span>
              <span class="dot-sep">·</span>
              <span>{{ formatDate(v.createdAt) }}</span>
            </div>
          </div>

          <div v-if="v.description" class="version-description">
            {{ v.description }}
          </div>

          <div v-if="v.tags.length > 0" class="version-tags">
            <span v-for="tag in v.tags" :key="tag" class="version-tag">
              #{{ tag }}
            </span>
          </div>

          <div class="version-change-summary">
            <span class="change-badge change-added">➕ {{ countChanges(v).added }}</span>
            <span class="change-badge change-removed">➖ {{ countChanges(v).removed }}</span>
            <span class="change-badge change-modified">✏️ {{ countChanges(v).modified }}</span>
          </div>

          <div v-if="v.changes.length > 0" class="version-changes">
            <div class="version-changes-header" @click="($event.currentTarget as HTMLElement).parentElement!.classList.toggle('expanded')">
              <span>变更详情（{{ v.changes.length }}项）</span>
              <span class="expand-icon">▼</span>
            </div>
            <div class="version-changes-list">
              <div
                v-for="(c, ci) in v.changes.slice(0, 20)"
                :key="ci"
                :class="['change-item', `change-${c.type.split('_')[1] || 'modified'}`]"
              >
                <span class="change-icon">
                  {{ c.type.includes('_added') ? '➕' : c.type.includes('_removed') ? '➖' : '✏️' }}
                </span>
                <span>{{ c.description }}</span>
              </div>
              <div v-if="v.changes.length > 20" class="text-small text-muted" style="padding: 6px 10px;">
                ...其余 {{ v.changes.length - 20 }} 项变更
              </div>
            </div>
          </div>

          <div class="version-actions">
            <button
              class="btn btn-sm btn-secondary"
              :disabled="!versions[idx + 1]"
              :title="versions[idx + 1] ? `与 V${versions[idx + 1].versionNumber} 对比` : '已是最旧版本'"
              @click="versions[idx + 1] && emit('open-diff', v.id, versions[idx + 1].id)"
            >
              🔍 对比上个
            </button>
            <button
              class="btn btn-sm btn-secondary"
              @click="emit('open-diff', v.id)"
            >
              ⚡ 对比当前
            </button>
            <button
              class="btn btn-sm btn-secondary"
              @click="emit('copy-patterns', v.id)"
            >
              📋 复制纹线
            </button>
            <button
              class="btn btn-sm btn-secondary"
              @click="openExportModal(v.id)"
            >
              导出
            </button>
            <button
              v-if="idx !== 0"
              class="btn btn-sm btn-primary"
              @click="handleRollbackConfirm(v.id)"
            >
              ↩️ 回滚
            </button>
            <button
              v-if="versions.length > 1"
              class="btn btn-sm btn-danger"
              @click="confirmDelete(v)"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showSaveModal" class="modal-overlay" @click.self="showSaveModal = false">
    <div class="modal">
      <div class="modal-header">
        <h3>保存版本快照</h3>
        <button class="icon-btn" @click="showSaveModal = false">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-item mb-12">
          <label>版本名称 *</label>
          <input v-model="versionName" :placeholder="`V${nextVersionNumber}`" />
        </div>
        <div class="form-item mb-12">
          <label>版本说明</label>
          <textarea v-model="versionDesc" placeholder="记录本次修改的主要内容、调整依据等"></textarea>
        </div>
        <div class="form-item">
          <label>标签（逗号分隔）</label>
          <input v-model="versionTags" placeholder="如：审核版, 待确认, 客户方案A" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showSaveModal = false">取消</button>
        <button
          class="btn btn-primary"
          @click="handleSave"
          :disabled="!versionName.trim()"
        >
          保存为 V{{ nextVersionNumber }}
        </button>
      </div>
    </div>
  </div>

  <div v-if="showRollbackConfirm" class="modal-overlay" @click.self="showRollbackConfirm = false">
    <div class="modal">
      <div class="modal-header">
        <h3>⚠️ 确认回滚</h3>
        <button class="icon-btn" @click="showRollbackConfirm = false">✕</button>
      </div>
      <div class="modal-body">
        <div class="validation-alert warning">
          <strong>提示：</strong>回滚操作将使用所选版本的快照内容完全替换当前方案。当前未保存的修改将丢失（请先保存版本）。回滚后会自动创建新的版本记录，便于再次切换。
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showRollbackConfirm = false">取消</button>
        <button class="btn btn-danger" @click="handleRollback">
          确认回滚到此版本
        </button>
      </div>
    </div>
  </div>

  <div v-if="showExportModal" class="modal-overlay" @click.self="showExportModal = false">
    <div class="modal">
      <div class="modal-header">
        <h3>导出版本数据</h3>
        <button class="icon-btn" @click="showExportModal = false">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-item">
          <label>导出格式</label>
          <select v-model="exportFormat">
            <option value="json">JSON（完整版本数据，可再次导入）</option>
            <option value="csv">CSV（明细数据，用于Excel/报表）</option>
          </select>
        </div>
        <p class="text-small text-muted mt-8">
          💡 JSON 格式包含版本元信息、变更记录和完整方案快照；CSV 适合统计与打印。
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showExportModal = false">取消</button>
        <button class="btn btn-primary" @click="handleExport">下载文件</button>
      </div>
    </div>
  </div>
</template>
