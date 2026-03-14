'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Loader2,
  Plus,
  Check,
  X,
  Trash2,
  MoreVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTenant } from '@/hooks/use-tenant'
import { useActivations } from '@/app/(dashboard)/conversations/hooks'
import { Topic } from '@/lib/data/dummy-conversations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { showErrorToast } from '@/lib/utils/error-handler'

const TOPICS_PAGE_SIZE = 10

function isNoConversationalCapabilityError(message: string): boolean {
  const n = message.toLowerCase()
  return (
    n.includes('not registered') ||
    (n.includes('workflow') && n.includes('registered workflow types'))
  )
}

const GENERAL_TOPIC: Topic = {
  id: 'general-discussions',
  name: 'General Discussions',
  createdAt: new Date().toISOString(),
  status: 'active',
  messages: [],
  associatedTasks: [],
  isDefault: true,
  messageCount: 0,
  lastMessageAt: undefined,
}

interface ParticipantAgentTreeProps {
  onTopicSelect: (agentName: string, activationName: string, topic: Topic) => void
  onClose?: () => void
}

/** Fetches topics for a single activation. Returns at least [General Discussions] on empty/no-capability. */
async function fetchTopicsForActivation(
  agentName: string,
  activationName: string,
  page = 1,
  pageSize = TOPICS_PAGE_SIZE
): Promise<Topic[]> {
  const queryParams = new URLSearchParams({
    agentName,
    activationName,
    page: page.toString(),
    pageSize: pageSize.toString(),
  })
  const response = await fetch(`/api/messaging/topics?${queryParams.toString()}`)

  if (!response.ok) {
    let errorMessage = 'Failed to fetch topics'
    try {
      const err = await response.json()
      errorMessage = err.error ?? err.message ?? errorMessage
    } catch {
      errorMessage = `${response.status} ${response.statusText}`
    }
    if (
      response.status === 404 ||
      response.status === 400 ||
      isNoConversationalCapabilityError(errorMessage)
    ) {
      return [GENERAL_TOPIC]
    }
    throw new Error(errorMessage)
  }

  const data = await response.json()
  const rawTopics = data.topics || []
  const mapped: Topic[] = rawTopics.map(
    (t: { scope?: string | null; lastMessageAt?: string; messageCount?: number }) => {
      const isGeneral = t.scope === null
      const topicId = t.scope ?? 'general-discussions'
      const topicName = t.scope ?? 'General Discussions'
      return {
        id: topicId,
        name: topicName,
        createdAt: t.lastMessageAt || new Date().toISOString(),
        status: 'active' as const,
        messages: [],
        associatedTasks: [],
        isDefault: isGeneral,
        messageCount: t.messageCount ?? 0,
        lastMessageAt: t.lastMessageAt,
      } satisfies Topic
    }
  )
  const hasGeneral = mapped.some((t) => t.isDefault)
  const all = hasGeneral ? mapped : [GENERAL_TOPIC, ...mapped]
  return all.sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : 0))
}

