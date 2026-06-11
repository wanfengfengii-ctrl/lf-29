<script setup lang="ts">
import { useMaskStore } from '@/stores/mask'
import { ref } from 'vue'

const store = useMaskStore()
const showCreateModal = ref(false)
const newMaskName = ref('')
const newMaskDesc = ref('')

function handleCreate() {
  if (!newMaskName.value.trim()) return
  store.createMask(newMaskName.value.trim(), newMaskDesc.value.trim())
  newMaskName.value = ''
  newMaskDesc.value = ''
  showCreateModal.value = false
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h1>🎭 傩面具工坊</h1>
      <p>工序记录 · 配色方案 · 面积分析</p>
    </div>

    <div class="mask-list">
      <div
        v-for="mask in store.masks"
        :key="mask.id"
        :class="['mask-item', { active: store.activeMaskId === mask.id }]"
        @click="store.setActiveMask(mask.id)"
      >
        <div class="mask-item-title">{{ mask.name }}</div>
        <div class="mask-item-desc">{{ mask.description || '暂无描述' }}</div>
        <div class="mask-item-desc" style="margin-top: 6px">
          {{ mask.schemes.length }} 套方案
        </div>
      </div>

      <div v-if="store.masks.length === 0" class="empty-state">
        <div class="empty-state-icon">🎭</div>
        <div class="empty-state-text">还没有面具，点击下方按钮创建</div>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="btn btn-primary btn-block" @click="showCreateModal = true">
        + 新建面具
      </button>
    </div>
  </aside>

  <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
    <div class="modal">
      <div class="modal-header">
        <h3>新建面具</h3>
        <button class="icon-btn" @click="showCreateModal = false">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-item mb-12">
          <label>面具名称 *</label>
          <input v-model="newMaskName" placeholder="如：开山傩面" />
        </div>
        <div class="form-item">
          <label>描述</label>
          <textarea v-model="newMaskDesc" placeholder="简要描述此面具的用途、风格等"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showCreateModal = false">取消</button>
        <button class="btn btn-primary" @click="handleCreate" :disabled="!newMaskName.trim()">
          创建
        </button>
      </div>
    </div>
  </div>
</template>
