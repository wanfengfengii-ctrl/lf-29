<script setup lang="ts">
import { useMaskStore } from '@/stores/mask'
import { PROCESS_TYPE_META, type ProcessType } from '@/types'
import { computed, ref } from 'vue'
import ProcessLayerCard from './ProcessLayerCard.vue'

const store = useMaskStore()

const showAddModal = ref(false)
const newLayerType = ref<ProcessType>('polishing')
const newLayerName = ref('')
const newCustomTypeName = ref('')

const availableTypes = computed(() => {
  const types: { type: ProcessType; label: string; disabled: boolean; reason?: string }[] = []
  const canFace = store.canAddFaceCarving()

  for (const [key, meta] of Object.entries(PROCESS_TYPE_META)) {
    const t = key as ProcessType
    let disabled = false
    let reason: string | undefined
    if (t === 'face_carving' && !canFace) {
      disabled = true
      reason = '需先完成底胚工序（完成度100%）'
    }
    types.push({ type: t, label: meta.label, disabled, reason })
  }
  return types
})

const defaultNames: Record<ProcessType, string> = {
  base_embryo: '底胚制作',
  polishing: '打磨工序',
  plastering: '上灰工序',
  face_carving: '开脸工序',
  gold_outlining: '描金工序',
  custom: '自定义工序'
}

function openAddModal() {
  newLayerType.value = 'polishing'
  newLayerName.value = defaultNames[newLayerType.value]
  newCustomTypeName.value = ''
  showAddModal.value = true
}

function handleTypeChange() {
  newLayerName.value = defaultNames[newLayerType.value]
}

function handleAddLayer() {
  if (!newLayerName.value.trim()) return
  const customName = newLayerType.value === 'custom' ? newCustomTypeName.value.trim() : undefined
  const result = store.addLayer(newLayerType.value, newLayerName.value.trim(), customName)
  if (result) {
    showAddModal.value = false
  } else {
    alert('添加工序失败：可能名称重复或不满足前置条件')
  }
}

const validation = computed(() => store.validateCurrentScheme())
</script>

<template>
  <div class="editor-panel">
    <div class="editor-tabs">
      <div class="editor-tab active">📝 工序编辑</div>
    </div>

    <div class="editor-content">
      <div v-if="validation.errors.length > 0" class="validation-alert error">
        <strong>❌ 校验错误：</strong>
        <ul style="margin-left: 20px; margin-top: 4px;">
          <li v-for="(err, idx) in validation.errors" :key="idx">{{ err }}</li>
        </ul>
      </div>
      <div v-if="validation.warnings.length > 0" class="validation-alert warning">
        <strong>⚠️ 提示：</strong>
        <ul style="margin-left: 20px; margin-top: 4px;">
          <li v-for="(warn, idx) in validation.warnings" :key="idx">{{ warn }}</li>
        </ul>
      </div>

      <div v-if="!store.activeScheme" class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">请先选择或创建一个工序方案</div>
      </div>

      <template v-else>
        <div style="margin-bottom: 16px;" class="flex-between">
          <div>
            <h3 style="font-size: 16px; color: #3d2914;">
              {{ store.activeScheme.name }}
            </h3>
            <p class="text-small text-muted mt-8">
              {{ store.activeScheme.description || '暂无方案描述' }}
            </p>
          </div>
          <button class="btn btn-primary" @click="openAddModal">
            + 添加工序
          </button>
        </div>

        <ProcessLayerCard
          v-for="(layer, idx) in store.orderedLayers"
          :key="layer.id"
          :layer="layer"
          :layer-index="idx"
          :total-layers="store.orderedLayers.length"
        />

        <div v-if="store.orderedLayers.length === 0" class="empty-state">
          <div class="empty-state-icon">🔧</div>
          <div class="empty-state-text">
            此方案暂无工序，点击右上角"添加工序"开始
          </div>
        </div>
      </template>
    </div>
  </div>

  <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
    <div class="modal">
      <div class="modal-header">
        <h3>添加工序</h3>
        <button class="icon-btn" @click="showAddModal = false">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-item mb-12">
          <label>工序类型</label>
          <select v-model="newLayerType" @change="handleTypeChange">
            <option
              v-for="t in availableTypes"
              :key="t.type"
              :value="t.type"
              :disabled="t.disabled"
            >
              {{ t.label }}{{ t.disabled ? `（${t.reason}）` : '' }}
            </option>
          </select>
        </div>
        <div class="form-item mb-12">
          <label>工序名称 *</label>
          <input v-model="newLayerName" placeholder="输入工序名称（同一方案内不可重复）" />
        </div>
        <div v-if="newLayerType === 'custom'" class="form-item">
          <label>自定义类型显示名</label>
          <input v-model="newCustomTypeName" placeholder="如：做旧处理、彩绘" />
        </div>
        <p class="text-small text-muted mt-8">
          💡 工序名称在同一方案内不能重复
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showAddModal = false">取消</button>
        <button class="btn btn-primary" @click="handleAddLayer" :disabled="!newLayerName.trim()">
          添加
        </button>
      </div>
    </div>
  </div>
</template>
