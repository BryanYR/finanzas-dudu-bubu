export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

const confirmState = ref<{
  open: boolean
  options: ConfirmOptions
  resolve: ((value: boolean) => void) | null
}>({
  open: false,
  options: { message: '' },
  resolve: null,
})

export function useConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      confirmState.value = { open: true, options, resolve }
    })
  }

  function accept() {
    confirmState.value.resolve?.(true)
    confirmState.value.open = false
  }

  function cancel() {
    confirmState.value.resolve?.(false)
    confirmState.value.open = false
  }

  return {
    confirmState: readonly(confirmState),
    confirm,
    accept,
    cancel,
  }
}