export function ParticipantAgentTree({
  onTopicSelect,
  onClose,
}: ParticipantAgentTreeProps) {
  const params = useParams()
  const searchParams = useSearchParams()
  const { currentTenantId } = useTenant()
  const { activations: allActivations, isLoading: isLoadingActivations } =
    useActivations(currentTenantId)
  const activations = allActivations.filter((a) => a.status === 'active')

  const routeAgentName = params.agentName as string | undefined
  const routeActivationName = params.activationName as string | undefined
  const routeTopicId = searchParams.get('topic') || 'general-discussions'

  const [expandedActivations, setExpandedActivations] = useState<Set<string>>(
    () =>
      routeAgentName && routeActivationName
        ? new Set([`${decodeURIComponent(routeAgentName)}|${decodeURIComponent(routeActivationName)}`])
        : new Set()
  )
  const [topicsByActivation, setTopicsByActivation] = useState<
    Record<string, Topic[]>
  >({})
  const [loadingActivations, setLoadingActivations] = useState<
    Set<string>
  >(new Set())
  const [creatingForActivation, setCreatingForActivation] = useState<string | null>(null)
  const [newTopicName, setNewTopicName] = useState('')
  const [topicToDelete, setTopicToDelete] = useState<{
    key: string
    topicId: string
    topicName: string
  } | null>(null)
  const [isDeletingTopic, setIsDeletingTopic] = useState(false)
  const createInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creatingForActivation && createInputRef.current) {
      createInputRef.current.focus()
    }
  }, [creatingForActivation])

  // Auto-expand and fetch topics for the currently selected activation
  useEffect(() => {
    if (!routeAgentName || !routeActivationName) return
    const key = `${decodeURIComponent(routeAgentName)}|${decodeURIComponent(routeActivationName)}`
    setExpandedActivations((prev) => new Set(prev).add(key))
    if (!topicsByActivation[key]?.length) {
      fetchTopicsForActivation(decodeURIComponent(routeAgentName), decodeURIComponent(routeActivationName)).then(
        (topics) =>
          setTopicsByActivation((p) => ({ ...p, [key]: topics }))
      ).catch(console.error)
    }
  }, [routeAgentName, routeActivationName])

  const refetchActivationTopics = useCallback(
    async (agentName: string, activationName: string) => {
      const key = `${agentName}|${activationName}`
      const topics = await fetchTopicsForActivation(agentName, activationName)
      setTopicsByActivation((prev) => ({ ...prev, [key]: topics }))
    },
    []
  )

  const handleCreateTopic = useCallback(
    (agentName: string, activationName: string, topicName: string) => {
      const key = `${agentName}|${activationName}`
      const newTopic: Topic = {
        id: topicName,
        name: topicName,
        createdAt: new Date().toISOString(),
        status: 'active',
        messages: [],
        associatedTasks: [],
        isDefault: false,
        messageCount: 0,
        lastMessageAt: new Date().toISOString(),
      }
      setTopicsByActivation((prev) => ({
        ...prev,
        [key]: [...(prev[key] ?? []).filter((t) => t.isDefault), newTopic, ...(prev[key] ?? []).filter((t) => !t.isDefault)],
      }))
      setCreatingForActivation(null)
      setNewTopicName('')
      onTopicSelect(agentName, activationName, newTopic)
      onClose?.()
    },
    [onTopicSelect, onClose]
  )

  const handleDeleteTopic = useCallback(
    async (agentName: string, activationName: string, topicId: string, topicName: string) => {
      const key = `${agentName}|${activationName}`
      const topicParam = topicId === 'general-discussions' ? '' : topicId
      const queryParams = new URLSearchParams({
        agentName,
        activationName,
        topic: topicParam,
      })
      const response = await fetch(`/api/messaging/messages?${queryParams.toString()}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete topic messages')
      await refetchActivationTopics(agentName, activationName)
      setTopicToDelete(null)
      toast.success('Topic deleted', {
        description: `All messages in "${topicName}" have been deleted.`,
      })
    },
    [refetchActivationTopics]
  )

  const toggleActivation = useCallback(
    async (agentName: string, activationName: string) => {
      const key = `${agentName}|${activationName}`
      const isExpanded = expandedActivations.has(key)

      if (isExpanded) {
        setExpandedActivations((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
        return
      }

      setExpandedActivations((prev) => new Set(prev).add(key))
      if (topicsByActivation[key]?.length) return

      setLoadingActivations((prev) => new Set(prev).add(key))
      try {
        const topics = await fetchTopicsForActivation(agentName, activationName)
        setTopicsByActivation((prev) => ({ ...prev, [key]: topics }))
      } catch (err) {
        console.error('[ParticipantAgentTree] Failed to fetch topics:', err)
        setTopicsByActivation((prev) => ({ ...prev, [key]: [] }))
      } finally {
        setLoadingActivations((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    },
    [expandedActivations, topicsByActivation]
  )

  const handleTopicClick = useCallback(
    (agentName: string, activationName: string, topic: Topic) => {
      onTopicSelect(agentName, activationName, topic)
      onClose?.()
    },
    [onTopicSelect, onClose]
  )

  const handleActivationClick = useCallback(
    (agentName: string, activationName: string) => {
      onTopicSelect(agentName, activationName, GENERAL_TOPIC)
      onClose?.()
    },
    [onTopicSelect, onClose]
  )

  if (isLoadingActivations) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">Loading agents...</p>
      </div>
    )
  }

  if (activations.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        No agents available
      </div>
    )
  }

  return (
    <>
    <div className="flex flex-col gap-0.5 py-2">
      {activations.map((activation) => {
        const { agentName, name: activationName } = activation
        const key = `${agentName}|${activationName}`
        const isActivationExpanded = expandedActivations.has(key)
        const topics = topicsByActivation[key] ?? []
        const isLoading = loadingActivations.has(key)

        const isSelectedActivation =
          routeAgentName &&
          routeActivationName &&
          decodeURIComponent(routeAgentName) === agentName &&
          decodeURIComponent(routeActivationName) === activationName

        return (
          <div key={key} className="flex flex-col">
            <div className="flex items-center gap-1 w-full group/row">
              {/* Click activation → open default chat */}
              <button
                type="button"
                onClick={() => handleActivationClick(agentName, activationName)}
                className={cn(
                  'flex items-center gap-2 flex-1 min-w-0 px-3 py-2.5 text-left rounded-lg',
                  'hover:bg-muted/60 transition-colors',
                  isSelectedActivation && 'bg-primary/10'
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-primary/80" />
                <span className="font-medium text-sm truncate">{activationName}</span>
                {activation.status === 'active' && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-green-500 shrink-0" />
                )}
              </button>
              {/* Expand to see topics + create new thread - visible on hover or when expanded */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleActivation(agentName, activationName)
                }}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-opacity',
                  'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  isActivationExpanded ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'
                )}
                aria-label={isActivationExpanded ? 'Collapse threads' : 'Expand threads'}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isActivationExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>

            {isActivationExpanded && (
              <div className="ml-6 pl-3 border-l border-border/50 mt-0.5 space-y-0.5">
                {isLoading ? (
                  <div className="py-4 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {topics.length === 0 && creatingForActivation !== key && (
                      <div className="py-3 text-xs text-muted-foreground">
                        No threads yet
                      </div>
                    )}
                    {topics.map((topic) => {
                      const isSelectedTopic =
                        isSelectedActivation && topic.id === routeTopicId
                      return (
                      <div
                        key={topic.id}
                        className="flex items-center gap-2 group/topic"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleTopicClick(agentName, activationName, topic)
                          }
                          className={cn(
                            'flex items-center gap-2 flex-1 min-w-0 px-2 py-2 rounded-md text-left',
                            'hover:bg-primary/10 transition-colors'
                          )}
                        >
                          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className={cn(
                            'text-sm truncate',
                            isSelectedTopic && 'font-semibold'
                          )}>
                            {topic.name}
                          </span>
                        </button>
                        {topic.id !== 'general-discussions' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                                className="h-6 w-6 p-0 opacity-0 group-hover/topic:opacity-100 transition-opacity shrink-0"
                              >
                                <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  setTopicToDelete({
                                    key,
                                    topicId: topic.id,
                                    topicName: topic.name,
                                  })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                      )
                    })}
                    {creatingForActivation === key && (
                      <div className="flex items-center gap-2 px-2 py-2 border-l-2 border-primary/50">
                        <Input
                          ref={createInputRef}
                          type="text"
                          placeholder="New thread..."
                          value={newTopicName}
                          onChange={(e) => setNewTopicName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              if (newTopicName.trim())
                                handleCreateTopic(agentName, activationName, newTopicName.trim())
                            } else if (e.key === 'Escape') {
                              setCreatingForActivation(null)
                              setNewTopicName('')
                            }
                          }}
                          className="h-8 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            newTopicName.trim() &&
                            handleCreateTopic(agentName, activationName, newTopicName.trim())
                          }
                          disabled={!newTopicName.trim()}
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setCreatingForActivation(null)
                            setNewTopicName('')
                          }}
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                    {creatingForActivation !== key && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCreatingForActivation(key)}
                        className="h-8 gap-1.5 px-2 rounded-md text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-xs">New thread</span>
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>

    <AlertDialog
      open={!!topicToDelete}
      onOpenChange={(open) => !open && setTopicToDelete(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Topic Messages</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete all messages in
            &quot;{topicToDelete?.topicName}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeletingTopic}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              if (!topicToDelete) return
              setIsDeletingTopic(true)
              try {
                const [agentName, activationName] = topicToDelete.key.split('|')
                await handleDeleteTopic(
                  agentName,
                  activationName,
                  topicToDelete.topicId,
                  topicToDelete.topicName
                )
              } catch (err) {
                showErrorToast(err, 'Failed to delete topic')
              } finally {
                setIsDeletingTopic(false)
              }
            }}
            disabled={isDeletingTopic}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeletingTopic ? 'Deleting...' : 'Delete Messages'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
