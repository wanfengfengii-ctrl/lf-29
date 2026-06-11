<script setup lang="ts">
import { useCraftTemplateStore } from '@/stores/craftTemplate'
import { useMaskStore } from '@/stores/mask'
import { ref, computed, watch } from 'vue'
import {
  SCHOOL_STYLE_META,
  PROCESS_TYPE_META,
  type SchoolStyle,
  type ProcessType,
  type TemplateProcessStep,
  type ColorTemplate,
  type LineSketch,
  type MaterialItem
} from '@/types'

const store = useCraftTemplateStore()
const maskStore = useMaskStore()

type SubTab = 'list' | 'detail' | 'apply' | 'teaching' | 'practice' | 'review' | 'archive' | 'inheritance'
const subTab = ref<SubTab>('list')

const createModalVisible = ref(false)
const applyModalVisible = ref(false)
const teachingModalVisible = ref(false)
const practiceModalVisible = ref(false)

const newTemplateName = ref('')
const newTemplateSchool = ref<SchoolStyle>('jiangxi')
const newTemplateMaskType = ref('')
const newTemplateDesc = ref('')

const applyTargetMaskId = ref('')
const applySchemeName = ref('')
const applyResult = ref<{ success: boolean; message: string } | null>(null)

const practiceApprenticeName = ref('学徒' + Math.floor(Math.random() * 1000))
const practiceSchemeId = ref('')
const practiceSubmitError = ref('')

const schoolFilter = ref<SchoolStyle | 'all'>('all')

const filteredTemplates = computed(() => {
  if (schoolFilter.value === 'all') return store.sortedTemplates
  return store.sortedTemplates.filter(t => t.school === schoolFilter.value)
})

const detailTemplate = computed(() => store.activeTemplate)

const processTypesList: ProcessType[] = ['base_embryo', 'polishing', 'plastering', 'face_carving', 'gold_outlining', 'custom']

function openCreateModal() {
  newTemplateName.value = ''
  newTemplateSchool.value = 'jiangxi'
  newTemplateMaskType.value = ''
  newTemplateDesc.value = ''
  createModalVisible.value = true
}

function handleCreate() {
  if (!newTemplateName.value.trim()) return
  store.createTemplate({
    name: newTemplateName.value.trim(),
    school: newTemplateSchool.value,
    maskType: newTemplateMaskType.value.trim(),
    description: newTemplateDesc.value.trim()
  })
  createModalVisible.value = false
  subTab.value = 'detail'
}

function openApplyModal(templateId: string) {
  store.setActiveTemplate(templateId)
  applyTargetMaskId.value = maskStore.activeMaskId || maskStore.masks[0]?.id || ''
  applySchemeName.value = `套用·${store.activeTemplate?.name || '模板'}`
  applyResult.value = null
  applyModalVisible.value = true
}

function handleApply() {
  if (!store.activeTemplateId || !applyTargetMaskId.value) return
  const result = store.applyTemplateToScheme(
    store.activeTemplateId,
    applyTargetMaskId.value,
    applySchemeName.value.trim()
  )
  applyResult.value = { success: result.success, message: result.message }
  if (result.success && result.schemeId) {
    maskStore.switchScheme(result.schemeId)
  }
}

function openTeachingModal(templateId: string) {
  store.setActiveTemplate(templateId)
  teachingModalVisible.value = true
}

function onTeachingSubmitPractice(templateId: string) {
  store.setActiveTemplate(templateId)
  teachingModalVisible.value = false
  practiceSchemeId.value = maskStore.activeScheme?.id || ''
  practiceSubmitError.value = ''
  practiceModalVisible.value = true
}

function openPracticeModal(templateId: string) {
  store.setActiveTemplate(templateId)
  practiceSchemeId.value = maskStore.activeScheme?.id || ''
  practiceSubmitError.value = ''
  practiceModalVisible.value = true
}

