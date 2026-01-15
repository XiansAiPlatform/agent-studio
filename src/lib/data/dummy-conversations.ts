// Dummy conversation data for development (Phase 1)

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'agent' | 'system';
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  attachments?: {
    type: 'task' | 'file' | 'link';
    id: string;
    name: string;
  }[];
  contentDraft?: {
    id: string;
    title: string;
    content: string;
    type: 'email' | 'response' | 'document' | 'recommendation' | 'analysis';
    taskId?: string; // Associated task ID for editing
    metadata?: {
      subject?: string;
      recipients?: string[];
      [key: string]: any;
    };
  };
}

export interface Topic {
  id: string;
  name: string;
  createdAt: string;
  status: 'active' | 'resolved' | 'archived';
  messages: Message[];
  associatedTasks?: string[]; // Task IDs
  isDefault?: boolean;
}

export interface Conversation {
  id: string;
  tenantId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  agent: {
    id: string;
    name: string;
    avatar?: string;
    status: 'online' | 'offline' | 'busy';
  };
  startTime: string;
  lastActivity: string;
  topics: Topic[];
  status: 'active' | 'inactive' | 'archived';
}

export const DUMMY_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-001',
    tenantId: 'tenant-001',
    user: {
      id: 'user-001',
      name: 'John Doe',
    },
    agent: {
      id: 'agent-001',
      name: 'Client Support Agent',
      status: 'online',
    },
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    status: 'active',
    topics: [
      {
        id: 'topic-001',
        name: 'General Discussion',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        isDefault: true,
        messages: [
          {
            id: 'msg-001',
            content: 'Hello! I need help with my recent order.',
            role: 'user',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-002',
            content: 'Hello! I\'d be happy to help you with your order. Could you please provide your order number?',
            role: 'agent',
            timestamp: new Date(Date.now() - 119 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-003',
            content: 'Sure, it\'s ORDER-12345. The product arrived damaged.',
            role: 'user',
            timestamp: new Date(Date.now() - 118 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-004',
            content: 'I\'m sorry to hear that. Let me check your order details and create a refund request for you.',
            role: 'agent',
            timestamp: new Date(Date.now() - 117 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-005',
            content: 'I\'ve prepared a response for the customer. Would you like to review it?',
            role: 'agent',
            timestamp: new Date(Date.now() - 115 * 60 * 1000).toISOString(),
            status: 'read',
            contentDraft: {
              id: 'draft-001',
              title: 'Customer Refund Response',
              type: 'response',
              taskId: 'task-001',
              content: 'Dear John,\n\nThank you for bringing this to our attention. I sincerely apologize for the inconvenience caused by receiving a damaged product.\n\nI have reviewed your order (ORDER-12345) and can confirm that:\n\n1. A full refund of $129.99 will be processed to your original payment method within 3-5 business days\n2. A prepaid return label has been sent to your email address\n3. As a gesture of goodwill, we\'re adding a 20% discount code for your next purchase\n\nYou can track your refund status in your account dashboard. If you have any questions or concerns, please don\'t hesitate to reach out.\n\nBest regards,\nCustomer Support Team',
            },
          },
        ],
      },
      {
        id: 'topic-002',
        name: 'Refund Policy Discussion',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        status: 'active',
        associatedTasks: ['task-001'],
        messages: [
          {
            id: 'msg-006',
            content: 'Can you explain your refund policy in detail?',
            role: 'user',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-007',
            content: 'Absolutely! Our refund policy allows for full refunds within 30 days of purchase for any reason. For damaged items, we process refunds immediately and provide a prepaid return label.',
            role: 'agent',
            timestamp: new Date(Date.now() - 29 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-008',
            content: 'That\'s great! How long does the refund usually take?',
            role: 'user',
            timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-009',
            content: 'Refunds are typically processed within 3-5 business days once we receive the returned item. For damaged goods, we often process it immediately upon request.',
            role: 'agent',
            timestamp: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
            status: 'read',
          },
        ],
      },
      {
        id: 'topic-009',
        name: 'Shipping Inquiry',
        createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        status: 'active',
        associatedTasks: ['task-009'],
        messages: [
          {
            id: 'msg-032',
            content: 'When will my replacement order ship?',
            role: 'user',
            timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-033',
            content: 'Let me check the shipping status for your replacement order. Your new order ORDER-12346 was created and is being prepared for shipment.',
            role: 'agent',
            timestamp: new Date(Date.now() - 19 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-034',
            content: 'I\'ve prepared an expedited shipping notification for your approval. Would you like to review it?',
            role: 'agent',
            timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
            status: 'read',
          },
        ],
      },
      {
        id: 'topic-010',
        name: 'Product Warranty Question',
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        status: 'active',
        associatedTasks: ['task-010'],
        messages: [
          {
            id: 'msg-035',
            content: 'Does the replacement product come with a warranty?',
            role: 'user',
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-036',
            content: 'Yes! All our products come with a standard 1-year warranty. Your replacement will have a full warranty starting from the delivery date.',
            role: 'agent',
            timestamp: new Date(Date.now() - 44 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-037',
            content: 'Can I extend the warranty?',
            role: 'user',
            timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-038',
            content: 'Absolutely! We offer extended warranty plans. I\'ve drafted a warranty extension proposal for your review.',
            role: 'agent',
            timestamp: new Date(Date.now() - 39 * 60 * 1000).toISOString(),
            status: 'read',
          },
        ],
      },
      {
        id: 'topic-011',
        name: 'Account Access Issue',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        status: 'resolved',
        associatedTasks: ['task-011'],
        messages: [
          {
            id: 'msg-039',
            content: 'I can\'t log into my account to track the refund.',
            role: 'user',
            timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-040',
            content: 'I apologize for the inconvenience. Let me help you regain access to your account. I\'ll need to verify your identity first.',
            role: 'agent',
            timestamp: new Date(Date.now() - 59 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-041',
            content: 'I\'ve detected suspicious login attempts on your account. For security, I\'ve escalated this to our security team for immediate review.',
            role: 'agent',
            timestamp: new Date(Date.now() - 58 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-042',
            content: 'Your account has been secured and password reset link has been sent to your email.',
            role: 'agent',
            timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
            status: 'read',
          },
        ],
      },
      {
        id: 'topic-012',
        name: 'Loyalty Discount Request',
        createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
        status: 'resolved',
        associatedTasks: ['task-012'],
        messages: [
          {
            id: 'msg-043',
            content: 'I\'ve been a customer for 3 years. Can I get an additional discount on my next purchase?',
            role: 'user',
            timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-044',
            content: 'Thank you for being a loyal customer! Let me check what we can offer you.',
            role: 'agent',
            timestamp: new Date(Date.now() - 74 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-045',
            content: 'I\'ve reviewed your account history. In addition to the 20% discount for the damaged product, I can offer you a loyalty discount. This requires approval.',
            role: 'agent',
            timestamp: new Date(Date.now() - 73 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-046',
            content: 'Your loyalty discount has been approved! You\'ll receive an additional 15% off your next purchase.',
            role: 'agent',
            timestamp: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
            status: 'read',
          },
        ],
      },
    ],
  },
  {
    id: 'conv-002',
    tenantId: 'tenant-001',
    user: {
      id: 'user-001',
      name: 'John Doe',
    },
    agent: {
      id: 'agent-002',
      name: 'Email Marketing Agent',
      status: 'online',
    },
    startTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    lastActivity: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    status: 'active',
    topics: [
      {
        id: 'topic-003',
        name: 'General Discussion',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        isDefault: true,
        messages: [
          {
            id: 'msg-010',
            content: 'I need to create a new product launch email campaign.',
            role: 'user',
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-011',
            content: 'I can definitely help with that! What product are we launching, and who is the target audience?',
            role: 'agent',
            timestamp: new Date(Date.now() - 299 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-012',
            content: 'We\'re launching our new premium subscription tier. Target audience is our existing free users who have been active for at least 3 months.',
            role: 'user',
            timestamp: new Date(Date.now() - 295 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-013',
            content: 'Perfect! I\'ve created a draft email campaign with A/B tested subject lines. The campaign includes a 15% launch discount for early adopters.',
            role: 'agent',
            timestamp: new Date(Date.now() - 290 * 60 * 1000).toISOString(),
            status: 'read',
            contentDraft: {
              id: 'draft-002',
              title: 'Premium Tier Launch Campaign',
              type: 'email',
              taskId: 'task-002',
              metadata: {
                subject: 'Unlock Premium Features - 15% Off Launch Special',
                recipients: ['Active free tier users (3+ months)'],
              },
              content: 'Subject Line A: "Unlock Premium Features - 15% Off Launch Special"\nSubject Line B: "You\'re Invited: Exclusive Early Access to Premium"\n\n---\n\nHi [First Name],\n\nYou\'ve been with us for [X months], and we\'ve loved seeing how you use our platform. Today, we\'re excited to invite you to something special.\n\n🚀 Introducing Our Premium Tier\n\nGet access to:\n• Advanced analytics and reporting\n• Priority customer support (24/7)\n• Custom integrations and API access\n• Unlimited storage and users\n• Early access to new features\n\n💎 Exclusive Launch Offer\nAs one of our valued users, get 15% off your first year of Premium when you upgrade before [Date]. Use code: PREMIUM15\n\n[Upgrade Now Button]\n\nQuestions? Our team is here to help.\n\nBest,\nThe [Company] Team\n\nP.S. This offer expires in 7 days - don\'t miss out!',
            },
          },
        ],
      },
      {
        id: 'topic-004',
        name: 'Campaign Analytics',
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        status: 'active',
        messages: [
          {
            id: 'msg-014',
            content: 'What kind of open rates should I expect?',
            role: 'user',
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-015',
            content: 'Based on our historical data, similar campaigns to engaged users typically achieve 32-38% open rates and 8-12% click-through rates.',
            role: 'agent',
            timestamp: new Date(Date.now() - 44 * 60 * 1000).toISOString(),
            status: 'read',
          },
        ],
      },
    ],
  },
  {
    id: 'conv-003',
    tenantId: 'tenant-001',
    user: {
      id: 'user-001',
      name: 'John Doe',
    },
    agent: {
      id: 'agent-003',
      name: 'Data Analysis Agent',
      status: 'online',
    },
    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    status: 'active',
    topics: [
      {
        id: 'topic-005',
        name: 'General Discussion',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        isDefault: true,
        messages: [
          {
            id: 'msg-016',
            content: 'I need a comprehensive Q4 sales analysis.',
            role: 'user',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-017',
            content: 'I\'ll analyze the Q4 sales data for you. This includes revenue trends, product performance, and customer segments.',
            role: 'agent',
            timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-018',
            content: 'I\'ve completed the Q4 sales analysis. The data shows a 23% increase compared to Q3, with premium products driving most of the growth.',
            role: 'agent',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            status: 'read',
            attachments: [
              {
                type: 'task',
                id: 'task-003',
                name: 'Validate data analysis results',
              },
            ],
          },
        ],
      },
      {
        id: 'topic-006',
        name: 'Premium Segment Deep Dive',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        associatedTasks: ['task-003'],
        messages: [
          {
            id: 'msg-019',
            content: 'Can you provide more details on the premium segment growth?',
            role: 'user',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-020',
            content: 'The premium segment grew by 45% in Q4. Key drivers include:\n\n1. New product launches (Product A, Product B)\n2. Improved customer retention (87% vs 71% in Q3)\n3. Higher average order value ($450 vs $380)\n\nThe top 3 premium products account for 68% of segment revenue.',
            role: 'agent',
            timestamp: new Date(Date.now() - 179 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-021',
            content: 'Excellent analysis! What recommendations do you have?',
            role: 'user',
            timestamp: new Date(Date.now() - 175 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-022',
            content: 'Based on the data, I recommend:\n\n1. Increase marketing budget for premium products by 30%\n2. Launch loyalty program for premium customers\n3. Develop 2-3 new products in the premium category\n4. Optimize pricing strategy for cross-sells\n\nThese initiatives could potentially increase Q1 premium revenue by 25-35%.',
            role: 'agent',
            timestamp: new Date(Date.now() - 170 * 60 * 1000).toISOString(),
            status: 'read',
            contentDraft: {
              id: 'draft-003',
              title: 'Q1 Strategic Recommendations',
              type: 'recommendation',
              taskId: 'task-003',
              content: 'STRATEGIC RECOMMENDATIONS FOR Q1 PREMIUM GROWTH\n\nExecutive Summary:\nBased on comprehensive Q4 analysis showing 45% premium segment growth, we recommend four strategic initiatives to sustain momentum and achieve 25-35% revenue increase in Q1.\n\n1. MARKETING BUDGET OPTIMIZATION\n   • Increase premium product marketing spend by 30% ($450K → $585K)\n   • Focus: Digital channels with highest ROI (Google Ads: 4.2x, LinkedIn: 3.8x)\n   • Expected outcome: 40% increase in qualified premium leads\n   • Timeline: Immediate implementation\n\n2. PREMIUM LOYALTY PROGRAM\n   • Tier-based rewards system (Silver/Gold/Platinum)\n   • Benefits: Early product access, exclusive pricing, dedicated support\n   • Retention impact: Projected 87% → 93% retention rate\n   • Implementation: 6-week development cycle\n\n3. PRODUCT PORTFOLIO EXPANSION\n   • Develop 2-3 new premium offerings based on customer feedback analysis\n   • Suggested categories: Advanced Analytics Suite, Enterprise Integration Pack\n   • Investment required: $280K development costs\n   • Expected launch: End of Q1\n\n4. PRICING STRATEGY OPTIMIZATION\n   • Implement smart cross-sell bundling (avg order value: $450 → $620)\n   • Dynamic pricing for volume purchases\n   • A/B test pricing tiers with 10% user sample\n   • Projected revenue uplift: $1.2M in Q1\n\nFINANCIAL PROJECTION:\n• Total investment: $865K\n• Projected Q1 premium revenue: $8.5M - $9.2M\n• ROI: 285% - 310%\n• Break-even timeline: 6-8 weeks',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'conv-004',
    tenantId: 'tenant-001',
    user: {
      id: 'user-002',
      name: 'Jane Smith',
    },
    agent: {
      id: 'agent-004',
      name: 'Fraud Detection Agent',
      status: 'online',
    },
    startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    lastActivity: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 minute ago
    status: 'active',
    topics: [
      {
        id: 'topic-007',
        name: 'General Discussion',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        status: 'active',
        isDefault: true,
        messages: [
          {
            id: 'msg-023',
            content: 'Unusual payment pattern detected for account ACC-12345',
            role: 'system',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-024',
            content: 'I\'ve detected suspicious activity on account ACC-12345. Multiple high-value transactions from a newly created account within 24 hours.',
            role: 'agent',
            timestamp: new Date(Date.now() - 29 * 60 * 1000).toISOString(),
            status: 'read',
            attachments: [
              {
                type: 'task',
                id: 'task-004',
                name: 'Escalated: Unusual payment pattern detected',
              },
            ],
          },
          {
            id: 'msg-025',
            content: 'What\'s the risk score?',
            role: 'user',
            timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-026',
            content: 'The risk score is 87/100. Key indicators:\n\n- 5 transactions totaling $15,000\n- New account created 18 hours ago\n- Different shipping addresses for each order\n- Payment method changed 3 times\n\nI recommend temporarily suspending the account pending verification.',
            role: 'agent',
            timestamp: new Date(Date.now() - 27 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-027',
            content: 'What verification steps should we take?',
            role: 'user',
            timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-028',
            content: 'I recommend:\n\n1. Request government-issued ID verification\n2. Confirm shipping addresses via phone call\n3. Verify payment method ownership\n4. Review IP addresses and device fingerprints\n\nI can automatically send the verification request if you approve the suspension.',
            role: 'agent',
            timestamp: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
            status: 'read',
          },
        ],
      },
    ],
  },
  {
    id: 'conv-005',
    tenantId: 'tenant-001',
    user: {
      id: 'user-001',
      name: 'John Doe',
    },
    agent: {
      id: 'agent-007',
      name: 'Inventory Agent',
      status: 'offline',
    },
    startTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    lastActivity: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    status: 'inactive',
    topics: [
      {
        id: 'topic-008',
        name: 'General Discussion',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        status: 'resolved',
        isDefault: true,
        messages: [
          {
            id: 'msg-029',
            content: 'Check inventory levels for Product X',
            role: 'user',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-030',
            content: 'Current stock for Product X: 1,500 units. Based on current sales velocity (214 units/day), stock will deplete in 7 days. Lead time for reorder is 10 days.',
            role: 'agent',
            timestamp: new Date(Date.now() - 239 * 60 * 1000).toISOString(),
            status: 'read',
          },
          {
            id: 'msg-031',
            content: 'I recommend an immediate reorder of 5,000 units to prevent stockouts.',
            role: 'agent',
            timestamp: new Date(Date.now() - 238 * 60 * 1000).toISOString(),
            status: 'read',
            attachments: [
              {
                type: 'task',
                id: 'task-008',
                name: 'Review inventory reorder recommendation',
              },
            ],
          },
        ],
      },
    ],
  },
];

// Filter and utility functions
export function getActiveConversations(): Conversation[] {
  return DUMMY_CONVERSATIONS.filter((conv) => conv.status === 'active');
}

export function getConversationHistory(): Conversation[] {
  return DUMMY_CONVERSATIONS.filter((conv) => conv.status === 'inactive' || conv.status === 'archived');
}

export function getConversationById(id: string): Conversation | undefined {
  return DUMMY_CONVERSATIONS.find((conv) => conv.id === id);
}

export function getConversationsByAgent(agentId: string): Conversation[] {
  return DUMMY_CONVERSATIONS.filter((conv) => conv.agent.id === agentId);
}

export function getConversationsByUser(userId: string): Conversation[] {
  return DUMMY_CONVERSATIONS.filter((conv) => conv.user.id === userId);
}

export function getTopicById(conversationId: string, topicId: string): Topic | undefined {
  const conversation = getConversationById(conversationId);
  return conversation?.topics.find((topic) => topic.id === topicId);
}
