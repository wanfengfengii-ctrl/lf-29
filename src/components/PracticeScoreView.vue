<script setup lang="ts">
import { useCraftTemplateStore } from '@/stores/craftTemplate'
import { useMaskStore } from '@/stores/mask'
import { ref, computed } from 'vue'
import { SCHOOL_STYLE_META, type PracticeSubmission, type DeviationType } from '@/types'

const store = useCraftTemplateStore()
const maskStore = useMaskStore()

const apprenticeFilter = ref('')
const templateFilter = ref<string>('')
const severityFilter = ref<'all' | 'critical' | 'major' | 'minor'>('all')

const submitModalVisible = ref(false)
const selectedSubmissionId = ref<string | null>(null)
const apprenticeName = ref('学徒' + Math.floor(Math.random() * 1000))
const submitTemplateId = ref(store.activeTemplateId || store.templates[0]?.id || '')
const submitSchemeId = ref(maskStore.activeScheme?.id || '')
const submitResult = ref<PracticeSubmission | null>(null)

const deviationLabel: Record<DeviationType, string> = {
  missing_step: '工序缺失',
  extra_step: '额外工序',
  order_wrong: '顺序错误',
  color_mismatch: '配色缺失',
  area_deviation: '面积偏差',
  material_mismatch: '材料缺失',
  completion_insufficient: '完成不足',
  pattern_missing: '纹线不足',
  pattern_extra: '纹线过多'
}

const severityConfig = {
  critical: { label: '严重', color: '#c62828', icon: '🔴' },
  major: { label: '重要', color: '#e65100', icon: '🟠' },
  minor: { label: '轻微', color: '#f9a825', icon: '🟡' }
}

const gradeConfig = {
  excellent: { label: '优秀', color: '#2e7d32', bg: '#e8f5e9', icon: '🏆' },
  good: { label: '良好', color: '#1565c0', bg: '#e3f2fd', icon: '👍' },
  pass: { label: '及格', color: '#ef6c00', bg: '#fff3e0', icon: '📝' },
  fail: { label: '不及格', color: '#c62828', bg: '#ffebee', icon: '💪' }
}

const filteredSubmissions = computed(() => {
  let list = [...store.submissions]
  if (apprenticeFilter.value.trim()) {
    const kw = apprenticeFilter.value.trim().toLowerCase()
    list = list.filter(s => s.apprenticeName.toLowerCase().includes(kw))
  }
  if (templateFilter.value) {
    list = list.filter(s => s.templateId === templateFilter.value)
  }
  return list
})

const selectedSubmission = computed<PracticeSubmission | null>(() => {
  if (!selectedSubmissionId.value && filteredSubmissions.value.length) {
    selectedSubmissionId.value = filteredSubmissions.value[0].id
  }
  return store.submissions.find(s => s.id === selectedSubmissionId.value) || null
})

const filteredDeviations = computed(() => {
  if (!selectedSubmission.value) return []
  if (severityFilter.value === 'all') return selectedSubmission.value.deviations
  return selectedSubmission.value.deviations.filter(d => d.severity === severityFilter.value)
})

function openSubmitModal() {
  submitTemplateId.value = store.activeTemplateId || store.templates[0]?.id || ''
  submitSchemeId.value = maskStore.activeScheme?.id || maskStore.activeMask?.schemes[0]?.id || ''
  submitResult.value = null
  submitModalVisible.value = true
}

function handleSubmit() {
  if (!submitTemplateId.value || !submitSchemeId.value) return
  const result = store.submitPractice(
    submitTemplateId.value,
    submitSchemeId.value,
    apprenticeName.value.trim() || '匿名学徒'
  )
  if (result) {
    submitResult.value = result
    selectedSubmissionId.value = result.id
  }
}

