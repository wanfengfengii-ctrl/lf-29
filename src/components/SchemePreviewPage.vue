<script setup lang="ts">
import { useMaskStore } from '@/stores/mask'
import { ref, computed, onMounted } from 'vue'
import type { PreviewToken, ProcessScheme } from '@/types'
import { analyzeColorDistribution, aggregateColorStats } from '@/utils/analysis'

const props = defineProps<{
  previewTokenId?: string
  standalone?: boolean
}>()

const store = useMaskStore()

const currentToken = ref<PreviewToken | null>(null)
const showCreateModal = ref(false)
const authorName = ref('设计师')
const expirationHours = ref<number | null>(72)
const createdToken = ref<PreviewToken | null>(null)
const commentAuthor = ref('审核人')
const commentContent = ref('')

const allTokens = computed(() => store.getAllPreviewTokens())

onMounted(() => {
  if (props.previewTokenId) {
    currentToken.value = store.getPreviewToken(props.previewTokenId)
  }
})

function handleCreate() {
  if (!store.activeScheme) return
  const token = store.createPreviewToken(
    store.activeScheme.id,
    authorName.value,
    expirationHours.value
  )
  if (token) {
    createdToken.value = token
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN')
}

function getScheme(): ProcessScheme | null {
  return currentToken.value?.snapshot || null
}

const colorDist = computed(() => {
  const scheme = getScheme()
  if (!scheme) return []
  return analyzeColorDistribution(scheme, true)
})

const aggregatedColors = computed(() => aggregateColorStats(colorDist.value))

function formatArea(n: number): string {
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

function openPreview(token: PreviewToken) {
  currentToken.value = token
}

function closePreview() {
  currentToken.value = null
}

function submitComment() {
  if (!currentToken.value || !commentContent.value.trim()) return
  store.addPreviewComment(
    currentToken.value.id,
    commentAuthor.value.trim(),
    commentContent.value.trim()
  )
  commentContent.value = ''
}

function copyShareLink() {
  if (!createdToken.value) return
  const link = `${window.location.origin}${window.location.pathname}?preview=${createdToken.value.id}`
  navigator.clipboard?.writeText(link)
  alert('分享链接已复制到剪贴板：\n' + link)
}
</script>

<template>
  <div class="editor-panel">
    <div class="editor-tabs">
      <div class="editor-tab active">🔐 只读预览与审核</div>
    </div>

    <div class="editor-content">
      <div v-if="!currentToken || !standalone">
        <div class="flex-between mb-16">
          <div>
            <h3 style="font-size: 16px; color: #3d2914;">
              预览链接管理
            </h3>
            <p class="text-small text-muted mt-8">
              生成只读预览页，便于师傅或团队成员查看与审核方案
            </p>
          </div>
          <button
            class="btn btn-primary"
            @click="showCreateModal = true"
            :disabled="!store.activeScheme"
          >
            ➕ 生成预览链接
          </button>
        </div>

        <div v-if="!store.activeScheme" class="empty-state">
          <div class="empty-state-icon">🔐</div>
          <div class="empty-state-text">请先选择一个工序方案</div>
        </div>

        <div v-else-if="allTokens.length === 0" class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">暂无预览链接，点击右上角生成</div>
        </div>

        <div v-else class="preview-token-list">
          <div
            v-for="token in allTokens"
            :key="token.id"
            class="preview-token-card"
          >
            <div class="preview-token-header">
              <div>
                <h4>{{ token.snapshot.name }}</h4>
                <p class="text-small text-muted mt-4">
                  作者：{{ token.author }} · 创建于 {{ formatDate(token.createdAt) }}
                </p>
                <p v-if="token.expiresAt" class="text-small text-muted">
                  有效期至：{{ formatDate(token.expiresAt) }}
                  <span v-if="token.expiresAt < Date.now()" style="color: #c0392b; margin-left: 6px;">
                    （已过期）
                  </span>
                </p>
              </div>
              <div class="flex gap-8" style="flex-direction: column; align-items: flex-end;">
                <span
                  :class="['review-badge', token.comments.length > 0 ? 'has-comments' : '']"
                >
                  💬 {{ token.comments.length }} 条评论
                </span>
                <button class="btn btn-sm btn-primary" @click="openPreview(token)">
                  打开预览
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentToken" class="preview-viewer">
        <div class="preview-viewer-header">
          <div>
            <h3>
              <span class="readonly-badge">只读</span>
              {{ getScheme()?.name }}
            </h3>
            <p class="text-small text-muted mt-4">
              预览链接创建者：{{ currentToken.author }} ·
              方案快照时间：{{ formatDate(currentToken.snapshot.updatedAt) }}
            </p>
          </div>
          <div v-if="!standalone" class="flex gap-8">
            <button class="btn btn-secondary" @click="closePreview">
              返回列表
            </button>
          </div>
        </div>

        <div class="preview-content">
          <div class="preview-section">
            <h4 class="preview-section-title">📋 方案概述</h4>
            <div class="preview-grid">
              <div class="preview-card-sm">
                <div class="pc-label">工序数</div>
                <div class="pc-value">{{ getScheme()?.layers.length || 0 }}</div>
              </div>
              <div class="preview-card-sm">
                <div class="pc-label">纹线数</div>
                <div class="pc-value">
                  {{ (getScheme()?.layers || []).reduce((s, l) => s + l.patterns.length, 0) }}
                </div>
              </div>
              <div class="preview-card-sm">
                <div class="pc-label">颜色数</div>
                <div class="pc-value">{{ aggregatedColors.length }}</div>
              </div>
              <div class="preview-card-sm">
                <div class="pc-label">总面积</div>
                <div class="pc-value">
                  {{ formatArea(colorDist.reduce((s, c) => s + c.area, 0)) }}
                </div>
              </div>
            </div>
          </div>

          <div class="preview-section">
            <h4 class="preview-section-title">🎨 颜色分布</h4>
            <div class="color-bar-large">
              <div
                v-for="(c, idx) in aggregatedColors"
                :key="idx"
                class="color-bar-segment"
                :style="{ width: c.percentage + '%', backgroundColor: c.color }"
                :title="`${c.colorName}: ${c.percentage}%`"
              ></div>
            </div>
            <div class="color-legend-grid">
              <div
                v-for="(c, idx) in aggregatedColors"
                :key="idx"
                class="color-legend-item"
              >
                <span class="color-legend-swatch" :style="{ backgroundColor: c.color }"></span>
                <span style="flex: 1;">{{ c.colorName }}</span>
                <span style="color: #8b7355;">{{ formatArea(c.totalArea) }} / {{ c.percentage }}%</span>
              </div>
            </div>
          </div>

          <div class="preview-section">
            <h4 class="preview-section-title">🔧 工序明细</h4>
            <div class="preview-layers">
              <div
                v-for="layer in getScheme()?.layerOrder.map(id => getScheme()!.layers.find(l => l.id === id)!).filter(Boolean)"
                :key="layer.id"
                class="preview-layer-card"
              >
                <div class="preview-layer-header">
                  <div>
                    <h5>{{ layer.name }}</h5>
                    <p class="text-small text-muted">
                      材料批次：{{ layer.materialBatch || '(未设置)' }}
                    </p>
                  </div>
                  <div class="preview-completion">
                    <div class="progress-bar" style="width: 100px;">
                      <div class="progress-fill" :style="{ width: layer.completion + '%' }"></div>
                    </div>
                    <span class="completion-text">{{ layer.completion }}%</span>
                  </div>
                </div>
                <div v-if="layer.description" class="preview-layer-desc">
                  {{ layer.description }}
                </div>
                <div v-if="layer.patterns.length > 0" class="preview-patterns">
                  <div
                    v-for="p in layer.patterns"
                    :key="p.id"
                    class="preview-pattern-item"
                  >
                    <span
                      class="pattern-color-swatch"
                      :style="{ backgroundColor: p.color, opacity: p.opacity / 100 }"
                    ></span>
                    <span class="pp-name">{{ p.name }}</span>
                    <span class="pp-area">{{ formatArea(p.area) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="preview-section">
            <h4 class="preview-section-title">💬 审核评论 ({{ currentToken.comments.length }})</h4>
            <div class="comments-section">
              <div class="comment-input">
                <input v-model="commentAuthor" placeholder="您的称呼" style="width: 120px;" />
                <input
                  v-model="commentContent"
                  placeholder="输入审核意见或评论..."
                  style="flex: 1;"
                  @keyup.enter="submitComment"
                />
                <button
                  class="btn btn-primary btn-sm"
                  @click="submitComment"
                  :disabled="!commentContent.trim()"
                >
                  发送
                </button>
              </div>
              <div v-if="currentToken.comments.length === 0" class="empty-state" style="padding: 30px 20px;">
                <div class="empty-state-icon" style="font-size: 32px;">💬</div>
                <div class="empty-state-text">暂无评论，欢迎留下审核意见</div>
              </div>
              <div v-else class="comment-list">
                <div
                  v-for="c in [...currentToken.comments].reverse()"
                  :key="c.id"
                  class="comment-item"
                >
                  <div class="comment-avatar">
                    {{ c.author.charAt(0) }}
                  </div>
                  <div class="comment-body">
                    <div class="comment-meta">
                      <strong>{{ c.author }}</strong>
                      <span class="text-small text-muted">{{ formatDate(c.createdAt) }}</span>
                    </div>
                    <div class="comment-content">{{ c.content }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
    <div class="modal">
      <div class="modal-header">
        <h3>生成只读预览链接</h3>
        <button class="icon-btn" @click="showCreateModal = false">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-item mb-12">
          <label>创建者名称</label>
          <input v-model="authorName" placeholder="如：张师傅、设计师A" />
        </div>
        <div class="form-item mb-12">
          <label>有效期</label>
          <select v-model.number="expirationHours">
            <option :value="1">1 小时</option>
            <option :value="6">6 小时</option>
            <option :value="24">1 天</option>
            <option :value="72">3 天</option>
            <option :value="168">7 天</option>
            <option :value="null">永久有效</option>
          </select>
        </div>
        <p class="text-small text-muted">
          💡 生成后将创建方案的只读快照，不影响原始数据编辑。被分享人可查看并留言。
        </p>

        <div v-if="createdToken" class="validation-alert warning" style="margin-top: 16px;">
          <strong>✅ 生成成功！</strong>
          <div style="margin-top: 8px; word-break: break-all; font-family: monospace; font-size: 12px;">
            Token ID: {{ createdToken.id.slice(0, 12) }}...
          </div>
          <button class="btn btn-sm btn-primary" style="margin-top: 8px;" @click="copyShareLink">
            📋 复制分享链接
          </button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showCreateModal = false; createdToken = null;">
          {{ createdToken ? '关闭' : '取消' }}
        </button>
        <button
          v-if="!createdToken"
          class="btn btn-primary"
          @click="handleCreate"
        >
          生成链接
        </button>
      </div>
    </div>
  </div>
</template>
