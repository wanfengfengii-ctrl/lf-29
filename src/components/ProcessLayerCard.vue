<script setup lang="ts">
import { useMaskStore } from '@/stores/mask'
import { PROCESS_TYPE_META, type ProcessLayer, type PatternRegion, type ProcessType } from '@/types'
import { getLayerDisplayName, canStartFaceCarving } from '@/utils/validators'
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  layer: ProcessLayer
  layerIndex: number
  totalLayers: number
}>()

const store = useMaskStore()

const showPatternModal = ref(false)
const editingPattern = ref<PatternRegion | null>(null)
const patternName = ref('')
const patternColor = ref('#8B4513')
const patternArea = ref(100)
const patternOpacity = ref(100)

const layerMeta = computed(() => PROCESS_TYPE_META[props.layer.type])
const displayName = computed(() => getLayerDisplayName(props.layer))

const canMoveUp = computed(() => props.layerIndex > 0)
const canMoveDown = computed(() => props.layerIndex < props.totalLayers - 1)

const hasPatterns = computed(() => props.layer.patterns.length > 0)

watch(() => props.layer.patterns, () => {}, { deep: true })

function openAddPattern() {
  editingPattern.value = null
  patternName.value = ''
  patternColor.value = '#8B4513'
  patternArea.value = 100
  patternOpacity.value = 100
  showPatternModal.value = true
}

function openEditPattern(pattern: PatternRegion) {
  editingPattern.value = pattern
  patternName.value = pattern.name
  patternColor.value = pattern.color
  patternArea.value = pattern.area
  patternOpacity.value = pattern.opacity
  showPatternModal.value = true
}

function handleSavePattern() {
  if (!patternName.value.trim()) return
  if (patternOpacity.value < 0) patternOpacity.value = 0
  if (patternOpacity.value > 100) patternOpacity.value = 100

  if (editingPattern.value) {
    store.updatePattern(props.layer.id, editingPattern.value.id, {
      name: patternName.value.trim(),
      color: patternColor.value,
      area: patternArea.value,
      opacity: patternOpacity.value
    })
  } else {
    store.addPattern(
      props.layer.id,
      patternName.value.trim(),
      patternColor.value,
      patternArea.value,
      patternOpacity.value
    )
  }
  showPatternModal.value = false
}

function handleDeleteLayer() {
  const deleted = store.requestDeleteLayer(props.layer.id)
  if (!deleted) {
  }
}

function togglePatternVisibility(pattern: PatternRegion) {
  store.updatePattern(props.layer.id, pattern.id, { visible: !pattern.visible })
}

function confirmDeletePattern(patternId: string, patternName: string) {
  if (confirm(`确定删除纹线区域"${patternName}"吗？`)) {
    store.deletePattern(props.layer.id, patternId)
  }
}
</script>

