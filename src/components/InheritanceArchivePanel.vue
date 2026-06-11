<script setup lang="ts">
import { ref, computed } from 'vue'
import { useReviewArchiveStore } from '@/stores/reviewArchive'
import { useMaskStore } from '@/stores/mask'
import { useCraftTemplateStore } from '@/stores/craftTemplate'
import { PROCESS_TYPE_META, type InheritanceArchive } from '@/types'

const reviewStore = useReviewArchiveStore()
const maskStore = useMaskStore()
const templateStore = useCraftTemplateStore()

const showCreateArchiveModal = ref(false)
const showCompleteArchiveModal = ref(false)
const showPreviewModal = ref(false)

const activeArchiveId = ref<string | null>(null)
const previewContent = ref('')

const newArchiveMaskId = ref('')
const newArchiveSchemeId = ref('')
const newArchiveTemplateId = ref('')
const newArchiveApprenticeName = ref('')
const newArchiveMasterName = ref('李师傅（第三代传人）')

const completeGrade = ref<'excellent' | 'good' | 'pass' | 'fail'>('good')
const completeTotalScore = ref(85)
const completeMaxScore = ref(100)
const completeStrengths = ref<string[]>(['', '', ''])
const completeImprovements = ref<string[]>(['', '', ''])
const completeComments = ref('')
const completeEvaluatedBy = ref('李师傅（第三代传人）')

const activeArchive = computed(() => {
  return reviewStore.inheritanceArchives.find(a => a.id === activeArchiveId.value) || null
})

const availableSchemes = computed(() => {
  const mask = maskStore.masks.find(m => m.id === newArchiveMaskId.value)
  return mask?.schemes || []
})

const gradeLabelMap = {
  excellent: '优秀',
  good: '良好',
  pass: '及格',
  fail: '不及格'
}

const gradeColorMap = {
  excellent: '#4caf50',
  good: '#2196f3',
  pass: '#ff9800',
  fail: '#f44336'
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('zh-CN')
}

function openCreateArchiveModal() {
  newArchiveMaskId.value = maskStore.activeMaskId || maskStore.masks[0]?.id || ''
  newArchiveSchemeId.value = maskStore.activeScheme?.id || ''
  newArchiveTemplateId.value = templateStore.activeTemplateId || ''
  newArchiveApprenticeName.value = '学徒' + Math.floor(Math.random() * 1000)
  showCreateArchiveModal.value = true
}

function handleCreateArchive() {
  if (!newArchiveMaskId.value || !newArchiveSchemeId.value || !newArchiveApprenticeName.value) return

  const mask = maskStore.masks.find(m => m.id === newArchiveMaskId.value)
  const scheme = mask?.schemes.find(s => s.id === newArchiveSchemeId.value)
  const template = templateStore.templates.find(t => t.id === newArchiveTemplateId.value)

  reviewStore.createInheritanceArchive({
    maskId: newArchiveMaskId.value,
    maskName: mask?.name || '',
    schemeId: newArchiveSchemeId.value,
    schemeName: scheme?.name || '',
    templateId: template?.id,
    templateName: template?.name,
    apprenticeName: newArchiveApprenticeName.value,
    masterName: newArchiveMasterName.value
  })

  showCreateArchiveModal.value = false
}

function viewArchiveDetail(archiveId: string) {
  activeArchiveId.value = archiveId
}

function backToList() {
  activeArchiveId.value = null
}

function openCompleteModal(archiveId: string) {
  activeArchiveId.value = archiveId
  showCompleteArchiveModal.value = true
  completeStrengths.value = ['', '', '']
  completeImprovements.value = ['', '', '']
  completeComments.value = ''
}

function handleCompleteArchive() {
  if (!activeArchiveId.value) return

  reviewStore.completeInheritanceArchive(activeArchiveId.value, {
    totalScore: completeTotalScore.value,
    maxScore: completeMaxScore.value,
    grade: completeGrade.value,
    strengths: completeStrengths.value.filter(s => s.trim()),
    improvements: completeImprovements.value.filter(s => s.trim()),
    comments: completeComments.value,
    evaluatedBy: completeEvaluatedBy.value
  })

  showCompleteArchiveModal.value = false
}

function previewArchive(archiveId: string) {
  previewContent.value = reviewStore.exportInheritanceArchiveAsMarkdown(archiveId)
  showPreviewModal.value = true
}

function downloadArchive(archiveId: string) {
  reviewStore.downloadInheritanceArchive(archiveId)
}

