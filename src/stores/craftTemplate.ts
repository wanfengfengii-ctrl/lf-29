import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CraftTemplate,
  TemplateProcessStep,
  ColorTemplate,
  LineSketch,
  MaterialItem,
  TemplateApplyResult,
  TeachingSession,
  PracticeSubmission,
  DeviationItem,
  ProcessScheme,
  ProcessLayer,
  PatternRegion,
  SchoolStyle
} from '@/types'
import { PROCESS_ORDER } from '@/types'
import { generateId, now } from '@/utils/id'
import { useMaskStore } from '@/stores/mask'

function createSampleTemplates(): CraftTemplate[] {
  const jiangxiTemplate: CraftTemplate = {
    id: generateId(),
    name: '江西傩 · 开山神将标准模板',
    school: 'jiangxi',
    maskType: '开山傩面',
    description: '赣鄱地区传统开山神将傩面具标准工艺，红脸怒目，气势威严',
    author: '李师傅（师承第三代）',
    createdAt: now() - 86400000 * 30,
    updatedAt: now() - 86400000 * 5,
    isPublic: true,
    tags: ['开山', '红脸', '驱邪', '传统'],
    version: '2.1',
    processSteps: [
      {
        id: generateId(),
        order: 1,
        layerType: 'base_embryo',
        stepName: '樟木选料与底胚雕刻',
        description: '选用30年以上老樟木，按照开山神将脸型轮廓雕刻粗胚，注意额头饱满、颧骨突出',
        durationMinutes: 240,
        difficultyLevel: 4,
        keyPoints: [
          '樟木需自然风干3年以上，含水率低于12%',
          '脸型比例：额头占3/10，眉眼区占3/10，口鼻区占4/10',
          '保留木材天然纹理，避免横向裂纹'
        ],
        commonMistakes: [
          '选用未干透的新木材，后期易开裂变形',
          '额头雕刻过平，缺乏威严感',
          '面部左右不对称'
        ],
        qualityStandards: [
          '表面无明显刀痕，过渡圆润',
          '左右对称误差不超过2mm',
          '整体重量控制在1.5-2.5kg'
        ],
        referenceLines: ['脸型外轮廓线', '眉骨中轴线'],
        recommendedColors: [],
        materials: ['老樟木', '平刀', '圆刀', '三角刀'],
        safetyNotes: ['雕刻时注意力道方向，防止滑刀伤手', '佩戴防尘口罩']
      },
      {
        id: generateId(),
        order: 2,
        layerType: 'polishing',
        stepName: '三道打磨工序',
        description: '从粗到细依次打磨，使表面光滑细腻，为上灰做准备',
        durationMinutes: 120,
        difficultyLevel: 2,
        keyPoints: [
          '先用80目粗砂去刀痕',
          '再用240目中砂找平',
          '最后用600目细砂抛光',
          '每道打磨需顺着木纹方向'
        ],
        commonMistakes: [
          '跳号使用砂纸，表面留有深划痕',
          '横向打磨破坏木纹',
          '细节处打磨过度破坏造型'
        ],
        qualityStandards: [
          '手摸无凹凸感',
          '光照下无明显划痕',
          '棱角分明不失圆润'
        ],
        referenceLines: [],
        recommendedColors: [],
        materials: ['80目砂纸', '240目砂纸', '600目砂纸', '打磨块'],
        safetyNotes: ['佩戴防尘口罩和护目镜']
      },
      {
        id: generateId(),
        order: 3,
        layerType: 'plastering',
        stepName: '传统鹿角灰上灰',
        description: '使用祖传鹿角灰配方，分三道上灰，每道阴干后再上',
        durationMinutes: 180,
        difficultyLevel: 5,
        keyPoints: [
          '鹿角灰配方：鹿角霜60% + 生漆30% + 面粉10%',
          '每道厚度不超过0.5mm',
          '阴干时间不少于24小时',
          '每道灰干后需用细砂轻磨'
        ],
        commonMistakes: [
          '灰层过厚导致后期开裂',
          '未干透就上第二道',
          '灰料配比不准，附着力差'
        ],
        qualityStandards: [
          '灰层均匀无气泡',
          '三道灰总厚度1.2-1.5mm',
          '干透后敲击声清脆'
        ],
        referenceLines: [],
        recommendedColors: [],
        materials: ['鹿角霜', '生漆', '精制面粉', '刮灰刀', '细砂布'],
        safetyNotes: ['生漆易过敏，需戴手套和防护服', '工作场所保持通风']
      },
      {
        id: generateId(),
        order: 4,
        layerType: 'face_carving',
        stepName: '开脸·传统朱砂红脸',
        description: '按照江西傩传统配色，主色朱砂红，配以黑色眉眼和金色纹饰',
        durationMinutes: 300,
        difficultyLevel: 5,
        keyPoints: [
          '主色：朱砂红（#C41E3A）涂满面部90%区域',
          '眉眼：浓墨（#1A1A1A），眉尾上挑呈怒目状',
          '额头：火焰纹，朱砂红描金边',
          '腮红：两侧颧骨处以朱膘色晕染',
          '嘴唇：正红，嘴角下撇呈威严状'
        ],
        commonMistakes: [
          '红色不够正，偏粉偏暗',
          '眉眼间距过宽，显呆滞',
          '纹饰线条粗细不均',
          '颜色叠加层次不够，发色灰暗'
        ],
        qualityStandards: [
          '朱砂发色纯正，三遍涂色均匀',
          '线条流畅无抖动',
          '怒目神态传神，有威慑感',
          '整体色彩对比鲜明'
        ],
        referenceLines: ['眉眼定位线', '嘴部中心线', '额头火焰纹基线'],
        recommendedColors: ['#C41E3A', '#1A1A1A', '#DAA520', '#E8B4B8', '#B22222'],
        materials: ['朱砂粉', '明胶', '墨锭', '金箔胶', '狼毫笔', '衣纹笔'],
        safetyNotes: ['朱砂含微量汞，使用后洗手', '保持通风，避免颜料粉尘吸入']
      },
      {
        id: generateId(),
        order: 5,
        layerType: 'gold_outlining',
        stepName: '描金·纹饰勾线',
        description: '在关键纹饰边缘描金，增强华丽感和神圣感',
        durationMinutes: 150,
        difficultyLevel: 4,
        keyPoints: [
          '眉眼外轮廓描24K金线',
          '额头火焰纹金边',
          '口鼻周围装饰性金纹',
          '金线宽度1.5-2mm，均匀一致'
        ],
        commonMistakes: [
          '金线粗细不均',
          '金箔粘贴不牢起翘',
          '描金位置偏离纹样'
        ],
        qualityStandards: [
          '金线流畅无断笔',
          '金箔粘贴平整无气泡',
          '整体金碧辉煌不浮夸'
        ],
        referenceLines: ['金描装饰线'],
        recommendedColors: ['#DAA520', '#FFD700'],
        materials: ['24K金箔', '金箔胶', '细勾线笔', '玛瑙压子'],
        safetyNotes: ['金箔极轻，操作时避免吹风', '胶干透后再进行下一步']
      }
    ],
    colorTemplates: [
      { id: generateId(), name: '主色朱砂红', color: '#C41E3A', purpose: '面部主色', usageArea: '面部90%', opacity: 100 },
      { id: generateId(), name: '浓墨黑', color: '#1A1A1A', purpose: '眉眼须发', usageArea: '眉眼、胡须', opacity: 95 },
      { id: generateId(), name: '描金', color: '#DAA520', purpose: '纹饰勾边', usageArea: '边缘纹饰', opacity: 100 },
      { id: generateId(), name: '朱膘腮红', color: '#E8B4B8', purpose: '腮红晕染', usageArea: '颧骨区域', opacity: 80 },
      { id: generateId(), name: '烈焰红', color: '#B22222', purpose: '火焰纹', usageArea: '额头纹饰', opacity: 100 },
      { id: generateId(), name: '嘴唇正红', color: '#DC143C', purpose: '嘴唇着色', usageArea: '嘴唇', opacity: 100 }
    ],
    lineSketches: [
      {
        id: generateId(),
        name: '开山脸型外轮廓',
        description: '方中带圆，额头宽阔，下巴方正有力',
        path: 'M50,15 C30,15 20,35 20,55 C20,80 30,95 50,95 C70,95 80,80 80,55 C80,35 70,15 50,15 Z',
        category: 'face_outline',
        keyPoints: '左右对称，额头最高点，下颌最宽点'
      },
      {
        id: generateId(),
        name: '怒目眉眼线',
        description: '眉头紧锁，眉尾上挑30度，眼型细长锐利',
        path: 'M25,42 L38,38 L42,48 M58,38 L75,42 L58,48',
        category: 'facial_feature',
        keyPoints: '眉峰高度，眼尾上挑角度'
      },
      {
        id: generateId(),
        name: '额头火焰纹',
        description: '三朵火焰居中，中高两侧低',
        path: 'M50,20 L55,28 L50,35 L45,28 Z M40,25 L44,32 L40,38 L36,32 Z M60,25 L64,32 L60,38 L56,32 Z',
        category: 'symbol',
        keyPoints: '三火间距，火焰高度比例1:0.7'
      }
    ],
    materials: [
      { id: generateId(), name: '老樟木', category: 'wood', specification: '30年以上，自然风干3年+', quantity: '1块（约30×25×15cm）', notes: '首选香樟，防虫防蛀', alternative: '楠木、梨木' },
      { id: generateId(), name: '朱砂粉', category: 'paint', specification: '天然矿物朱砂，纯度95%以上', quantity: '50g', notes: '需与明胶调和使用', alternative: '现代丙烯朱红色' },
      { id: generateId(), name: '鹿角霜', category: 'paint', specification: '炮制鹿角研磨，200目以上', quantity: '100g', notes: '上灰主要原料', alternative: '石膏粉+骨胶' },
      { id: generateId(), name: '24K金箔', category: 'accessory', specification: '9.33×9.33cm，厚度0.12μm', quantity: '10张', notes: '正宗南京金箔', alternative: '台湾金箔、仿金铜箔' },
      { id: generateId(), name: '生漆', category: 'paint', specification: '特级毛坝生漆', quantity: '50ml', notes: '需避光保存', alternative: '腰果漆、聚氨酯漆' },
      { id: generateId(), name: '平刀套装', category: 'tool', specification: '3/6/9/12mm平刀', quantity: '4把', notes: '高速钢或白钢材质', alternative: '' },
      { id: generateId(), name: '墨锭', category: 'paint', specification: '徽墨，油烟墨', quantity: '1锭', notes: '研磨使用，不可用墨汁替代', alternative: '精制墨汁（效果稍次）' }
    ],
    precautions: [
      '樟木雕刻前需确认充分干燥，含水率需低于12%',
      '生漆操作必须戴手套、穿防护服，过敏体质者慎做',
      '朱砂含微量汞，操作后务必洗手，不可入口',
      '上灰工序每道必须阴干24小时以上，不可烘烤',
      '描金工序需在无尘环境下进行',
      '颜料干透前后颜色差异较大，先做色卡确认',
      '传统工艺讲究"慢工出细活"，不可急于求成'
    ],
    culturalBackground: '江西傩舞是国家级非物质文化遗产，开山神将为傩戏中重要神祇，象征驱邪纳福、开路先锋。红脸代表忠勇正义，怒目圆睁具有威慑邪祟的寓意。其工艺传承可追溯至唐宋时期，历经千年而不衰。',
    inheritanceNotes: '此工艺为李氏家族第三代传人手订，关键在于鹿角灰配方和朱砂调色技法。传内不传外，传男不传女的旧规矩已打破，现面向有志传承者公开传授。学此工艺需三年打基础，五年可独立完成，十年方可出师。',
    usageCount: 128,
    rating: 4.9
  }

  const guizhouTemplate: CraftTemplate = {
    id: generateId(),
    name: '贵州傩 · 傩公傩母标准模板',
    school: 'guizhou',
    maskType: '傩公傩母',
    description: '黔东南苗族傩戏傩公傩母对脸，黑底彩绘，造型古朴神秘',
    author: '王师傅（黔东南州级传承人）',
    createdAt: now() - 86400000 * 45,
    updatedAt: now() - 86400000 * 10,
    isPublic: true,
    tags: ['傩公', '傩母', '苗族', '黑地'],
    version: '1.3',
    processSteps: [
      {
        id: generateId(),
        order: 1,
        layerType: 'base_embryo',
        stepName: '白杨木底胚制作',
        description: '选用黔东南本地白杨木，雕刻傩公严肃傩母慈祥两种脸型',
        durationMinutes: 200,
        difficultyLevel: 4,
        keyPoints: [
          '傩公脸型方正，额头有皱纹',
          '傩母脸型圆润，面颊饱满',
          '傩公眉毛浓粗上挑',
          '傩母眉毛细弯如月'
        ],
        commonMistakes: [
          '傩公傩母特征混淆',
          '表情不够传神'
        ],
        qualityStandards: [
          '傩公傩母特征鲜明可辨',
          '表情生动有灵气'
        ],
        referenceLines: ['脸型轮廓线'],
        recommendedColors: [],
        materials: ['白杨木', '雕刻刀组'],
        safetyNotes: ['注意刀方向安全']
      },
      {
        id: generateId(),
        order: 2,
        layerType: 'polishing',
        stepName: '草灰打磨',
        description: '使用当地稻草烧灰调和打磨，传统工艺',
        durationMinutes: 90,
        difficultyLevel: 2,
        keyPoints: ['稻草灰+细棉布打磨', '反复揉搓使表面温润'],
        commonMistakes: ['打磨过度破坏细节'],
        qualityStandards: ['表面温润如玉'],
        referenceLines: [],
        recommendedColors: [],
        materials: ['稻草灰', '细棉布'],
        safetyNotes: ['防尘']
      },
      {
        id: generateId(),
        order: 3,
        layerType: 'face_carving',
        stepName: '黑地彩绘开脸',
        description: '先通体上黑漆为地，再彩绘五官纹饰',
        durationMinutes: 280,
        difficultyLevel: 5,
        keyPoints: [
          '通体髹黑漆三遍',
          '傩公用红、白、黄三色',
          '傩母用粉、绿、金三色'
        ],
        commonMistakes: ['黑漆不够黑', '颜色在黑底上发色不正'],
        qualityStandards: ['黑漆如镜', '彩绘对比鲜明'],
        referenceLines: ['五官定位线'],
        recommendedColors: ['#0A0A0A', '#E53935', '#FFFFFF', '#FDD835', '#F48FB1', '#81C784'],
        materials: ['黑漆', '各色矿物颜料', '画笔'],
        safetyNotes: ['通风']
      }
    ],
    colorTemplates: [
      { id: generateId(), name: '漆黑底色', color: '#0A0A0A', purpose: '面具整体底色', usageArea: '面具100%', opacity: 100 },
      { id: generateId(), name: '苗家红', color: '#E53935', purpose: '傩公主色', usageArea: '傩公面部纹饰', opacity: 95 },
      { id: generateId(), name: '圣洁白', color: '#FFFFFF', purpose: '牙齿眼白', usageArea: '牙齿、眼白', opacity: 100 },
      { id: generateId(), name: '苗银黄', color: '#FDD835', purpose: '傩公纹饰', usageArea: '装饰纹样', opacity: 100 },
      { id: generateId(), name: '桃花粉', color: '#F48FB1', purpose: '傩母主色', usageArea: '傩母面部', opacity: 90 }
    ],
    lineSketches: [
      {
        id: generateId(),
        name: '傩公方脸轮廓',
        description: '方额宽颌，威严端重',
        path: 'M50,12 C28,12 18,32 18,55 C18,82 30,95 50,95 C70,95 82,82 82,55 C82,32 72,12 50,12 Z',
        category: 'face_outline',
        keyPoints: '下颌角分明，颧骨突出'
      }
    ],
    materials: [
      { id: generateId(), name: '白杨木', category: 'wood', specification: '黔东南本地白杨，直径25cm以上', quantity: '2块', notes: '木质轻软易雕刻', alternative: '泡桐木' },
      { id: generateId(), name: '土漆（黑漆）', category: 'paint', specification: '本地加工生漆加铁砂', quantity: '80ml', notes: '传统黑漆配方', alternative: '聚氨酯黑漆' }
    ],
    precautions: [
      '白杨木较软，雕刻时力道需轻柔',
      '黑底漆需充分干透才能彩绘，否则会咬色',
      '彩绘颜色在黑底上会变深，需比正常稍调浅'
    ],
    culturalBackground: '傩公傩母为苗族傩戏中的始祖神，传说中为人类始祖，掌管生育与婚姻。傩公傩母对脸常成对出现，在"还傩愿"仪式中供奉使用。其造型古朴粗犷，具有浓郁的苗族文化特色。',
    inheritanceNotes: '黔东南傩戏面具制作多为家族传承，傩公傩母造型有严格定式，不可随意改动。色彩以黑地为尊，体现苗族"以黑为美"的审美传统。',
    usageCount: 76,
    rating: 4.8
  }

  const hunanTemplate: CraftTemplate = {
    id: generateId(),
    name: '湖南傩 · 孟姜女标准模板',
    school: 'hunan',
    maskType: '女性角色',
    description: '湘西辰河傩戏孟姜女角色面具，旦角造型，温婉凄美',
    author: '陈师傅（辰河高腔传承人）',
    createdAt: now() - 86400000 * 60,
    updatedAt: now() - 86400000 * 3,
    isPublic: true,
    tags: ['孟姜女', '旦角', '白底', '凄美'],
    version: '1.0',
    processSteps: [
      {
        id: generateId(),
        order: 1,
        layerType: 'base_embryo',
        stepName: '梨木蛋脸胚',
        description: '选用上等梨木雕刻鹅蛋脸型，线条柔美流畅',
        durationMinutes: 220,
        difficultyLevel: 4,
        keyPoints: ['蛋脸型，上宽下窄', '五官纤秀', '表情温婉略带愁容'],
        commonMistakes: ['脸型过于现代', '表情不够端庄'],
        qualityStandards: ['古典美人脸型', '眉目含情'],
        referenceLines: ['蛋脸轮廓线'],
        recommendedColors: [],
        materials: ['梨木', '雕刻刀组'],
        safetyNotes: []
      },
      {
        id: generateId(),
        order: 2,
        layerType: 'face_carving',
        stepName: '粉彩旦角开脸',
        description: '白底粉彩为主，眉如远山，眼含秋水，唇若涂脂',
        durationMinutes: 260,
        difficultyLevel: 5,
        keyPoints: [
          '粉底：铅白或钛白，通体髹白',
          '腮红：桃花粉晕染双颊',
          '眉：石青画远山眉',
          '唇：胭脂点樱桃小口'
        ],
        commonMistakes: ['底色不匀透黄', '腮红过重显俗气'],
        qualityStandards: ['白里透红', '典雅秀美'],
        referenceLines: ['眉形线', '唇形线'],
        recommendedColors: ['#FAFAFA', '#F8BBD9', '#3949AB', '#AD1457'],
        materials: ['钛白', '胭脂', '石青', '细笔'],
        safetyNotes: ['通风']
      }
    ],
    colorTemplates: [
      { id: generateId(), name: '月白粉底', color: '#FAFAFA', purpose: '面具主底色', usageArea: '全脸95%', opacity: 98 },
      { id: generateId(), name: '桃花粉', color: '#F8BBD9', purpose: '双颊腮红', usageArea: '颧骨晕染', opacity: 70 },
      { id: generateId(), name: '远山黛', color: '#3949AB', purpose: '眉色', usageArea: '眉毛', opacity: 90 },
      { id: generateId(), name: '点唇胭脂', color: '#AD1457', purpose: '唇色', usageArea: '嘴唇', opacity: 100 }
    ],
    lineSketches: [],
    materials: [
      { id: generateId(), name: '梨木', category: 'wood', specification: '老梨木，质地细密', quantity: '1块', notes: '梨木是雕刻女性面具的良材', alternative: '银杏木' }
    ],
    precautions: ['粉色晕染需多层薄涂，一次过厚容易花'],
    culturalBackground: '辰河傩戏为湖南四大地方傩之一，孟姜女是重要女性角色，表现其寻夫哭长城的凄美故事。旦角面具造型讲究"鸭蛋脸、樱桃嘴、眉目含情"，体现中国古典审美。',
    inheritanceNotes: '湖南女性角色面具制作讲究"三白"——脸白、手白、颈白，以及"三红"——唇红、腮红、指甲红。粉彩晕染是核心技法，需长期练习掌握。',
    usageCount: 54,
    rating: 4.7
  }

  return [jiangxiTemplate, guizhouTemplate, hunanTemplate]
}

