import { ref, computed, reactive, type Ref, type ComputedRef } from 'vue'

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseAsyncStateOptions {
  initialStatus?: AsyncStatus
  resetOnExecute?: boolean
}

export interface UseAsyncStateReturn<TData = unknown, TError = Error> {
  status: Ref<AsyncStatus>
  data: Ref<TData | null>
  error: Ref<TError | null>
  message: Ref<string>
  isIdle: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  isSuccess: ComputedRef<boolean>
  isError: ComputedRef<boolean>
  execute: <R extends TData = TData>(
    fn: () => Promise<R> | R,
    successMsg?: string,
    errorMsg?: string
  ) => Promise<R | null>
  setLoading: () => void
  setSuccess: (d?: TData, msg?: string) => void
  setError: (e?: TError | string) => void
  reset: () => void
}

export function useAsyncState<TData = unknown, TError = Error>(
  options: UseAsyncStateOptions = {}
) {
  const { initialStatus = 'idle', resetOnExecute = true } = options
  const status = ref<AsyncStatus>(initialStatus)
  const data = ref<TData | null>(null)
  const error = ref<TError | null>(null)
  const message = ref<string>('')

  const isIdle = computed(() => status.value === 'idle')
  const isLoading = computed(() => status.value === 'loading')
  const isSuccess = computed(() => status.value === 'success')
  const isError = computed(() => status.value === 'error')

  function setLoading() {
    status.value = 'loading'
    message.value = ''
    error.value = null
  }

  function setSuccess(d?: TData, msg: string = '') {
    status.value = 'success'
    if (d !== undefined) data.value = d
    message.value = msg
    error.value = null
  }

  function setError(e?: TError | string) {
    status.value = 'error'
    if (typeof e === 'string') {
      message.value = e
      error.value = null
    } else if (e) {
      error.value = e
      message.value = (e as unknown as { message?: string }).message || String(e)
    }
  }

  function reset() {
    status.value = 'idle'
    data.value = null
    error.value = null
    message.value = ''
  }

  async function execute<R extends TData = TData>(
    fn: () => Promise<R> | R,
    successMsg: string = '',
    errorMsg: string = ''
  ): Promise<R | null> {
    if (resetOnExecute) {
      data.value = null
      error.value = null
    }
    setLoading()
    try {
      const result = await fn()
      setSuccess(result, successMsg)
      return result
    } catch (e) {
      setError((e as TError) || errorMsg)
      return null
    }
  }

  return {
    status, data, error, message,
    isIdle, isLoading, isSuccess, isError,
    execute, setLoading, setSuccess, setError, reset
  }
}

export interface UseSubmissionState {
  submitting: Ref<boolean>
  submitError: Ref<string>
  submitSuccess: Ref<boolean>
  startSubmit: () => void
  endSubmit: (ok: boolean, error?: string) => void
  resetSubmit: () => void
}

export function useSubmissionState(): UseSubmissionState {
  const submitting = ref(false)
  const submitError = ref('')
  const submitSuccess = ref(false)

  function startSubmit() {
    submitting.value = true
    submitError.value = ''
    submitSuccess.value = false
  }

  function endSubmit(ok: boolean, error: string = '') {
    submitting.value = false
    submitSuccess.value = ok
    submitError.value = error
  }

  function resetSubmit() {
    submitting.value = false
    submitError.value = ''
    submitSuccess.value = false
  }

  return { submitting, submitError, submitSuccess, startSubmit, endSubmit, resetSubmit }
}

export function useListLoading() {
  return reactive({
    loading: false,
    error: '',
    loaded: false,
    total: 0
  })
}
