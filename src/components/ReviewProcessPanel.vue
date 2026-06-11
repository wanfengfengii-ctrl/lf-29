<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useReviewArchiveStore } from '@/stores/reviewArchive'
import { useMaskStore } from '@/stores/mask'
import { useCraftTemplateStore } from '@/stores/craftTemplate'
import { PROCESS_TYPE_META, type RejectionCategory } from '@/types'

const reviewStore = useReviewArchiveStore()
const maskStore = useMaskStore()
const templateStore = useCraftTemplateStore()

const showCreateReviewModal = ref(false)
const showStageReviewModal = ref(false)
const showCommentModal = ref(false)
const showModificationModal = ref(false)
const showReplyModal = ref(false)

const selectedStageId = ref('')
const selectedCommentId = ref('')

const newReviewMaskId = ref('')
const newReviewSchemeId = ref('')
const newReviewTemplateId = ref('')
const newReviewCreator = ref('学徒' + Math.floor(Math.random() * 1000))

const reviewStageAccepted = ref(true)
const reviewStageComments = ref('')
const reviewStageRejectionCategory = ref<RejectionCategory>('technique')
const reviewStageRejectionReason = ref('')
const reviewStageRejectionSuggestions = ref<string[]>(['', '', ''])

const masterCommentReviewer = ref('李师傅（第三代传人）')
const masterCommentContent = ref('')
const masterCommentRating = ref(4)
const masterCommentHighlights = ref<string[]>(['', '', ''])
const masterCommentImprovements = ref<string[]>(['', '', ''])

const modificationTargetType = ref<'scheme' | 'layer' | 'pattern'>('layer')
const modificationTargetId = ref('')
const modificationTargetName = ref('')
const modificationDescription = ref('')
const modificationChangeType = ref<'add' | 'modify' | 'remove'>('modify')
const modificationOldValue = ref('')
const modificationNewValue = ref('')
const modificationAuthor = ref('')

const replyAuthor = ref('')
const replyContent = ref('')

const availableSchemes = computed(() => {
  const mask = maskStore.masks.find(m => m.id === newReviewMaskId.value)
  return mask?.schemes || []
})

const statusLabelMap: Record<string, string> = {
  pending: '待提交',
  submitted: '已提交待审',
  under_review: '评审中',
  accepted: '验收通过',
  rejected: '验收不通过',
  archived: '已归档'
}

const statusColorMap: Record<string, string> = {
  pending: '#9e9e9e',
  submitted: '#ff9800',
  under_review: '#2196f3',
  accepted: '#4caf50',
  rejected: '#f44336',
  archived: '#607d8b'
}

const rejectionCategoryOptions: { value: RejectionCategory; label: string }[] = [
  { value: 'technique', label: '工艺技法' },
  { value: 'material', label: '材料使用' },
  { value: 'color', label: '配色问题' },
  { value: 'pattern', label: '纹线造型' },
  { value: 'order', label: '工序顺序' },
  { value: 'other', label: '其他问题' }
]

function openCreateReviewModal() {
  newReviewMaskId.value = maskStore.activeMaskId || maskStore.masks[0]?.id || ''
  newReviewSchemeId.value = maskStore.activeScheme?.id || ''
  newReviewTemplateId.value = templateStore.activeTemplateId || ''
  showCreateReviewModal.value = true
}

function handleCreateReview() {
  if (!newReviewMaskId.value || !newReviewSchemeId.value) return

  const mask = maskStore.masks.find(m => m.id === newReviewMaskId.value)
  const scheme = mask?.schemes.find(s => s.id === newReviewSchemeId.value)
  const template = templateStore.templates.find(t => t.id === newReviewTemplateId.value)

  reviewStore.createReview({
    maskId: newReviewMaskId.value,
    maskName: mask?.name || '',
    schemeId: newReviewSchemeId.value,
    schemeName: scheme?.name || '',
    templateId: template?.id,
    templateName: template?.name,
    type: newReviewTemplateId.value ? 'template' : 'scheme',
    createdBy: newReviewCreator.value || '匿名用户'
  })

  showCreateReviewModal.value = false
}

