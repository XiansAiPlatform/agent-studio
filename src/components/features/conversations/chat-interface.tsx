'use client';

import { useState, useRef, useEffect } from 'react';
import { Conversation, Topic } from '@/lib/data/dummy-conversations';
import { ChatHeader } from './chat-header';
import { ChatInputArea } from './chat-input-area';
import { MessagesArea } from './messages-area';
import { useChatScroll } from './hooks/use-chat-scroll';

export interface FileUploadPayload {
  base64: string;
  fileName: string;
  contentType: string;
  fileSize?: number;
}

interface ChatInterfaceProps {
  conversation: Conversation;
  selectedTopicId: string;
  onSendMessage?: (content: string, topicId: string) => void;
  onSendFile?: (file: FileUploadPayload, topicId: string) => void;
  isLoadingMessages?: boolean;
  onLoadMoreMessages?: () => void;
  isLoadingMoreMessages?: boolean;
  hasMoreMessages?: boolean;
  activationName?: string;
  hideHeader?: boolean;
  isActivationActive?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ChatInterface({
  conversation,
  selectedTopicId,
  onSendMessage,
  onSendFile,
  isLoadingMessages = false,
  onLoadMoreMessages,
  isLoadingMoreMessages = false,
  hasMoreMessages = false,
  activationName,
  hideHeader = false,
  isActivationActive = true,
  inputRef: externalInputRef,
}: ChatInterfaceProps) {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const lastAgentMessageIdRef = useRef<string | null>(null);

  const selectedTopic = conversation.topics.find(t => t.id === selectedTopicId);

  const { messagesEndRef, messagesContainerRef } = useChatScroll({
    messages: selectedTopic?.messages ?? [],
    hasMoreMessages,
    isLoadingMoreMessages,
    onLoadMoreMessages,
    selectedTopicId,
  });

  // Clear typing indicator only when agent *chat* response arrives (not reasoning/tool steps)
  useEffect(() => {
    if (!selectedTopic || !isTyping) return;

    const agentChatMessages = selectedTopic.messages.filter(
      m => m.role === 'agent' && (m.messageType?.toLowerCase() !== 'reasoning' && m.messageType?.toLowerCase() !== 'tool')
    );
    const lastChatMessage = agentChatMessages[agentChatMessages.length - 1];

    if (lastChatMessage && lastChatMessage.id !== lastAgentMessageIdRef.current) {
      lastAgentMessageIdRef.current = lastChatMessage.id;
      setIsTyping(false);
    }
  }, [selectedTopic?.messages, isTyping]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedTopicId || !isActivationActive) return;

    const currentTopic = conversation.topics.find(t => t.id === selectedTopicId);
    if (currentTopic) {
      const agentChatMessages = currentTopic.messages.filter(
        m => m.role === 'agent' && (m.messageType?.toLowerCase() !== 'reasoning' && m.messageType?.toLowerCase() !== 'tool')
      );
      lastAgentMessageIdRef.current = agentChatMessages[agentChatMessages.length - 1]?.id ?? null;
    }

    onSendMessage?.(messageInput, selectedTopicId);
    setMessageInput('');
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 20000);
  };

  const handleSendFile = (payload: FileUploadPayload, topicId: string) => {
    const currentTopic = conversation.topics.find(t => t.id === topicId);
    if (currentTopic) {
      const agentChatMessages = currentTopic.messages.filter(
        m => m.role === 'agent' && (m.messageType?.toLowerCase() !== 'reasoning' && m.messageType?.toLowerCase() !== 'tool')
      );
      lastAgentMessageIdRef.current = agentChatMessages[agentChatMessages.length - 1]?.id ?? null;
    }
    onSendFile?.(payload, topicId);
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 20000);
  };

  if (!selectedTopic) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No topic selected
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border-l border-border/30 overflow-hidden">
      {!hideHeader && (
        <ChatHeader
          conversation={conversation}
          selectedTopic={selectedTopic}
          activationName={activationName}
        />
      )}

      <MessagesArea
        messages={selectedTopic.messages}
        agentName={conversation.agent.name}
        userName={conversation.user.name}
        topicName={selectedTopic.name}
        isLoadingMessages={isLoadingMessages}
        isLoadingMoreMessages={isLoadingMoreMessages}
        hasMoreMessages={hasMoreMessages}
        isTyping={isTyping}
        onLoadMoreMessages={onLoadMoreMessages}
        messagesContainerRef={messagesContainerRef}
        messagesEndRef={messagesEndRef}
      />

      <ChatInputArea
        messageInput={messageInput}
        onMessageChange={setMessageInput}
        onSendMessage={handleSendMessage}
        onSendFile={onSendFile ? handleSendFile : undefined}
        selectedTopicId={selectedTopicId}
        agentName={conversation.agent.name}
        isActivationActive={isActivationActive}
        inputRef={externalInputRef}
      />
    </div>
  );
}
