import * as React from "react"

// Toast types for the enhanced toast hook
type ToastActionElement = React.ReactElement

type ToastProps = {
  variant?: "default" | "destructive" | "success" | "warning" | "info" | "loading"
  duration?: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Enhanced toast hook with loading states, error handling, and advanced UX features
 */

const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 5000
const TOAST_REMOVE_DELAY_SUCCESS = 4000
const TOAST_REMOVE_DELAY_ERROR = 6000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string, variant?: ToastProps["variant"]) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  // Use different delays based on variant
  let delay = TOAST_REMOVE_DELAY
  if (variant === 'success') {
    delay = TOAST_REMOVE_DELAY_SUCCESS
  } else if (variant === 'destructive') {
    delay = TOAST_REMOVE_DELAY_ERROR
  } else if (variant === 'loading') {
    delay = TOAST_REMOVE_DELAY * 2 // Loading toasts stay longer
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, delay)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

  // ! Side effects ! - This could be extracted into a dismissToast() action,
  // but I'll keep it here for simplicity
  if (toastId) {
    const toast = state.toasts.find(t => t.id === toastId)
    addToRemoveQueue(toastId, toast?.variant)
  } else {
    state.toasts.forEach((toast) => {
      addToRemoveQueue(toast.id, toast.variant)
    })
  }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss()
      },
    },
  })

  // Auto-dismiss toast after delay (unless it's loading variant)
  if (props.variant !== 'loading') {
    addToRemoveQueue(id, props.variant)
  }

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)
  const loadingToastsRef = React.useRef<Map<string, { id: string; dismiss: () => void; update: (props: ToasterToast) => void }>>(new Map())

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  // Enhanced functionality
  const showLoading = React.useCallback((title: string, description?: string) => {
    const loadingToast = toast({
      title,
      description,
      variant: 'loading',
      duration: Infinity, // Loading toasts don't auto-dismiss
    })

    loadingToastsRef.current.set(title, loadingToast)
    return loadingToast
  }, [])

  const updateToSuccess = React.useCallback((
    loadingTitle: string,
    successTitle: string,
    successDescription?: string,
    duration: number = 4000
  ) => {
    const loadingToast = loadingToastsRef.current.get(loadingTitle)
    if (loadingToast) {
      loadingToast.update({
        id: loadingToast.id,
        title: successTitle,
        description: successDescription,
        variant: 'success',
      })

      // Auto-dismiss after success duration
      setTimeout(() => {
        loadingToast.dismiss()
        loadingToastsRef.current.delete(loadingTitle)
      }, duration)
    }
  }, [])

  const updateToError = React.useCallback((
    loadingTitle: string,
    errorTitle: string,
    errorDescription?: string,
    duration: number = 6000
  ) => {
    const loadingToast = loadingToastsRef.current.get(loadingTitle)
    if (loadingToast) {
      loadingToast.update({
        id: loadingToast.id,
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
      })

      // Auto-dismiss after error duration
      setTimeout(() => {
        loadingToast.dismiss()
        loadingToastsRef.current.delete(loadingTitle)
      }, duration)
    }
  }, [])

  const dismissLoading = React.useCallback((title: string) => {
    const loadingToast = loadingToastsRef.current.get(title)
    if (loadingToast) {
      loadingToast.dismiss()
      loadingToastsRef.current.delete(title)
    }
  }, [])

  const showSuccess = React.useCallback((
    title: string,
    description?: string,
    duration: number = 4000
  ) => {
    return toast({
      title,
      description,
      variant: 'success',
      duration,
    })
  }, [])

  const showError = React.useCallback((
    title: string,
    error: any,
    duration: number = 6000
  ) => {
    console.error(`${title}:`, error) // Debug logging

    // Provide user-friendly error messages
    let errorMessage = 'An unexpected error occurred. Please try again.'

    if (error?.message) {
      const message = error.message.toLowerCase()

      // Handle specific error cases
      if (message.includes('invalid credentials') || message.includes('invalid email or password')) {
        errorMessage = 'Invalid email or password. Please check your credentials.'
      } else if (message.includes('account is deactivated')) {
        errorMessage = 'Your account has been deactivated. Please contact support.'
      } else if (message.includes('please verify your email')) {
        errorMessage = 'Please verify your email address before logging in.'
      } else if (message.includes('email already registered') || message.includes('email already exists')) {
        errorMessage = 'This email is already registered. Please use a different email or try logging in.'
      } else if (message.includes('invalid email format')) {
        errorMessage = 'Please enter a valid email address.'
      } else if (message.includes('password must be') || message.includes('password does not meet')) {
        errorMessage = 'Password does not meet security requirements. Please use a stronger password.'
      } else if (message.includes('first name') || message.includes('last name')) {
        errorMessage = 'Please provide both first and last names.'
      } else if (message.includes('network error') || message.includes('connection')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      } else if (message.includes('too many attempts') || message.includes('rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.'
      } else if (message.includes('unauthorized') || message.includes('not authorized')) {
        errorMessage = 'You are not authorized to perform this action.'
      } else if (message.includes('not found')) {
        errorMessage = 'The requested resource was not found.'
      } else if (message.includes('server error') || message.includes('internal server')) {
        errorMessage = 'Server error. Please try again later.'
      } else if (message.includes('validation error')) {
        errorMessage = 'Please check your input and try again.'
      } else {
        // Use the original error message if it's user-friendly and not too technical
        const originalMessage = error.message
        if (originalMessage.length < 100 && !originalMessage.includes('stack') && !originalMessage.includes('Error:')) {
          errorMessage = originalMessage
        }
      }
    }

    return toast({
      title,
      description: errorMessage,
      variant: 'destructive',
      duration,
    })
  }, [])

  const showWarning = React.useCallback((
    title: string,
    description?: string,
    duration: number = 5000
  ) => {
    return toast({
      title,
      description,
      variant: 'warning',
      duration,
    })
  }, [])

  const showInfo = React.useCallback((
    title: string,
    description?: string,
    duration: number = 5000
  ) => {
    return toast({
      title,
      description,
      variant: 'info',
      duration,
    })
  }, [])


  // Error handling shortcuts
  const showNetworkError = React.useCallback(() => {
    return showError(
      'Connection Error',
      { message: 'Network error - please check your connection' },
      5000
    )
  }, [showError])

  const showServerError = React.useCallback(() => {
    return showError(
      'Server Error',
      { message: 'Server error - please try again later' },
      5000
    )
  }, [showError])

  const showValidationError = React.useCallback((message: string = 'Please check your input and try again') => {
    return showError(
      'Validation Error',
      { message },
      4000
    )
  }, [showError])

  const result = {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),

    // Enhanced toast methods
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Loading state methods
    showLoading,
    updateToSuccess,
    updateToError,
    dismissLoading,

    // Error shortcuts
    showNetworkError,
    showServerError,
    showValidationError,
  }

  return result
}

export { useToast, toast }
