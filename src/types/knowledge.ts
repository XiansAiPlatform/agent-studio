// Knowledge article domain types.

export type KnowledgeFormat = 'json' | 'markdown' | 'text';

export interface KnowledgeArticle {
  id: string;
  title: string;
  description: string;
  format: KnowledgeFormat;
  content: string;
  assignedAgent: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string;
  };
  updatedBy?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  version: number;
}
