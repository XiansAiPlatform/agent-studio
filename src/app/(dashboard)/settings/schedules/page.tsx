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
  CalendarClock,
  Bot,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Trash2,
} from 'lucide-react'
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler'
import { Schedule, SCHEDULE_STATUS_OPTIONS } from './types'
import { useSchedules } from './hooks/use-schedules'
import { ScheduleCard } from './components/schedule-card'
import { ScheduleDetailsSheet } from './components/schedule-details-sheet'
import { DeleteScheduleDialog } from './components/delete-schedule-dialog'

function SchedulesContent() {
  const searchParams = useSearchParams()
  const agentName = searchParams.get('agentName')
  const activationName = searchParams.get('activationName')

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null)
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const options = useMemo(
    () => ({
      agentName: agentName ?? undefined,
      status: statusFilter,
    }),
    [agentName, statusFilter]
  )

  const {
    schedules,
    isLoading,
    error,
    refetch,
    deleteSchedule,
    deleteAllSchedules,
    setSchedulePaused,
  } = useSchedules(options)

  const filteredSchedules = useMemo(() => {
    if (!schedules) return []
    const query = searchQuery.trim().toLowerCase()
    if (!query) return schedules
    return schedules.filter(
      (s) =>
        s.workflowType.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.scheduleSpec.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query)
    )
  }, [schedules, searchQuery])

  const handleCardClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setShowDetails(true)
  }

  const handleTogglePause = async (schedule: Schedule) => {
    const willPause = schedule.status !== 'Suspended'
    setTogglingId(schedule.id)
    try {
      await setSchedulePaused(schedule.id, willPause)
      showSuccessToast(willPause ? 'Schedule paused' : 'Schedule resumed')
      // Keep the open details sheet in sync with the new status.
      setSelectedSchedule((current) =>
        current && current.id === schedule.id
          ? { ...current, status: willPause ? 'Suspended' : 'Running' }
          : current
      )
    } catch (err) {
      showErrorToast(err)
    } finally {
      setTogglingId(null)
    }
  }

  const handleConfirmDeleteSingle = async () => {
    if (!scheduleToDelete) return
    setIsDeleting(true)
    try {
      await deleteSchedule(scheduleToDelete.id)
      showSuccessToast('Schedule deleted successfully')
      setScheduleToDelete(null)
      setShowDetails(false)
      setSelectedSchedule(null)
    } catch (err) {
      showErrorToast(err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleConfirmDeleteAll = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteAllSchedules()
      const count = result?.deletedCount ?? 0
      showSuccessToast(
        `Deleted ${count} schedule${count === 1 ? '' : 's'}`
      )
      setShowDeleteAll(false)
    } catch (err) {
      showErrorToast(err)
    } finally {
      setIsDeleting(false)
    }
  }

  // No agent selected yet — prompt the user to pick one from the sidebar.
  if (!agentName) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <PageHeader agentName={null} activationName={null} />
        <Card className="mt-6">
          <CardContent className="py-16">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <CalendarClock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">No agent selected</p>
                <p className="text-sm text-muted-foreground">
                  Choose an agent activation from the <strong>Schedules</strong>{' '}
                  menu in the sidebar to view and manage its schedules.
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
        {/* Header */}
        <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <PageHeader agentName={agentName} activationName={activationName} />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowDeleteAll(true)}
                  disabled={!schedules || schedules.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete All
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by workflow, description or spec..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {SCHEDULE_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Body */}
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
          ) : isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading schedules...</p>
              </div>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <CalendarClock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {schedules && schedules.length > 0
                      ? 'No schedules match your filters.'
                      : 'This agent has no schedules.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredSchedules.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  onClick={handleCardClick}
                  onDelete={setScheduleToDelete}
                  onTogglePause={handleTogglePause}
                  isToggling={togglingId === schedule.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ScheduleDetailsSheet
        schedule={selectedSchedule}
        agentName={agentName}
        open={showDetails}
        onOpenChange={(open) => {
          setShowDetails(open)
          if (!open) setSelectedSchedule(null)
        }}
        onDelete={(schedule) => setScheduleToDelete(schedule)}
        onTogglePause={handleTogglePause}
        isToggling={
          selectedSchedule ? togglingId === selectedSchedule.id : false
        }
      />

      <DeleteScheduleDialog
        open={!!scheduleToDelete}
        onOpenChange={(open) => !open && setScheduleToDelete(null)}
        scheduleLabel={
          scheduleToDelete?.description?.trim() || scheduleToDelete?.workflowType
        }
        onConfirm={handleConfirmDeleteSingle}
        isDeleting={isDeleting}
      />

      <DeleteScheduleDialog
        open={showDeleteAll}
        onOpenChange={(open) => !open && setShowDeleteAll(false)}
        deleteAll
        agentName={agentName}
        onConfirm={handleConfirmDeleteAll}
        isDeleting={isDeleting}
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
        <CalendarClock className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />
        Schedules
      </h1>
      {agentName && (
        <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs text-muted-foreground sm:text-sm">
            Managing schedules for
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

export default function SchedulesPage() {
  return (
    <Suspense
      fallback={<div className="container mx-auto p-6">Loading...</div>}
    >
      <SchedulesContent />
    </Suspense>
  )
}
