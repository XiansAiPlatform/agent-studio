'use client'

import { useRouter } from 'next/navigation'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useParticipantLayout } from '@/contexts/participant-layout-context'
import { ParticipantAgentTree } from './participant-agent-tree'
import { Topic } from '@/lib/data/dummy-conversations'

interface ParticipantLayoutShellProps {
  children: React.ReactNode
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
}

export function ParticipantLayoutShell({
  children,
  menuOpen,
  onMenuOpenChange,
}: ParticipantLayoutShellProps) {
  const router = useRouter()
  const { notifyTopicDeleted } = useParticipantLayout()

  const handleTopicSelect = (
    agentName: string,
    activationName: string,
    _topic: Topic
  ) => {
    const topicId = _topic.id
    const path = `/conversations/${encodeURIComponent(agentName)}/${encodeURIComponent(activationName)}?topic=${encodeURIComponent(topicId)}`
    router.push(path)
    onMenuOpenChange(false)
  }

  return (
    <TooltipProvider>
      <div className="flex flex-1 min-w-0 min-h-0 flex-col h-full">
      <Sheet open={menuOpen} onOpenChange={onMenuOpenChange}>
        <SheetContent
          side="left"
          className="participant-menu-sheet w-[320px] sm:max-w-[360px] p-0 flex flex-col top-[calc(3.5rem+1px)] h-[calc(100vh-3.5rem-1px)]"
          overlayClassName="top-[calc(3.5rem+1px)] h-[calc(100vh-3.5rem-1px)]"
        >
          {/* Simple header - SheetTitle required for accessibility; SheetContent provides close X */}
          <div className="px-4 py-4 pr-12 border-b shrink-0">
            <SheetTitle className="text-base font-semibold text-foreground">
              Conversations
            </SheetTitle>
            <p className="text-sm text-muted-foreground font-normal mt-0.5">
              Browse agents and topics
            </p>
          </div>
          <div className="participant-tree-sheet flex-1 overflow-y-auto px-3 py-2">
            <ParticipantAgentTree
              onTopicSelect={handleTopicSelect}
              onClose={() => onMenuOpenChange(false)}
              onTopicDeleted={notifyTopicDeleted}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
    </TooltipProvider>
  )
}
