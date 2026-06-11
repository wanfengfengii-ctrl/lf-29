import { ref, computed, type Ref, type ComputedRef } from 'vue'

export interface FilterField<T> {
  key: keyof T | string
  value: unknown
  match: (item: T, value: unknown) => boolean
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export interface SortState<T> {
  field: keyof T | string | null
  order: 'asc' | 'desc' | null
}

export interface UseListFilterOptions<T> {
  initialSort?: SortState<T>
  initialPageSize?: number
  keywordFields?: (keyof T)[]
  caseSensitive?: boolean
}

export interface UseListFilterReturn<T> {
  keyword: Ref<string>
  filters: Ref<Record<string, unknown>>
  sort: Ref<SortState<T>>
  pagination: Ref<PaginationState>
  setKeyword: (k: string) => void
  setFilter: (key: string, value: unknown) => void
  setFilters: (values: Record<string, unknown>) => void
  clearFilters: () => void
  toggleSort: (field: keyof T | string) => void
  setSort: (field: keyof T | string, order: 'asc' | 'desc') => void
  resetSort: () => void
  goToPage: (p: number) => void
  nextPage: () => void
  prevPage: () => void
  setPageSize: (size: number) => void
  totalPages: ComputedRef<number>
  hasNextPage: ComputedRef<boolean>
  hasPrevPage: ComputedRef<boolean>
  applyFilters: (list: T[]) => T[]
  applySort: (list: T[]) => T[]
  applyPagination: (list: T[]) => T[]
  process: (list: T[]) => T[]
}

function containsKeyword(str: string, kw: string, caseSensitive: boolean): boolean {
  if (!kw) return true
  const a = caseSensitive ? str : str.toLowerCase()
  const b = caseSensitive ? kw : kw.toLowerCase()
  return a.includes(b)
}

function itemKeywordMatch<T>(item: T, kw: string, fields?: (keyof T)[], caseSensitive = false): boolean {
  if (!kw) return true
  if (!fields || fields.length === 0) {
    return containsKeyword(JSON.stringify(item), kw, caseSensitive)
  }
  return fields.some(f => {
    const v = item[f]
    if (v == null) return false
    if (typeof v === 'string') return containsKeyword(v, kw, caseSensitive)
    if (Array.isArray(v)) return v.some(x => containsKeyword(String(x), kw, caseSensitive))
    return containsKeyword(String(v), kw, caseSensitive)
  })
}

export function useListFilter<T extends Record<string, unknown>>(
  options: UseListFilterOptions<T> = {}
) {
  const { initialSort, initialPageSize = 20, keywordFields, caseSensitive = false } = options

  const keyword = ref('')
  const filters = ref<Record<string, unknown>>({})
  const sort = ref<SortState<T>>({ field: initialSort?.field ?? null, order: initialSort?.order ?? null })
  const pagination = ref<PaginationState>({ page: 1, pageSize: initialPageSize, total: 0 })

  function setKeyword(k: string) {
    keyword.value = k
    pagination.value.page = 1
  }

  function setFilter(key: string, value: unknown) {
    filters.value = { ...filters.value, [key]: value }
    pagination.value.page = 1
  }

  function setFilters(values: Record<string, unknown>) {
    filters.value = { ...filters.value, ...values }
    pagination.value.page = 1
  }

  function clearFilters() {
    filters.value = {}
    keyword.value = ''
    pagination.value.page = 1
  }

  function toggleSort(field: keyof T | string) {
    if (sort.value.field !== field) {
      sort.value = { field, order: 'asc' }
    } else if (sort.value.order === 'asc') {
      sort.value = { field, order: 'desc' }
    } else {
      sort.value = { field: null, order: null }
    }
  }

  function setSort(field: keyof T | string, order: 'asc' | 'desc') {
    sort.value = { field, order }
  }

  function resetSort() {
    sort.value = { field: null, order: null }
  }

  function goToPage(p: number) {
    const tp = totalPages.value
    pagination.value.page = Math.max(1, Math.min(p, tp || 1))
  }

  function nextPage() {
    if (hasNextPage.value) pagination.value.page++
  }

  function prevPage() {
    if (hasPrevPage.value) pagination.value.page--
  }

  function setPageSize(size: number) {
    pagination.value.pageSize = Math.max(1, size)
    pagination.value.page = 1
  }

  const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))
  const hasNextPage = computed(() => pagination.value.page < totalPages.value)
  const hasPrevPage = computed(() => pagination.value.page > 1)

  function applyFilters(list: T[]): T[] {
    const kw = keyword.value.trim()
    return list.filter(item => {
      if (!itemKeywordMatch(item, kw, keywordFields, caseSensitive)) return false
      for (const [key, value] of Object.entries(filters.value)) {
        if (value === undefined || value === null || value === '' || value === 'all') continue
        const iv = item[key]
        if (Array.isArray(value)) {
          if (!value.some(v => iv === v)) return false
        } else if (typeof value === 'object' && value !== null) {
          const { min, max } = value as { min?: number; max?: number }
          const num = Number(iv)
          if (min !== undefined && num < min) return false
          if (max !== undefined && num > max) return false
        } else if (iv !== value) {
          return false
        }
      }
      return true
    })
  }

  function applySort(list: T[]): T[] {
    if (!sort.value.field || !sort.value.order) return list
    const f = sort.value.field as string
    const o = sort.value.order === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const av = a[f]
      const bv = b[f]
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * o
      if (av instanceof Date && bv instanceof Date) return (av.getTime() - bv.getTime()) * o
      return String(av).localeCompare(String(bv)) * o
    })
  }

  function applyPagination(list: T[]): T[] {
    pagination.value.total = list.length
    const { page, pageSize } = pagination.value
    const start = (page - 1) * pageSize
    return list.slice(start, start + pageSize)
  }

  function process(list: T[]): T[] {
    let r = applyFilters(list)
    r = applySort(r)
    return applyPagination(r)
  }

  return {
    keyword, filters, sort, pagination,
    setKeyword, setFilter, setFilters, clearFilters,
    toggleSort, setSort, resetSort,
    goToPage, nextPage, prevPage, setPageSize,
    totalPages, hasNextPage, hasPrevPage,
    applyFilters, applySort, applyPagination, process
  }
}

export function useTagFilter() {
  const selectedTags = ref<string[]>([])

  function toggleTag(tag: string) {
    const i = selectedTags.value.indexOf(tag)
    if (i >= 0) selectedTags.value.splice(i, 1)
    else selectedTags.value.push(tag)
  }

  function clearTags() {
    selectedTags.value = []
  }

  function hasTag(tag: string): boolean {
    return selectedTags.value.includes(tag)
  }

  function matchTags(tags: string[]): boolean {
    if (selectedTags.value.length === 0) return true
    return selectedTags.value.some(st => tags.includes(st))
  }

  return { selectedTags, toggleTag, clearTags, hasTag, matchTags }
}

export function useDateRangeFilter() {
  const startDate = ref<number | null>(null)
  const endDate = ref<number | null>(null)

  function setRange(start: number | null, end: number | null) {
    startDate.value = start
    endDate.value = end
  }

  function clearRange() {
    startDate.value = null
    endDate.value = null
  }

  function inRange(ts: number): boolean {
    if (startDate.value !== null && ts < startDate.value) return false
    if (endDate.value !== null && ts > endDate.value) return false
    return true
  }

  return { startDate, endDate, setRange, clearRange, inRange }
}
