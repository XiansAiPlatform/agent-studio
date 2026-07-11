'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, Loader2, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import type { FileUploadPayload } from './types';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_FILES = 5;
const MAX_TOTAL_SIZE_MB = 20;
const MAX_TOTAL_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;

function formatBytes(bytes?: number): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ChatInputAreaProps {
  messageInput: string;
  onMessageChange: (value: string) => void;
  /** Send the current text along with any staged files. */
  onSendMessage: (files?: FileUploadPayload[]) => void;
  /** Whether file attachments are supported for this conversation. */
  allowFileUpload?: boolean;
  selectedTopicId: string;
  activationName: string;
  isActivationActive: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

/** Max height the textarea can grow to before it starts scrolling (~6-7 rows). */
const MAX_TEXTAREA_HEIGHT_PX = 160;

export function ChatInputArea({
  messageInput,
  onMessageChange,
  onSendMessage,
  allowFileUpload = false,
  selectedTopicId,
  activationName,
  isActivationActive,
  inputRef: externalInputRef,
}: ChatInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileUploadPayload[]>([]);
  const localInputRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = externalInputRef || localInputRef;

  const canSend =
    isActivationActive && (messageInput.trim().length > 0 || pendingFiles.length > 0);

  const resizeTextarea = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  }, [inputRef]);

  // Keep height in sync when the value changes externally (e.g. sample prompts, send reset).
  useEffect(() => {
    resizeTextarea();
  }, [messageInput, resizeTextarea]);

  const doSend = () => {
    if (!canSend) return;
    onSendMessage(pendingFiles.length > 0 ? pendingFiles : undefined);
    setPendingFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't send while an IME composition is active (e.g. CJK / accented input),
    // where Enter confirms the composition rather than submitting the message.
    if (e.nativeEvent.isComposing || e.key === 'Process') return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Content = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64Content ?? '');
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (selected.length === 0 || !isActivationActive) return;

    const currentCount = pendingFiles.length;
    const currentTotal = pendingFiles.reduce((sum, f) => sum + (f.fileSize ?? 0), 0);

    const accepted: File[] = [];
    let runningTotal = currentTotal;
    let hitCountLimit = false;
    let hitTotalLimit = false;

    for (const file of selected) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error('File too large', {
          description: `"${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB per-file limit.`,
        });
        continue;
      }
      if (currentCount + accepted.length >= MAX_FILES) {
        hitCountLimit = true;
        break;
      }
      if (runningTotal + file.size > MAX_TOTAL_SIZE_BYTES) {
        hitTotalLimit = true;
        continue;
      }
      accepted.push(file);
      runningTotal += file.size;
    }

    if (hitCountLimit) {
      toast.error('Too many files', {
        description: `You can attach up to ${MAX_FILES} files per message.`,
      });
    }
    if (hitTotalLimit) {
      toast.error('Attachments too large', {
        description: `Combined attachments must stay under ${MAX_TOTAL_SIZE_MB}MB.`,
      });
    }

    if (accepted.length === 0) return;

    setIsReadingFiles(true);
    try {
      const payloads = await Promise.all(
        accepted.map(async (file) => ({
          base64: await readFileAsBase64(file),
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
        }))
      );
      setPendingFiles((prev) => [...prev, ...payloads]);
    } catch {
      toast.error('Failed to read file', {
        description: 'One or more files could not be read. Please try again.',
      });
    } finally {
      setIsReadingFiles(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAttachClick = () => {
    if (!isActivationActive || isReadingFiles || pendingFiles.length >= MAX_FILES) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="border-t border-border bg-card px-3 pt-2.5 sm:px-6 sm:pt-4 pb-[max(env(safe-area-inset-bottom),0.875rem)] sm:pb-[max(env(safe-area-inset-bottom),1rem)] flex-shrink-0">
      <div className="max-w-4xl mx-auto">
        {!isActivationActive && (
          <div className="mb-2 sm:mb-3 px-3 sm:px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs sm:text-sm text-yellow-700 dark:text-yellow-400">
            This agent is inactive. Messages cannot be sent until it is activated.
          </div>
        )}

        {pendingFiles.length > 0 && (
          <div className="mb-2 sm:mb-3 flex flex-wrap gap-2">
            {pendingFiles.map((file, index) => (
              <div
                key={`${file.fileName}-${index}`}
                className="flex items-center gap-2 max-w-[220px] rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              >
                <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{file.fileName}</p>
                  {file.fileSize != null && (
                    <p className="text-[10px] text-muted-foreground">{formatBytes(file.fileSize)}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="flex-shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label={`Remove ${file.fileName}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5 sm:gap-2">
          {allowFileUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept="*/*"
                onChange={handleFileSelect}
                disabled={!isActivationActive || isReadingFiles}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleAttachClick}
                disabled={!isActivationActive || isReadingFiles || pendingFiles.length >= MAX_FILES}
                className="chat-attach-btn flex-shrink-0 h-11 w-11 sm:h-10 sm:w-10 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Attach files"
              >
                {isReadingFiles ? (
                  <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-5 w-5 sm:h-4 sm:w-4" />
                )}
              </Button>
            </>
          )}
          <div className="flex-1 relative min-w-0">
            <textarea
              ref={inputRef}
              rows={1}
              value={messageInput}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isActivationActive ? `Message ${activationName}...` : 'Activation is inactive'}
              disabled={!isActivationActive}
              enterKeyHint="send"
              className="block w-full resize-none bg-background border border-border rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/60 transition-colors text-base sm:text-sm px-5 sm:px-4 py-2.5 leading-6 max-h-40 overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <Button
            onClick={doSend}
            disabled={!canSend}
            size="icon"
            aria-label="Send message"
            className="chat-send-btn flex-shrink-0 h-11 w-11 sm:h-10 sm:w-10 rounded-full transition-all duration-200 bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
