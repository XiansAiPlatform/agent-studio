'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { FileUploadPayload } from './types';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface ChatInputAreaProps {
  messageInput: string;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onSendFile?: (file: FileUploadPayload, topicId: string) => void;
  selectedTopicId: string;
  activationName: string;
  isActivationActive: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ChatInputArea({
  messageInput,
  onMessageChange,
  onSendMessage,
  onSendFile,
  selectedTopicId,
  activationName,
  isActivationActive,
  inputRef: externalInputRef,
}: ChatInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const localInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || localInputRef;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTopicId || !isActivationActive || !onSendFile) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error('File too large', {
        description: `Maximum file size is ${MAX_FILE_SIZE_MB}MB`,
      });
      e.target.value = '';
      return;
    }

    setIsUploadingFile(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Content = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64Content ?? '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      onSendFile(
        {
          base64,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
        },
        selectedTopicId
      );
    } finally {
      setIsUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleAttachClick = () => {
    if (!isActivationActive || isUploadingFile) return;
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
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onSendFile && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="*/*"
                onChange={handleFileSelect}
                disabled={!isActivationActive || isUploadingFile}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleAttachClick}
                disabled={!isActivationActive || isUploadingFile}
                className="chat-attach-btn flex-shrink-0 h-11 w-11 sm:h-10 sm:w-10 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Upload file"
              >
                {isUploadingFile ? (
                  <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-5 w-5 sm:h-4 sm:w-4" />
                )}
              </Button>
            </>
          )}
          <div className="flex-1 relative min-w-0">
            <Input
              ref={inputRef}
              value={messageInput}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isActivationActive ? `Message ${activationName}...` : 'Activation is inactive'}
              disabled={!isActivationActive}
              className="h-11 sm:h-10 resize-none bg-background border border-border rounded-full focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/60 transition-all text-base sm:text-sm px-5 sm:px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <Button
            onClick={onSendMessage}
            disabled={!messageInput.trim() || !isActivationActive}
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
