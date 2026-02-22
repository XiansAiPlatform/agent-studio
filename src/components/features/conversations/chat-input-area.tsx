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
  agentName: string;
  isActivationActive: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ChatInputArea({
  messageInput,
  onMessageChange,
  onSendMessage,
  onSendFile,
  selectedTopicId,
  agentName,
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
    <div className="border-t border-border/20 bg-card px-6 py-4 flex-shrink-0">
      <div className="max-w-4xl mx-auto">
        {!isActivationActive && (
          <div className="mb-3 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-700 dark:text-yellow-400">
            This agent is inactive. Messages cannot be sent until it is activated.
          </div>
        )}
        <div className="flex items-center gap-2">
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
                className="flex-shrink-0 h-11 w-11 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Upload file"
              >
                {isUploadingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={messageInput}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isActivationActive ? `Message ${agentName}...` : 'Activation is inactive'}
              disabled={!isActivationActive}
              className="h-11 resize-none bg-muted/30 border-0 rounded-full focus-visible:ring-1 focus-visible:ring-primary/30 transition-all text-sm px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <Button
            onClick={onSendMessage}
            disabled={!messageInput.trim() || !isActivationActive}
            size="icon"
            className="flex-shrink-0 h-11 w-11 rounded-full transition-all duration-200 bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
