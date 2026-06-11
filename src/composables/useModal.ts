import { ref, computed, type Ref, type ComputedRef } from 'vue'

export interface UseModalOptions {
  initialVisible?: boolean
  onOpen?: () => void
  onClose?: () => void
}

export interface UseModalReturn {
  visible: Ref<boolean>
  isOpen: ComputedRef<boolean>
  open: () => void
  close: () => void
  toggle: () => void
  setVisible: (v: boolean) => void
}

export function useModal(options: UseModalOptions = {}): UseModalReturn {
  const { initialVisible = false, onOpen, onClose } = options
  const visible = ref<boolean>(initialVisible)
  const isOpen = computed(() => visible.value)

  function open() {
    visible.value = true
    onOpen?.()
  }

  function close() {
    visible.value = false
    onClose?.()
  }

  function toggle() {
    visible.value ? close() : open()
  }

  function setVisible(v: boolean) {
    v ? open() : close()
  }

  return { visible, isOpen, open, close, toggle, setVisible }
}

export interface UseConfirmModalState<T = unknown> {
  data: T | null
  resolve: ((value: boolean) => void) | null
}

export function useConfirmModal<T = unknown>() {
  const modal = useModal()
  const state = ref<UseConfirmModalState<T>>({ data: null, resolve: null })

  function confirm(data?: T): Promise<boolean> {
    state.value = { data: data ?? null, resolve: null }
    modal.open()
    return new Promise<boolean>(resolve => {
      state.value.resolve = resolve
    })
  }

  function accept() {
    modal.close()
    state.value.resolve?.(true)
    state.value = { data: null, resolve: null }
  }

  function cancel() {
    modal.close()
    state.value.resolve?.(false)
    state.value = { data: null, resolve: null }
  }

  return { ...modal, confirmData: computed(() => state.value.data), confirm, accept, cancel }
}
