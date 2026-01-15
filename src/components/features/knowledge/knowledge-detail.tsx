'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { KnowledgeArticle } from '@/lib/data/dummy-knowledge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  FileJson,
  FileText,
  FileCode,
  User,
  Clock,
  Edit,
  Copy,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Dynamically import the markdown editor to avoid SSR issues
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

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
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(article.content);

  useEffect(() => {
    setMounted(true);
  }, []);

  const FormatIcon = formatIcons[article.format];

  const handleSave = () => {
    const updatedArticle: KnowledgeArticle = {
      ...article,
      content: editedContent,
      updatedAt: new Date().toISOString(),
      version: article.version + 1,
    };
    onEdit?.(updatedArticle);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(article.content);
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
        <div className="p-3 bg-muted/50 rounded-md">
          <p className="text-sm text-muted-foreground">Loading content...</p>
        </div>
      );
    }

    switch (article.format) {
      case 'json':
        if (isEditing) {
          return (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full min-h-[300px] p-3 bg-background border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono resize-none"
              placeholder="Enter JSON content..."
            />
          );
        }
        try {
          const parsed = JSON.parse(article.content);
          return (
            <div className="p-3 bg-muted/50 rounded-md overflow-x-auto">
              <pre className="text-sm text-foreground font-mono">
                {JSON.stringify(parsed, null, 2)}
              </pre>
            </div>
          );
        } catch {
          return (
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-sm text-destructive">Invalid JSON format</p>
              <pre className="mt-2 text-xs text-foreground font-mono whitespace-pre-wrap">
                {article.content}
              </pre>
            </div>
          );
        }

      case 'markdown':
        return (
          <div data-color-mode="auto" className="markdown-preview-compact">
            {isEditing ? (
              <MDEditor
                value={editedContent}
                onChange={(value) => setEditedContent(value || '')}
                height={400}
                preview="live"
                hideToolbar={false}
              />
            ) : (
              <MDEditorMarkdown
                source={article.content}
                style={{
                  padding: 12,
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
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full min-h-[300px] p-3 bg-background border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Enter text content..."
            />
          );
        }
        return (
          <div className="p-3 bg-muted/50 rounded-md">
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
          <FormatIcon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', formatColors[article.format])} />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground leading-tight">
              {article.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {article.description}
            </p>
          </div>
        </div>
        
        {/* Compact metadata */}
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {article.assignedAgent.name}
          </span>
          <span>•</span>
          <Badge variant="outline" className="text-xs h-5">
            {article.format.toUpperCase()}
          </Badge>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            v{article.version}
          </span>
          <span>•</span>
          <span>{formatDate(article.updatedAt)}</span>
        </div>
      </div>

      <Separator />

      {/* Content */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2">Content</h3>
        {renderContent()}
      </div>

      {/* Actions */}
      <Separator />
      {isEditing ? (
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      ) : (
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onDelete?.(article.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDuplicate}
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
          <Button
            className="flex-1"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      )}
    </div>
  );
}