function openStageReviewModal(stageId: string) {
  selectedStageId.value = stageId
  reviewStageAccepted.value = true
  reviewStageComments.value = ''
  reviewStageRejectionCategory.value = 'technique'
  reviewStageRejectionReason.value = ''
  reviewStageRejectionSuggestions.value = ['', '', '']
  showStageReviewModal.value = true
}

function handleStageReview() {
  if (!reviewStore.activeReview || !selectedStageId.value) return

  const rejection = reviewStageAccepted.value ? undefined : {
    category: reviewStageRejectionCategory.value,
    reason: reviewStageRejectionReason.value,
    suggestions: reviewStageRejectionSuggestions.value.filter(s => s.trim())
  }

  reviewStore.reviewStage(
    reviewStore.activeReview.id,
    selectedStageId.value,
    reviewStageAccepted.value,
    '李师傅（第三代传人）',
    reviewStageComments.value,
    rejection
  )

  showStageReviewModal.value = false
}

function openCommentModal() {
  masterCommentContent.value = ''
  masterCommentRating.value = 4
  masterCommentHighlights.value = ['', '', '']
  masterCommentImprovements.value = ['', '', '']
  showCommentModal.value = true
}

function handleAddComment() {
  if (!reviewStore.activeReview) return

  reviewStore.addMasterComment(
    reviewStore.activeReview.id,
    masterCommentReviewer.value,
    masterCommentContent.value,
    masterCommentRating.value,
    masterCommentHighlights.value.filter(h => h.trim()),
    masterCommentImprovements.value.filter(i => i.trim())
  )

  showCommentModal.value = false
}

function openReplyModal(commentId: string) {
  selectedCommentId.value = commentId
  replyAuthor.value = ''
  replyContent.value = ''
  showReplyModal.value = true
}

function handleReply() {
  if (!reviewStore.activeReview || !selectedCommentId.value) return

  reviewStore.replyToMasterComment(
    reviewStore.activeReview.id,
    selectedCommentId.value,
    replyAuthor.value || '匿名',
    replyContent.value
  )

  showReplyModal.value = false
}

function openModificationModal() {
  modificationTargetType.value = 'layer'
  modificationTargetId.value = ''
  modificationTargetName.value = ''
  modificationDescription.value = ''
  modificationChangeType.value = 'modify'
  modificationOldValue.value = ''
  modificationNewValue.value = ''
  modificationAuthor.value = newReviewCreator.value
  showModificationModal.value = true
}

function handleAddModification() {
  if (!reviewStore.activeReview) return

  reviewStore.addModificationTrack(
    reviewStore.activeReview.id,
    {
      targetType: modificationTargetType.value,
      targetId: modificationTargetId.value || 'general',
      targetName: modificationTargetName.value || '通用修改',
      description: modificationDescription.value,
      changeType: modificationChangeType.value,
      oldValue: modificationOldValue.value || undefined,
      newValue: modificationNewValue.value || undefined,
      author: modificationAuthor.value || '匿名',
      status: 'in_progress'
    }
  )

  showModificationModal.value = false
}

function submitForReview() {
  if (!reviewStore.activeReview) return
  reviewStore.submitReview(reviewStore.activeReview.id)
}

function startReviewProcess() {
  if (!reviewStore.activeReview) return
  reviewStore.startReview(reviewStore.activeReview.id, '李师傅（第三代传人）')
}

function resubmitStage(stageId: string, actualResults: string[]) {
  if (!reviewStore.activeReview) return
  reviewStore.resubmitStage(reviewStore.activeReview.id, stageId, actualResults)
}

watch(newReviewMaskId, () => {
  newReviewSchemeId.value = availableSchemes.value[0]?.id || ''
})
</script>

