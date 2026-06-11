<script setup lang="ts">
import { useCraftTemplateStore } from '@/stores/craftTemplate'
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { SCHOOL_STYLE_META, PROCESS_TYPE_META } from '@/types'

const store = useCraftTemplateStore()

const apprenticeName = ref('学徒')
const selectedTemplateId = ref(store.activeTemplateId || store.templates[0]?.id || '')
const sessionInitialized = ref(false)

let autoTimer: ReturnType<typeof setInterval> | null = null

const currentSession = computed(() => store.activeTeaching)
const currentTemplate = computed(() => {
  const id = currentSession.value?.templateId || selectedTemplateId.value
  return store.templates.find(t => t.id === id) || null
})
const sortedSteps = computed(() => {
  if (!currentTemplate.value) return []
  return [...currentTemplate.value.processSteps].sort((a, b) => a.order - b.order)
})
const currentStep = computed(() => {
  if (!sortedSteps.value.length || !currentSession.value) return null
  return sortedSteps.value[currentSession.value.currentStepIndex] || null
})
const progress = computed(() => {
  if (!sortedSteps.value.length || !currentSession.value) return 0
  return Math.round(((currentSession.value.currentStepIndex + 1) / sortedSteps.value.length) * 100)
})
const totalDuration = computed(() => {
  return sortedSteps.value.reduce((sum, s) => sum + s.durationMinutes, 0)
})
const elapsedDuration = computed(() => {
  if (!currentSession.value) return 0
  return sortedSteps.value
    .slice(0, currentSession.value.currentStepIndex + 1)
    .reduce((sum, s) => sum + s.durationMinutes, 0)
})

function ensureSession() {
  if (!selectedTemplateId.value) return
  if (!currentSession.value || currentSession.value.templateId !== selectedTemplateId.value) {
    store.startTeachingSession(selectedTemplateId.value, apprenticeName.value)
    sessionInitialized.value = true
  }
}

onMounted(() => {
  ensureSession()
})

watch(selectedTemplateId, () => {
  if (currentSession.value) {
    store.closeTeachingSession(currentSession.value.id)
  }
  sessionInitialized.value = false
  ensureSession()
})

onUnmounted(() => {
  if (autoTimer) clearInterval(autoTimer)
})

watch(
  () => currentSession.value?.isPlaying,
  (playing) => {
    if (autoTimer) {
      clearInterval(autoTimer)
      autoTimer = null
    }
    if (playing && currentSession.value?.playMode === 'auto') {
      autoTimer = setInterval(() => {
        if (!currentSession.value) return
        if (currentSession.value.currentStepIndex < sortedSteps.value.length - 1) {
          store.nextStep(currentSession.value.id)
        } else {
          store.togglePlay(currentSession.value.id)
        }
      }, (currentSession.value?.autoPlayInterval || 30) * 1000)
    }
  },
  { immediate: true }
)

