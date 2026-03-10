'use client'

import { createContext, useContext } from 'react'

interface ParticipantLayoutContextValue {
  isParticipantMode: boolean
  onOpenMenu?: () => void
}

const ParticipantLayoutContext = createContext<ParticipantLayoutContextValue>({
  isParticipantMode: false,
})

export function ParticipantLayoutProvider({
  children,
  isParticipantMode,
  onOpenMenu,
}: {
  children: React.ReactNode
  isParticipantMode: boolean
  onOpenMenu?: () => void
}) {
  return (
    <ParticipantLayoutContext.Provider value={{ isParticipantMode, onOpenMenu }}>
      {children}
    </ParticipantLayoutContext.Provider>
  )
}

export function useParticipantLayout() {
  return useContext(ParticipantLayoutContext)
}
