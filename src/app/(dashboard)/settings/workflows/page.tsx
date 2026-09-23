'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Workflow,
  Bot,
  Search,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { PageLoader } from '@/components/ui/page-loader'
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler'
import { WorkflowExecution, WORKFLOW_STATUS_OPTIONS } from './types'
import { useWorkflows } from './hooks/use-workflows'
import { WorkflowsTable } from './components/workflows-table'
import { WorkflowActionDialog } from './components/workflow-action-dialog'

function WorkflowsContent() {
  const searchParams = useSearchParams()
  const agentName = searchParams.get('agentName')
  const activationName = searchParams.get('activationName')

  const [statusFilter, setStatusFilter] = useState('all')
  const [workflowTypeFilter, setWorkflowTypeFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionMode, setActionMode] = useState<'cancel' | 'terminate' | null>(null)
  const [target, setTarget] = useState<WorkflowExecution | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  const options = useMemo(
    () => ({
      agentName: agentName ?? undefined,
      activationName: activationName ?? undefined,
      status: statusFilter,
      workflowType: workflowTypeFilter.trim() || undefined,
      user: userFilter.trim() || undefined,
    }),
    [agentName, activationName, statusFilter, workflowTypeFilter, userFilter]
  )

  const {
    workflows,
    isLoading,
    error,
    refetch,
    loadMore,
    hasNextPage,
    cancelWorkflow,
  } = useWorkflows(options)

  const filteredWorkflows = useMemo(() => {
    if (!workflows) return []
    const query = searchQuery.trim().toLowerCase()
    if (!query) return workflows
    return workflows.filter((w) =>
      (w.workflowId ?? '').toLowerCase().includes(query)
    )
  }, [workflows, searchQuery])

  const handleConfirm = async () => {
    if (!target?.workflowId || !actionMode) return
    setIsWorking(true)
    try {
      await cancelWorkflow(target.workflowId, actionMode === 'terminate')
      showSuccessToast(
        actionMode === 'terminate' ? 'Workflow terminated' : 'Workflow canceled'
      )
      setActionMode(null)
      setTarget(null)
    } catch (e) {
      showErrorToast(e)
    } finally {
      setIsWorking(false)
    }
  }

  if (!agentName || !activationName) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <PageHeader agentName={null} activationName={null} />
        <Card className="mt-6">
          <CardContent className="py-16">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Workflow className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">No agent selected</p>
                <p className="text-sm text-muted-foreground">
                  Choose an agent activation from the{' '}
                  <strong>Temporal Workflows</strong> menu in the sidebar to view
                  and manage its workflows.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <PageHeader agentName={agentName} activationName={activationName} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by workflow ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {WORKFLOW_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Workflow type"
                value={workflowTypeFilter}
                onChange={(e) => setWorkflowTypeFilter(e.target.value)}
                className="w-full lg:w-48"
              />
              <Input
                placeholder="Owner / user"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full lg:w-48"
              />
            </div>
          </div>
        </div>

        <div className="container mx-auto space-y-4 p-4 sm:p-6">
          {error ? (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error.message}</span>
                </div>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <PageLoader label="Loading workflows..." className="py-24" />
          ) : filteredWorkflows.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Workflow className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {workflows && workflows.length > 0
                      ? 'No workflows match your filters.'
                      : 'No workflows found for this activation.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <WorkflowsTable
                workflows={filteredWorkflows}
                agentName={agentName}
                activationName={activationName}
                actionBusyId={isWorking ? target?.workflowId ?? null : null}
                onCancel={(workflow) => {
                  setTarget(workflow)
                  setActionMode('cancel')
                }}
                onTerminate={(workflow) => {
                  setTarget(workflow)
                  setActionMode('terminate')
                }}
              />
              {hasNextPage && (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => loadMore()} disabled={isLoading}>
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <WorkflowActionDialog
        open={actionMode !== null}
        onOpenChange={(open) => {
          if (!open && !isWorking) {
            setActionMode(null)
            setTarget(null)
          }
        }}
        mode={actionMode ?? 'cancel'}
        workflowId={target?.workflowId ?? null}
        onConfirm={handleConfirm}
        isWorking={isWorking}
      />
    </>
  )
}

function PageHeader({
  agentName,
  activationName,
}: {
  agentName: string | null
  activationName: string | null
}) {
  return (
    <div className="min-w-0">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground sm:gap-3 sm:text-2xl">
        <Workflow className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />
        Temporal Workflows
      </h1>
      {agentName && (
        <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs text-muted-foreground sm:text-sm">
            Managing workflows for
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="flex max-w-full items-center gap-1.5 px-2 py-1 sm:px-3"
            >
              <Bot className="h-3 w-3 shrink-0" />
              <span className="max-w-[140px] truncate sm:max-w-none">{agentName}</span>
            </Badge>
            {activationName && (
              <Badge variant="outline" className="max-w-full px-2 py-1 sm:px-3">
                <span className="max-w-[160px] truncate sm:max-w-none">
                  {activationName}
                </span>
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function WorkflowsPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading workflows..." />}>
      <WorkflowsContent />
    </Suspense>
  )
}
