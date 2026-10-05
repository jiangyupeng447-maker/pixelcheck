import { createContext, useContext, useState, type ReactNode } from 'react'
import type { UploadedImage } from '../types'

interface AppState {
  designImage: UploadedImage | null
  actualImage: UploadedImage | null
  setDesignImage: (img: UploadedImage | null) => void
  setActualImage: (img: UploadedImage | null) => void
  reset: () => void
}

const AppContext = createContext<AppState | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [designImage, setDesignImage] = useState<UploadedImage | null>(null)
  const [actualImage, setActualImage] = useState<UploadedImage | null>(null)

  const reset = () => {
    setDesignImage(null)
    setActualImage(null)
  }

  return (
    <AppContext.Provider
      value={{ designImage, actualImage, setDesignImage, setActualImage, reset }}
    >
      {children}
    </AppContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