const archivesByApprentice = computed(() => {
  const map = new Map<string, InheritanceArchive[]>()
  reviewStore.inheritanceArchives.forEach(archive => {
    if (!map.has(archive.apprenticeName)) {
      map.set(archive.apprenticeName, [])
    }
    map.get(archive.apprenticeName)!.push(archive)
  })
  return map
})

const archivesByMaster = computed(() => {
  const map = new Map<string, InheritanceArchive[]>()
  reviewStore.inheritanceArchives.forEach(archive => {
    if (!map.has(archive.masterName)) {
      map.set(archive.masterName, [])
    }
    map.get(archive.masterName)!.push(archive)
  })
  return map
})

const archiveStats = computed(() => ({
  total: reviewStore.inheritanceArchives.length,
  inProgress: reviewStore.inheritanceArchives.filter(a => a.status === 'in_progress').length,
  completed: reviewStore.inheritanceArchives.filter(a => a.status === 'completed').length,
  avgScore: reviewStore.inheritanceArchives.length > 0
    ? (reviewStore.inheritanceArchives
        .filter(a => a.finalEvaluation)
        .reduce((s, a) => s + (a.finalEvaluation?.totalScore || 0), 0) /
       reviewStore.inheritanceArchives.filter(a => a.finalEvaluation).length).toFixed(1)
    : '0'
}))
</script>