function handleSubmitPractice() {
  practiceSubmitError.value = ''
  if (!store.activeTemplateId) {
    practiceSubmitError.value = '请先选择一个工艺模板'
    return
  }
  if (!practiceSchemeId.value) {
    practiceSubmitError.value = '请选择要评分的练习方案'
    return
  }
  const submission = store.submitPractice(
    store.activeTemplateId,
    practiceSchemeId.value,
    practiceApprenticeName.value.trim() || '匿名学徒'
  )
  if (!submission) {
    practiceSubmitError.value = '提交失败：方案不存在或数据异常，请确认方案后重试'
    return
  }
  practiceModalVisible.value = false
  subTab.value = 'practice'
}

const lineCategoryLabel: Record<LineSketch['category'], string> = {
  face_outline: '脸型轮廓',
  facial_feature: '五官特征',
  decoration: '装饰纹饰',
  symbol: '符号纹样'
}

const materialCategoryLabel: Record<MaterialItem['category'], string> = {
  wood: '木料',
  paint: '颜料',
  tool: '工具',
  accessory: '配件',
  other: '其他'
}

const difficultyStars = (level: number) => '★'.repeat(level) + '☆'.repeat(5 - level)
</script>

<template>
  <div class="craft-template-page">
    <div class="sub-tabs">
      <button
        v-for="t in [
          { k: 'list', label: '模板库', icon: '📚' },
          { k: 'detail', label: '模板详情', icon: '📋' },
          { k: 'apply', label: '一键套用', icon: '✨' },
          { k: 'teaching', label: '教学演示', icon: '🎓' },
          { k: 'practice', label: '练习评分', icon: '📝' },
          { k: 'review', label: '工艺评审', icon: '🔍' },
          { k: 'archive', label: '归档检索', icon: '📚' },
          { k: 'inheritance', label: '传承档案', icon: '📖' }
        ] as { k: SubTab; label: string; icon: string }[]"
        :key="t.k"
        :class="['sub-tab-btn', { active: subTab === t.k }]"
        @click="subTab = t.k"
      >
        {{ t.icon }} {{ t.label }}
      </button>
    </div>

    <div class="sub-content">
      <!-- 模板库 -->
      <div v-if="subTab === 'list'" class="template-library">
        <div class="library-header">
          <div class="filter-bar" style="margin-bottom: 0">
            <button
              :class="['filter-chip', { active: schoolFilter === 'all' }]"
              @click="schoolFilter = 'all'"
            >
              全部流派
            </button>
            <button
              v-for="(meta, key) in SCHOOL_STYLE_META"
              :key="key"
              :class="['filter-chip', { active: schoolFilter === key }]"
              @click="schoolFilter = key as SchoolStyle"
              :style="schoolFilter === key ? { background: meta.color, borderColor: meta.color } : {}"
            >
              {{ meta.label }}
            </button>
          </div>
          <button class="btn btn-primary" @click="openCreateModal">
            + 新建模板
          </button>
        </div>

        <div v-if="filteredTemplates.length === 0" class="empty-state">
          <div class="empty-state-icon">📜</div>
          <div class="empty-state-text">暂无此流派的模板，点击上方按钮创建</div>
        </div>

        <div v-else class="template-grid">
          <div
            v-for="tpl in filteredTemplates"
            :key="tpl.id"
            :class="['template-card', { active: store.activeTemplateId === tpl.id }]"
            @click="store.setActiveTemplate(tpl.id); subTab = 'detail'"
          >
            <div
              class="template-card-banner"
              :style="{ background: SCHOOL_STYLE_META[tpl.school].color }"
            >
              <span class="template-school-tag">
                {{ SCHOOL_STYLE_META[tpl.school].label }}
              </span>
              <span class="template-rating">⭐ {{ tpl.rating }}</span>
            </div>
            <div class="template-card-body">
              <h4 class="template-card-title">{{ tpl.name }}</h4>
              <p class="template-card-desc">{{ tpl.description }}</p>
              <div class="template-meta-row">
                <span class="meta-pill">{{ tpl.maskType || '通用' }}</span>
                <span class="meta-pill">👤 {{ tpl.author }}</span>
              </div>
              <div class="template-stats">
                <div class="stat-item-sm">
                  <span class="stat-value-sm">{{ tpl.processSteps.length }}</span>
                  <span class="stat-label-sm">工序</span>
                </div>
                <div class="stat-item-sm">
                  <span class="stat-value-sm">{{ tpl.colorTemplates.length }}</span>
                  <span class="stat-label-sm">配色</span>
                </div>
                <div class="stat-item-sm">
                  <span class="stat-value-sm">{{ tpl.lineSketches.length }}</span>
                  <span class="stat-label-sm">纹线</span>
                </div>
                <div class="stat-item-sm">
                  <span class="stat-value-sm">{{ tpl.usageCount }}</span>
                  <span class="stat-label-sm">使用</span>
                </div>
              </div>
              <div class="template-tags">
                <span v-for="tag in tpl.tags.slice(0, 4)" :key="tag" class="template-tag">{{ tag }}</span>
              </div>
              <div class="template-card-actions" @click.stop>
                <button class="btn btn-sm btn-primary" @click="openApplyModal(tpl.id)">
                  ✨ 套用
                </button>
                <button class="btn btn-sm btn-secondary" @click="openTeachingModal(tpl.id)">
                  🎓 教学
                </button>
                <button class="btn btn-sm btn-secondary" @click="openPracticeModal(tpl.id)">
                  📝 评分
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 模板详情 -->
      <div v-else-if="subTab === 'detail'" class="template-detail">
        <div v-if="!detailTemplate" class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">请先在模板库中选择一个模板</div>
        </div>
        <div v-else class="detail-content">
          <div class="detail-header-card">
            <div class="detail-header-left">
              <div
                class="detail-banner"
                :style="{ background: SCHOOL_STYLE_META[detailTemplate.school].color }"
              >
                {{ SCHOOL_STYLE_META[detailTemplate.school].label }}
              </div>
              <div class="detail-title-area">
                <h2>{{ detailTemplate.name }}</h2>
                <p class="text-muted text-small mt-8">
                  {{ detailTemplate.description }}
                </p>
                <div class="detail-badges">
                  <span class="detail-badge">👤 {{ detailTemplate.author }}</span>
                  <span class="detail-badge">🎭 {{ detailTemplate.maskType || '通用类型' }}</span>
                  <span class="detail-badge">📦 V{{ detailTemplate.version }}</span>
                  <span class="detail-badge">⭐ {{ detailTemplate.rating }}</span>
                  <span class="detail-badge">🔥 {{ detailTemplate.usageCount }}次使用</span>
                </div>
              </div>
            </div>
            <div class="detail-actions">
              <button class="btn btn-primary" @click="openApplyModal(detailTemplate.id)">
                ✨ 一键套用
              </button>
              <button class="btn btn-secondary" @click="openTeachingModal(detailTemplate.id)">
                🎓 开始教学
              </button>
              <button class="btn btn-secondary" @click="openPracticeModal(detailTemplate.id)">
                📝 提交练习
              </button>
              <button
                class="btn btn-danger btn-sm"
                @click="store.deleteTemplate(detailTemplate.id)"
                v-if="store.templates.length > 1"
              >
                🗑️ 删除
              </button>
            </div>
          </div>

          <div class="detail-sections">
            <!-- 工序步骤 -->
            <div class="detail-section">
              <div class="section-header">
                <h3>📝 标准工序（{{ detailTemplate.processSteps.length }}道）</h3>
              </div>
              <div class="step-list">
                <div
                  v-for="step in [...detailTemplate.processSteps].sort((a,b)=>a.order-b.order)"
                  :key="step.id"
                  class="step-card"
                >
                  <div class="step-header">
                    <div class="step-order-badge">{{ step.order }}</div>
                    <div class="step-title">
                      <h4>{{ step.stepName }}</h4>
                      <div class="step-meta">
                        <span
                          class="layer-type-badge"
                          :style="{ background: PROCESS_TYPE_META[step.layerType].color }"
                        >
                          {{ PROCESS_TYPE_META[step.layerType].label }}
                        </span>
                        <span class="step-time">⏱️ {{ step.durationMinutes }}分钟</span>
                        <span class="step-difficulty">难度 {{ difficultyStars(step.difficultyLevel) }}</span>
                      </div>
                    </div>
                  </div>
                  <p class="step-description">{{ step.description }}</p>

                  <div class="step-content-grid">
                    <div class="step-block" v-if="step.keyPoints.length">
                      <h5>🔑 操作要点</h5>
                      <ul>
                        <li v-for="(k, i) in step.keyPoints" :key="i">{{ k }}</li>
                      </ul>
                    </div>
                    <div class="step-block" v-if="step.commonMistakes.length">
                      <h5>⚠️ 常见错误</h5>
                      <ul>
                        <li v-for="(m, i) in step.commonMistakes" :key="i" class="mistake-item">{{ m }}</li>
                      </ul>
                    </div>
                    <div class="step-block" v-if="step.qualityStandards.length">
                      <h5>✅ 质量标准</h5>
                      <ul>
                        <li v-for="(q, i) in step.qualityStandards" :key="i">{{ q }}</li>
                      </ul>
                    </div>
                    <div class="step-block" v-if="step.safetyNotes.length">
                      <h5>🛡️ 安全注意</h5>
                      <ul>
                        <li v-for="(s, i) in step.safetyNotes" :key="i" class="safety-item">{{ s }}</li>
                      </ul>
                    </div>
                  </div>

                  <div class="step-footer" v-if="step.recommendedColors.length || step.materials.length">
                    <div class="step-colors" v-if="step.recommendedColors.length">
                      <span class="footer-label">配色：</span>
                      <span
                        v-for="c in step.recommendedColors"
                        :key="c"
                        class="color-chip"
                        :style="{ background: c }"
                        :title="detailTemplate.colorTemplates.find(ct=>ct.color===c)?.name"
                      ></span>
                      <span
                        v-for="c in step.recommendedColors"
                        :key="'n'+c"
                        class="color-name-tag"
                      >
                        {{ detailTemplate.colorTemplates.find(ct=>ct.color===c)?.name || c }}
                      </span>
                    </div>
                    <div class="step-materials" v-if="step.materials.length">
                      <span class="footer-label">用料：</span>
                      {{ step.materials.join('、') }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 配色模板 -->
            <div class="detail-section">
              <div class="section-header">
                <h3>🎨 示范配色（{{ detailTemplate.colorTemplates.length }}种）</h3>
              </div>
              <div v-if="detailTemplate.colorTemplates.length === 0" class="empty-state inline">
                <div class="empty-state-text">暂无配色定义</div>
              </div>
              <div v-else class="color-grid">
                <div
                  v-for="c in detailTemplate.colorTemplates"
                  :key="c.id"
                  class="color-card"
                >
                  <div class="color-swatch-lg" :style="{ background: c.color }"></div>
                  <div class="color-info">
                    <div class="color-name-lg">{{ c.name }}</div>
                    <div class="color-purpose">{{ c.purpose }}</div>
                    <div class="color-usage">适用：{{ c.usageArea }}</div>
                    <div class="color-meta-sm">
                      <span>{{ c.color }}</span>
                      <span>透明度 {{ c.opacity }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 纹线示意 -->
            <div class="detail-section">
              <div class="section-header">
                <h3>✏️ 关键纹线（{{ detailTemplate.lineSketches.length }}组）</h3>
              </div>
              <div v-if="detailTemplate.lineSketches.length === 0" class="empty-state inline">
                <div class="empty-state-text">暂无纹线示意</div>
              </div>
              <div v-else class="line-grid">
                <div
                  v-for="line in detailTemplate.lineSketches"
                  :key="line.id"
                  class="line-card"
                >
                  <div class="line-preview">
                    <svg viewBox="0 0 100 110" width="100%" height="120">
                      <rect x="0" y="0" width="100" height="110" fill="#fffaf0" />
                      <path
                        v-if="line.path"
                        :d="line.path"
                        fill="none"
                        stroke="#8B4513"
                        stroke-width="1.2"
                        stroke-linejoin="round"
                      />
                      <text v-else x="50" y="60" text-anchor="middle" fill="#aaa" font-size="10">
                        无路径
                      </text>
                    </svg>
                  </div>
                  <div class="line-info">
                    <div class="line-name">{{ line.name }}</div>
                    <span class="line-cat-tag">{{ lineCategoryLabel[line.category] }}</span>
                    <div class="line-desc">{{ line.description }}</div>
                    <div class="line-keypoints" v-if="line.keyPoints">
                      📌 {{ line.keyPoints }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 材料清单 -->
            <div class="detail-section">
              <div class="section-header">
                <h3>📦 材料清单（{{ detailTemplate.materials.length }}项）</h3>
              </div>
              <div v-if="detailTemplate.materials.length === 0" class="empty-state inline">
                <div class="empty-state-text">暂无材料清单</div>
              </div>
              <div v-else class="material-table-wrap">
                <table class="material-table">
                  <thead>
                    <tr>
                      <th>类别</th>
                      <th>名称</th>
                      <th>规格</th>
                      <th>用量</th>
                      <th>备注</th>
                      <th>替代方案</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="m in detailTemplate.materials" :key="m.id">
                      <td>
                        <span class="mat-cat-tag" :data-cat="m.category">
                          {{ materialCategoryLabel[m.category] }}
                        </span>
                      </td>
                      <td class="mat-name">{{ m.name }}</td>
                      <td>{{ m.specification }}</td>
                      <td>{{ m.quantity }}</td>
                      <td class="mat-notes">{{ m.notes }}</td>
                      <td class="mat-alt">{{ m.alternative || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 注意事项 -->
            <div class="detail-section" v-if="detailTemplate.precautions.length">
              <div class="section-header">
                <h3>⚠️ 工艺注意事项</h3>
              </div>
              <ul class="precaution-list">
                <li v-for="(p, i) in detailTemplate.precautions" :key="i">
                  <span class="pre-num">{{ i + 1 }}</span>
                  <span>{{ p }}</span>
                </li>
              </ul>
            </div>

            <!-- 文化背景与传承 -->
            <div class="detail-section" v-if="detailTemplate.culturalBackground || detailTemplate.inheritanceNotes">
              <div class="section-header">
                <h3>📖 文化传承</h3>
              </div>
              <div class="culture-grid">
                <div class="culture-block" v-if="detailTemplate.culturalBackground">
                  <h5>🏛️ 文化背景</h5>
                  <p>{{ detailTemplate.culturalBackground }}</p>
                </div>
                <div class="culture-block" v-if="detailTemplate.inheritanceNotes">
                  <h5>👨‍🏫 传承说明</h5>
                  <p>{{ detailTemplate.inheritanceNotes }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 一键套用页面 -->
      <div v-else-if="subTab === 'apply'" class="apply-page">
        <div class="page-intro">
          <h3>✨ 一键套用工艺模板</h3>
          <p class="text-muted">选择模板和目标面具，自动创建标准工序方案</p>
        </div>
        <div class="apply-form-card">
          <div class="form-item mb-12">
            <label>选择工艺模板</label>
            <select v-model="store.activeTemplateId" style="max-width: 480px">
              <option v-for="t in store.templates" :key="t.id" :value="t.id">
                [{{ SCHOOL_STYLE_META[t.school].label }}] {{ t.name }}
              </option>
            </select>
          </div>
          <div v-if="store.activeTemplate" class="selected-tpl-info">
            <div class="tpl-info-row">
              <span class="tpl-info-label">模板描述：</span>
              {{ store.activeTemplate.description }}
            </div>
            <div class="tpl-info-row">
              <span class="tpl-info-label">包含工序：</span>
              {{ store.activeTemplate.processSteps.length }} 道工序 ·
              {{ store.activeTemplate.colorTemplates.length }} 种配色 ·
              {{ store.activeTemplate.lineSketches.length }} 组纹线 ·
              {{ store.activeTemplate.materials.length }} 项材料
            </div>
          </div>
          <div class="form-row mt-16">
            <div class="form-item mb-12">
              <label>目标面具</label>
              <select v-model="applyTargetMaskId">
                <option v-for="m in maskStore.masks" :key="m.id" :value="m.id">
                  {{ m.name }}（{{ m.schemes.length }}套方案）
                </option>
              </select>
            </div>
            <div class="form-item mb-12">
              <label>新方案名称</label>
              <input v-model="applySchemeName" placeholder="自动生成方案名称" />
            </div>
          </div>
          <div class="apply-result" v-if="applyResult">
            <div :class="['validation-alert', applyResult.success ? 'warning' : 'error']">
              {{ applyResult.success ? '✅' : '❌' }} {{ applyResult.message }}
            </div>
          </div>
          <div class="apply-actions">
            <button
              class="btn btn-primary btn-lg"
              :disabled="!store.activeTemplateId || !applyTargetMaskId"
              @click="handleApply"
            >
              🚀 一键套用模板
            </button>
          </div>
        </div>
      </div>

      <!-- 教学演示页面 -->
      <div v-else-if="subTab === 'teaching'" class="teaching-page">
        <div class="page-intro">
          <h3>🎓 教学演示模式</h3>
          <p class="text-muted">分步骤学习标准工序，了解推荐顺序与常见错误</p>
        </div>
        <TeachingModeView />
      </div>

      <!-- 练习评分页面 -->
      <div v-else-if="subTab === 'practice'" class="practice-page">
        <div class="page-intro">
          <h3>📝 学徒练习提交与评分</h3>
          <p class="text-muted">提交您的练习方案，自动与标准模板比对并输出分析</p>
        </div>
        <PracticeScoreView />
      </div>

      <!-- 工艺评审页面 -->
      <div v-else-if="subTab === 'review'" class="review-page">
        <ReviewProcessPanel />
      </div>

      <!-- 归档检索页面 -->
      <div v-else-if="subTab === 'archive'" class="archive-page">
        <ArchiveSearchPanel />
      </div>

      <!-- 传承档案页面 -->
      <div v-else-if="subTab === 'inheritance'" class="inheritance-page">
        <InheritanceArchivePanel />
      </div>
    </div>

    <!-- 创建模板 Modal -->
    <div v-if="createModalVisible" class="modal-overlay" @click.self="createModalVisible = false">
      <div class="modal">
        <div class="modal-header">
          <h3>📜 新建师承工艺模板</h3>
          <button class="icon-btn" @click="createModalVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-item mb-12">
            <label>模板名称 *</label>
            <input v-model="newTemplateName" placeholder="如：江西傩·开山神将标准模板" />
          </div>
          <div class="form-row">
            <div class="form-item mb-12">
              <label>流派</label>
              <select v-model="newTemplateSchool">
                <option v-for="(meta, key) in SCHOOL_STYLE_META" :key="key" :value="key">
                  {{ meta.label }}（{{ meta.region }}）
                </option>
              </select>
            </div>
            <div class="form-item mb-12">
              <label>面具类型</label>
              <input v-model="newTemplateMaskType" placeholder="如：开山傩面、傩公傩母" />
            </div>
          </div>
          <div class="form-item">
            <label>模板描述</label>
            <textarea v-model="newTemplateDesc" placeholder="简要描述此模板的工艺特色、适用场景等"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="createModalVisible = false">取消</button>
          <button
            class="btn btn-primary"
            @click="handleCreate"
            :disabled="!newTemplateName.trim()"
          >
            创建模板
          </button>
        </div>
      </div>
    </div>

    <!-- 套用 Modal -->
    <div v-if="applyModalVisible" class="modal-overlay" @click.self="applyModalVisible = false">
      <div class="modal" style="max-width: 560px">
        <div class="modal-header">
          <h3>✨ 一键套用模板</h3>
          <button class="icon-btn" @click="applyModalVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="tpl-highlight">
            <strong>{{ store.activeTemplate?.name }}</strong>
            <div class="text-small text-muted mt-8">{{ store.activeTemplate?.description }}</div>
            <div class="tpl-highlight-meta mt-12">
              <span>{{ store.activeTemplate?.processSteps.length }} 工序</span>
              <span>{{ store.activeTemplate?.colorTemplates.length }} 配色</span>
              <span>{{ store.activeTemplate?.materials.length }} 材料</span>
            </div>
          </div>
          <div class="form-item mb-12 mt-16">
            <label>目标面具</label>
            <select v-model="applyTargetMaskId">
              <option v-for="m in maskStore.masks" :key="m.id" :value="m.id">
                {{ m.name }}（{{ m.schemes.length }}套方案）
              </option>
            </select>
          </div>
          <div class="form-item mb-12">
            <label>方案名称</label>
            <input v-model="applySchemeName" />
          </div>
          <div class="apply-result" v-if="applyResult">
            <div :class="['validation-alert', applyResult.success ? 'warning' : 'error']">
              {{ applyResult.success ? '✅' : '❌' }} {{ applyResult.message }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="applyModalVisible = false">取消</button>
          <button
            class="btn btn-primary"
            :disabled="!applyTargetMaskId"
            @click="handleApply"
          >
            确认套用
          </button>
        </div>
      </div>
    </div>

    <!-- 教学 Modal -->
    <div v-if="teachingModalVisible" class="modal-overlay" @click.self="teachingModalVisible = false">
      <div class="modal" style="max-width: 900px; width: 95%">
        <div class="modal-header">
          <h3>🎓 {{ store.activeTemplate?.name }} — 教学演示</h3>
          <button class="icon-btn" @click="teachingModalVisible = false">✕</button>
        </div>
        <div class="modal-body" style="padding: 12px">
          <TeachingModeView @submit-practice="onTeachingSubmitPractice" />
        </div>
      </div>
    </div>

    <!-- 练习评分 Modal -->
    <div v-if="practiceModalVisible" class="modal-overlay" @click.self="practiceModalVisible = false">
      <div class="modal" style="max-width: 720px">
        <div class="modal-header">
          <h3>📝 提交练习评分</h3>
          <button class="icon-btn" @click="practiceModalVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="tpl-highlight mb-16">
            <strong>对照模板：{{ store.activeTemplate?.name }}</strong>
            <div class="text-small text-muted mt-8">流派：{{ store.activeTemplate ? SCHOOL_STYLE_META[store.activeTemplate.school].label : '' }}</div>
          </div>
          <div class="form-row">
            <div class="form-item mb-12">
              <label>学徒姓名</label>
              <input v-model="practiceApprenticeName" placeholder="请输入姓名或学号" />
            </div>
            <div class="form-item mb-12">
              <label>练习方案</label>
              <select v-model="practiceSchemeId">
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
          <div class="text-small text-muted" style="color: #8b4513">
            💡 系统将自动比对工序顺序、完成度、配色、纹线等指标，生成偏差分析报告与评分结果
          </div>
          <div v-if="practiceSubmitError" class="validation-alert error mt-12">
            ⚠️ {{ practiceSubmitError }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="practiceModalVisible = false">取消</button>
          <button
            class="btn btn-primary"
            :disabled="!practiceSchemeId"
            @click="handleSubmitPractice"
          >
            提交并评分
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import TeachingModeView from './TeachingModeView.vue'
import PracticeScoreView from './PracticeScoreView.vue'
import ReviewProcessPanel from './ReviewProcessPanel.vue'
import ArchiveSearchPanel from './ArchiveSearchPanel.vue'
import InheritanceArchivePanel from './InheritanceArchivePanel.vue'
export default {
  components: { TeachingModeView, PracticeScoreView, ReviewProcessPanel, ArchiveSearchPanel, InheritanceArchivePanel }
}
</script>
