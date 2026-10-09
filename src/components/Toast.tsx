import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

type Toast = { id: number; message: string; icon: string }

const ToastContext = createContext<(message: string, icon?: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const notify = useCallback((message: string, icon = 'check_circle') => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, message, icon }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-space-sm pointer-events-none w-[calc(100%-2rem)] max-w-md"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="animate-fade-up pointer-events-auto flex items-center gap-space-sm px-space-md py-space-sm rounded-xl bg-inverse-surface text-inverse-on-surface font-body-sm text-body-sm shadow-[0_12px_32px_-4px_rgba(102,18,20,0.25)]"
          >
            <Icon name={t.icon} className="text-[18px] text-inverse-primary" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
