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
