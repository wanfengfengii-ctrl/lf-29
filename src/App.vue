<script setup lang="ts">
import { useMaskStore } from '@/stores/mask'
import { ref, computed, onMounted } from 'vue'
import MaskSidebar from './components/MaskSidebar.vue'
import SchemePanel from './components/SchemePanel.vue'
import ProcessEditor from './components/ProcessEditor.vue'
import SchemeComparisonView from './components/SchemeComparisonView.vue'
import VersionHistoryPanel from './components/VersionHistoryPanel.vue'
import VersionDiffView from './components/VersionDiffView.vue'
import SchemeValidationPanel from './components/SchemeValidationPanel.vue'
import SchemePreviewPage from './components/SchemePreviewPage.vue'
import CraftTemplateManager from './components/CraftTemplateManager.vue'
import { useCraftTemplateStore } from '@/stores/craftTemplate'

const store = useMaskStore()

type TabKey =
  | 'editor'
  | 'comparison'
  | 'versions'
  | 'diff'
  | 'validation'
  | 'preview'
  | 'heritage'

const activeTab = ref<TabKey>('editor')
const previewTokenFromUrl = ref('')

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const tokenId = params.get('preview')
  if (tokenId) {
    const token = store.getPreviewToken(tokenId)
    if (token) {
      previewTokenFromUrl.value = tokenId
      activeTab.value = 'preview'
      window.history.replaceState({}, '', window.location.pathname)
    }
  }
})

const diffVersionA = ref('')
const diffVersionB = ref('')
const diffCompareWithCurrent = ref(false)

const copyPatternModalVisible = ref(false)
const copySourceVersionId = ref('')
const copyTargetSchemeId = ref('')
const copyTargetLayerId = ref('')
const copyPatternIds = ref<string[]>([])
const copyResultCount = ref(0)

const headerSubtitle = computed(() => {
  if (!store.activeMask) return ''
  const schemeCount = store.activeMask.schemes.length
  const totalLayers = store.orderedLayers.length
  const versionCount = store.activeScheme
    ? store.getVersionsByScheme(store.activeScheme.id).length
    : 0
  return `${schemeCount} 套方案 · ${totalLayers} 个工序 · ${versionCount} 个历史版本`
})

const valReport = computed(() => {
  if (!store.activeScheme) return { errorCount: 0, warningCount: 0, infoCount: 0 }
  const r = store.validateSchemeFull(store.activeScheme.id)
  return { errorCount: r.errorCount, warningCount: r.warningCount, infoCount: r.infoCount }
})

function openDiffTab(v1Id: string, v2Id?: string) {
  diffVersionA.value = v1Id
  diffVersionB.value = v2Id || ''
  diffCompareWithCurrent.value = !v2Id
  activeTab.value = 'diff'
}

function openCopyPatternsModal(versionId: string) {
  copySourceVersionId.value = versionId
  copyTargetSchemeId.value = store.activeScheme?.id || ''
  copyTargetLayerId.value = ''
  copyPatternIds.value = []
  copyResultCount.value = 0
  copyPatternModalVisible.value = true
}

const sourceVersion = computed(() => {
  return store.versions.find(v => v.id === copySourceVersionId.value) || null
})

const allPatterns = computed(() => {
  if (!sourceVersion.value) return []
  const result: { id: string; layerId: string; layerName: string; name: string; color: string; area: number }[] = []
  sourceVersion.value.snapshot.layers.forEach(l => {
    l.patterns.forEach(p => {
      result.push({
        id: p.id,
        layerId: l.id,
        layerName: l.name,
        name: p.name,
        color: p.color,
        area: p.area
      })
    })
  })
  return result
})

function togglePattern(pid: string) {
  const i = copyPatternIds.value.indexOf(pid)
  if (i >= 0) copyPatternIds.value.splice(i, 1)
  else copyPatternIds.value.push(pid)
}

function selectAllPatterns() {
  if (copyPatternIds.value.length === allPatterns.value.length) {
    copyPatternIds.value = []
  } else {
    copyPatternIds.value = allPatterns.value.map(p => p.id)
  }
}

function executeCopy() {
  if (!copySourceVersionId.value || !copyTargetSchemeId.value) return
  const n = store.batchCopyPatternsFromVersion(
    copySourceVersionId.value,
    copyTargetSchemeId.value,
    copyTargetLayerId.value || undefined,
    copyPatternIds.value.length > 0 ? copyPatternIds.value : undefined
  )
  copyResultCount.value = n
  if (n > 0) {
    setTimeout(() => {
      copyPatternModalVisible.value = false
      activeTab.value = 'editor'
    }, 1500)
  }
}

const craftStore = useCraftTemplateStore()

const craftTemplateBadgeCount = computed(() => {
  return craftStore.submissions.length > 0 ? String(craftStore.submissions.length) : ''
})

const tabs: { key: TabKey; label: string; icon: string; badge?: string; badgeColor?: string }[] = [
  { key: 'editor', label: '工序编辑', icon: '📝' },
  { key: 'versions', label: '版本历史', icon: '📚' },
  { key: 'diff', label: '差异对比', icon: '🔍' },
  { key: 'comparison', label: '方案比较', icon: '📊' },
  { key: 'validation', label: '异常校验', icon: '🛡️', badge: String(valReport.value.errorCount + valReport.value.warningCount || ''), badgeColor: valReport.value.errorCount > 0 ? '#c0392b' : valReport.value.warningCount > 0 ? '#e67e22' : undefined },
  { key: 'preview', label: '只读预览', icon: '🔐' },
  { key: 'heritage', label: '师承工艺', icon: '🎭', badge: craftTemplateBadgeCount.value, badgeColor: '#b8860b' }
]
</script>

