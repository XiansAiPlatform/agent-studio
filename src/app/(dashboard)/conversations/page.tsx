'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  DUMMY_CONVERSATIONS,
  Conversation,
} from '@/lib/data/dummy-conversations';
import { ChatInterface, TopicList } from '@/components/features/conversations';
import { Bot } from 'lucide-react';

function ConversationsContent() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get('agent');

  // Find conversations for the selected agent
  const agentConversations = agentId
    ? DUMMY_CONVERSATIONS.filter((conv) => conv.agent.id === agentId && conv.status === 'active')
    : [];

  // Use the first conversation for the selected agent
  const selectedConversation = agentConversations[0] || null;

  // State for selected topic
  const [selectedTopicId, setSelectedTopicId] = useState(
    selectedConversation?.topics.find((t) => t.isDefault)?.id || 
    selectedConversation?.topics[0]?.id || 
    ''
  );

  // Update selected topic when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      const defaultTopic = selectedConversation.topics.find((t) => t.isDefault);
      setSelectedTopicId(defaultTopic?.id || selectedConversation.topics[0]?.id || '');
    }
  }, [selectedConversation?.id]);

  const handleSendMessage = (content: string, topicId: string) => {
    console.log('Sending message:', content, 'to topic:', topicId);
    // In a real app, this would send the message to the backend
  };

  const handleCreateTopic = () => {
    console.log('Creating new topic');
    // In a real app, this would open a dialog to create a new topic
  };

  if (!agentId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Bot className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Select an Agent
        </h2>
        <p className="text-muted-foreground max-w-md">
          Choose an agent from the sidebar to view conversations and start chatting
        </p>
      </div>
    );
  }

  if (!selectedConversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Bot className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          No Active Conversation
        </h2>
        <p className="text-muted-foreground max-w-md">
          There are no active conversations with this agent
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Topics List - Left Sidebar */}
      <div className="w-80 flex-shrink-0">
        <TopicList
          topics={selectedConversation.topics}
          selectedTopicId={selectedTopicId}
          onSelectTopic={setSelectedTopicId}
          onCreateTopic={handleCreateTopic}
        />
      </div>

      {/* Chat Interface - Main Area */}
      <div className="flex-1 flex flex-col">
        {selectedTopicId ? (
          <ChatInterface
            conversation={selectedConversation}
            selectedTopicId={selectedTopicId}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-12">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Topic Selected
            </h3>
            <p className="text-muted-foreground">
              Select a topic from the left to view messages
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
      <ConversationsContent />
    </Suspense>
  );
}
