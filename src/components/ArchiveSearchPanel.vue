<script setup lang="ts">
import { ref, computed } from 'vue'
import { useReviewArchiveStore } from '@/stores/reviewArchive'
import { SCHOOL_STYLE_META, type ArchiveItem, type ArchiveSearchQuery } from '@/types'

const reviewStore = useReviewArchiveStore()

const searchKeyword = ref('')
const searchType = ref<ArchiveItem['archiveType'] | 'all'>('all')
const searchSchool = ref<string>('all')
const searchAuthor = ref('')
const searchRatingMin = ref(0)
const searchRatingMax = ref(5)

const activeArchiveDetail = ref<ArchiveItem | null>(null)

const archiveTypeOptions: { value: ArchiveItem['archiveType'] | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: '全部类型', icon: '📚' },
  { value: 'template', label: '工艺模板', icon: '📜' },
  { value: 'scheme', label: '制作方案', icon: '🎨' },
  { value: 'practice', label: '练习评分', icon: '📝' },
  { value: 'review', label: '评审记录', icon: '🔍' }
]

const searchResults = computed(() => {
  const query: ArchiveSearchQuery = {
    keyword: searchKeyword.value,
    archiveType: searchType.value,
    school: searchSchool.value as any,
    author: searchAuthor.value,
    ratingRange: { min: searchRatingMin.value, max: searchRatingMax.value }
  }
  return reviewStore.searchArchive(query)
})

const allAuthors = computed(() => reviewStore.getAllArchiveAuthors())
const allTags = computed(() => reviewStore.getAllArchiveTags())

const archiveStats = computed(() => ({
  total: reviewStore.archiveItems.length,
  templates: reviewStore.archiveItems.filter(i => i.archiveType === 'template').length,
  schemes: reviewStore.archiveItems.filter(i => i.archiveType === 'scheme').length,
  practices: reviewStore.archiveItems.filter(i => i.archiveType === 'practice').length,
  reviews: reviewStore.archiveItems.filter(i => i.archiveType === 'review').length
}))

const typeLabelMap: Record<string, { label: string; color: string }> = {
  template: { label: '工艺模板', color: '#8B4513' },
  scheme: { label: '制作方案', color: '#2e7d32' },
  practice: { label: '练习评分', color: '#1565c0' },
  review: { label: '评审记录', color: '#c62828' }
}

function viewArchiveDetail(item: ArchiveItem) {
  activeArchiveDetail.value = item
}

function closeDetail() {
  activeArchiveDetail.value = null
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('zh-CN')
}

function getMetadataDisplay(item: ArchiveItem): { label: string; value: string }[] {
  const result: { label: string; value: string }[] = []
  const md = item.metadata

  if (item.archiveType === 'template') {
    result.push({ label: '工序数量', value: `${md.processSteps || 0} 道` })
    result.push({ label: '配色方案', value: `${md.colorTemplates || 0} 种` })
    result.push({ label: '纹线示意', value: `${md.lineSketches || 0} 组` })
    result.push({ label: '材料清单', value: `${md.materials || 0} 项` })
  } else if (item.archiveType === 'scheme') {
    result.push({ label: '工序层数', value: `${md.layers || 0} 层` })
    result.push({ label: '纹线数量', value: `${md.patterns || 0} 条` })
    result.push({ label: '是否激活', value: md.isActive ? '是' : '否' })
  } else if (item.archiveType === 'practice') {
    result.push({ label: '总分', value: `${md.totalScore} / ${md.maxScore}` })
    result.push({ label: '等级', value: `${md.grade}` })
    result.push({ label: '偏差项数', value: `${md.deviationCount || 0} 项` })
  } else if (item.archiveType === 'review') {
    result.push({ label: '评审类型', value: `${md.type || 'scheme'}` })
    result.push({ label: '工序数', value: `${md.stageCount || 0} 道` })
  }

  return result
}
</script>