<template>
  <div class="app-container">
    <MaskSidebar />

    <main class="main-content">
      <header class="main-header">
        <div>
          <h2>{{ store.activeMask?.name || '未选择面具' }}</h2>
          <p v-if="store.activeMask" class="text-small text-muted mt-8">
            {{ store.activeMask.description || '暂无描述' }} · {{ headerSubtitle }}
          </p>
        </div>
        <div class="main-tabs">
          <button
            v-for="t in tabs"
            :key="t.key"
            :class="['tab-btn', activeTab === t.key ? 'active' : '']"
            @click="activeTab = t.key"
          >
            <span>{{ t.icon }} {{ t.label }}</span>
            <span
              v-if="t.badge"
              class="tab-badge"
              :style="{ background: t.badgeColor }"
            >
              {{ t.badge }}
            </span>
          </button>
        </div>
      </header>

      <div class="main-body">
        <SchemePanel v-if="store.activeMask" />
        <template v-if="activeTab === 'editor'">
          <ProcessEditor />
        </template>
        <template v-else-if="activeTab === 'versions'">
          <VersionHistoryPanel
            @open-diff="openDiffTab"
            @copy-patterns="openCopyPatternsModal"
          />
        </template>
        <template v-else-if="activeTab === 'diff'">
          <VersionDiffView
            :default-version-a="diffVersionA"
            :default-version-b="diffVersionB"
            :compare-with-current="diffCompareWithCurrent"
            :source-version-id="diffVersionA"
          />
        </template>
        <template v-else-if="activeTab === 'comparison'">
          <SchemeComparisonView />
        </template>
        <template v-else-if="activeTab === 'validation'">
          <SchemeValidationPanel />
        </template>
        <template v-else-if="activeTab === 'preview'">
          <SchemePreviewPage
            :preview-token-id="previewTokenFromUrl || undefined"
            :standalone="!!previewTokenFromUrl"
          />
        </template>
        <template v-else-if="activeTab === 'heritage'">
          <CraftTemplateManager />
        </template>
      </div>
    </main>
  </div>

  <div v-if="copyPatternModalVisible" class="modal-overlay" @click.self="copyPatternModalVisible = false">
    <div class="modal" style="max-width: 640px;">
      <div class="modal-header">
        <h3>📋 批量复制纹线到新方案</h3>
        <button class="icon-btn" @click="copyPatternModalVisible = false">✕</button>
      </div>
      <div class="modal-body">
        <div v-if="copyResultCount > 0" class="validation-alert warning">
          ✅ 成功复制 {{ copyResultCount }} 条纹线，即将跳转到编辑页...
        </div>

        <div class="form-item mb-12">
          <label>来源版本</label>
          <input :value="sourceVersion?.name + ' (V' + sourceVersion?.versionNumber + ')'" disabled />
        </div>

        <div class="form-item mb-12">
          <label>目标方案</label>
          <select v-model="copyTargetSchemeId">
            <option v-for="s in store.activeMask?.schemes || []" :key="s.id" :value="s.id">
              {{ s.name }}
            </option>
          </select>
        </div>

        <div class="form-item mb-12">
          <label>目标工序（可选，留空则按工序类型自动匹配/创建）</label>
          <select v-model="copyTargetLayerId">
            <option value="">-- 自动匹配或新建工序 --</option>
            <template v-for="s in store.activeMask?.schemes || []" :key="s.id">
              <optgroup v-if="s.id === copyTargetSchemeId" :label="s.name">
                <option v-for="l in s.layers" :key="l.id" :value="l.id">
                  {{ l.name }}
                </option>
              </optgroup>
            </template>
          </select>
        </div>

        <div class="form-item mb-12">
          <div class="flex-between" style="margin-bottom: 6px;">
            <label>选择纹线（不选则全部复制）</label>
            <button class="btn btn-sm btn-secondary" @click="selectAllPatterns">
              {{ copyPatternIds.length === allPatterns.length ? '取消全选' : '全选' }}
            </button>
          </div>
          <div class="pattern-picker">
            <div
              v-for="p in allPatterns"
              :key="p.id"
              :class="['pattern-picker-item', { selected: copyPatternIds.includes(p.id) }]"
              @click="togglePattern(p.id)"
            >
              <input type="checkbox" :checked="copyPatternIds.includes(p.id)" @click.stop />
              <span class="pattern-color-swatch" :style="{ backgroundColor: p.color }"></span>
              <div class="pattern-picker-info">
                <div class="pp-name">{{ p.name }}</div>
                <div class="pp-meta">{{ p.layerName }} · {{ p.area }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="copyPatternModalVisible = false">取消</button>
        <button
          class="btn btn-primary"
          @click="executeCopy"
          :disabled="!copySourceVersionId || !copyTargetSchemeId"
        >
          复制 {{ copyPatternIds.length > 0 ? copyPatternIds.length : allPatterns.length }} 条纹线
        </button>
      </div>
    </div>
  </div>
</template>