<template>
  <div class="layer-card">
    <div class="layer-header">
      <div class="layer-header-left">
        <span class="layer-type-badge" :style="{ backgroundColor: layerMeta.color }">
          {{ layerMeta.label }}
        </span>
        <span class="layer-name">{{ layer.name }}</span>
        <span class="text-small text-muted">完成度 {{ layer.completion }}%</span>
      </div>
      <div class="layer-header-right">
        <button
          class="icon-btn"
          title="上移"
          :disabled="!canMoveUp"
          :style="{ opacity: canMoveUp ? 1 : 0.3, cursor: canMoveUp ? 'pointer' : 'not-allowed' }"
          @click="store.moveLayerUp(layer.id)"
        >
          ▲
        </button>
        <button
          class="icon-btn"
          title="下移"
          :disabled="!canMoveDown"
          :style="{ opacity: canMoveDown ? 1 : 0.3, cursor: canMoveDown ? 'pointer' : 'not-allowed' }"
          @click="store.moveLayerDown(layer.id)"
        >
          ▼
        </button>
        <button
          class="icon-btn"
          title="删除工序"
          @click="handleDeleteLayer"
        >
          🗑️
        </button>
      </div>
    </div>

    <div class="layer-body">
      <div class="form-row">
        <div class="form-item">
          <label>工序名称</label>
          <input
            :value="layer.name"
            @input="store.updateLayer(layer.id, { name: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div class="form-item">
          <label>材料批次</label>
          <input
            :value="layer.materialBatch"
            @input="store.updateLayer(layer.id, { materialBatch: ($event.target as HTMLInputElement).value })"
            placeholder="如：樟木-2024-A01"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-item">
          <label>完成度：{{ layer.completion }}%</label>
          <input
            type="range"
            min="0"
            max="100"
            :value="layer.completion"
            @input="store.updateLayer(layer.id, { completion: Number(($event.target as HTMLInputElement).value) })"
          />
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: layer.completion + '%' }"></div>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-item">
          <label>工序描述</label>
          <textarea
            :value="layer.description"
            @input="store.updateLayer(layer.id, { description: ($event.target as HTMLTextAreaElement).value })"
            placeholder="描述此工序的具体内容"
          ></textarea>
        </div>
        <div class="form-item">
          <label>备注</label>
          <textarea
            :value="layer.notes"
            @input="store.updateLayer(layer.id, { notes: ($event.target as HTMLTextAreaElement).value })"
            placeholder="注意事项、问题记录等"
          ></textarea>
        </div>
      </div>

      <div
        v-if="layer.type === 'face_carving' || layer.type === 'gold_outlining' || layer.type === 'plastering'"
        class="patterns-section"
      >
        <div class="patterns-section-header">
          <h4>
            纹线区域（{{ layer.patterns.filter(p => p.visible).length }}/{{ layer.patterns.length }} 可见）
          </h4>
          <button class="btn btn-sm btn-primary" @click="openAddPattern">
            + 添加纹线
          </button>
        </div>

        <div v-if="layer.patterns.length === 0" class="text-small text-muted" style="padding: 12px; text-align: center;">
          暂无纹线区域，点击上方按钮添加
        </div>

        <div
          v-for="pattern in layer.patterns"
          :key="pattern.id"
          class="pattern-item"
          :style="{ opacity: pattern.visible ? 1 : 0.5 }"
        >
          <div
            class="pattern-color-swatch"
            :style="{ backgroundColor: pattern.color, opacity: pattern.opacity / 100 }"
          ></div>
          <div class="pattern-info">
            <div class="pattern-name">{{ pattern.name }}</div>
            <div class="pattern-meta">
              面积 {{ pattern.area }} · 透明度 {{ pattern.opacity }}%
              <span v-if="!pattern.visible" style="color: #c0392b;">（已隐藏）</span>
            </div>
          </div>
          <div class="pattern-actions">
            <button
              :class="['icon-btn', { active: pattern.visible }]"
              :title="pattern.visible ? '点击隐藏（不计入面积）' : '点击显示（计入面积）'"
              @click="togglePatternVisibility(pattern)"
            >
              {{ pattern.visible ? '👁️' : '🚫' }}
            </button>
            <button class="icon-btn" title="编辑" @click="openEditPattern(pattern)">
              ✏️
            </button>
            <button
              class="icon-btn"
              title="删除"
              style="color: #c0392b;"
              @click="confirmDeletePattern(pattern.id, pattern.name)"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="store.pendingDeleteLayerId === layer.id" class="modal-overlay" @click.self="store.cancelDeleteLayer()">
      <div class="modal">
        <div class="modal-header">
          <h3>⚠️ 确认删除工序</h3>
        </div>
        <div class="modal-body">
          <p style="color: #c0392b; font-weight: 500;">
            此工序包含 {{ layer.patterns.length }} 个纹线描绘内容，删除后将无法恢复！
          </p>
          <p class="text-muted text-small mt-8">
            工序：{{ layer.name }}
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="store.cancelDeleteLayer()">取消</button>
          <button class="btn btn-danger" @click="store.confirmDeleteLayer()">确认删除</button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showPatternModal" class="modal-overlay" @click.self="showPatternModal = false">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ editingPattern ? '编辑纹线区域' : '添加纹线区域' }}</h3>
        <button class="icon-btn" @click="showPatternModal = false">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-item mb-12">
          <label>区域名称 *</label>
          <input v-model="patternName" placeholder="如：额头区域、左眼窝" />
        </div>
        <div class="form-row mb-12">
          <div class="form-item">
            <label>颜色</label>
            <div class="flex gap-8" style="align-items: center;">
              <input type="color" v-model="patternColor" style="width: 48px; height: 36px; padding: 2px;" />
              <input v-model="patternColor" placeholder="#RRGGBB" style="flex: 1;" />
            </div>
          </div>
          <div class="form-item">
            <label>面积</label>
            <input type="number" v-model.number="patternArea" min="0" step="1" />
          </div>
        </div>
        <div class="form-item">
          <label>透明度：{{ patternOpacity }}%</label>
          <input type="range" class="opacity-slider" min="0" max="100" v-model.number="patternOpacity" />
          <p class="text-small text-muted">
            范围 0（完全透明）- 100（完全不透明）
          </p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showPatternModal = false">取消</button>
        <button class="btn btn-primary" @click="handleSavePattern" :disabled="!patternName.trim()">
          {{ editingPattern ? '保存' : '添加' }}
        </button>
      </div>
    </div>
  </div>
</template>