function formatTime(ts: number) {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const deviationTypeStats = computed(() => {
  if (!selectedSubmission.value) return []
  const map = new Map<DeviationType, number>()
  selectedSubmission.value.deviations.forEach(d => {
    map.set(d.type, (map.get(d.type) || 0) + 1)
  })
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
})

const avgScore = computed(() => {
  if (store.submissions.length === 0) return 0
  const sum = store.submissions.reduce((s, x) => s + (x.totalScore / x.maxScore * 100), 0)
  return Math.round(sum / store.submissions.length)
})

const passRate = computed(() => {
  if (store.submissions.length === 0) return 0
  const pass = store.submissions.filter(s => s.grade !== 'fail').length
  return Math.round(pass / store.submissions.length * 100)
})
</script>

<template>
  <div class="practice-score-page">
    <div class="score-header-bar">
      <div class="score-overview">
        <div class="overview-card">
          <div class="ov-icon">📋</div>
          <div class="ov-value">{{ store.submissions.length }}</div>
          <div class="ov-label">总提交数</div>
        </div>
        <div class="overview-card avg">
          <div class="ov-icon">📊</div>
          <div class="ov-value">{{ avgScore }}%</div>
          <div class="ov-label">平均得分率</div>
        </div>
        <div class="overview-card pass">
          <div class="ov-icon">✅</div>
          <div class="ov-value">{{ passRate }}%</div>
          <div class="ov-label">通过率</div>
        </div>
        <div class="overview-card excellent">
          <div class="ov-icon">🏆</div>
          <div class="ov-value">
            {{ store.submissions.filter(s => s.grade === 'excellent').length }}
          </div>
          <div class="ov-label">优秀作品</div>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary btn-lg" @click="openSubmitModal">
          + 提交新练习
        </button>
      </div>
    </div>

    <div class="score-main-layout">
      <!-- 左侧：提交列表 -->
      <div class="submissions-panel">
        <div class="panel-search">
          <input
            v-model="apprenticeFilter"
            placeholder="🔍 搜索学徒姓名..."
            class="search-input"
          />
          <select v-model="templateFilter" class="filter-select">
            <option value="">全部模板</option>
            <option v-for="t in store.templates" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
        </div>

        <div v-if="filteredSubmissions.length === 0" class="empty-state inline">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-text">暂无提交记录，点击上方按钮提交练习</div>
        </div>

        <div v-else class="submission-list">
          <div
            v-for="s in filteredSubmissions"
            :key="s.id"
            :class="['submission-card', { active: selectedSubmissionId === s.id }]"
            @click="selectedSubmissionId = s.id"
          >
            <div class="sc-top">
              <div
                class="grade-badge"
                :style="{
                  background: gradeConfig[s.grade].bg,
                  color: gradeConfig[s.grade].color,
                  borderColor: gradeConfig[s.grade].color
                }"
              >
                {{ gradeConfig[s.grade].icon }} {{ gradeConfig[s.grade].label }}
              </div>
              <div class="sc-score">
                <span class="sc-score-num">{{ s.totalScore }}</span>
                <span class="sc-score-total">/{{ s.maxScore }}</span>
              </div>
            </div>
            <div class="sc-title">{{ s.templateName }}</div>
            <div class="sc-meta">
              <span>👤 {{ s.apprenticeName }}</span>
            </div>
            <div class="sc-meta">
              <span>🕐 {{ formatTime(s.submittedAt) }}</span>
            </div>
            <div class="sc-deviation-tags">
              <span
                v-if="s.deviations.filter(d=>d.severity==='critical').length"
                class="dv-tag critical"
              >
                🔴 {{ s.deviations.filter(d=>d.severity==='critical').length }}
              </span>
              <span
                v-if="s.deviations.filter(d=>d.severity==='major').length"
                class="dv-tag major"
              >
                🟠 {{ s.deviations.filter(d=>d.severity==='major').length }}
              </span>
              <span
                v-if="s.deviations.filter(d=>d.severity==='minor').length"
                class="dv-tag minor"
              >
                🟡 {{ s.deviations.filter(d=>d.severity==='minor').length }}
              </span>
              <span v-if="s.deviations.length === 0" class="dv-tag perfect">
                ✅ 零偏差
              </span>
            </div>
            <div class="sc-progress-mini">
              <div
                class="sc-progress-fill"
                :style="{
                  width: (s.totalScore / s.maxScore * 100) + '%',
                  background: gradeConfig[s.grade].color
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：评分详情 -->
      <div class="score-detail-panel">
        <div v-if="!selectedSubmission" class="empty-state inline">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-text">选择左侧提交记录查看详情</div>
        </div>

        <template v-else>
          <!-- 评分汇总 -->
          <div
            class="score-summary-card"
            :style="{ borderLeftColor: gradeConfig[selectedSubmission.grade].color }"
          >
            <div class="summary-left">
              <div
                class="grade-display"
                :style="{
                  background: gradeConfig[selectedSubmission.grade].bg,
                  color: gradeConfig[selectedSubmission.grade].color
                }"
              >
                <div class="grade-icon-lg">{{ gradeConfig[selectedSubmission.grade].icon }}</div>
                <div class="grade-text-lg">{{ gradeConfig[selectedSubmission.grade].label }}</div>
                <div class="grade-score-text">
                  {{ selectedSubmission.totalScore }} / {{ selectedSubmission.maxScore }}
                </div>
                <div class="grade-percent">
                  {{ Math.round(selectedSubmission.totalScore / selectedSubmission.maxScore * 100) }}%
                </div>
              </div>
            </div>
            <div class="summary-right">
              <h3 class="summary-title">{{ selectedSubmission.templateName }}</h3>
              <div class="summary-meta">
                <div class="meta-row">
                  <span class="meta-k">学徒：</span>
                  <span class="meta-v">{{ selectedSubmission.apprenticeName }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-k">流派：</span>
                  <span class="meta-v">
                    {{
                      SCHOOL_STYLE_META[store.templates.find(t=>t.id===selectedSubmission.templateId)?.school || 'custom'].label
                    }}
                  </span>
                </div>
                <div class="meta-row">
                  <span class="meta-k">提交时间：</span>
                  <span class="meta-v">{{ formatTime(selectedSubmission.submittedAt) }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-k">方案工序：</span>
                  <span class="meta-v">{{ selectedSubmission.schemeSnapshot.layers.length }} 道</span>
                </div>
              </div>
              <div class="severity-stats">
                <div class="sev-stat critical">
                  <span class="sev-num">{{ selectedSubmission.deviations.filter(d=>d.severity==='critical').length }}</span>
                  <span class="sev-label">严重</span>
                </div>
                <div class="sev-stat major">
                  <span class="sev-num">{{ selectedSubmission.deviations.filter(d=>d.severity==='major').length }}</span>
                  <span class="sev-label">重要</span>
                </div>
                <div class="sev-stat minor">
                  <span class="sev-num">{{ selectedSubmission.deviations.filter(d=>d.severity==='minor').length }}</span>
                  <span class="sev-label">轻微</span>
                </div>
                <div class="sev-stat deduction">
                  <span class="sev-num">-{{ selectedSubmission.deviations.reduce((s,d)=>s+d.scoreDeduction,0) }}</span>
                  <span class="sev-label">总扣分</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 反馈 -->
          <div class="feedback-card">
            <div class="feedback-title">💬 综合评语</div>
            <div class="feedback-content">
              <p v-for="(line, i) in selectedSubmission.feedback.split('\n')" :key="i">{{ line }}</p>
            </div>
          </div>

          <!-- 分步骤评分 -->
          <div class="section-wrap">
            <div class="section-title-wrap">
              <h4>📊 分工序评分</h4>
              <span class="section-sub">共 {{ selectedSubmission.stepScores.length }} 道工序</span>
            </div>
            <div class="step-score-list">
              <div
                v-for="(ss, idx) in selectedSubmission.stepScores"
                :key="ss.stepId"
                :class="[
                  'step-score-item',
                  { perfect: ss.score === ss.maxScore, has_issue: ss.score < ss.maxScore }
                ]"
              >
                <div class="ss-header">
                  <div class="ss-order">{{ idx + 1 }}</div>
                  <div class="ss-name">{{ ss.stepName }}</div>
                  <div class="ss-score-box">
                    <span class="ss-score" :class="{ full: ss.score === ss.maxScore }">
                      {{ ss.score }}
                    </span>
                    <span class="ss-max">/{{ ss.maxScore }}</span>
                  </div>
                </div>
                <div class="ss-progress">
                  <div
                    class="ss-progress-fill"
                    :style="{
                      width: (ss.score / ss.maxScore * 100) + '%',
                      background: ss.score === ss.maxScore ? '#43a047' :
                                  ss.score >= ss.maxScore * 0.75 ? '#1e88e5' :
                                  ss.score >= ss.maxScore * 0.6 ? '#fb8c00' : '#e53935'
                    }"
                  ></div>
                </div>
                <div class="ss-issues">
                  <div v-for="(issue, i) in ss.issues" :key="i" class="issue-line">
                    <span class="issue-bullet">{{ issue.includes('扣') || issue.includes('缺') || issue.includes('不足') ? '⚠️' : '✅' }}</span>
                    <span>{{ issue }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 偏差类型统计 -->
          <div class="section-wrap" v-if="deviationTypeStats.length">
            <div class="section-title-wrap">
              <h4>📈 偏差类型分析</h4>
              <span class="section-sub">{{ deviationTypeStats.length }} 类问题</span>
            </div>
            <div class="dev-type-grid">
              <div v-for="[type, count] in deviationTypeStats" :key="type" class="dev-type-item">
                <div class="dev-type-name">{{ deviationLabel[type as DeviationType] }}</div>
                <div class="dev-type-bar-wrap">
                  <div
                    class="dev-type-bar"
                    :style="{
                      width: Math.min(100, count / selectedSubmission.deviations.length * 100) + '%'
                    }"
                  ></div>
                </div>
                <div class="dev-type-count">{{ count }} 项</div>
              </div>
            </div>
          </div>

          <!-- 偏差明细 -->
          <div class="section-wrap">
            <div class="section-title-wrap">
              <h4>🔍 偏差明细</h4>
              <div class="severity-filter-bar">
                <button
                  :class="['sf-btn', { active: severityFilter === 'all' }]"
                  @click="severityFilter = 'all'"
                >
                  全部 {{ selectedSubmission.deviations.length }}
                </button>
                <button
                  :class="['sf-btn critical', { active: severityFilter === 'critical' }]"
                  @click="severityFilter = 'critical'"
                >
                  🔴 严重 {{ selectedSubmission.deviations.filter(d=>d.severity==='critical').length }}
                </button>
                <button
                  :class="['sf-btn major', { active: severityFilter === 'major' }]"
                  @click="severityFilter = 'major'"
                >
                  🟠 重要 {{ selectedSubmission.deviations.filter(d=>d.severity==='major').length }}
                </button>
                <button
                  :class="['sf-btn minor', { active: severityFilter === 'minor' }]"
                  @click="severityFilter = 'minor'"
                >
                  🟡 轻微 {{ selectedSubmission.deviations.filter(d=>d.severity==='minor').length }}
                </button>
              </div>
            </div>

            <div v-if="filteredDeviations.length === 0" class="empty-state inline compact">
              <div class="empty-state-icon">✅</div>
              <div class="empty-state-text">
                {{ severityFilter === 'all' ? '完美！零偏差，形神兼备！' : '当前筛选下无偏差项' }}
              </div>
            </div>

            <div v-else class="deviation-list">
              <div
                v-for="d in filteredDeviations"
                :key="d.id"
                :class="['deviation-card', d.severity]"
              >
                <div class="dv-card-header">
                  <div class="dv-sev-badge" :style="{ background: severityConfig[d.severity].color }">
                    {{ severityConfig[d.severity].icon }} {{ severityConfig[d.severity].label }}
                  </div>
                  <div class="dv-type-tag">{{ deviationLabel[d.type] }}</div>
                  <div class="dv-deduction">-{{ d.scoreDeduction }}分</div>
                </div>
                <div class="dv-target">📍 {{ d.targetName }}</div>
                <div class="dv-description">
                  {{ d.description }}
                </div>
                <div class="dv-compare">
                  <div class="compare-col">
                    <div class="compare-label">📐 标准要求</div>
                    <div class="compare-value expected">{{ d.expected }}</div>
                  </div>
                  <div class="compare-arrow">→</div>
                  <div class="compare-col">
                    <div class="compare-label">🧪 实际情况</div>
                    <div class="compare-value actual">{{ d.actual }}</div>
                  </div>
                </div>
                <div class="dv-suggestion">
                  <span class="suggestion-icon">💡</span>
                  <span>{{ d.suggestion }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 提交Modal -->
    <div v-if="submitModalVisible" class="modal-overlay" @click.self="submitModalVisible = false">
      <div class="modal" style="max-width: 600px">
        <div class="modal-header">
          <h3>📝 提交练习评分</h3>
          <button class="icon-btn" @click="submitModalVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <template v-if="!submitResult">
            <div class="form-item mb-12">
              <label>学徒姓名</label>
              <input v-model="apprenticeName" placeholder="请输入姓名或学号" />
            </div>
            <div class="form-row">
              <div class="form-item mb-12">
                <label>对照标准模板</label>
                <select v-model="submitTemplateId">
                  <option v-for="t in store.templates" :key="t.id" :value="t.id">
                    [{{ SCHOOL_STYLE_META[t.school].label }}] {{ t.name }}
                  </option>
                </select>
              </div>
              <div class="form-item mb-12">
                <label>练习方案</label>
                <select v-model="submitSchemeId">
                  <option
                    v-for="s in maskStore.activeMask?.schemes || []"
                    :key="s.id"
                    :value="s.id"
                  >
                    {{ s.name }}（{{ s.layers.length }}工序）
                  </option>
                </select>
              </div>
            </div>
            <div class="form-item mb-12">
              <div class="info-hint">
                💡 系统将自动比对以下9项指标：工序完整性、工序顺序、完成度、材料填写、推荐配色、着色面积、纹线数量、纹线类别、额外工序
              </div>
            </div>
          </template>
          <template v-else>
            <div
              class="result-banner"
              :style="{
                background: gradeConfig[submitResult.grade].bg,
                borderColor: gradeConfig[submitResult.grade].color
              }"
            >
              <div class="rb-left">
                <div class="rb-grade-icon">{{ gradeConfig[submitResult.grade].icon }}</div>
              </div>
              <div class="rb-right">
                <div class="rb-grade" :style="{ color: gradeConfig[submitResult.grade].color }">
                  {{ gradeConfig[submitResult.grade].label }}
                </div>
                <div class="rb-score">
                  得分 <strong>{{ submitResult.totalScore }}</strong> / {{ submitResult.maxScore }}
                  （{{ Math.round(submitResult.totalScore / submitResult.maxScore * 100) }}%）
                </div>
                <div class="rb-deviations">
                  偏差：{{ submitResult.deviations.length }} 项
                  （🔴{{ submitResult.deviations.filter(d=>d.severity==='critical').length }}
                  🟠{{ submitResult.deviations.filter(d=>d.severity==='major').length }}
                  🟡{{ submitResult.deviations.filter(d=>d.severity==='minor').length }}）
                </div>
              </div>
            </div>
            <div class="result-feedback mt-16">
              <p v-for="(line, i) in submitResult.feedback.split('\n')" :key="i">{{ line }}</p>
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <template v-if="!submitResult">
            <button class="btn btn-secondary" @click="submitModalVisible = false">取消</button>
            <button
              class="btn btn-primary"
              :disabled="!submitTemplateId || !submitSchemeId"
              @click="handleSubmit"
            >
              🔍 提交并评分
            </button>
          </template>
          <template v-else>
            <button
              class="btn btn-secondary"
              @click="submitResult = null"
            >
              再评一份
            </button>
            <button
              class="btn btn-primary"
              @click="submitModalVisible = false"
            >
              查看详情
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
