'use client'

import { createContext, useContext, useState, useCallback } from 'react'

export interface TopicDeletedEvent {
  agentName: string
  activationName: string
  topicId: string
}

interface ParticipantLayoutContextValue {
  isParticipantMode: boolean
  onOpenMenu?: () => void
  /** When false, user cannot change theme (tenant has set theme and user is not admin) */
  canCustomizeTheme: boolean
  /** Last topic delete event; conversation page uses this to refetch/clear messages */
  topicDeletedEvent: TopicDeletedEvent | null
  /** Call when a topic's messages are deleted (e.g. from ParticipantAgentTree) */
  notifyTopicDeleted: (agentName: string, activationName: string, topicId: string) => void
}

const ParticipantLayoutContext = createContext<ParticipantLayoutContextValue>({
  isParticipantMode: false,
  canCustomizeTheme: true,
  topicDeletedEvent: null,
  notifyTopicDeleted: () => {},
})

export function ParticipantLayoutProvider({
  children,
  isParticipantMode,
  onOpenMenu,
  canCustomizeTheme = true,
}: {
  children: React.ReactNode
  isParticipantMode: boolean
  onOpenMenu?: () => void
  canCustomizeTheme?: boolean
}) {
  const [topicDeletedEvent, setTopicDeletedEvent] = useState<TopicDeletedEvent | null>(null)
  const notifyTopicDeleted = useCallback(
    (agentName: string, activationName: string, topicId: string) => {
      setTopicDeletedEvent({ agentName, activationName, topicId })
    },
    []
  )

  return (
    <ParticipantLayoutContext.Provider
      value={{
        isParticipantMode,
        onOpenMenu,
        canCustomizeTheme,
        topicDeletedEvent,
        notifyTopicDeleted,
      }}
    >
      {children}
    </ParticipantLayoutContext.Provider>
  )
}

export function useParticipantLayout() {
  return useContext(ParticipantLayoutContext)
}
