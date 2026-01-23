import { 
  Bot, 
  MessageSquare, 
  Database, 
  Sparkles, 
  Code, 
  FileText, 
  Zap 
} from 'lucide-react';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

/**
 * Get the appropriate icon component based on agent name/summary/description
 */
export const getAgentIcon = (
  name: string, 
  summary?: string | null, 
  description?: string | null
) => {
  const text = `${name} ${summary || description || ''}`.toLowerCase();
  
  if (text.includes('chat') || text.includes('conversational') || text.includes('support')) {
    return MessageSquare;
  }
  if (text.includes('data') || text.includes('analytics') || text.includes('research')) {
    return Database;
  }
  if (text.includes('marketing') || text.includes('email')) {
    return Sparkles;
  }
  if (text.includes('code') || text.includes('development')) {
    return Code;
  }
  if (text.includes('content') || text.includes('writer')) {
    return FileText;
  }
  if (text.includes('automation') || text.includes('workflow') || text.includes('process')) {
    return Zap;
  }
  return Bot;
};

/**
 * Get a consistent color for an agent based on its name
 */
export const getAgentColor = (name: string): string => {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = ['primary', 'secondary', 'accent'];
  return colors[hash % colors.length];
};

/**
 * Generate a suggested instance name with random adjective + animal
 */
export const generateInstanceName = (agentName: string): string => {
  const randomName = uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: ' ',
    style: 'capital',
  });
  return `${agentName} - ${randomName}`;
};

/**
 * Generate a default description with metadata
 */
export const generateInstanceDescription = (
  agentName: string, 
  instanceName: string, 
  userName?: string | null
): string => {
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const time = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
  const creator = userName || 'user';
  
  return `Created on ${date} at ${time} by ${creator} using the Agent Template '${agentName}'`;
};

/**
 * Truncate text to a maximum number of sentences
 */
export const truncateToSentences = (text: string, maxSentences: number = 3) => {
  if (!text) return { truncated: '', isLong: false, full: text };
  
  // Match sentences ending with . ! or ?
  const sentenceRegex = /[^.!?]+[.!?]+/g;
  const sentences = text.match(sentenceRegex) || [];
  
  const isLong = sentences.length > maxSentences;
  const truncated = isLong 
    ? sentences.slice(0, maxSentences).join(' ').trim() 
    : text;
  
  return { truncated, isLong, full: text };
};

/**
 * Validate instance name
 */
export const validateInstanceName = (name: string): { 
  isValid: boolean; 
  error?: string;
} => {
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return { isValid: false, error: 'Please provide an instance name' };
  }
  
  // Validate name format (alphanumeric, spaces, hyphens, underscores only)
  const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  if (!nameRegex.test(trimmedName)) {
    return { 
      isValid: false, 
      error: 'Instance name can only contain letters, numbers, spaces, hyphens, and underscores' 
    };
  }
  
  // Validate name length
  if (trimmedName.length < 3) {
    return { isValid: false, error: 'Instance name must be at least 3 characters long' };
  }
  
  if (trimmedName.length > 100) {
    return { isValid: false, error: 'Instance name must be less than 100 characters' };
  }
  
  return { isValid: true };
};