const difficultyStars = (level: number) => '★'.repeat(level) + '☆'.repeat(5 - level)
const formatDuration = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 || ''}m` : `${m}m`
</script>

<template>
  <div class="teaching-mode">
    <div v-if="!currentTemplate" class="empty-state">
      <div class="empty-state-icon">🎓</div>
      <div class="empty-state-text">请先选择工艺模板开始教学</div>
    </div>

    <template v-else>
      <!-- 顶部控制条 -->
      <div class="teaching-top-bar">
        <div class="teaching-tpl-select">
          <label class="text-small text-muted">选择模板：</label>
          <select v-model="selectedTemplateId" style="max-width: 360px">
            <option v-for="t in store.templates" :key="t.id" :value="t.id">
              [{{ SCHOOL_STYLE_META[t.school].label }}] {{ t.name }}
            </option>
          </select>
        </div>
        <div class="teaching-info">
          <span class="info-pill">👤 {{ currentSession?.apprenticeName || apprenticeName }}</span>
          <span class="info-pill">
            📚 {{ currentSession ? currentSession.currentStepIndex + 1 : 1 }}/{{ sortedSteps.length }}
          </span>
          <span class="info-pill">⏱️ {{ formatDuration(elapsedDuration) }}/{{ formatDuration(totalDuration) }}</span>
        </div>
      </div>

      <!-- 进度条 -->
      <div class="teaching-progress-wrap">
        <div class="teaching-progress-track">
          <div class="teaching-progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <div class="teaching-progress-labels">
          <span>{{ progress }}% 完成</span>
          <span>{{ sortedSteps.length }} 道标准工序</span>
        </div>
      </div>

      <!-- 工序步骤导航 -->
      <div class="step-navigator">
        <div
          v-for="(step, idx) in sortedSteps"
          :key="step.id"
          :class="[
            'step-nav-item',
            {
              active: currentSession && currentSession.currentStepIndex === idx,
              done: currentSession && idx < currentSession.currentStepIndex,
              current: currentSession && currentSession.currentStepIndex === idx
            }
          ]"
          @click="currentSession && store.goToStep(currentSession.id, idx)"
        >
          <div class="step-nav-badge">
            {{ step.order }}
          </div>
          <div class="step-nav-info">
            <div class="step-nav-name">{{ step.stepName }}</div>
            <div class="step-nav-type">
              <span
                class="nav-type-dot"
                :style="{ background: PROCESS_TYPE_META[step.layerType].color }"
              ></span>
              {{ PROCESS_TYPE_META[step.layerType].label }}
            </div>
          </div>
          <div class="step-nav-time">{{ formatDuration(step.durationMinutes) }}</div>
        </div>
      </div>

      <!-- 当前步骤详情 -->
      <div v-if="currentStep && currentSession" class="current-step-panel">
        <div class="step-header-hero">
          <div class="hero-step-num">
            <div class="hero-num">{{ currentStep.order }}</div>
            <div class="hero-total">/ {{ sortedSteps.length }}</div>
          </div>
          <div class="hero-step-main">
            <h2 class="hero-step-title">{{ currentStep.stepName }}</h2>
            <div class="hero-step-tags">
              <span
                class="layer-type-badge"
                :style="{ background: PROCESS_TYPE_META[currentStep.layerType].color }"
              >
                {{ PROCESS_TYPE_META[currentStep.layerType].label }}
              </span>
              <span class="hero-tag">⏱️ 预计 {{ formatDuration(currentStep.durationMinutes) }}</span>
              <span class="hero-tag">🎯 难度 {{ difficultyStars(currentStep.difficultyLevel) }}</span>
              <span class="hero-tag">📊 进度 {{ progress }}%</span>
            </div>
          </div>
        </div>

        <p class="step-desc-lg">{{ currentStep.description }}</p>

        <div class="step-content-grid-lg">
          <div class="content-block key-block">
            <div class="block-icon">🔑</div>
            <h4>操作要点</h4>
            <ol>
              <li v-for="(k, i) in currentStep.keyPoints" :key="i">{{ k }}</li>
            </ol>
            <div v-if="currentStep.keyPoints.length === 0" class="empty-mini">暂无要点</div>
          </div>

          <div class="content-block mistake-block">
            <div class="block-icon">⚠️</div>
            <h4>常见错误</h4>
            <ul>
              <li v-for="(m, i) in currentStep.commonMistakes" :key="i" class="mistake-item-lg">{{ m }}</li>
            </ul>
            <div v-if="currentStep.commonMistakes.length === 0" class="empty-mini">暂无记录</div>
          </div>

          <div class="content-block quality-block">
            <div class="block-icon">✅</div>
            <h4>质量标准</h4>
            <ul>
              <li v-for="(q, i) in currentStep.qualityStandards" :key="i" class="quality-item">{{ q }}</li>
            </ul>
            <div v-if="currentStep.qualityStandards.length === 0" class="empty-mini">暂无标准</div>
          </div>

          <div class="content-block safety-block">
            <div class="block-icon">🛡️</div>
            <h4>安全注意</h4>
            <ul>
              <li v-for="(s, i) in currentStep.safetyNotes" :key="i" class="safety-item-lg">{{ s }}</li>
            </ul>
            <div v-if="currentStep.safetyNotes.length === 0" class="empty-mini">暂无提示</div>
          </div>
        </div>

        <div class="step-footer-lg">
          <div class="colors-row" v-if="currentStep.recommendedColors.length">
            <span class="row-label">🎨 推荐配色：</span>
            <div class="chips-wrap">
              <span
                v-for="c in currentStep.recommendedColors"
                :key="c"
                class="color-chip-lg"
              >
                <span class="cc-swatch" :style="{ background: c }"></span>
                <span class="cc-name">
                  {{ currentTemplate?.colorTemplates.find(ct => ct.color === c)?.name || c }}
                </span>
                <span class="cc-code">{{ c }}</span>
              </span>
            </div>
          </div>
          <div class="lines-row" v-if="currentStep.referenceLines.length">
            <span class="row-label">✏️ 参考纹线：</span>
            <span v-for="l in currentStep.referenceLines" :key="l" class="ref-tag">{{ l }}</span>
          </div>
          <div class="mats-row" v-if="currentStep.materials.length">
            <span class="row-label">📦 所需材料：</span>
            <span v-for="(m, i) in currentStep.materials" :key="i" class="mat-chip">
              {{ m }}
            </span>
          </div>
        </div>

        <div class="step-notes-section">
          <label class="notes-label">📝 学习笔记（本工序）</label>
          <textarea
            :value="currentSession.notes[currentStep.id] || ''"
            @input="store.saveStepNote(currentSession.id, currentStep.id, ($event.target as HTMLTextAreaElement).value)"
            placeholder="在此记录您的学习心得、疑问、注意事项..."
            class="notes-textarea"
          ></textarea>
        </div>
      </div>

      <!-- 控制按钮栏 -->
      <div v-if="currentSession" class="teaching-controls">
        <div class="controls-left">
          <button
            class="btn btn-secondary"
            :disabled="currentSession.currentStepIndex === 0"
            @click="store.prevStep(currentSession.id)"
          >
            ⬅️ 上一道
          </button>
          <button
            class="btn btn-secondary"
            :disabled="currentSession.currentStepIndex === 0"
            @click="store.goToStep(currentSession.id, 0)"
          >
            ⏮ 从头开始
          </button>
        </div>
        <div class="controls-center">
          <button
            :class="['btn', currentSession.isPlaying ? 'btn-danger' : 'btn-primary', 'btn-lg']"
            @click="store.togglePlay(currentSession.id)"
          >
            {{ currentSession.isPlaying ? '⏸ 暂停播放' : '▶ 自动播放' }}
          </button>
          <div class="play-mode-toggle">
            <button
              :class="['mode-btn', { active: currentSession.playMode === 'manual' }]"
              @click="store.setPlayMode(currentSession.id, 'manual')"
            >
              手动模式
            </button>
            <button
              :class="['mode-btn', { active: currentSession.playMode === 'auto' }]"
              @click="store.setPlayMode(currentSession.id, 'auto')"
            >
              自动模式
            </button>
            <select
              v-if="currentSession.playMode === 'auto'"
              class="interval-select"
              :value="currentSession.autoPlayInterval"
              @change="Object.assign(currentSession, { autoPlayInterval: Number(($event.target as HTMLSelectElement).value) })"
            >
              <option :value="10">10秒/步</option>
              <option :value="30">30秒/步</option>
              <option :value="60">60秒/步</option>
              <option :value="120">2分钟/步</option>
            </select>
          </div>
        </div>
        <div class="controls-right">
          <button
            class="btn btn-secondary"
            :disabled="currentSession.currentStepIndex >= sortedSteps.length - 1"
            @click="store.goToStep(currentSession.id, sortedSteps.length - 1)"
          >
            ⏭ 跳到最后
          </button>
          <button
            class="btn btn-primary"
            :disabled="currentSession.currentStepIndex >= sortedSteps.length - 1"
            @click="store.nextStep(currentSession.id)"
          >
            下一道 ➡️
          </button>
        </div>
      </div>

      <!-- 完成提示 -->
      <div
        v-if="currentSession && currentSession.currentStepIndex === sortedSteps.length - 1 && progress === 100"
        class="teaching-complete"
      >
        <div class="complete-card">
          <div class="complete-icon">🎉</div>
          <h3>恭喜完成全部 {{ sortedSteps.length }} 道工序学习！</h3>
          <p class="text-muted">
            模板：{{ currentTemplate.name }}<br />
            累计学习时长：约 {{ formatDuration(totalDuration) }}
          </p>
          <div class="complete-actions">
            <button class="btn btn-secondary" @click="store.goToStep(currentSession.id, 0)">
              🔄 再学一遍
            </button>
            <button class="btn btn-primary" @click="() => { window.dispatchEvent(new CustomEvent('switch-to-practice')) }">
              📝 提交练习评分
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
