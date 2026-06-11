<script setup lang="ts">
import { useMaskStore } from '@/stores/mask'
import { ref, computed } from 'vue'
import MaskSidebar from './components/MaskSidebar.vue'
import SchemePanel from './components/SchemePanel.vue'
import ProcessEditor from './components/ProcessEditor.vue'
import SchemeComparisonView from './components/SchemeComparisonView.vue'

const store = useMaskStore()

type TabKey = 'editor' | 'comparison'
const activeTab = ref<TabKey>('editor')

const headerSubtitle = computed(() => {
  if (!store.activeMask) return ''
  const schemeCount = store.activeMask.schemes.length
  const totalLayers = store.orderedLayers.length
  return `${schemeCount} 套方案 · ${totalLayers} 个工序`
})
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
        <div class="flex gap-8">
          <button
            :class="['btn', activeTab === 'editor' ? 'btn-primary' : 'btn-secondary']"
            @click="activeTab = 'editor'"
          >
            📝 工序编辑
          </button>
          <button
            :class="['btn', activeTab === 'comparison' ? 'btn-primary' : 'btn-secondary']"
            @click="activeTab = 'comparison'"
          >
            📊 方案比较
          </button>
        </div>
      </header>

      <div class="main-body">
        <SchemePanel v-if="store.activeMask" />
        <template v-if="activeTab === 'editor'">
          <ProcessEditor />
        </template>
        <template v-else>
          <SchemeComparisonView />
        </template>
      </div>
    </main>
  </div>
</template>