<template>
  <div class="inheritance-archive-panel">
    <div class="page-intro">
      <h3>📖 传承档案管理中心</h3>
      <p class="text-muted">建立完整传承档案，记录工序过程、版本演变、教学记录、评分结果与评审结论</p>
    </div>

    <div class="archive-actions-bar">
      <button class="btn btn-primary" @click="openCreateArchiveModal">
        + 新建传承档案
      </button>
    </div>

    <div v-if="!activeArchiveId" class="archive-list-section">
      <div class="archive-stats-row">
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-info">
            <div class="stat-value">{{ archiveStats.total }}</div>
            <div class="stat-label">总计档案</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <div class="stat-value">{{ archiveStats.inProgress }}</div>
            <div class="stat-label">进行中</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-value">{{ archiveStats.completed }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-info">
            <div class="stat-value">{{ archiveStats.avgScore }}</div>
            <div class="stat-label">平均得分</div>
          </div>
        </div>
      </div>

      <div v-if="reviewStore.inheritanceArchives.length === 0" class="empty-state">
        <div class="empty-state-icon">📖</div>
        <div class="empty-state-text">暂无传承档案，点击上方按钮创建</div>
      </div>

      <div v-else class="archive-list">
        <div
          v-for="archive in reviewStore.inheritanceArchives"
          :key="archive.id"
          class="inheritance-archive-card"
          @click="viewArchiveDetail(archive.id)"
        >
          <div class="archive-card-header">
            <div class="archive-card-title">
              <h4>{{ archive.maskName }} - {{ archive.apprenticeName }}</h4>
              <span
                :class="['archive-status-badge', archive.status]"
              >
                {{ archive.status === 'completed' ? '已完成' : '进行中' }}
              </span>
            </div>
            <div class="archive-card-subtitle">
              师傅：{{ archive.masterName }}
            </div>
          </div>

          <div class="archive-card-meta">
            <div class="meta-item">
              <span class="meta-icon">🎭</span>
              <span>{{ archive.schemeName }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-icon">📜</span>
              <span>{{ archive.templateName || '自定义' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-icon">📋</span>
              <span>{{ archive.processRecords.length }} 道工序</span>
            </div>
            <div class="meta-item">
              <span class="meta-icon">📝</span>
              <span>{{ archive.practiceRecords.length }} 次练习</span>
            </div>
            <div class="meta-item">
              <span class="meta-icon">🔍</span>
              <span>{{ archive.reviewRecords.length }} 次评审</span>
            </div>
          </div>

          <div v-if="archive.finalEvaluation" class="archive-card-score">
            <div class="score-display">
              <span class="score-value">{{ archive.finalEvaluation.totalScore }}</span>
              <span class="score-divider">/</span>
              <span class="score-max">{{ archive.finalEvaluation.maxScore }}</span>
            </div>
            <span
              class="grade-badge"
              :style="{ background: gradeColorMap[archive.finalEvaluation.grade] }"
            >
              {{ gradeLabelMap[archive.finalEvaluation.grade] }}
            </span>
          </div>

          <div class="archive-card-footer">
            <span>创建时间：{{ formatDate(archive.createdAt) }}</span>
            <span v-if="archive.completedAt">完成时间：{{ formatDate(archive.completedAt) }}</span>
          </div>

          <div class="archive-card-actions" @click.stop>
            <button
              v-if="archive.status === 'in_progress'"
              class="btn btn-sm btn-success"
              @click="openCompleteModal(archive.id)"
            >
              ✅ 完成评定
            </button>
            <button
              class="btn btn-sm btn-secondary"
              @click="previewArchive(archive.id)"
            >
              👁️ 预览
            </button>
            <button
              class="btn btn-sm btn-primary"
              @click="downloadArchive(archive.id)"
            >
              📥 导出
            </button>
          </div>
        </div>
      </div>

      <div v-if="archivesByApprentice.size > 1" class="archive-group-section">
        <h4>按学徒分组</h4>
        <div class="group-cards">
          <div
            v-for="[name, archives] in archivesByApprentice"
            :key="name"
            class="group-card"
          >
            <div class="group-card-title">{{ name }}</div>
            <div class="group-card-stats">
              <span>{{ archives.length }} 份档案</span>
              <span>
                {{ archives.filter(a => a.status === 'completed').length }} 已完成
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="archive-detail-section">
      <div class="detail-header">
        <button class="btn btn-sm btn-secondary" @click="backToList">
          ← 返回列表
        </button>
        <h3>{{ activeArchive?.maskName }} - {{ activeArchive?.apprenticeName }} 传承档案</h3>
        <span
          :class="['archive-status-badge large', activeArchive?.status]"
        >
          {{ activeArchive?.status === 'completed' ? '已完成' : '进行中' }}
        </span>
      </div>

      <div class="detail-actions">
        <button
          v-if="activeArchive?.status === 'in_progress'"
          class="btn btn-success"
          @click="openCompleteModal(activeArchive.id)"
        >
          ✅ 完成评定
        </button>
        <button class="btn btn-secondary" @click="previewArchive(activeArchiveId!)">
          👁️ 预览档案
        </button>
        <button class="btn btn-primary" @click="downloadArchive(activeArchiveId!)">
          📥 导出完整档案
        </button>
      </div>

      <div class="detail-section">
        <h4>📋 基本信息</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">学徒</span>
            <span class="info-value">{{ activeArchive?.apprenticeName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">指导师傅</span>
            <span class="info-value">{{ activeArchive?.masterName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">面具</span>
            <span class="info-value">{{ activeArchive?.maskName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">方案</span>
            <span class="info-value">{{ activeArchive?.schemeName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">模板</span>
            <span class="info-value">{{ activeArchive?.templateName || '自定义' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">创建时间</span>
            <span class="info-value">{{ activeArchive ? formatDate(activeArchive.createdAt) : '' }}</span>
          </div>
        </div>
      </div>

      <div v-if="activeArchive?.teachingContent" class="detail-section">
        <h4>📚 教学内容</h4>
        <div class="content-block">
          <div class="content-subsection">
            <h5>🏛️ 文化背景</h5>
            <p>{{ activeArchive.teachingContent.culturalBackground }}</p>
          </div>
          <div class="content-subsection">
            <h5>👨‍🏫 传承说明</h5>
            <p>{{ activeArchive.teachingContent.inheritanceNotes }}</p>
          </div>
          <div class="content-subsection">
            <h5>⚠️ 工艺注意事项</h5>
            <ul>
              <li v-for="(p, i) in activeArchive.teachingContent.precautions" :key="i">{{ p }}</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4>📝 工序过程记录</h4>
        <div class="process-timeline">
          <div
            v-for="(record, idx) in activeArchive?.processRecords"
            :key="record.stepId"
            class="process-timeline-item"
          >
            <div
              class="timeline-dot"
              :class="{ completed: record.completion >= 100, inprogress: record.completion > 0 && record.completion < 100 }"
            >
              {{ idx + 1 }}
            </div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="step-name">{{ record.stepName }}</span>
                <span
                  class="layer-type-badge"
                  :style="{ background: PROCESS_TYPE_META[record.layerType]?.color || '#666' }"
                >
                  {{ PROCESS_TYPE_META[record.layerType]?.label || record.layerType }}
                </span>
                <span class="completion-badge" :class="record.completion >= 100 ? 'full' : 'partial'">
                  {{ record.completion }}% 完成
                </span>
              </div>
              <div class="timeline-meta">
                <span>开始：{{ formatDate(record.startedAt) }}</span>
                <span v-if="record.completedAt">完成：{{ formatDate(record.completedAt) }}</span>
              </div>
              <div class="timeline-materials" v-if="record.materials.length > 0">
                <span class="materials-label">用料：</span>
                <span class="materials-list">{{ record.materials.join('、') }}</span>
              </div>
              <div class="timeline-notes" v-if="record.notes">
                <span class="notes-label">备注：</span>
                <span class="notes-content">{{ record.notes }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeArchive?.versionHistory && activeArchive.versionHistory.length > 0" class="detail-section">
        <h4>🔄 版本演变记录</h4>
        <div class="version-list">
          <div v-for="v in activeArchive.versionHistory" :key="v.versionId" class="version-item">
            <div class="version-header">
              <span class="version-badge">V{{ v.versionNumber }}</span>
              <span class="version-name">{{ v.name }}</span>
              <span class="version-author">{{ v.author }}</span>
              <span class="version-date">{{ formatDate(v.createdAt) }}</span>
            </div>
            <div class="version-body">
              <p class="version-desc">{{ v.description || '无描述' }}</p>
              <span v-if="v.diffSummary" class="version-diff">{{ v.diffSummary }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeArchive?.practiceRecords && activeArchive.practiceRecords.length > 0" class="detail-section">
        <h4>📊 练习评分记录</h4>
        <div class="practice-list">
          <div
            v-for="(record, idx) in activeArchive.practiceRecords"
            :key="record.id"
            class="practice-item"
          >
            <div class="practice-header">
              <span class="practice-index">第 {{ idx + 1 }} 次练习</span>
              <span class="practice-template">{{ record.templateName }}</span>
              <span
                class="grade-badge"
                :style="{ background: gradeColorMap[record.grade] }"
              >
                {{ gradeLabelMap[record.grade] }}
              </span>
              <span class="practice-score">{{ record.totalScore }} / {{ record.maxScore }}</span>
            </div>
            <div class="practice-date">{{ formatDate(record.submittedAt) }}</div>
            <div class="practice-step-scores" v-if="record.stepScores.length > 0">
              <div
                v-for="ss in record.stepScores.slice(0, 3)"
                :key="ss.stepId"
                class="step-score-item"
              >
                <span class="step-name">{{ ss.stepName }}</span>
                <div class="step-score-bar">
                  <div
                    class="step-score-fill"
                    :style="{ width: `${(ss.score / ss.maxScore) * 100}%` }"
                  ></div>
                </div>
                <span class="step-score-num">{{ ss.score }}/{{ ss.maxScore }}</span>
              </div>
            </div>
            <p class="practice-feedback">{{ record.feedback }}</p>
          </div>
        </div>
      </div>

      <div v-if="activeArchive?.finalEvaluation" class="detail-section">
        <h4>🏆 最终评定</h4>
        <div class="final-evaluation-card">
          <div class="final-score-row">
            <div class="final-score-display">
              <span class="final-score-value">{{ activeArchive.finalEvaluation.totalScore }}</span>
              <span class="final-score-divider">/</span>
              <span class="final-score-max">{{ activeArchive.finalEvaluation.maxScore }}</span>
            </div>
            <span
              class="grade-badge large"
              :style="{ background: gradeColorMap[activeArchive.finalEvaluation.grade] }"
            >
              {{ gradeLabelMap[activeArchive.finalEvaluation.grade] }}
            </span>
          </div>
          <div class="final-meta">
            <span>评定人：{{ activeArchive.finalEvaluation.evaluatedBy }}</span>
            <span>评定时间：{{ formatDate(activeArchive.finalEvaluation.evaluatedAt) }}</span>
          </div>
          <div class="final-content">
            <div v-if="activeArchive.finalEvaluation.strengths.length > 0" class="final-section">
              <h5>✨ 优点</h5>
              <ul>
                <li v-for="(s, i) in activeArchive.finalEvaluation.strengths" :key="i">{{ s }}</li>
              </ul>
            </div>
            <div v-if="activeArchive.finalEvaluation.improvements.length > 0" class="final-section">
              <h5>📌 待改进</h5>
              <ul>
                <li v-for="(imp, i) in activeArchive.finalEvaluation.improvements" :key="i">{{ imp }}</li>
              </ul>
            </div>
            <div class="final-section">
              <h5>📝 综合评语</h5>
              <p>{{ activeArchive.finalEvaluation.comments }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建档案 Modal -->
    <div v-if="showCreateArchiveModal" class="modal-overlay" @click.self="showCreateArchiveModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>📖 新建传承档案</h3>
          <button class="icon-btn" @click="showCreateArchiveModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-item mb-12">
              <label>学徒姓名 *</label>
              <input v-model="newArchiveApprenticeName" placeholder="请输入学徒姓名" />
            </div>
            <div class="form-item mb-12">
              <label>指导师傅 *</label>
              <input v-model="newArchiveMasterName" />
            </div>
          </div>
          <div class="form-item mb-12">
            <label>选择面具</label>
            <select v-model="newArchiveMaskId">
              <option v-for="m in maskStore.masks" :key="m.id" :value="m.id">
                {{ m.name }}（{{ m.schemes.length }}套方案）
              </option>
            </select>
          </div>
          <div class="form-item mb-12">
            <label>选择方案</label>
            <select v-model="newArchiveSchemeId">
              <option v-for="s in availableSchemes" :key="s.id" :value="s.id">
                {{ s.name }}（{{ s.layers.length }}道工序）
              </option>
            </select>
          </div>
          <div class="form-item mb-12">
            <label>关联工艺模板（可选）</label>
            <select v-model="newArchiveTemplateId">
              <option value="">不关联模板</option>
              <option v-for="t in templateStore.templates" :key="t.id" :value="t.id">
                {{ t.name }}（{{ t.processSteps.length }}道工序）
              </option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCreateArchiveModal = false">取消</button>
          <button
            class="btn btn-primary"
            :disabled="!newArchiveApprenticeName || !newArchiveSchemeId"
            @click="handleCreateArchive"
          >
            创建档案
          </button>
        </div>
      </div>
    </div>

    <!-- 完成评定 Modal -->
    <div v-if="showCompleteArchiveModal" class="modal-overlay" @click.self="showCompleteArchiveModal = false">
      <div class="modal" style="max-width: 720px">
        <div class="modal-header">
          <h3>🏆 完成最终评定</h3>
          <button class="icon-btn" @click="showCompleteArchiveModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-item mb-12">
              <label>总分</label>
              <input type="number" v-model.number="completeTotalScore" min="0" :max="completeMaxScore" />
            </div>
            <div class="form-item mb-12">
              <label>满分</label>
              <input type="number" v-model.number="completeMaxScore" min="1" />
            </div>
          </div>
          <div class="form-item mb-12">
            <label>等级</label>
            <div class="grade-options">
              <button
                v-for="(label, key) in gradeLabelMap"
                :key="key"
                :class="['grade-option-btn', { active: completeGrade === key }]"
                :style="{ borderColor: gradeColorMap[key as keyof typeof gradeColorMap] }"
                @click="completeGrade = key as any"
              >
                {{ label }}
              </button>
            </div>
          </div>
          <div class="form-item mb-12">
            <label>✨ 优点（每行一条）</label>
            <input v-for="(s, si) in completeStrengths" :key="si"
              v-model="completeStrengths[si]"
              :placeholder="`优点 ${si + 1}`"
              class="mb-8"
            />
          </div>
          <div class="form-item mb-12">
            <label>📌 待改进（每行一条）</label>
            <input v-for="(imp, ii) in completeImprovements" :key="ii"
              v-model="completeImprovements[ii]"
              :placeholder="`待改进 ${ii + 1}`"
              class="mb-8"
            />
          </div>
          <div class="form-item mb-12">
            <label>综合评语</label>
            <textarea v-model="completeComments" placeholder="请输入综合评定评语"></textarea>
          </div>
          <div class="form-item mb-12">
            <label>评定人</label>
            <input v-model="completeEvaluatedBy" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCompleteArchiveModal = false">取消</button>
          <button class="btn btn-primary" @click="handleCompleteArchive">完成评定</button>
        </div>
      </div>
    </div>

    <!-- 预览 Modal -->
    <div v-if="showPreviewModal" class="modal-overlay" @click.self="showPreviewModal = false">
      <div class="modal" style="max-width: 900px; width: 95%; max-height: 85vh">
        <div class="modal-header">
          <h3>👁️ 档案预览</h3>
          <button class="icon-btn" @click="showPreviewModal = false">✕</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto">
          <pre class="markdown-preview">{{ previewContent }}</pre>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-primary"
            @click="downloadArchive(activeArchiveId!); showPreviewModal = false"
          >
            📥 下载 Markdown
          </button>
          <button class="btn btn-secondary" @click="showPreviewModal = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>
