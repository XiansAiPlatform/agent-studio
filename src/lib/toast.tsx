import React from 'react'
import { toast } from 'sonner'

interface ToastOptions {
  title: string
  description?: string
  duration?: number
  icon?: string | React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

export const showToast = {
  success: ({ title, description, duration = 4000, icon, action }: ToastOptions) => {
    return toast.success(title, {
      description,
      duration,
      icon,
      action: action ? {
        label: action.label,
        onClick: action.onClick,
      } : undefined,
    })
  },

  error: ({ title, description, duration = 6000, action }: ToastOptions) => {
    return toast.error(title, {
      description,
      duration,
      action: action ? {
        label: action.label,
        onClick: action.onClick,
      } : undefined,
    })
  },

  warning: ({ title, description, duration = 5000, action }: ToastOptions) => {
    return toast.warning(title, {
      description,
      duration,
      action: action ? {
        label: action.label,
        onClick: action.onClick,
      } : undefined,
    })
  },

  info: ({ title, description, duration = 4000, action }: ToastOptions) => {
    return toast.info(title, {
      description,
      duration,
      action: action ? {
        label: action.label,
        onClick: action.onClick,
      } : undefined,
    })
  },

  loading: ({ title, description }: Omit<ToastOptions, 'duration' | 'action'>) => {
    return toast.loading(title, {
      description,
    })
  },

  dismiss: (toastId?: string | number) => toast.dismiss(toastId),
  
  promise: toast.promise,
}

// Re-export the base toast for advanced usage
export { toast }
