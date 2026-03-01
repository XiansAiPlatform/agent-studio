'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  KnowledgeItem,
  KnowledgeGroup,
  KnowledgeScopeLevel,
  SCOPE_LEVEL_CONFIG,
} from '@/lib/xians/knowledge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileJson,
  FileText,
  FileCode,
  User,
  Clock,
  Edit,
  Copy,
  Trash2,
  Globe,
  Building2,
  Zap,
  ChevronDown,
  Save,
  X,
  AlertTriangle,
  Loader2,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { showToast } from '@/lib/toast';

// Dynamically import the markdown editor to avoid SSR issues
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

const MDEditorMarkdown = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
);

// Dynamically import the JSON editor to avoid SSR issues
const JsonEditorWrapper = dynamic(
  () => import('./json-editor-wrapper').then((mod) => ({ default: mod.JsonEditorWrapper })),
  { ssr: false }
);

interface KnowledgeItemDetailProps {
  item: KnowledgeItem;
  level: KnowledgeScopeLevel;
  groupName: string;
  group?: KnowledgeGroup;
  agentName?: string;
  activationName?: string;
  onEdit?: (item: KnowledgeItem) => void;
  onSave?: (itemId: string, content: string, type: string, version: string) => Promise<void>;
  onDuplicate?: (item: KnowledgeItem) => void;
  onDelete?: (itemId: string) => void;
  onOverride?: (item: KnowledgeItem, targetLevel: 'tenant' | 'activation') => void;
  onDeleteVersion?: () => void;
  onDeleteAllVersions?: () => void;
}

const formatIcons = {
  json: FileJson,
  markdown: FileCode,
  text: FileText,
};

const formatColors = {
  json: 'text-blue-600 dark:text-blue-400',
  markdown: 'text-purple-600 dark:text-purple-400',
  text: 'text-gray-600 dark:text-gray-400',
};

const scopeIcons = {
  system: Globe,
  tenant: Building2,
  activation: Zap,
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ContentViewerProps {
  item: KnowledgeItem;
  mounted: boolean;
}

function ContentViewer({ item, mounted }: ContentViewerProps) {
  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center p-3 bg-muted/50 rounded-md">
        <p className="text-sm text-muted-foreground">Loading content...</p>
      </div>
    );
  }

  if (!item.content || item.content.trim() === '') {
    return (
      <div className="h-full flex items-center justify-center p-4 bg-muted/30 rounded-md border border-dashed border-muted-foreground/20">
        <p className="text-sm text-muted-foreground italic text-center">
          No content defined
        </p>
      </div>
    );
  }

  switch (item.type) {
    case 'json':
      return (
        <div className="h-full w-full border rounded-md overflow-hidden bg-background">
          <JsonEditorWrapper
            value={item.content || '{}'}
            onChange={() => {}} // Read-only, no changes
            mode="tree"
            readOnly={true}
          />
        </div>
      );

    case 'markdown':
      return (
        <div data-color-mode="auto" className="h-full markdown-preview-compact overflow-hidden">
          <div className="h-full p-3 bg-muted/30 rounded-md overflow-auto">
            <MDEditorMarkdown
              source={item.content}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--foreground)',
              }}
            />
          </div>
        </div>
      );

    case 'text':
    default:
      return (
        <div className="h-full p-3 bg-muted/50 rounded-md overflow-auto">
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
            {item.content}
          </pre>
        </div>
      );
  }
}