<template>
  <div class="review-process-panel">
    <div class="page-intro">
      <h3>🔍 工艺评审与传承档案中心</h3>
      <p class="text-muted">按工序提交送审，记录评审过程与修改意见，建立完整传承档案</p>
    </div>

    <div class="review-actions-bar">
      <button class="btn btn-primary" @click="openCreateReviewModal">
        + 新建评审记录
      </button>
      <button
        v-if="reviewStore.activeReview && reviewStore.activeReview.status === 'pending'"
        class="btn btn-success"
        @click="submitForReview"
      >
        📤 提交评审
      </button>
      <button
        v-if="reviewStore.activeReview && reviewStore.activeReview.status === 'submitted'"
        class="btn btn-info"
        @click="startReviewProcess"
      >
        🔬 开始评审
      </button>
      <button
        v-if="reviewStore.activeReview && (reviewStore.activeReview.status === 'under_review' || reviewStore.activeReview.status === 'submitted')"
        class="btn btn-secondary"
        @click="openCommentModal"
      >
        💬 师傅点评
      </button>
      <button
        v-if="reviewStore.activeReview"
        class="btn btn-secondary"
        @click="openModificationModal"
      >
        📝 记录修改
      </button>
    </div>

    <div class="review-list-section" v-if="!reviewStore.activeReview">
      <div v-if="reviewStore.reviewRecords.length === 0" class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">暂无评审记录，点击上方按钮创建</div>
      </div>

      <div v-else class="review-list">
        <div class="list-section-title">
          <h4>⏳ 待处理评审 ({{ reviewStore.pendingReviews.length }})</h4>
        </div>
        <div
          v-for="review in reviewStore.pendingReviews"
          :key="review.id"
          class="review-list-item"
          @click="reviewStore.setActiveReview(review.id)"
        >
          <div class="review-item-header">
            <span class="review-item-title">{{ review.maskName }} - {{ review.schemeName }}</span>
            <span
              class="status-badge"
              :style="{ background: statusColorMap[review.status] }"
            >
              {{ statusLabelMap[review.status] }}
            </span>
          </div>
          <div class="review-item-meta">
            <span>创建人: {{ review.createdBy }}</span>
            <span>工序: {{ review.stages.length }} 道</span>
            <span>当前进度: {{ review.currentStageIndex + 1 }}/{{ review.stages.length }}</span>
          </div>
          <div class="review-item-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${((review.currentStageIndex) / review.stages.length) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>

        <div class="list-section-title mt-24">
          <h4>✅ 已完成评审 ({{ reviewStore.completedReviews.length }})</h4>
        </div>
        <div
          v-for="review in reviewStore.completedReviews"
          :key="review.id"
          class="review-list-item completed"
          @click="reviewStore.setActiveReview(review.id)"
        >
          <div class="review-item-header">
            <span class="review-item-title">{{ review.maskName }} - {{ review.schemeName }}</span>
            <span
              class="status-badge"
              :style="{ background: statusColorMap[review.status] }"
            >
              {{ statusLabelMap[review.status] }}
            </span>
          </div>
          <div class="review-item-meta">
            <span>创建人: {{ review.createdBy }}</span>
            <span>最终得分: {{ review.finalScore || '-' }}</span>
            <span>等级: {{ review.finalGrade || '-' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="review-detail-section">
      <div class="review-detail-header">
        <div class="review-detail-title">
          <button class="btn btn-sm btn-secondary" @click="reviewStore.setActiveReview('')">
            ← 返回列表
          </button>
          <h3>{{ reviewStore.activeReview.maskName }} - {{ reviewStore.activeReview.schemeName }}</h3>
          <span
            class="status-badge large"
            :style="{ background: statusColorMap[reviewStore.activeReview.status] }"
          >
            {{ statusLabelMap[reviewStore.activeReview.status] }}
          </span>
        </div>
        <div class="review-detail-meta">
          <span>创建人: {{ reviewStore.activeReview.createdBy }}</span>
          <span>模板: {{ reviewStore.activeReview.templateName || '无' }}</span>
          <span>创建时间: {{ new Date(reviewStore.activeReview.createdAt).toLocaleString() }}</span>
        </div>
      </div>

      <div class="stages-timeline">
        <h4>📋 工序阶段验收</h4>
        <div class="timeline">
          <div
            v-for="(stage, idx) in reviewStore.activeReview.stages"
            :key="stage.id"
            :class="['timeline-item', { active: idx === reviewStore.activeReview.currentStageIndex }]"
          >
            <div
              class="timeline-node"
              :style="{ background: statusColorMap[stage.status] }"
            >
              {{ idx + 1 }}
            </div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-step-name">{{ stage.stepName }}</span>
                <span
                  class="layer-type-badge"
                  :style="{ background: PROCESS_TYPE_META[stage.layerType]?.color || '#666' }"
                >
                  {{ PROCESS_TYPE_META[stage.layerType]?.label || stage.layerType }}
                </span>
                <span
                  class="status-badge"
                  :style="{ background: statusColorMap[stage.status] }"
                >
                  {{ statusLabelMap[stage.status] }}
                </span>
              </div>

              <div v-if="stage.acceptanceCriteria.length > 0" class="criteria-section">
                <div class="criteria-title">验收标准：</div>
                <ul class="criteria-list">
                  <li v-for="(c, ci) in stage.acceptanceCriteria" :key="ci">{{ c }}</li>
                </ul>
              </div>

              <div v-if="stage.rejections.length > 0" class="rejection-section">
                <div class="rejection-title">❌ 退回记录</div>
                <div v-for="(rej, ri) in stage.rejections" :key="rej.id" class="rejection-item">
                  <div class="rejection-meta">
                    <span class="rejection-category">{{ rejectionCategoryOptions.find(o => o.value === rej.category)?.label }}</span>
                    <span class="rejection-time">{{ new Date(rej.rejectedAt).toLocaleString() }}</span>
                    <span class="rejection-reviewer">{{ rej.reviewer }}</span>
                  </div>
                  <div class="rejection-reason">原因：{{ rej.reason }}</div>
                  <div class="rejection-suggestions">
                    改进建议：
                    <ul>
                      <li v-for="(s, si) in rej.suggestions" :key="si">{{ s }}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div v-if="stage.reReviews.length > 0" class="rereview-section">
                <div class="rereview-title">🔄 复审记录</div>
                <div v-for="(rr, ri) in stage.reReviews" :key="rr.id" class="rereview-item">
                  <span :class="['rereview-result', rr.result]">
                    {{ rr.result === 'pass' ? '✅ 通过' : '❌ 不通过' }}
                  </span>
                  <span class="rereview-reviewer">{{ rr.reviewer }}</span>
                  <span class="rereview-time">{{ new Date(rr.reviewedAt).toLocaleString() }}</span>
                  <p class="rereview-comments">{{ rr.comments }}</p>
                </div>
              </div>

              <div v-if="stage.comments" class="stage-comments">
                <span class="comments-label">💬 评审意见：</span>
                <span>{{ stage.comments }}</span>
              </div>

              <div class="timeline-actions">
                <button
                  v-if="stage.status === 'pending' && reviewStore.activeReview.status === 'under_review'"
                  class="btn btn-sm btn-primary"
                  @click.stop="submitStageForReview(reviewStore.activeReview.id, stage.id, [])"
                >
                  📤 提交此工序
                </button>
                <button
                  v-if="stage.status === 'submitted' && reviewStore.activeReview.status === 'under_review'"
                  class="btn btn-sm btn-success"
                  @click.stop="openStageReviewModal(stage.id)"
                >
                  🔬 评审此工序
                </button>
                <button
                  v-if="stage.status === 'rejected'"
                  class="btn btn-sm btn-warning"
                  @click.stop="resubmitStage(stage.id, ['已按要求改进'])"
                >
                  🔄 重新提交
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="reviewStore.activeReview.masterComments.length > 0" class="comments-section">
        <h4>💬 师傅点评</h4>
        <div
          v-for="comment in reviewStore.activeReview.masterComments"
          :key="comment.id"
          class="comment-card"
        >
          <div class="comment-header">
            <span class="comment-reviewer">{{ comment.reviewer }}</span>
            <span class="comment-rating">
              {{ '★'.repeat(comment.rating) }}{{ '☆'.repeat(5 - comment.rating) }}
            </span>
            <span class="comment-time">{{ new Date(comment.createdAt).toLocaleString() }}</span>
          </div>
          <p class="comment-content">{{ comment.content }}</p>

          <div v-if="comment.highlights.length > 0" class="comment-highlights">
            <div class="comment-section-title">✨ 亮点</div>
            <ul>
              <li v-for="(h, hi) in comment.highlights" :key="hi">{{ h }}</li>
            </ul>
          </div>

          <div v-if="comment.improvements.length > 0" class="comment-improvements">
            <div class="comment-section-title">📌 改进建议</div>
            <ul>
              <li v-for="(imp, ii) in comment.improvements" :key="ii">{{ imp }}</li>
            </ul>
          </div>

          <button class="btn btn-sm btn-link" @click="openReplyModal(comment.id)">
            ↩️ 回复
          </button>

          <div v-if="comment.replies && comment.replies.length > 0" class="comment-replies">
            <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
              <span class="reply-author">{{ reply.author }}</span>
              <span class="reply-time">{{ new Date(reply.createdAt).toLocaleString() }}</span>
              <p class="reply-content">{{ reply.content }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="reviewStore.activeReview.modifications.length > 0" class="modifications-section">
        <h4>📝 修改意见跟踪</h4>
        <div class="modifications-table-wrap">
          <table class="modifications-table">
            <thead>
              <tr>
                <th>修改对象</th>
                <th>变更类型</th>
                <th>描述</th>
                <th>原值</th>
                <th>新值</th>
                <th>操作人</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="mod in reviewStore.activeReview.modifications" :key="mod.id">
                <td>{{ mod.targetName }}</td>
                <td>
                  <span :class="['change-type-badge', mod.changeType]">
                    {{ { add: '新增', modify: '修改', remove: '删除' }[mod.changeType] }}
                  </span>
                </td>
                <td>{{ mod.description }}</td>
                <td class="mono-sm">{{ mod.oldValue || '-' }}</td>
                <td class="mono-sm">{{ mod.newValue || '-' }}</td>
                <td>{{ mod.author }}</td>
                <td>
                  <span
                    class="status-badge"
                    :style="{
                      background: {
                        pending: '#9e9e9e',
                        in_progress: '#ff9800',
                        completed: '#2196f3',
                        verified: '#4caf50'
                      }[mod.status]
                    }"
                  >
                    {{ { pending: '待处理', in_progress: '处理中', completed: '待验证', verified: '已验证' }[mod.status] }}
                  </span>
                </td>
                <td>
                  <button
                    v-if="mod.status === 'pending'"
                    class="btn btn-xs btn-warning"
                    @click="reviewStore.updateModificationStatus(reviewStore.activeReview!.id, mod.id, 'in_progress')"
                  >
                    开始
                  </button>
                  <button
                    v-if="mod.status === 'in_progress'"
                    class="btn btn-xs btn-info"
                    @click="reviewStore.updateModificationStatus(reviewStore.activeReview!.id, mod.id, 'completed')"
                  >
                    完成
                  </button>
                  <button
                    v-if="mod.status === 'completed'"
                    class="btn btn-xs btn-success"
                    @click="reviewStore.updateModificationStatus(reviewStore.activeReview!.id, mod.id, 'verified', '李师傅')"
                  >
                    验证
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="reviewStore.activeReview.reviewConclusion" class="conclusion-section">
        <h4>📌 评审结论</h4>
        <div class="conclusion-card">
          <p>{{ reviewStore.activeReview.reviewConclusion }}</p>
          <div class="conclusion-meta" v-if="reviewStore.activeReview.finalScore !== undefined">
            <span>最终得分：{{ reviewStore.activeReview.finalScore }}</span>
            <span>等级：{{ reviewStore.activeReview.finalGrade }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建评审 Modal -->
    <div v-if="showCreateReviewModal" class="modal-overlay" @click.self="showCreateReviewModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>📋 新建评审记录</h3>
          <button class="icon-btn" @click="showCreateReviewModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-item mb-12">
            <label>选择面具</label>
            <select v-model="newReviewMaskId">
              <option v-for="m in maskStore.masks" :key="m.id" :value="m.id">
                {{ m.name }}（{{ m.schemes.length }}套方案）
              </option>
            </select>
          </div>
          <div class="form-item mb-12">
            <label>选择方案</label>
            <select v-model="newReviewSchemeId">
              <option v-for="s in availableSchemes" :key="s.id" :value="s.id">
                {{ s.name }}（{{ s.layers.length }}道工序）
              </option>
            </select>
          </div>
          <div class="form-item mb-12">
            <label>对照工艺模板（可选）</label>
            <select v-model="newReviewTemplateId">
              <option value="">不使用模板（自定义评审）</option>
              <option v-for="t in templateStore.templates" :key="t.id" :value="t.id">
                {{ t.name }}（{{ t.processSteps.length }}道工序）
              </option>
            </select>
          </div>
          <div class="form-item mb-12">
            <label>申请人</label>
            <input v-model="newReviewCreator" placeholder="请输入您的姓名" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCreateReviewModal = false">取消</button>
          <button
            class="btn btn-primary"
            :disabled="!newReviewMaskId || !newReviewSchemeId"
            @click="handleCreateReview"
          >
            创建评审
          </button>
        </div>
      </div>
    </div>

    <!-- 工序评审 Modal -->
    <div v-if="showStageReviewModal" class="modal-overlay" @click.self="showStageReviewModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>🔬 工序评审</h3>
          <button class="icon-btn" @click="showStageReviewModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-item mb-12">
            <label>评审结果</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" v-model="reviewStageAccepted" :value="true" />
                <span>✅ 验收通过</span>
              </label>
              <label class="radio-label">
                <input type="radio" v-model="reviewStageAccepted" :value="false" />
                <span>❌ 验收不通过（退回）</span>
              </label>
            </div>
          </div>
          <div class="form-item mb-12">
            <label>评审意见</label>
            <textarea v-model="reviewStageComments" placeholder="请输入评审意见"></textarea>
          </div>
          <template v-if="!reviewStageAccepted">
            <div class="form-item mb-12">
              <label>问题类别</label>
              <select v-model="reviewStageRejectionCategory">
                <option v-for="opt in rejectionCategoryOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="form-item mb-12">
              <label>退回原因</label>
              <textarea v-model="reviewStageRejectionReason" placeholder="请详细说明退回原因"></textarea>
            </div>
            <div class="form-item mb-12">
              <label>改进建议（每行一条）</label>
              <input v-for="(s, si) in reviewStageRejectionSuggestions" :key="si"
                v-model="reviewStageRejectionSuggestions[si]"
                :placeholder="`建议 ${si + 1}`"
                class="mb-8"
              />
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showStageReviewModal = false">取消</button>
          <button class="btn btn-primary" @click="handleStageReview">
            确认{{ reviewStageAccepted ? '通过' : '退回' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 师傅点评 Modal -->
    <div v-if="showCommentModal" class="modal-overlay" @click.self="showCommentModal = false">
      <div class="modal" style="max-width: 720px">
        <div class="modal-header">
          <h3>💬 师傅点评</h3>
          <button class="icon-btn" @click="showCommentModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-item mb-12">
            <label>点评人</label>
            <input v-model="masterCommentReviewer" />
          </div>
          <div class="form-item mb-12">
            <label>总体评分</label>
            <div class="rating-stars">
              <span
                v-for="i in 5"
                :key="i"
                :class="['star', { active: i <= masterCommentRating }]"
                @click="masterCommentRating = i"
              >
                ★
              </span>
            </div>
          </div>
          <div class="form-item mb-12">
            <label>点评内容</label>
            <textarea v-model="masterCommentContent" placeholder="请输入总体点评"></textarea>
          </div>
          <div class="form-item mb-12">
            <label>✨ 亮点（每行一条）</label>
            <input v-for="(h, hi) in masterCommentHighlights" :key="hi"
              v-model="masterCommentHighlights[hi]"
              :placeholder="`亮点 ${hi + 1}`"
              class="mb-8"
            />
          </div>
          <div class="form-item mb-12">
            <label>📌 改进建议（每行一条）</label>
            <input v-for="(imp, ii) in masterCommentImprovements" :key="ii"
              v-model="masterCommentImprovements[ii]"
              :placeholder="`建议 ${ii + 1}`"
              class="mb-8"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCommentModal = false">取消</button>
          <button class="btn btn-primary" @click="handleAddComment">提交点评</button>
        </div>
      </div>
    </div>

    <!-- 修改记录 Modal -->
    <div v-if="showModificationModal" class="modal-overlay" @click.self="showModificationModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>📝 记录修改</h3>
          <button class="icon-btn" @click="showModificationModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-item mb-12">
              <label>修改对象类型</label>
              <select v-model="modificationTargetType">
                <option value="scheme">方案</option>
                <option value="layer">工序</option>
                <option value="pattern">纹线</option>
              </select>
            </div>
            <div class="form-item mb-12">
              <label>变更类型</label>
              <select v-model="modificationChangeType">
                <option value="add">新增</option>
                <option value="modify">修改</option>
                <option value="remove">删除</option>
              </select>
            </div>
          </div>
          <div class="form-item mb-12">
            <label>修改对象名称</label>
            <input v-model="modificationTargetName" placeholder="例如：传统鹿角灰上灰" />
          </div>
          <div class="form-item mb-12">
            <label>修改描述</label>
            <textarea v-model="modificationDescription" placeholder="请描述修改内容"></textarea>
          </div>
          <div class="form-row">
            <div class="form-item mb-12">
              <label>原值</label>
              <input v-model="modificationOldValue" placeholder="修改前的值" />
            </div>
            <div class="form-item mb-12">
              <label>新值</label>
              <input v-model="modificationNewValue" placeholder="修改后的值" />
            </div>
          </div>
          <div class="form-item mb-12">
            <label>操作人</label>
            <input v-model="modificationAuthor" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showModificationModal = false">取消</button>
          <button class="btn btn-primary" @click="handleAddModification">保存记录</button>
        </div>
      </div>
    </div>

    <!-- 回复 Modal -->
    <div v-if="showReplyModal" class="modal-overlay" @click.self="showReplyModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>↩️ 回复点评</h3>
          <button class="icon-btn" @click="showReplyModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-item mb-12">
            <label>回复人</label>
            <input v-model="replyAuthor" placeholder="请输入您的姓名" />
          </div>
          <div class="form-item mb-12">
            <label>回复内容</label>
            <textarea v-model="replyContent" placeholder="请输入回复内容"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showReplyModal = false">取消</button>
          <button class="btn btn-primary" @click="handleReply">发送回复</button>
        </div>
      </div>
    </div>
  </div>
</template>
