'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AlertCircle, Bot, FlaskConical, PauseCircle, Plus, RefreshCw, Search } from 'lucide-react'
import { PageLoader } from '@/components/ui/page-loader'
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler'
import { formatRelative } from '../schedules/format'
import { AgentEval, EvalRequest, EvalSummary, toEvalRequest, toFormValues } from './types'
import { useEvals } from './hooks/use-evals'
import { EvalCard } from './components/eval-card'
import { EvalFormSheet } from './components/eval-form-sheet'
import { EvalRunsSheet } from './components/eval-runs-sheet'
import { DeleteEvalDialog } from './components/delete-eval-dialog'
import { ActivationHealthBadge } from './components/eval-status-badge'

function EvalsContent() {
  const searchParams = useSearchParams()
  const agentName = searchParams.get('agentName')
  const activationName = searchParams.get('activationName')

  const [searchQuery, setSearchQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AgentEval | null>(null)
  const [viewing, setViewing] = useState<AgentEval | null>(null)
  const [toDelete, setToDelete] = useState<AgentEval | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { evals, activationActive, summary, isLoading, error, refetch, createEval, updateEval, deleteEval } =
    useEvals({ agentName, activationName })

  const filtered = useMemo(() => {
    if (!evals) return []
    const query = searchQuery.trim().toLowerCase()
    if (!query) return evals
    return evals.filter((e) => e.name.toLowerCase().includes(query) || e.type.includes(query))
  }, [evals, searchQuery])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (evaluation: AgentEval) => {
    setEditing(evaluation)
    setFormOpen(true)
  }

  const handleSubmit = async (request: EvalRequest) => {
    if (editing) {
      await updateEval(editing.id, request)
      showSuccessToast('Eval updated')
    } else {
      await createEval(request)
      showSuccessToast('Eval created', 'It will run on its schedule; results appear here.')
    }
  }

  const handleToggle = async (evaluation: AgentEval, enabled: boolean) => {
    setTogglingId(evaluation.id)
    try {
      await updateEval(evaluation.id, toEvalRequest({ ...toFormValues(evaluation), enabled }))
      showSuccessToast(enabled ? 'Eval enabled' : 'Eval disabled')
    } catch (err) {
      showErrorToast(err)
    } finally {
      setTogglingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!toDelete) return
    setIsDeleting(true)
    try {
      await deleteEval(toDelete.id)
      showSuccessToast('Eval deleted')
      setToDelete(null)
      if (viewing?.id === toDelete.id) setViewing(null)
    } catch (err) {
      showErrorToast(err)
    } finally {
      setIsDeleting(false)
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
                <FlaskConical className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">No agent selected</p>
                <p className="text-sm text-muted-foreground">
                  Choose an agent activation from the <strong>Evals</strong> menu in the sidebar to set up
                  automated checks for it.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isActive = activationActive !== false

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <PageHeader agentName={agentName} activationName={activationName} />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  New eval
                </Button>
              </div>
            </div>

            {summary && <SummaryBar summary={summary} />}

            {!isActive && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                <PauseCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>This activation is inactive, so its evals are paused. They resume automatically when it is activated.</span>
              </div>
            )}

            {evals && evals.length > 0 && (
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search evals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto p-4 sm:p-6">
          {error ? (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error.message}</span>
                </div>
              </CardContent>
            </Card>
          ) : isLoading && !evals ? (
            <PageLoader label="Loading evals..." className="py-24" />
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <FlaskConical className="h-8 w-8 text-muted-foreground" />
                  </div>
                  {evals && evals.length > 0 ? (
                    <p className="text-sm text-muted-foreground">No evals match your search.</p>
                  ) : (
                    <>
                      <div className="max-w-md space-y-1">
                        <p className="font-medium text-foreground">No evals yet</p>
                        <p className="text-sm text-muted-foreground">
                          Evals check this activation automatically: send a chat message and check the reply, call
                          a webhook, or make sure a schedule is still running. Results are recorded as pass or fail.
                        </p>
                      </div>
                      <Button onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                        Create your first eval
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filtered.map((evaluation) => (
                <EvalCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  activationActive={isActive}
                  onOpen={setViewing}
                  onEdit={openEdit}
                  onDelete={setToDelete}
                  onToggleEnabled={handleToggle}
                  isToggling={togglingId === evaluation.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <EvalFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        agentName={agentName}
        activationName={activationName}
        evaluation={editing}
        onSubmit={handleSubmit}
      />

      <EvalRunsSheet
        evaluation={viewing}
        agentName={agentName}
        activationName={activationName}
        activationActive={isActive}
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
      />

      <DeleteEvalDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        evalName={toDelete?.name}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </>
  )
}

function SummaryBar({ summary }: { summary: EvalSummary }) {
  if (summary.totalChecks === 0) return null
  const lastRun = formatRelative(summary.lastRunAt)
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <ActivationHealthBadge health={summary.status} />
      <span className="text-muted-foreground">
        <span className="font-medium text-green-700 dark:text-green-400">{summary.passing}</span> passing ·{' '}
        <span className="font-medium text-red-700 dark:text-red-400">{summary.failing}</span> failing ·{' '}
        <span className="font-medium text-orange-700 dark:text-orange-400">{summary.erroring}</span> errors
      </span>
      <span className="text-muted-foreground">
        {summary.enabledChecks} of {summary.totalChecks} enabled
      </span>
      {lastRun && <span className="text-muted-foreground">Last run {lastRun}</span>}
    </div>
  )
}

function PageHeader({ agentName, activationName }: { agentName: string | null; activationName: string | null }) {
  return (
    <div className="min-w-0">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground sm:gap-3 sm:text-2xl">
        <FlaskConical className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />
        Evals
      </h1>
      {agentName && (
        <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs text-muted-foreground sm:text-sm">Automated checks for</span>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge variant="secondary" className="flex max-w-full items-center gap-1.5 px-2 py-1 sm:px-3">
              <Bot className="h-3 w-3 shrink-0" />
              <span className="max-w-[140px] truncate sm:max-w-none">{agentName}</span>
            </Badge>
            {activationName && (
              <Badge variant="outline" className="max-w-full px-2 py-1 sm:px-3">
                <span className="max-w-[160px] truncate sm:max-w-none">{activationName}</span>
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function EvalsPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading evals..." />}>
      <EvalsContent />
    </Suspense>
  )
}