export function KnowledgeItemDetail({
  item,
  level,
  groupName,
  group,
  agentName,
  activationName,
  onEdit,
  onSave,
  onDuplicate,
  onDelete,
  onOverride,
  onDeleteVersion,
  onDeleteAllVersions,
}: KnowledgeItemDetailProps) {
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(item.content || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setEditedContent(item.content || '');
    setValidationError(null);
    setIsEditing(false);
  }, [item.id, item.content]);

  const FormatIcon = formatIcons[item.type] || FileText;
  const config = SCOPE_LEVEL_CONFIG[level];
  const ScopeIcon = scopeIcons[level];

  // Check if overrides exist at different levels
  const hasTenantOverride = !!group?.tenant_default;
  const hasAgentOverride = !!group?.activations.length;

  const validateContent = (): boolean => {
    if (item.type === 'json') {
      try {
        JSON.parse(editedContent);
        setValidationError(null);
        return true;
      } catch (error) {
        setValidationError('Invalid JSON format');
        return false;
      }
    }
    setValidationError(null);
    return true;
  };

  const handleEditClick = () => {
    setIsEditing(true);
    onEdit?.(item);
  };

  const handleSave = async () => {
    if (!validateContent() || !onSave) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(item.id, editedContent, item.type, item.version);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving knowledge:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(item.content || '');
    setValidationError(null);
    setIsEditing(false);
  };

  const handleDeleteVersion = async () => {
    if (!item.id) {
      showToast.error({
        title: 'Error',
        description: 'Missing knowledge ID',
      });
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/knowledge/${item.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete knowledge version');
      }

      showToast.success({
        title: 'Version Deleted',
        description: 'Knowledge version deleted successfully. Previous version is now active.',
      });

      setShowDeleteDialog(false);
      onDeleteVersion?.();
    } catch (error: any) {
      console.error('Error deleting knowledge version:', error);
      showToast.error({
        title: 'Failed to Delete',
        description: error.message || 'Failed to delete knowledge version',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllVersions = async () => {
    if (!item.name || !agentName) {
      showToast.error({
        title: 'Error',
        description: 'Missing required information for deletion',
      });
      return;
    }

    if (level === 'system') {
      showToast.error({
        title: 'Error',
        description: 'Cannot delete system-level knowledge',
      });
      return;
    }

    setIsDeletingAll(true);
    try {
      // Build query params
      const params = new URLSearchParams({
        name: item.name,
        level: level,
        agentName: agentName,
      });
      
      if (level === 'activation' && activationName) {
        params.append('activationName', activationName);
      }

      const response = await fetch(
        `/api/knowledge/versions?${params}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete all versions');
      }

      const result = await response.json();
      const deletedCount = result.deletedCount || 0;

      showToast.success({
        title: level === 'tenant' ? 'Deleted' : 'All Versions Deleted',
        description: `Successfully deleted ${deletedCount} version(s) at ${level} level.`,
      });

      setShowDeleteAllDialog(false);
      level === 'tenant' ? onDelete?.(item.id) : onDeleteAllVersions?.();
    } catch (error: any) {
      console.error('Error deleting all versions:', error);
      showToast.error({
        title: 'Failed to Delete',
        description: error.message || 'Failed to delete all versions',
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const renderEditor = () => {
    if (!mounted) {
      return (
        <div className="h-full flex items-center justify-center p-4 bg-muted/50 rounded-md">
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
      );
    }

    switch (item.type) {
      case 'json':
        return (
          <div className="h-full w-full border rounded-md overflow-hidden">
            <JsonEditorWrapper
              value={editedContent}
              onChange={(value) => {
                setEditedContent(value);
                setValidationError(null);
              }}
              onValidationError={(errors) => {
                if (errors && errors.length > 0) {
                  setValidationError('Invalid JSON format');
                } else {
                  setValidationError(null);
                }
              }}
              mode="tree"
              readOnly={false}
            />
          </div>
        );

      case 'markdown':
        return (
          <div data-color-mode="auto" className="h-full markdown-editor-container">
            <MDEditor
              value={editedContent}
              onChange={(value) => setEditedContent(value || '')}
              height="100%"
              preview="live"
              hideToolbar={false}
            />
          </div>
        );

      case 'text':
        return (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full p-3 bg-background border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Enter text content..."
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Content Area with Flex Layout */}
      <div className="flex-1 flex flex-col px-6 pt-4 min-h-0">
        {/* Metadata badges */}
        <div className="flex items-center gap-3 flex-wrap text-xs mb-4 shrink-0">
          <Badge variant="outline" className={cn('text-xs h-6 flex items-center gap-1.5', config.badgeColor)}>
            <ScopeIcon className="h-3 w-3" />
            {config.label} Level
          </Badge>
          <span>•</span>
          <Badge variant="outline" className="text-xs h-6">
            {item.type.toUpperCase()}
          </Badge>

          <span>•</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDate(item.createdAt)}
          </span>
        </div>

        {/* Document/Editor - Takes Full Height */}
        <div className="flex-1 mb-4 min-h-0">
          {isEditing ? (
            <div className="h-full flex flex-col gap-2">
              <div className="flex-1 min-h-0">
                {renderEditor()}
              </div>
              {validationError && (
                <p className="text-sm text-destructive shrink-0">{validationError}</p>
              )}
            </div>
          ) : (
            <ContentViewer item={item} mounted={mounted} />
          )}
        </div>

        {/* Version Info */}
        <div className="p-3 bg-muted/30 rounded-md shrink-0 mb-4">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <div>
              <span className="font-medium">Version:</span>{' '}
              <span className="font-mono">{item.version}</span>
            </div>
            {item.tenantId && level !== 'system' && (
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:underline font-medium"
                title="Delete this version and revert to previous"
              >
                delete this version
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Action Bar at Bottom */}
      <div className="shrink-0 border-t border-border bg-background px-6 py-4">
        {isEditing ? (
          // Editing mode - show Save/Cancel
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 max-w-[180px]"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              size="default"
              onClick={handleSave}
              disabled={isSaving || !!validationError}
              className="flex-1 max-w-[180px]"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        ) : level === 'system' ? (
          // System level is read-only - only show override option
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="default">
                  <Copy className="mr-2 h-4 w-4" />
                  Override
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {!hasTenantOverride && (
                  <DropdownMenuItem onClick={() => onOverride?.(item, 'tenant')}>
                    <Building2 className="mr-2 h-4 w-4 text-amber-500" />
                    Override at Organization Level
                  </DropdownMenuItem>
                )}
                {!hasAgentOverride && (
                  <DropdownMenuItem onClick={() => onOverride?.(item, 'activation')}>
                    <Zap className="mr-2 h-4 w-4 text-emerald-500" />
                    Override at Agent Level
                  </DropdownMenuItem>
                )}
                {hasTenantOverride && hasAgentOverride && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                    All levels have overrides
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : level === 'tenant' ? (
          // Organization Level - show override dropdown
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={() => setShowDeleteAllDialog(true)}
              className="flex-1 max-w-[140px]"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <div className="flex items-center gap-3 flex-1 justify-end">
              {!hasAgentOverride && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="default">
                      <Copy className="mr-2 h-4 w-4" />
                      Override
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem onClick={() => onOverride?.(item, 'activation')}>
                      <Zap className="mr-2 h-4 w-4 text-emerald-500" />
                      Override at Agent Level
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                size="default"
                onClick={handleEditClick}
                className="min-w-[100px]"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </div>
        ) : (
          // Agent level - fully editable
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={() => setShowDeleteAllDialog(true)}
              className="flex-1 max-w-[200px]"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All Versions
            </Button>
            <Button
              size="default"
              onClick={handleEditClick}
              className="flex-1 max-w-[140px]"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Delete Version Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <DialogTitle>Delete Knowledge Version</DialogTitle>
                <DialogDescription className="mt-1">
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm text-foreground">
                Are you sure you want to delete this version of{' '}
                <span className="font-semibold text-destructive">
                  {item.name}
                </span>
                ?
              </p>
              <div className="mt-3 pt-3 border-t border-destructive/10">
                <p className="text-xs text-muted-foreground">
                  This version will be permanently deleted and the previous version will become the active version.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Current version: <span className="font-mono">{item.version}</span>
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteVersion}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Version
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Versions Confirmation Dialog */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <DialogTitle>Delete All Versions</DialogTitle>
                <DialogDescription className="mt-1">
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-foreground font-semibold">
                  Warning: All versions will be permanently deleted
                </p>
              </div>
              <p className="text-sm text-foreground">
                Are you sure you want to delete <span className="font-semibold text-destructive">all versions</span> of{' '}
                <span className="font-semibold">{item.name}</span> at the{' '}
                <span className="font-semibold">{config.label}</span> level?
              </p>
              <div className="mt-3 pt-3 border-t border-destructive/10">
                <p className="text-xs text-muted-foreground">
                  This will delete:
                </p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                  <li>All versions of <span className="font-mono">{item.name}</span></li>
                  <li>At {config.label} level only</li>
                  {level === 'activation' && activationName && (
                    <li>For activation: <span className="font-mono">{activationName}</span></li>
                  )}
                  <li>For agent: <span className="font-mono">{agentName || item.agent}</span></li>
                </ul>
                <div className="flex items-center gap-1.5 mt-2">
                  <Info className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Other scope levels will remain unaffected
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteAllDialog(false)}
              disabled={isDeletingAll}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllVersions}
              disabled={isDeletingAll}
            >
              {isDeletingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Versions
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