<template>
  <div class="archive-search-panel">
    <div class="page-intro">
      <h3>📚 统一归档检索中心</h3>
      <p class="text-muted">对方案、模板、练习评分进行统一归档检索，快速定位历史资料</p>
    </div>

    <div class="archive-stats-row">
      <div class="stat-card">
        <div class="stat-icon">📚</div>
        <div class="stat-info">
          <div class="stat-value">{{ archiveStats.total }}</div>
          <div class="stat-label">总计归档</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📜</div>
        <div class="stat-info">
          <div class="stat-value">{{ archiveStats.templates }}</div>
          <div class="stat-label">工艺模板</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🎨</div>
        <div class="stat-info">
          <div class="stat-value">{{ archiveStats.schemes }}</div>
          <div class="stat-label">制作方案</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-info">
          <div class="stat-value">{{ archiveStats.practices }}</div>
          <div class="stat-label">练习评分</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔍</div>
        <div class="stat-info">
          <div class="stat-value">{{ archiveStats.reviews }}</div>
          <div class="stat-label">评审记录</div>
        </div>
      </div>
    </div>

    <div class="search-filters-card">
      <div class="search-input-row">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索标题、描述、作者、标签..."
            class="search-input"
          />
        </div>
      </div>

      <div class="filter-row">
        <div class="filter-group">
          <label>类型</label>
          <div class="filter-chips">
            <button
              v-for="opt in archiveTypeOptions"
              :key="opt.value"
              :class="['filter-chip', { active: searchType === opt.value }]"
              @click="searchType = opt.value"
            >
              {{ opt.icon }} {{ opt.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="filter-row">
        <div class="filter-group">
          <label>流派</label>
          <select v-model="searchSchool">
            <option value="all">全部流派</option>
            <option v-for="(meta, key) in SCHOOL_STYLE_META" :key="key" :value="key">
              {{ meta.label }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>作者</label>
          <select v-model="searchAuthor">
            <option value="">全部作者</option>
            <option v-for="author in allAuthors" :key="author" :value="author">
              {{ author }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>评分范围</label>
          <div class="rating-range">
            <select v-model="searchRatingMin">
              <option v-for="i in 6" :key="i - 1" :value="i - 1">{{ i - 1 }}星+</option>
            </select>
            <span class="range-sep">至</span>
            <select v-model="searchRatingMax">
              <option v-for="i in 6" :key="i" :value="i">{{ i }}星</option>
            </select>
          </div>
        </div>
      </div>

      <div class="filter-row" v-if="allTags.length > 0">
        <div class="filter-group">
          <label>热门标签</label>
          <div class="tag-chips">
            <span
              v-for="tag in allTags.slice(0, 12)"
              :key="tag"
              class="tag-chip"
              @click="searchKeyword = tag"
            >
              #{{ tag }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="search-results-section">
      <div class="results-header">
        <h4>搜索结果 ({{ searchResults.length }})</h4>
        <div class="results-sort">
          按归档时间倒序排列
        </div>
      </div>

      <div v-if="searchResults.length === 0" class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">暂无匹配的归档记录，请调整搜索条件</div>
      </div>

      <div v-else class="archive-grid">
        <div
          v-for="item in searchResults"
          :key="item.id"
          class="archive-card"
          @click="viewArchiveDetail(item)"
        >
          <div
            class="archive-card-type-badge"
            :style="{ background: typeLabelMap[item.archiveType]?.color || '#666' }"
          >
            {{ typeLabelMap[item.archiveType]?.label || item.archiveType }}
          </div>
          <div
            class="archive-card-header"
            :style="item.school ? { borderLeftColor: SCHOOL_STYLE_META[item.school]?.color } : {}"
          >
            <h5 class="archive-card-title">{{ item.title }}</h5>
            <div class="archive-card-meta">
              <span v-if="item.school" class="school-tag" :style="{ background: SCHOOL_STYLE_META[item.school]?.color }">
                {{ SCHOOL_STYLE_META[item.school]?.label }}
              </span>
              <span v-if="item.version" class="version-tag">V{{ item.version }}</span>
              <span v-if="item.rating" class="rating-tag">
                {{ '★'.repeat(Math.round(item.rating)) }}
              </span>
            </div>
          </div>
          <p class="archive-card-desc">{{ item.description }}</p>
          <div class="archive-card-footer">
            <span class="archive-author">👤 {{ item.author }}</span>
            <span class="archive-date">{{ formatDate(item.archivedAt) }}</span>
          </div>
          <div class="archive-card-tags">
            <span v-for="tag in item.tags.slice(0, 3)" :key="tag" class="archive-tag">{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="activeArchiveDetail" class="modal-overlay" @click.self="closeDetail">
      <div class="modal" style="max-width: 720px">
        <div class="modal-header">
          <h3>
            <span
              class="type-badge-inline"
              :style="{ background: typeLabelMap[activeArchiveDetail.archiveType]?.color }"
            >
              {{ typeLabelMap[activeArchiveDetail.archiveType]?.label }}
            </span>
            {{ activeArchiveDetail.title }}
          </h3>
          <button class="icon-btn" @click="closeDetail">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-meta-row">
            <div class="detail-meta-item">
              <span class="meta-label">作者</span>
              <span class="meta-value">{{ activeArchiveDetail.author }}</span>
            </div>
            <div class="detail-meta-item">
              <span class="meta-label">归档时间</span>
              <span class="meta-value">{{ formatDate(activeArchiveDetail.archivedAt) }}</span>
            </div>
            <div v-if="activeArchiveDetail.version" class="detail-meta-item">
              <span class="meta-label">版本</span>
              <span class="meta-value">V{{ activeArchiveDetail.version }}</span>
            </div>
            <div v-if="activeArchiveDetail.rating" class="detail-meta-item">
              <span class="meta-label">评分</span>
              <span class="meta-value">
                {{ '★'.repeat(Math.round(activeArchiveDetail.rating)) }}
                {{ '☆'.repeat(5 - Math.round(activeArchiveDetail.rating || 0)) }}
              </span>
            </div>
            <div v-if="activeArchiveDetail.usageCount !== undefined" class="detail-meta-item">
              <span class="meta-label">使用次数</span>
              <span class="meta-value">{{ activeArchiveDetail.usageCount }} 次</span>
            </div>
          </div>

          <div class="detail-section">
            <h5>描述</h5>
            <p>{{ activeArchiveDetail.description }}</p>
          </div>

          <div class="detail-section">
            <h5>元数据</h5>
            <div class="metadata-grid">
              <div
                v-for="(md, idx) in getMetadataDisplay(activeArchiveDetail)"
                :key="idx"
                class="metadata-item"
              >
                <span class="metadata-label">{{ md.label }}</span>
                <span class="metadata-value">{{ md.value }}</span>
              </div>
            </div>
          </div>

          <div v-if="activeArchiveDetail.tags.length > 0" class="detail-section">
            <h5>标签</h5>
            <div class="detail-tags">
              <span v-for="tag in activeArchiveDetail.tags" :key="tag" class="detail-tag">
                #{{ tag }}
              </span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-danger btn-sm" @click="reviewStore.deleteArchiveItem(activeArchiveDetail.id); closeDetail()">
            🗑️ 删除归档
          </button>
          <button class="btn btn-secondary" @click="closeDetail">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>
