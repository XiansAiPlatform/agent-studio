// Dummy task data for development (Phase 1)

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'obsolete';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: {
    id: string;
    name: string;
  };
  assignedTo?: {
    id: string;
    name: string;
  };
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  conversationId?: string;
  topicId?: string;
  content: {
    originalRequest?: string;
    proposedAction?: string;
    reasoning?: string;
    data?: Record<string, any>;
  };
}

export const DUMMY_TASKS: Task[] = [
  {
    id: 'task-001',
    title: 'Review customer inquiry response',
    description: 'Customer asked about refund policy. Agent drafted a response that needs approval.',
    status: 'pending',
    priority: 'high',
    createdBy: {
      id: 'agent-001',
      name: 'Client Support Agent',
    },
    assignedTo: {
      id: 'user-001',
      name: 'John Doe',
    },
    dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    conversationId: 'conv-001',
    topicId: 'topic-002',
    content: {
      originalRequest: 'I purchased a product last week and it arrived damaged. Can I get a refund?',
      proposedAction: 'Dear Customer,\n\nWe sincerely apologize for the damaged product. We would be happy to process a full refund for you. Please provide your order number and we will initiate the refund within 24 hours.\n\nWe will also send you a prepaid return label via email.\n\nBest regards,\nCustomer Support Team',
      reasoning: 'Customer has a valid complaint about damaged goods. Our policy allows for full refunds in such cases. The response is empathetic and provides clear next steps.',
    },
  },
  {
    id: 'task-002',
    title: 'Approve email campaign draft',
    description: 'Marketing agent has prepared an email campaign for the new product launch.',
    status: 'pending',
    priority: 'medium',
    createdBy: {
      id: 'agent-002',
      name: 'Email Marketing Agent',
    },
    assignedTo: {
      id: 'user-001',
      name: 'John Doe',
    },
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    conversationId: 'conv-002',
    topicId: 'topic-003',
    content: {
      proposedAction: 'Subject: Introducing Our Revolutionary New Product! \n\nBody: We are excited to announce the launch of our latest innovation...',
      reasoning: 'Campaign targets our premium segment with a 15% discount offer. A/B tested subject line shows 32% higher open rates.',
    },
  },
  {
    id: 'task-003',
    title: 'Validate data analysis results',
    description: 'Data analysis agent has completed Q4 sales analysis and requires validation.',
    status: 'pending',
    priority: 'medium',
    createdBy: {
      id: 'agent-003',
      name: 'Data Analysis Agent',
    },
    assignedTo: {
      id: 'user-001',
      name: 'John Doe',
    },
    dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours from now
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    content: {
      proposedAction: 'Q4 Sales Analysis Report',
      reasoning: 'Analysis shows 23% increase in sales compared to Q3. Key growth drivers identified in the premium segment.',
      data: {
        totalSales: 1250000,
        growthRate: 23,
        topProducts: ['Product A', 'Product B', 'Product C'],
      },
    },
  },
  {
    id: 'task-004',
    title: 'Escalated: Unusual payment pattern detected',
    description: 'Fraud detection agent has flagged unusual payment activity requiring immediate review.',
    status: 'pending',
    priority: 'urgent',
    createdBy: {
      id: 'agent-004',
      name: 'Fraud Detection Agent',
    },
    assignedTo: {
      id: 'user-002',
      name: 'Jane Smith',
    },
    dueDate: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour from now
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    conversationId: 'conv-003',
    topicId: 'topic-004',
    content: {
      originalRequest: 'Multiple high-value transactions detected from new account within 24 hours.',
      proposedAction: 'Temporarily suspend account and request additional verification from customer.',
      reasoning: 'Pattern matches known fraud indicators: new account, multiple transactions, high values, different shipping addresses.',
      data: {
        accountId: 'ACC-12345',
        transactionCount: 5,
        totalAmount: 15000,
        riskScore: 87,
      },
    },
  },
  {
    id: 'task-005',
    title: 'Configure new integration settings',
    description: 'Integration agent requires approval for new CRM connection settings.',
    status: 'pending',
    priority: 'low',
    createdBy: {
      id: 'agent-005',
      name: 'Integration Agent',
    },
    dueDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 3 days from now
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    content: {
      proposedAction: 'Enable bi-directional sync with Salesforce CRM',
      reasoning: 'Will allow real-time customer data synchronization and reduce manual data entry by 80%.',
      data: {
        integration: 'Salesforce',
        syncFrequency: 'real-time',
        dataTypes: ['contacts', 'leads', 'opportunities'],
      },
    },
  },
  {
    id: 'task-006',
    title: 'Approved: Update pricing for premium tier',
    description: 'Pricing adjustment for premium subscription tier has been approved.',
    status: 'approved',
    priority: 'medium',
    createdBy: {
      id: 'agent-006',
      name: 'Pricing Agent',
    },
    assignedTo: {
      id: 'user-001',
      name: 'John Doe',
    },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    content: {
      proposedAction: 'Increase premium tier pricing from $99 to $119 per month',
      reasoning: 'Competitive analysis shows we are underpriced. New pricing aligns with market rates while maintaining 15% discount vs. competitors.',
      data: {
        currentPrice: 99,
        newPrice: 119,
        effectiveDate: '2026-02-01',
      },
    },
  },
  {
    id: 'task-007',
    title: 'Rejected: Bulk discount request',
    description: 'Customer requested 40% bulk discount - exceeds approval threshold.',
    status: 'rejected',
    priority: 'low',
    createdBy: {
      id: 'agent-001',
      name: 'Client Support Agent',
    },
    assignedTo: {
      id: 'user-001',
      name: 'John Doe',
    },
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    content: {
      originalRequest: 'Customer requesting 40% discount for order of 100 units',
      proposedAction: 'Approve 40% discount',
      reasoning: 'Maximum approved bulk discount is 25%. 40% would result in below-cost pricing.',
    },
  },
  {
    id: 'task-008',
    title: 'Review inventory reorder recommendation',
    description: 'Inventory agent recommends restocking based on demand forecasting.',
    status: 'pending',
    priority: 'high',
    createdBy: {
      id: 'agent-007',
      name: 'Inventory Agent',
    },
    assignedTo: {
      id: 'user-001',
      name: 'John Doe',
    },
    dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    content: {
      proposedAction: 'Reorder 5000 units of Product X',
      reasoning: 'Current stock will deplete in 7 days based on sales velocity. Lead time is 10 days. Recommend immediate reorder to prevent stockouts.',
      data: {
        currentStock: 1500,
        dailySales: 214,
        daysUntilStockout: 7,
        leadTime: 10,
        reorderQuantity: 5000,
      },
    },
  },
  {
    id: 'task-009',
    title: 'Approve expedited shipping for replacement',
    description: 'Customer requesting status on replacement order shipping.',
    status: 'pending',
    priority: 'high',
    createdBy: {
      id: 'agent-001',
      name: 'Client Support Agent',
    },
    assignedTo: {
      id: 'user-001',
      name: 'John Doe',
    },
    dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(), // 18 minutes ago
    updatedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    content: {
      originalRequest: 'When will my replacement order ship?',
      proposedAction: 'Upgrade to expedited 2-day shipping at no additional cost as goodwill gesture for the damaged product incident.',
      reasoning: 'Customer experienced inconvenience with damaged product. Expedited shipping will improve customer satisfaction and retention. Cost: $15, Customer LTV: $2,400.',
    },
  },
  {
    id: 'task-010',
    title: 'Review extended warranty proposal',
    description: 'Customer interested in extended warranty coverage for replacement product.',
    status: 'pending',
    priority: 'medium',
    createdBy: {
      id: 'agent-001',
      name: 'Client Support Agent',
    },
    assignedTo: {
      id: 'user-001',
      name: 'John Doe',
    },
    dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
    createdAt: new Date(Date.now() - 39 * 60 * 1000).toISOString(), // 39 minutes ago
    updatedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(), // 35 minutes ago
    content: {
      originalRequest: 'Can I extend the warranty on my replacement product?',
      proposedAction: 'Offer 2-year extended warranty plan at 25% discount ($74.99 instead of $99.99) given the recent product issue.',
      reasoning: 'Customer may have concerns about product quality after damaged delivery. Discounted extended warranty builds trust and generates additional revenue. Extended warranty has 80% profit margin.',
    },
  },
  {
    id: 'task-011',
    title: 'Escalated: Suspicious account activity detected',
    description: 'Multiple failed login attempts detected on customer account.',
    status: 'approved',
    priority: 'urgent',
    createdBy: {
      id: 'agent-001',
      name: 'Client Support Agent',
    },
    assignedTo: {
      id: 'user-001',
      name: 'John Doe',
    },
    createdAt: new Date(Date.now() - 58 * 60 * 1000).toISOString(), // 58 minutes ago
    updatedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(), // 50 minutes ago
    content: {
      originalRequest: 'Customer unable to access account to track refund.',
      proposedAction: 'Temporarily lock account, require password reset, and enable 2-factor authentication.',
      reasoning: 'Security analysis detected 7 failed login attempts from unfamiliar IP addresses in last 2 hours. Customer security is priority. Action approved and completed.',
      data: {
        failedAttempts: 7,
        suspiciousIPs: ['185.220.101.45', '192.42.116.180'],
        accountSecured: true,
      },
    },
  },
  {
    id: 'task-012',
    title: 'Approve loyalty discount for long-term customer',
    description: 'Customer requesting additional discount based on 3-year account history.',
    status: 'approved',
    priority: 'low',
    createdBy: {
      id: 'agent-001',
      name: 'Client Support Agent',
    },
    assignedTo: {
      id: 'user-001',
      name: 'John Doe',
    },
    createdAt: new Date(Date.now() - 73 * 60 * 1000).toISOString(), // 73 minutes ago
    updatedAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(), // 65 minutes ago
    content: {
      originalRequest: 'Customer with 3-year history requesting additional discount.',
      proposedAction: 'Approve additional 15% loyalty discount on next purchase (on top of existing 20% goodwill discount).',
      reasoning: 'Customer has excellent history: 24 orders, $4,800 total spend, zero returns until this damaged product. Retention value justifies additional discount. Approved.',
      data: {
        customerTenure: '3 years',
        totalOrders: 24,
        lifetimeValue: 4800,
        proposedDiscount: 15,
      },
    },
  },
  {
    id: 'task-013',
    title: 'Obsolete: Legacy system migration approval',
    description: 'Request for approval to migrate data from legacy CRM system.',
    status: 'obsolete',
    priority: 'low',
    createdBy: {
      id: 'agent-005',
      name: 'Integration Agent',
    },
    assignedTo: {
      id: 'user-001',
      name: 'John Doe',
    },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days ago
    content: {
      proposedAction: 'Migrate customer data from Legacy CRM v1.0 to new system',
      reasoning: 'Legacy system has been deprecated. Migration was superseded by direct API integration.',
    },
  },
  {
    id: 'task-014',
    title: 'Obsolete: Q3 marketing campaign draft',
    description: 'Marketing agent prepared campaign draft for Q3 promotion.',
    status: 'obsolete',
    priority: 'low',
    createdBy: {
      id: 'agent-002',
      name: 'Email Marketing Agent',
    },
    assignedTo: {
      id: 'user-001',
      name: 'John Doe',
    },
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
    updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
    content: {
      proposedAction: 'Launch Q3 summer sale campaign with 20% discount',
      reasoning: 'Campaign became obsolete as company changed strategy to focus on year-end promotions.',
    },
  },
];

// Filter functions
export function getPendingTasks(): Task[] {
  return DUMMY_TASKS.filter((task) => task.status === 'pending');
}

export function getAssignedTasks(userId: string = 'user-001'): Task[] {
  return DUMMY_TASKS.filter((task) => task.assignedTo?.id === userId);
}

export function getCompletedTasks(): Task[] {
  return DUMMY_TASKS.filter((task) => 
    task.status === 'approved' || task.status === 'rejected' || task.status === 'obsolete'
  );
}

export function getTaskById(id: string): Task | undefined {
  return DUMMY_TASKS.find((task) => task.id === id);
}
