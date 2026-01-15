'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { KnowledgeArticle } from '@/lib/data/dummy-knowledge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileJson,
  FileText,
  FileCode,
  User,
  Clock,
  Edit,
  Save,
  X,
  Copy,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Dynamically import the markdown editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor'),
  { ssr: false }
);

const MDEditorMarkdown = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
);

interface KnowledgeDetailProps {
  article: KnowledgeArticle;
  onEdit?: (article: KnowledgeArticle) => void;
  onDuplicate?: (article: KnowledgeArticle) => void;
  onDelete?: (articleId: string) => void;
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

export function KnowledgeDetail({
  article,
  onEdit,
  onDuplicate,
  onDelete,
}: KnowledgeDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedArticle, setEditedArticle] = useState({
    title: article.title,
    description: article.description,
    content: article.content,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const FormatIcon = formatIcons[article.format];

  const handleSave = () => {
    const updatedArticle: KnowledgeArticle = {
      ...article,
      title: editedArticle.title,
      description: editedArticle.description,
      content: editedArticle.content,
      updatedAt: new Date().toISOString(),
      version: article.version + 1,
    };
    onEdit?.(updatedArticle);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedArticle({
      title: article.title,
      description: article.description,
      content: article.content,
    });
    setIsEditing(false);
  };

  const handleDuplicate = () => {
    const duplicatedArticle: KnowledgeArticle = {
      ...article,
      id: `kb-${Date.now()}`,
      title: `${article.title} (Copy)`,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onDuplicate?.(duplicatedArticle);
  };

  const renderContent = () => {
    if (!mounted) {
      return (
        <div className="p-4 bg-muted rounded-md">
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
      );
    }

    switch (article.format) {
      case 'json':
        if (isEditing) {
          return (
            <textarea
              value={editedArticle.content}
              onChange={(e) =>
                setEditedArticle({ ...editedArticle, content: e.target.value })
              }
              className="w-full min-h-[400px] p-4 bg-background border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              placeholder="Enter JSON content..."
            />
          );
        }
        try {
          const parsed = JSON.parse(article.content);
          return (
            <div className="p-4 bg-muted rounded-md overflow-x-auto">
              <pre className="text-sm text-foreground font-mono">
                {JSON.stringify(parsed, null, 2)}
              </pre>
            </div>
          );
        } catch {
          return (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm text-destructive">Invalid JSON format</p>
              <pre className="mt-2 text-xs text-foreground font-mono whitespace-pre-wrap">
                {article.content}
              </pre>
            </div>
          );
        }

      case 'markdown':
        return (
          <div data-color-mode="auto">
            {isEditing ? (
              <MDEditor
                value={editedArticle.content}
                onChange={(value) =>
                  setEditedArticle({ ...editedArticle, content: value || '' })
                }
                height={500}
                preview="live"
                hideToolbar={false}
              />
            ) : (
              <MDEditorMarkdown
                source={article.content}
                style={{
                  padding: 16,
                  backgroundColor: 'var(--muted)',
                  borderRadius: '0.375rem',
                  color: 'var(--foreground)',
                }}
              />
            )}
          </div>
        );

      case 'text':
        if (isEditing) {
          return (
            <textarea
              value={editedArticle.content}
              onChange={(e) =>
                setEditedArticle({ ...editedArticle, content: e.target.value })
              }
              className="w-full min-h-[400px] p-4 bg-background border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter text content..."
            />
          );
        }
        return (
          <div className="p-4 bg-muted rounded-md">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
              {article.content}
            </pre>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start gap-3 mb-3">
          <FormatIcon className={cn('h-6 w-6 flex-shrink-0 mt-1', formatColors[article.format])} />
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="title" className="text-xs text-muted-foreground">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={editedArticle.title}
                    onChange={(e) =>
                      setEditedArticle({ ...editedArticle, title: e.target.value })
                    }
                    className="text-xl font-semibold mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-xs text-muted-foreground">
                    Description
                  </Label>
                  <Input
                    id="description"
                    value={editedArticle.description}
                    onChange={(e) =>
                      setEditedArticle({ ...editedArticle, description: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-foreground leading-tight">
                  {article.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {article.description}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Assigned Agent */}
      <div className="flex items-center gap-2 text-sm p-3 bg-primary/10 border border-primary/20 rounded-md">
        <User className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">Assigned to:</span>
        <span className="font-medium text-foreground">
          {article.assignedAgent.name}
        </span>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created by:</span>
            <span className="font-medium text-foreground">
              {article.createdBy.name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium text-foreground">
              {formatDate(article.createdAt)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {article.updatedBy && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Updated by:</span>
              <span className="font-medium text-foreground">
                {article.updatedBy.name}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Last updated:</span>
            <span className="font-medium text-foreground">
              {formatDate(article.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm p-3 bg-muted rounded-md">
        <Badge variant="outline" className="text-xs">
          Version {article.version}
        </Badge>
        <span className="text-muted-foreground">•</span>
        <Badge variant="outline" className="text-xs">
          {article.format.toUpperCase()}
        </Badge>
      </div>

      <Separator />

      {/* Content */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Content</h3>
        </div>
        {renderContent()}
      </div>

      {/* Actions */}
      <Separator />
      {isEditing ? (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 transition-all hover:bg-gray-500/10"
            onClick={handleCancel}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            className="flex-1 group transition-all hover:shadow-md hover:scale-[1.02]"
            onClick={handleSave}
          >
            <Save className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
            Save Changes
          </Button>
        </div>
      ) : (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 group transition-all hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/50"
            onClick={() => onDelete?.(article.id)}
          >
            <Trash2 className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
            Delete
          </Button>
          <Button
            variant="outline"
            className="flex-1 group transition-all hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/50"
            onClick={handleDuplicate}
          >
            <Copy className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
            Duplicate
          </Button>
          <Button
            className="flex-1 group transition-all hover:shadow-md hover:scale-[1.02]"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="mr-2 h-4 w-4 transition-transform group-hover:rotate-12" />
            Edit
          </Button>
        </div>
      )}
    </div>
  );
}
