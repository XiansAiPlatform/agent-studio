'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getPendingTasks, getTaskById } from '@/lib/data/dummy-tasks';
import { TaskListItem } from '@/components/features/tasks/task-list-item';
import { TaskDetail } from '@/components/features/tasks/task-detail';

function PendingTasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTaskId = searchParams.get('task');
  const selectedTask = selectedTaskId ? getTaskById(selectedTaskId) : null;

  const pendingTasks = getPendingTasks();

  const handleTaskClick = (taskId: string) => {
    router.push(`/tasks/pending?task=${taskId}`, { scroll: false });
  };

  const handleCloseSlider = () => {
    router.push('/tasks/pending', { scroll: false });
  };

  const handleApprove = (taskId: string) => {
    console.log('Approving task:', taskId);
    handleCloseSlider();
  };

  const handleReject = (taskId: string) => {
    console.log('Rejecting task:', taskId);
    handleCloseSlider();
  };

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Pending Tasks</h1>
            <p className="text-muted-foreground mt-1">
              Tasks awaiting your review and approval
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{pendingTasks.length} pending task{pendingTasks.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Tasks List */}
        {pendingTasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No pending tasks
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                You're all caught up! There are no tasks waiting for your approval at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle>Pending Tasks</CardTitle>
              <CardDescription>
                Click on a task to view full details and take action
              </CardDescription>
            </CardHeader>
            <CardContent className="!px-0 !py-0">
              {pendingTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onClick={() => handleTaskClick(task.id)}
                  isSelected={task.id === selectedTaskId}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Task Detail Slider */}
      <Sheet open={!!selectedTask} onOpenChange={handleCloseSlider}>
        <SheetContent className="flex flex-col p-0">
          {selectedTask && (
            <>
              <SheetHeader className="px-6 pt-6">
                <SheetTitle className="text-base">Task Details</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
                <TaskDetail
                  task={selectedTask}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function PendingTasksPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-6">Loading...</div>}>
      <PendingTasksContent />
    </Suspense>
  );
}
