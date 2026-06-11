<script setup lang="ts">
import { useMaskStore } from '@/stores/mask'
import { ref } from 'vue'
import type { ProcessScheme } from '@/types'

const store = useMaskStore()

const showCreateModal = ref(false)
const showImportModal = ref(false)
const showDuplicateModal = ref(false)
const newSchemeName = ref('')
const newSchemeDesc = ref('')
const importJsonText = ref('')
const duplicateSourceId = ref('')
const duplicateNewName = ref('')
const importMessage = ref('')

function countFaceCarving(scheme: ProcessScheme): number {
  return scheme.layers.filter(l => l.type === 'face_carving').length
}

function handleCreate() {
  if (!newSchemeName.value.trim()) return
  store.createScheme(newSchemeName.value.trim(), newSchemeDesc.value.trim())
  newSchemeName.value = ''
  newSchemeDesc.value = ''
  showCreateModal.value = false
}

function handleExport(schemeId: string) {
  const json = store.exportScheme(schemeId)
  if (json) {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scheme-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
}

function handleImport() {
  const result = store.importScheme(importJsonText.value)
  importMessage.value = result.message
  if (result.success) {
    importJsonText.value = ''
    setTimeout(() => {
      showImportModal.value = false
      importMessage.value = ''
    }, 1500)
  }
}

function openDuplicateModal(schemeId: string, currentName: string) {
  duplicateSourceId.value = schemeId
  duplicateNewName.value = `${currentName} 副本`
  showDuplicateModal.value = true
}

function handleDuplicate() {
  if (!duplicateNewName.value.trim() || !duplicateSourceId.value) return
  store.duplicateScheme(duplicateSourceId.value, duplicateNewName.value.trim())
  showDuplicateModal.value = false
  duplicateSourceId.value = ''
  duplicateNewName.value = ''
}

function confirmDeleteScheme(schemeId: string, schemeName: string) {
  if (confirm(`确定要删除方案"${schemeName}"吗？此操作不可撤销。`)) {
    store.deleteScheme(schemeId)
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="schemes-panel">
    <div class="panel-header">
      <h3>工序方案</h3>
      <div class="flex gap-8">
        <button class="icon-btn" title="导入方案" @click="showImportModal = true">📥</button>
        <button class="icon-btn" title="新建方案" @click="showCreateModal = true">➕</button>
      </div>
    </div>

    <div class="panel-body">
      <div
        v-for="scheme in store.activeMask?.schemes || []"
        :key="scheme.id"
        :class="['scheme-card', { active: store.activeMask?.activeSchemeId === scheme.id }]"
        @click="store.switchScheme(scheme.id)"
      >
        <div class="scheme-card-title">
          <span>{{ scheme.name }}</span>
          <span v-if="store.activeMask?.activeSchemeId === scheme.id" style="font-size: 11px; color: #8b4513;">●</span>
        </div>
        <div class="scheme-card-meta">
          {{ scheme.layers.length }} 个工序 · 更新于 {{ formatDate(scheme.updatedAt) }}
        </div>
        <div class="scheme-card-meta">
          <span v-if="countFaceCarving(scheme) > 0" style="color: #8b4513;">
            {{ countFaceCarving(scheme) }} 套开脸配色
          </span>
          <span v-else class="text-muted">暂无开脸方案</span>
        </div>
        <div class="scheme-card-actions">
          <button
            class="btn btn-sm btn-secondary"
            @click.stop="openDuplicateModal(scheme.id, scheme.name)"
          >
            复制
          </button>
          <button
            class="btn btn-sm btn-secondary"
            @click.stop="handleExport(scheme.id)"
          >
            导出
          </button>
          <button
            v-if="(store.activeMask?.schemes.length || 0) > 1"
            class="btn btn-sm btn-danger"
            @click.stop="confirmDeleteScheme(scheme.id, scheme.name)"
          >
            删除
          </button>
        </div>
      </div>

      <div v-if="!store.activeMask || store.activeMask.schemes.length === 0" class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">还没有工序方案</div>
      </div>
    </div>
  </div>

  <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
    <div class="modal">
      <div class="modal-header">
        <h3>新建工序方案</h3>
        <button class="icon-btn" @click="showCreateModal = false">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-item mb-12">
          <label>方案名称 *</label>
          <input v-model="newSchemeName" placeholder="如：方案一：传统红脸" />
        </div>
        <div class="form-item">
          <label>描述</label>
          <textarea v-model="newSchemeDesc" placeholder="方案说明"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showCreateModal = false">取消</button>
        <button class="btn btn-primary" @click="handleCreate" :disabled="!newSchemeName.trim()">
          创建
        </button>
      </div>
    </div>
  </div>

  <div v-if="showDuplicateModal" class="modal-overlay" @click.self="showDuplicateModal = false">
    <div class="modal">
      <div class="modal-header">
        <h3>复制方案</h3>
        <button class="icon-btn" @click="showDuplicateModal = false">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-item">
          <label>新方案名称 *</label>
          <input v-model="duplicateNewName" placeholder="输入新方案名称" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showDuplicateModal = false">取消</button>
        <button class="btn btn-primary" @click="handleDuplicate" :disabled="!duplicateNewName.trim()">
          复制
        </button>
      </div>
    </div>
  </div>

  <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
    <div class="modal" style="max-width: 560px;">
      <div class="modal-header">
        <h3>导入方案</h3>
        <button class="icon-btn" @click="showImportModal = false">✕</button>
      </div>
      <div class="modal-body">
        <div v-if="importMessage" :class="['validation-alert', importMessage.includes('成功') ? 'warning' : 'error']">
          {{ importMessage }}
        </div>
        <div class="form-item">
          <label>粘贴方案 JSON 数据</label>
          <textarea
            v-model="importJsonText"
            style="min-height: 200px; font-family: monospace; font-size: 12px;"
            placeholder='{"id":"...","name":"...","layers":[...]}'
          ></textarea>
        </div>
        <p class="text-small text-muted mt-8">
          💡 提示：损坏的方案不会覆盖当前数据，导入前会进行校验。
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showImportModal = false">取消</button>
        <button class="btn btn-primary" @click="handleImport" :disabled="!importJsonText.trim()">
          导入
        </button>
      </div>
    </div>
  </div>
</template>