export const useCraftTemplateStore = defineStore('craftTemplate', () => {
  const templates = ref<CraftTemplate[]>(createSampleTemplates())
  const teachingSessions = ref<TeachingSession[]>([])
  const submissions = ref<PracticeSubmission[]>([])
  const activeTemplateId = ref<string | null>(templates.value[0]?.id || null)
  const activeTeachingId = ref<string | null>(null)

  const activeTemplate = computed<CraftTemplate | null>(() => {
    return templates.value.find(t => t.id === activeTemplateId.value) || null
  })

  const activeTeaching = computed<TeachingSession | null>(() => {
    return teachingSessions.value.find(s => s.id === activeTeachingId.value) || null
  })

  const sortedTemplates = computed<CraftTemplate[]>(() => {
    return [...templates.value].sort((a, b) => b.usageCount - a.usageCount)
  })

  function setActiveTemplate(templateId: string) {
    if (templates.value.find(t => t.id === templateId)) {
      activeTemplateId.value = templateId
    }
  }

  function createTemplate(data: Partial<CraftTemplate>): CraftTemplate {
    const template: CraftTemplate = {
      id: generateId(),
      name: data.name || '新模板',
      school: data.school || 'custom',
      customSchoolName: data.customSchoolName,
      maskType: data.maskType || '',
      description: data.description || '',
      author: data.author || '当前用户',
      coverImage: data.coverImage,
      createdAt: now(),
      updatedAt: now(),
      isPublic: data.isPublic ?? false,
      tags: data.tags || [],
      version: data.version || '1.0',
      processSteps: data.processSteps || [],
      colorTemplates: data.colorTemplates || [],
      lineSketches: data.lineSketches || [],
      materials: data.materials || [],
      precautions: data.precautions || [],
      culturalBackground: data.culturalBackground || '',
      inheritanceNotes: data.inheritanceNotes || '',
      usageCount: 0,
      rating: 0
    }
    templates.value.push(template)
    activeTemplateId.value = template.id
    return template
  }

  function updateTemplate(templateId: string, updates: Partial<CraftTemplate>) {
    const t = templates.value.find(x => x.id === templateId)
    if (!t) return
    Object.assign(t, updates, { updatedAt: now() })
  }

  function deleteTemplate(templateId: string) {
    const idx = templates.value.findIndex(t => t.id === templateId)
    if (idx >= 0) {
      templates.value.splice(idx, 1)
      if (activeTemplateId.value === templateId) {
        activeTemplateId.value = templates.value[0]?.id || null
      }
    }
  }

  function addProcessStep(templateId: string, step: Partial<TemplateProcessStep>) {
    const t = templates.value.find(x => x.id === templateId)
    if (!t) return null
    const order = t.processSteps.length + 1
    const newStep: TemplateProcessStep = {
      id: generateId(),
      order,
      layerType: step.layerType || 'custom',
      customTypeName: step.customTypeName,
      stepName: step.stepName || `工序 ${order}`,
      description: step.description || '',
      durationMinutes: step.durationMinutes || 60,
      difficultyLevel: (step.difficultyLevel as 1|2|3|4|5) || 3,
      keyPoints: step.keyPoints || [],
      commonMistakes: step.commonMistakes || [],
      qualityStandards: step.qualityStandards || [],
      referenceLines: step.referenceLines || [],
      recommendedColors: step.recommendedColors || [],
      materials: step.materials || [],
      safetyNotes: step.safetyNotes || []
    }
    t.processSteps.push(newStep)
    t.updatedAt = now()
    return newStep
  }

  function updateProcessStep(templateId: string, stepId: string, updates: Partial<TemplateProcessStep>) {
    const t = templates.value.find(x => x.id === templateId)
    if (!t) return
    const step = t.processSteps.find(s => s.id === stepId)
    if (!step) return
    Object.assign(step, updates)
    t.updatedAt = now()
  }

  function deleteProcessStep(templateId: string, stepId: string) {
    const t = templates.value.find(x => x.id === templateId)
    if (!t) return
    const idx = t.processSteps.findIndex(s => s.id === stepId)
    if (idx < 0) return
    t.processSteps.splice(idx, 1)
    t.processSteps.forEach((s, i) => { s.order = i + 1 })
    t.updatedAt = now()
  }

  function reorderProcessSteps(templateId: string, newOrderIds: string[]) {
    const t = templates.value.find(x => x.id === templateId)
    if (!t) return
    const valid = newOrderIds.every(id => t.processSteps.some(s => s.id === id))
      && newOrderIds.length === t.processSteps.length
    if (!valid) return
    const map = new Map(t.processSteps.map(s => [s.id, s]))
    t.processSteps = newOrderIds.map((id, i) => {
      const s = map.get(id)!
      s.order = i + 1
      return s
    })
    t.updatedAt = now()
  }

  function addColorTemplate(templateId: string, color: Partial<ColorTemplate>) {
    const t = templates.value.find(x => x.id === templateId)
    if (!t) return null
    const newColor: ColorTemplate = {
      id: generateId(),
      name: color.name || '新配色',
      color: color.color || '#8B4513',
      purpose: color.purpose || '',
      usageArea: color.usageArea || '',
      opacity: color.opacity ?? 100
    }
    t.colorTemplates.push(newColor)
    t.updatedAt = now()
    return newColor
  }

  function updateColorTemplate(templateId: string, colorId: string, updates: Partial<ColorTemplate>) {
    const t = templates.value.find(x => x.id === templateId)
    if (!t) return
    const c = t.colorTemplates.find(x => x.id === colorId)
    if (c) { Object.assign(c, updates); t.updatedAt = now() }
  }

  function deleteColorTemplate(templateId: string, colorId: string) {
    const t = templates.value.find(x => x.id === templateId)
    if (!t) return
    const idx = t.colorTemplates.findIndex(c => c.id === colorId)
    if (idx >= 0) { t.colorTemplates.splice(idx, 1); t.updatedAt = now() }
  }

  function addLineSketch(templateId: string, line: Partial<LineSketch>) {
    const t = templates.value.find(x => x.id === templateId)
    if (!t) return null
    const newLine: LineSketch = {
      id: generateId(),
      name: line.name || '新纹线',
      description: line.description || '',
      path: line.path || '',
      category: line.category || 'decoration',
      referenceImage: line.referenceImage,
      keyPoints: line.keyPoints || ''
    }
    t.lineSketches.push(newLine)
    t.updatedAt = now()
    return newLine
  }

  function updateLineSketch(templateId: string, lineId: string, updates: Partial<LineSketch>) {
    const t = templates.value.find(x => x.id === templateId)
    if (!t) return
    const l = t.lineSketches.find(x => x.id === lineId)
    if (l) { Object.assign(l, updates); t.updatedAt = now() }
  }

  function deleteLineSketch(templateId: string, lineId: string) {
    const t = templates.value.find(x => x.id === templateId)
    if (!t) return
    const idx = t.lineSketches.findIndex(l => l.id === lineId)
    if (idx >= 0) { t.lineSketches.splice(idx, 1); t.updatedAt = now() }
  }

  function addMaterialItem(templateId: string, mat: Partial<MaterialItem>) {
    const t = templates.value.find(x => x.id === templateId)
    if (!t) return null
    const newMat: MaterialItem = {
      id: generateId(),
      name: mat.name || '新材料',
      category: mat.category || 'other',
      specification: mat.specification || '',
      quantity: mat.quantity || '',
      notes: mat.notes || '',
      alternative: mat.alternative
    }
    t.materials.push(newMat)
    t.updatedAt = now()
    return newMat
  }

  function updateMaterialItem(templateId: string, matId: string, updates: Partial<MaterialItem>) {
    const t = templates.value.find(x => x.id === templateId)
    if (!t) return
    const m = t.materials.find(x => x.id === matId)
    if (m) { Object.assign(m, updates); t.updatedAt = now() }
  }

  function deleteMaterialItem(templateId: string, matId: string) {
    const t = templates.value.find(x => x.id === templateId)
    if (!t) return
    const idx = t.materials.findIndex(m => m.id === matId)
    if (idx >= 0) { t.materials.splice(idx, 1); t.updatedAt = now() }
  }

  function applyTemplateToScheme(
    templateId: string,
    maskId: string,
    schemeName: string
  ): TemplateApplyResult {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) {
      return { success: false, message: '模板不存在' }
    }

    const maskStore = useMaskStore()
    const mask = maskStore.masks.find(m => m.id === maskId)
    if (!mask) {
      return { success: false, message: '面具不存在' }
    }

    maskStore.setActiveMask(maskId)

    const scheme = maskStore.createScheme(schemeName || `套用·${template.name}`)
    if (!scheme) {
      return { success: false, message: '创建方案失败' }
    }

    let layersCreated = 0
    let patternsCreated = 0
    const idMap = new Map<string, string>()

    const sortedSteps = [...template.processSteps].sort((a, b) => a.order - b.order)
    sortedSteps.forEach(step => {
      const layer = maskStore.addLayer(step.layerType, step.stepName, step.customTypeName)
      if (layer) {
        idMap.set(step.id, layer.id)
        layersCreated++
        maskStore.updateLayer(layer.id, {
          description: step.description,
          notes: `【要点】\n${step.keyPoints.join('\n')}\n\n【质量标准】\n${step.qualityStandards.join('\n')}${step.safetyNotes.length ? '\n\n【安全提示】\n' + step.safetyNotes.join('\n') : ''}`,
          materialBatch: step.materials.join('、')
        })

        if (step.recommendedColors.length > 0 && step.layerType === 'face_carving') {
          const lineSketchesInStep = template.lineSketches.filter(
            l => step.referenceLines.some(r => l.name.includes(r)) || step.referenceLines.length === 0
          )
          step.recommendedColors.forEach((color, ci) => {
            const lineInfo = lineSketchesInStep[ci] || template.lineSketches[ci]
            const colorInfo = template.colorTemplates.find(c => c.color === color)
            const patternName = colorInfo?.name || lineInfo?.name || `配色${ci + 1}`
            const pattern = maskStore.addPattern(
              layer.id,
              patternName,
              color,
              500 + ci * 100,
              colorInfo?.opacity ?? 100
            )
            if (pattern) {
              if (lineInfo?.path) {
                Object.assign(pattern, { path: lineInfo.path })
              }
              patternsCreated++
            }
          })
        }
      }
    })

    template.usageCount++

    return {
      success: true,
      message: `已在「${mask.name}」成功套用模板「${template.name}」，已创建 ${layersCreated} 个工序，${patternsCreated} 条纹线`,
      schemeId: scheme.id,
      layersCreated,
      patternsCreated,
      maskId,
      maskName: mask.name
    }
  }

  function startTeachingSession(templateId: string, apprenticeName: string = '学徒'): TeachingSession | null {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return null

    const session: TeachingSession = {
      id: generateId(),
      templateId,
      templateName: template.name,
      currentStepIndex: 0,
      isPlaying: false,
      playMode: 'manual',
      autoPlayInterval: 30,
      startTime: now(),
      lastUpdateTime: now(),
      apprenticeName,
      notes: {}
    }
    teachingSessions.value.push(session)
    activeTeachingId.value = session.id
    return session
  }

  function goToStep(sessionId: string, index: number) {
    const s = teachingSessions.value.find(x => x.id === sessionId)
    if (!s) return
    const template = templates.value.find(t => t.id === s.templateId)
    if (!template) return
    if (index < 0 || index >= template.processSteps.length) return
    s.currentStepIndex = index
    s.lastUpdateTime = now()
  }

  function nextStep(sessionId: string) {
    const s = teachingSessions.value.find(x => x.id === sessionId)
    if (!s) return
    const template = templates.value.find(t => t.id === s.templateId)
    if (!template) return
    if (s.currentStepIndex < template.processSteps.length - 1) {
      s.currentStepIndex++
      s.lastUpdateTime = now()
    }
  }

  function prevStep(sessionId: string) {
    const s = teachingSessions.value.find(x => x.id === sessionId)
    if (!s) return
    if (s.currentStepIndex > 0) {
      s.currentStepIndex--
      s.lastUpdateTime = now()
    }
  }

  function togglePlay(sessionId: string) {
    const s = teachingSessions.value.find(x => x.id === sessionId)
    if (s) {
      s.isPlaying = !s.isPlaying
      s.lastUpdateTime = now()
    }
  }

  function saveStepNote(sessionId: string, stepId: string, note: string) {
    const s = teachingSessions.value.find(x => x.id === sessionId)
    if (s) {
      s.notes[stepId] = note
      s.lastUpdateTime = now()
    }
  }

  function setPlayMode(sessionId: string, mode: 'manual' | 'auto') {
    const s = teachingSessions.value.find(x => x.id === sessionId)
    if (s) { s.playMode = mode; s.lastUpdateTime = now() }
  }

  function closeTeachingSession(sessionId: string) {
    const idx = teachingSessions.value.findIndex(s => s.id === sessionId)
    if (idx >= 0) {
      teachingSessions.value.splice(idx, 1)
      if (activeTeachingId.value === sessionId) {
        activeTeachingId.value = null
      }
    }
  }

  function analyzeDeviations(
    template: CraftTemplate,
    scheme: ProcessScheme
  ): DeviationItem[] {
    const deviations: DeviationItem[] = []
    const templateSteps = [...template.processSteps].sort((a, b) => a.order - b.order)
    const schemeLayers = [...scheme.layers].sort((a, b) => {
      const ai = scheme.layerOrder.indexOf(a.id)
      const bi = scheme.layerOrder.indexOf(b.id)
      return ai - bi
    })

    templateSteps.forEach((step, expectedIdx) => {
      const matchedLayer = schemeLayers.find(
        l => l.type === step.layerType && l.type !== 'custom'
      ) || schemeLayers[expectedIdx]

      if (!matchedLayer) {
        deviations.push({
          id: generateId(),
          type: 'missing_step',
          severity: 'critical',
          targetName: step.stepName,
          expected: step.layerType,
          actual: '缺失',
          description: `标准模板中的工序「${step.stepName}」在方案中不存在`,
          suggestion: `请添加工序类型为「${step.layerType}」的工序层`,
          scoreDeduction: 15
        })
        return
      }

      const actualIdx = schemeLayers.indexOf(matchedLayer)
      if (Math.abs(expectedIdx - actualIdx) > 0 && step.layerType !== 'custom') {
        const expectedOrderMeta = PROCESS_ORDER[step.layerType]
        if (expectedOrderMeta && expectedOrderMeta !== 99) {
          deviations.push({
            id: generateId(),
            type: 'order_wrong',
            severity: 'minor',
            targetName: step.stepName,
            expected: `第 ${expectedIdx + 1} 道工序`,
            actual: `第 ${actualIdx + 1} 道工序`,
            description: `工序「${step.stepName}」顺序不对，应在第 ${expectedIdx + 1} 位，实际在第 ${actualIdx + 1} 位`,
            suggestion: '调整工序顺序，符合工艺流程规范',
            scoreDeduction: 3
          })
        }
      }

      if (matchedLayer.completion < 60) {
        deviations.push({
          id: generateId(),
          type: 'completion_insufficient',
          severity: 'major',
          targetName: step.stepName,
          expected: '完成度 ≥ 60%',
          actual: `完成度 ${matchedLayer.completion}%`,
          description: `工序「${step.stepName}」完成度过低，未达到合格线`,
          suggestion: '继续完善该工序内容，完成度至少达到60%',
          scoreDeduction: 8
        })
      }

      if (step.materials.length > 0 && matchedLayer.materialBatch.trim() === '') {
        deviations.push({
          id: generateId(),
          type: 'material_mismatch',
          severity: 'minor',
          targetName: step.stepName,
          expected: step.materials.join('、'),
          actual: '未填写',
          description: `工序「${step.stepName}」未填写使用的材料`,
          suggestion: `请填写材料批次信息，推荐材料：${step.materials.join('、')}`,
          scoreDeduction: 2
        })
      }

      if (step.recommendedColors.length > 0) {
        const layerColors = new Set(matchedLayer.patterns.map(p => p.color))
        const missingColors = step.recommendedColors.filter(c => !layerColors.has(c))
        if (missingColors.length > 0) {
          const colorInfo = missingColors.map(c => {
            const ct = template.colorTemplates.find(t => t.color === c)
            return ct ? `${ct.name}(${c})` : c
          })
          deviations.push({
            id: generateId(),
            type: 'color_mismatch',
            severity: 'major',
            targetName: step.stepName,
            expected: step.recommendedColors.length + ' 种推荐色',
            actual: `缺失 ${missingColors.length} 种`,
            description: `工序「${step.stepName}」配色方案缺少推荐颜色：${colorInfo.join('、')}`,
            suggestion: '请补充标准模板中推荐的关键配色',
            scoreDeduction: missingColors.length * 3
          })
        }

        const areaThreshold = 300
        matchedLayer.patterns.forEach(p => {
          if (step.recommendedColors.includes(p.color) && p.area < areaThreshold) {
            deviations.push({
              id: generateId(),
              type: 'area_deviation',
              severity: 'minor',
              targetName: `${step.stepName} - ${p.name}`,
              expected: `面积 ≥ ${areaThreshold}`,
              actual: `面积 ${p.area}`,
              description: `纹线「${p.name}」着色面积偏小，可能影响整体效果`,
              suggestion: '适当增加该颜色的着色面积',
              scoreDeduction: 2
            })
          }
        })
      }

      const expectedPatternCount = step.recommendedColors.length
      if (expectedPatternCount > 0 && matchedLayer.patterns.length < expectedPatternCount * 0.6) {
        deviations.push({
          id: generateId(),
          type: 'pattern_missing',
          severity: 'major',
          targetName: step.stepName,
          expected: `至少 ${Math.ceil(expectedPatternCount * 0.6)} 条纹线`,
          actual: `${matchedLayer.patterns.length} 条`,
          description: `工序「${step.stepName}」纹线数量明显少于推荐数量`,
          suggestion: '根据标准模板补充必要的纹线和着色区域',
          scoreDeduction: 10
        })
      }

      if (expectedPatternCount > 0 && matchedLayer.patterns.length > expectedPatternCount * 2) {
        deviations.push({
          id: generateId(),
          type: 'pattern_extra',
          severity: 'minor',
          targetName: step.stepName,
          expected: `约 ${expectedPatternCount} 条纹线`,
          actual: `${matchedLayer.patterns.length} 条`,
          description: `工序「${step.stepName}」纹线数量过多，可能偏离传统造型`,
          suggestion: '简化纹线，保持传统造型的简洁庄重',
          scoreDeduction: 3
        })
      }
    })

    schemeLayers.forEach((layer, idx) => {
      const hasMatch = templateSteps.some(
        s => s.layerType === layer.type && layer.type !== 'custom'
      )
      if (!hasMatch && templateSteps.length > 0) {
        deviations.push({
          id: generateId(),
          type: 'extra_step',
          severity: 'minor',
          targetName: layer.name,
          expected: '标准模板中无此工序',
          actual: '额外工序',
          description: `方案中包含标准模板未定义的额外工序「${layer.name}」`,
          suggestion: '如确需此工序请注明原因，否则建议移除以保持与模板一致',
          scoreDeduction: 2
        })
      }
    })

    return deviations
  }

  function calculateStepScores(
    template: CraftTemplate,
    scheme: ProcessScheme,
    deviations: DeviationItem[]
  ): PracticeSubmission['stepScores'] {
    return template.processSteps.sort((a, b) => a.order - b.order).map(step => {
      const stepDeviations = deviations.filter(d =>
        d.targetName.startsWith(step.stepName) || d.targetName.includes(step.stepName)
      )
      const maxScore = 20
      const deduction = stepDeviations.reduce((sum, d) => sum + d.scoreDeduction, 0)
      const score = Math.max(0, maxScore - deduction)
      const issues = stepDeviations.map(d => `${d.description}（扣${d.scoreDeduction}分）`)
      if (issues.length === 0) issues.push('本工序各项指标符合标准，表现优秀')
      return {
        stepId: step.id,
        stepName: step.stepName,
        score,
        maxScore,
        issues
      }
    })
  }

  function submitPractice(
    templateId: string,
    schemeId: string,
    apprenticeName: string = '匿名学徒'
  ): PracticeSubmission | null {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return null

    const maskStore = useMaskStore()
    const scheme = maskStore.findSchemeById ? maskStore.findSchemeById(schemeId) : null
    const activeScheme = maskStore.activeScheme
    const targetScheme: ProcessScheme | null = scheme || (activeScheme?.id === schemeId ? activeScheme : null)

    if (!targetScheme) return null

    const schemeSnapshot: ProcessScheme = JSON.parse(JSON.stringify(targetScheme))
    schemeSnapshot.id = schemeId

    const deviations = analyzeDeviations(template, targetScheme)
    const stepScores = calculateStepScores(template, targetScheme, deviations)
    const totalStepScore = stepScores.reduce((s, x) => s + x.score, 0)
    const maxStepScore = stepScores.reduce((s, x) => s + x.maxScore, 0)

    const completionAvg = targetScheme.layers.length > 0
      ? targetScheme.layers.reduce((s, l) => s + l.completion, 0) / targetScheme.layers.length
      : 0
    const completionBonus = Math.round(completionAvg * 0.1)

    const materialCoverage = template.processSteps.filter(s => {
      const matched = targetScheme.layers.find(l => l.type === s.layerType)
      return matched && matched.materialBatch.trim().length > 0
    }).length
    const materialBonus = template.processSteps.length > 0
      ? Math.round((materialCoverage / template.processSteps.length) * 10)
      : 0

    const totalScore = Math.min(100, totalStepScore + completionBonus + materialBonus)
    const maxScore = Math.min(100, maxStepScore + 10 + 10)

    let grade: PracticeSubmission['grade'] = 'fail'
    const percentage = totalScore / maxScore
    if (percentage >= 0.9) grade = 'excellent'
    else if (percentage >= 0.75) grade = 'good'
    else if (percentage >= 0.6) grade = 'pass'

    let feedback = ''
    const criticalCount = deviations.filter(d => d.severity === 'critical').length
    const majorCount = deviations.filter(d => d.severity === 'major').length
    const minorCount = deviations.filter(d => d.severity === 'minor').length

    if (grade === 'excellent') {
      feedback = `🎉 太棒了！${apprenticeName}的作品达到了优秀水准，深得${template.school === 'custom' ? '' : SCHOOL_STYLE_META[template.school].label}真传！工艺规范，形神兼备，传承有望！${criticalCount > 0 ? `仍有 ${criticalCount} 项关键问题需要改进。` : ''}`
    } else if (grade === 'good') {
      feedback = `👍 表现良好！整体工艺符合规范，造型基本到位。建议重点改进 ${majorCount} 项较重要问题，多加练习必成大器。`
    } else if (grade === 'pass') {
      feedback = `📝 勉强及格。作品有 ${criticalCount} 项关键缺陷和 ${majorCount} 项重要问题，需要回过头对照教学演示，仔细检查工序顺序、配色和纹线。`
    } else {
      feedback = `💪 未能通过考核。建议重新观看教学演示的分步骤内容，从底胚开始逐步制作，不要急于求成。有疑问及时向师傅请教。`
    }

    if (deviations.length > 0) {
      feedback += `\n\n📋 偏差统计：${criticalCount}项严重 · ${majorCount}项重要 · ${minorCount}项轻微`
    }

    const submission: PracticeSubmission = {
      id: generateId(),
      templateId,
      templateName: template.name,
      apprenticeName,
      schemeId,
      schemeSnapshot,
      submittedAt: now(),
      deviations,
      totalScore,
      maxScore,
      grade,
      feedback,
      stepScores
    }

    submissions.value.unshift(submission)
    return submission
  }

  function getSubmissionsByTemplate(templateId: string): PracticeSubmission[] {
    return submissions.value.filter(s => s.templateId === templateId)
  }

  function getSubmissionsByApprentice(name: string): PracticeSubmission[] {
    return submissions.value.filter(s => s.apprenticeName === name)
  }

  function getTemplatesBySchool(school: SchoolStyle): CraftTemplate[] {
    return templates.value.filter(t => t.school === school)
  }

  return {
    templates,
    teachingSessions,
    submissions,
    activeTemplateId,
    activeTeachingId,
    activeTemplate,
    activeTeaching,
    sortedTemplates,
    setActiveTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    addProcessStep,
    updateProcessStep,
    deleteProcessStep,
    reorderProcessSteps,
    addColorTemplate,
    updateColorTemplate,
    deleteColorTemplate,
    addLineSketch,
    updateLineSketch,
    deleteLineSketch,
    addMaterialItem,
    updateMaterialItem,
    deleteMaterialItem,
    applyTemplateToScheme,
    startTeachingSession,
    goToStep,
    nextStep,
    prevStep,
    togglePlay,
    saveStepNote,
    setPlayMode,
    closeTeachingSession,
    analyzeDeviations,
    submitPractice,
    getSubmissionsByTemplate,
    getSubmissionsByApprentice,
    getTemplatesBySchool
  }
})
